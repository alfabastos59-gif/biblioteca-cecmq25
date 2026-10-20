import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Public (publishable) connection values. Used as a fallback when a build
// was produced without the environment variables, so the app never blanks.
const FALLBACK_URL = 'https://c--55e4f730-37d9-4b5a-8b7f-06d4ae552687-prod.lovable.cloud';
const FALLBACK_KEY = 'sb_publishable_qtBRWIrYZYKHFqa1no8fHw_zn8EC_3U';

const URL = (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) || FALLBACK_URL;
const KEY = (import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined) || FALLBACK_KEY;

export const supabase = createClient<Database>(URL, KEY, {
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get('Authorization') === `Bearer ${KEY}`) headers.delete('Authorization');
      headers.set('apikey', KEY);
      return fetch(input, { ...init, headers });
    },
  },
  auth: { persistSession: false, autoRefreshToken: false },
});
