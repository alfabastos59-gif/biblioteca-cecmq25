// @ts-nocheck
// Sincronização na nuvem (Lovable Cloud). Mantém a mesma API usada pelo app.
import { supabase } from './cloudClient';
import { Book, Loan, Student, Suggestion, AdminUser, AuditLog } from '../types';

const TABLE = 'records';

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from(TABLE).select('id').limit(1);
    if (error) {
      console.error('Falha ao conectar na nuvem:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchCollection(collection: string): Promise<any[]> {
  const out: any[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('collection', collection)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []).map((r) => r.data));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

function subscribe(
  collection: string,
  transform: (list: any[]) => any[],
  onSuccess: (list: any[]) => void,
  onError?: (err: Error) => void
): () => void {
  let active = true;
  let timer: any = null;
  const load = async () => {
    try {
      const list = await fetchCollection(collection);
      if (active) onSuccess(transform(list));
    } catch (err: any) {
      console.error(`Erro ao sincronizar ${collection}:`, err);
      if (active && onError) onError(err);
    }
  };
  load();
  const channel = supabase
    .channel(`records-${collection}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `collection=eq.${collection}` },
      () => {
        clearTimeout(timer);
        timer = setTimeout(load, 300);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') load();
    });
  const onFocus = () => document.visibilityState === 'visible' && load();
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onFocus);
  return () => {
    active = false;
    clearTimeout(timer);
    supabase.removeChannel(channel);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onFocus);
  };
}

const byText = (k: string) => (l: any[]) =>
  l.sort((a, b) => String(a[k] || '').localeCompare(String(b[k] || ''), 'pt-BR', { sensitivity: 'base' }));

export const subscribeToBooks = (s: (b: Book[]) => void, e?: (err: Error) => void) =>
  subscribe('books', byText('title'), s, e);
export const subscribeToLoans = (s: (l: Loan[]) => void, e?: (err: Error) => void) =>
  subscribe('loans', (l) => l, s, e);
export const subscribeToStudents = (s: (l: Student[]) => void, e?: (err: Error) => void) =>
  subscribe('students', byText('name'), s, e);
export const subscribeToSuggestions = (s: (l: Suggestion[]) => void, e?: (err: Error) => void) =>
  subscribe('suggestions', (l) => l, s, e);
export const subscribeToAdminUsers = (s: (l: AdminUser[]) => void, e?: (err: Error) => void) =>
  subscribe('adminUsers', (l) => l, s, e);
export const subscribeToAuditLogs = (s: (l: AuditLog[]) => void, e?: (err: Error) => void) =>
  subscribe(
    'auditLogs',
    (l) => l.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100),
    s,
    e
  );
export const subscribeToAuthors = (s: (l: any[]) => void, e?: (err: Error) => void) =>
  subscribe('authors', (l) => l.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))), s, e);

export function sanitizeForFirestore<T>(val: T): T {
  return JSON.parse(JSON.stringify(val ?? null));
}

async function upsertMany(collection: string, items: any[]) {
  for (let i = 0; i < items.length; i += 500) {
    const rows = items.slice(i, i + 500).map((d) => ({
      collection,
      id: String(d.id),
      data: sanitizeForFirestore(d),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'collection,id' });
    if (error) throw error;
  }
}

async function removeOne(collection: string, id: string) {
  const { error } = await supabase.from(TABLE).delete().eq('collection', collection).eq('id', id);
  if (error) throw error;
}

export const saveBookToCloud = (b: Book) => upsertMany('books', [b]);
export const deleteBookFromCloud = (id: string) => removeOne('books', id);
export const saveLoanToCloud = (l: Loan) => upsertMany('loans', [l]);
export const deleteLoanFromCloud = (id: string) => removeOne('loans', id);
export const saveStudentToCloud = (s: Student) => upsertMany('students', [s]);
export const deleteStudentFromCloud = (id: string) => removeOne('students', id);
export const saveSuggestionToCloud = (s: Suggestion) => upsertMany('suggestions', [s]);
export const deleteSuggestionFromCloud = (id: string) => removeOne('suggestions', id);
export const saveAdminUserToCloud = (a: AdminUser) => upsertMany('adminUsers', [a]);
export const deleteAdminUserFromCloud = (id: string) => removeOne('adminUsers', id);
export const saveAuditLogToCloud = (l: AuditLog) => upsertMany('auditLogs', [l]);

type AllData = {
  books: Book[];
  loans: Loan[];
  students: Student[];
  suggestions: Suggestion[];
  adminUsers: AdminUser[];
  auditLogs: AuditLog[];
};

async function pushAll(d: AllData) {
  await upsertMany('books', d.books || []);
  await upsertMany('loans', d.loans || []);
  await upsertMany('students', d.students || []);
  await upsertMany('suggestions', d.suggestions || []);
  await upsertMany('adminUsers', d.adminUsers || []);
  await upsertMany('auditLogs', d.auditLogs || []);
}

export async function seedCloudDatabaseIfEmpty(initialData: AllData): Promise<boolean> {
  try {
    const { data: seed } = await supabase
      .from(TABLE).select('id').eq('collection', 'meta').eq('id', 'seed').maybeSingle();
    if (seed) return false;
    const { data: anyBook } = await supabase.from(TABLE).select('id').eq('collection', 'books').limit(1);
    if (!anyBook || anyBook.length === 0) await pushAll(initialData);
    await upsertMany('meta', [{ id: 'seed', seededAt: new Date().toISOString() }]);
    return true;
  } catch (error) {
    console.error('Erro na carga inicial da nuvem:', error);
    return false;
  }
}

export async function pushAllLocalDataToCloud(data: AllData): Promise<{ success: boolean; error?: string }> {
  try {
    await pushAll(data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Falha ao sincronizar' };
  }
}

export async function syncAuthorsToCloud(authors: any[]): Promise<void> {
  const { data } = await supabase.from(TABLE).select('id').eq('collection', 'authors');
  const keep = new Set(authors.map((a) => String(a.id)));
  const stale = (data || []).map((r) => r.id).filter((id) => !keep.has(id));
  if (stale.length) {
    const { error } = await supabase.from(TABLE).delete().eq('collection', 'authors').in('id', stale);
    if (error) throw error;
  }
  await upsertMany('authors', authors);
}
