import type { Loan } from '../types';

export const LIBRARY_RULES = {
  maxLoans: 2, minLoanDays: 7, maxLoanDays: 14,
  renewalDays: 7, questionSeconds: 20 * 60, maxAttempts: 5,
} as const;

export function parseLibraryDate(value: string): Date {
  const [day, month, year] = value.split('/').map(Number);
  if (day === undefined || month === undefined || year === undefined) return new Date(NaN);
  return new Date(year, month - 1, day);
}
export function renewLibraryDate(value: string): string {
  const date = parseLibraryDate(value);
  date.setDate(date.getDate() + LIBRARY_RULES.renewalDays);
  return date.toLocaleDateString('pt-BR');
}
const normalizeCode = (code: string) => code.replace(/[^a-z0-9]/gi, '').replace(/^alu/i, '').toLowerCase();
export function validateLibraryLoan(loan: Omit<Loan, 'id'>, loans: Loan[]): string | null {
  const active = loans.filter(l => l.status !== 'devolvido' && (
    (loan.studentCode && l.studentCode && normalizeCode(loan.studentCode) === normalizeCode(l.studentCode)) ||
    (loan.studentId && l.studentId === loan.studentId) ||
    l.studentName.trim().toLowerCase() === loan.studentName.trim().toLowerCase()
  ));
  if (active.length >= LIBRARY_RULES.maxLoans) return 'Você já possui 2 livros emprestados. Devolva um antes de solicitar outro.';
  const start = parseLibraryDate(loan.loanDate), end = parseLibraryDate(loan.returnDate);
  const days = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
  if (!Number.isFinite(days) || days < 7 || days > 14) return 'O prazo de empréstimo deve ser de 7 a 14 dias corridos.';
  return null;
}