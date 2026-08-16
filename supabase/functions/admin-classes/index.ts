// Ported from server/routes/classes.js. school_name comes from the FK
// relationship (classes.school_id -> schools.id) via PostgREST's embedded
// resource syntax; student_count is tallied separately since PostgREST
// doesn't do GROUP BY counts through the query builder.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('admin-classes');
  return idx >= 0 ? segments.slice(idx + 1) : [];
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const rest = restSegments(req);

  try {
    if (rest.length === 0 && req.method === 'GET') return await handleList();
    if (rest.length === 0 && req.method === 'POST') return await handleCreate(req);
    if (rest.length === 1 && req.method === 'DELETE') {
      const { error, count } = await supabaseAdmin.from('classes').delete({ count: 'exact' }).eq('id', rest[0]);
      if (error) throw error;
      if (!count) return json({ error: 'כיתה לא נמצאה' }, 404);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleList() {
  const { data: classes, error } = await supabaseAdmin
    .from('classes')
    .select('*, schools(name)')
    .order('name', { foreignTable: 'schools' })
    .order('name');
  if (error) throw error;

  const { data: users, error: usersError } = await supabaseAdmin.from('users').select('class_id').not('class_id', 'is', null);
  if (usersError) throw usersError;

  const counts: Record<number, number> = {};
  for (const u of users ?? []) {
    counts[u.class_id as number] = (counts[u.class_id as number] ?? 0) + 1;
  }

  const result = (classes ?? []).map((c: any) => ({
    id: c.id,
    school_id: c.school_id,
    name: c.name,
    created_at: c.created_at,
    school_name: c.schools?.name ?? null,
    student_count: counts[c.id] ?? 0,
  }));

  return json({ classes: result });
}

async function handleCreate(req: Request) {
  const { name, schoolId } = await req.json().catch(() => ({}));
  if (!name || !String(name).trim()) return json({ error: 'נדרש שם כיתה' }, 400);
  if (!schoolId) return json({ error: 'נדרש בית ספר' }, 400);

  const { data, error } = await supabaseAdmin
    .from('classes')
    .insert({ name: String(name).trim(), school_id: schoolId })
    .select()
    .single();
  if (error) throw error;

  return json({ class: data }, 201);
}
