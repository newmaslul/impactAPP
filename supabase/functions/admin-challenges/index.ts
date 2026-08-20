// Admin CRUD for the "צור אתגר" form (ChallengeForm.jsx / AdminChallenges.jsx).
// GET/POST only for now — the admin list screen has no edit/delete UI yet,
// matching its current feature set.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const TYPES = ['steps', 'distance', 'sleep', 'class', 'grade'];

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('admin-challenges');
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
      const { error, count } = await supabaseAdmin.from('challenges').delete({ count: 'exact' }).eq('id', rest[0]);
      if (error) throw error;
      if (!count) return json({ error: 'אתגר לא נמצא' }, 404);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleList() {
  const { data, error } = await supabaseAdmin.from('challenges').select('*').order('start_date', { ascending: false });
  if (error) throw error;
  return json({ challenges: data ?? [] });
}

async function handleCreate(req: Request) {
  const { name, type, start, end, goal, audience } = await req.json().catch(() => ({}));

  if (!name || !String(name).trim()) return json({ error: 'נדרש שם לאתגר' }, 400);
  if (!TYPES.includes(type)) return json({ error: `סוג חייב להיות אחד מ: ${TYPES.join(', ')}` }, 400);
  if (!start || !end) return json({ error: 'נדרשת תקופת אתגר מלאה' }, 400);
  if (new Date(end) <= new Date(start)) return json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' }, 400);
  const goalNum = Number(goal);
  if (!goalNum || goalNum <= 0) return json({ error: 'נדרש יעד גדול מ-0' }, 400);
  if (!Array.isArray(audience) || audience.length === 0) return json({ error: 'נדרשת לפחות קבוצת יעד אחת' }, 400);

  const { data, error } = await supabaseAdmin
    .from('challenges')
    .insert({
      name: String(name).trim(),
      type,
      start_date: start,
      end_date: end,
      goal: goalNum,
      audience,
    })
    .select()
    .single();
  if (error) throw error;

  return json({ challenge: data }, 201);
}
