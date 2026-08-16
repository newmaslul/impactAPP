// Ported from server/routes/schools.js.
import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('admin-schools');
  return idx >= 0 ? segments.slice(idx + 1) : [];
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const rest = restSegments(req);

  try {
    if (rest.length === 0 && req.method === 'GET') {
      const { data, error } = await supabaseAdmin.from('schools').select('*').order('name');
      if (error) throw error;
      return json({ schools: data ?? [] });
    }
    if (rest.length === 0 && req.method === 'POST') {
      const { name } = await req.json().catch(() => ({}));
      if (!name || !String(name).trim()) return json({ error: 'נדרש שם בית ספר' }, 400);
      const { data, error } = await supabaseAdmin.from('schools').insert({ name: String(name).trim() }).select().single();
      if (error) throw error;
      return json({ school: data }, 201);
    }
    if (rest.length === 1 && req.method === 'DELETE') {
      const { error, count } = await supabaseAdmin.from('schools').delete({ count: 'exact' }).eq('id', rest[0]);
      if (error) throw error;
      if (!count) return json({ error: 'בית ספר לא נמצא' }, 404);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});
