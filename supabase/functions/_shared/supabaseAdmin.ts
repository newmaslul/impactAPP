import { createClient } from 'npm:@supabase/supabase-js@2';

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
// Edge Function's environment by Supabase — no manual secret needed for
// these two. This client bypasses RLS (see migrations/0001_init.sql),
// which is safe here because it's only ever used server-side, inside
// Edge Functions, never shipped to the browser.
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
