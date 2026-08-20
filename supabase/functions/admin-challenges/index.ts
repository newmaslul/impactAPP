// Admin CRUD for the "צור אתגר" form (ChallengeForm.jsx / AdminChallenges.jsx).

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const TYPES = ['steps', 'distance', 'sleep'];
const AUDIENCES = ['grade', 'class', 'school'];

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
    if (rest.length === 1 && req.method === 'PATCH') return await handleUpdate(req, rest[0]);
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

function validAudience(audience: unknown): audience is string[] {
  return Array.isArray(audience) && audience.length === 1 && AUDIENCES.includes(audience[0]);
}

async function handleCreate(req: Request) {
  const { name, type, start, end, goal, audience } = await req.json().catch(() => ({}));

  if (!name || !String(name).trim()) return json({ error: 'נדרש שם לאתגר' }, 400);
  if (!TYPES.includes(type)) return json({ error: `סוג חייב להיות אחד מ: ${TYPES.join(', ')}` }, 400);
  if (!start || !end) return json({ error: 'נדרשת תקופת אתגר מלאה' }, 400);
  if (new Date(end) <= new Date(start)) return json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' }, 400);
  const goalNum = Number(goal);
  if (!goalNum || goalNum <= 0) return json({ error: 'נדרש יעד גדול מ-0' }, 400);
  if (!validAudience(audience)) return json({ error: `קהל יעד חייב להיות אחד מ: ${AUDIENCES.join(', ')}` }, 400);

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

// Period + goal only, per the admin table's inline edit — name/type/
// audience aren't editable there today, so there's no path that could
// send them; accepting them anyway (same partial-patch shape used
// elsewhere) costs nothing and doesn't need its own separate endpoint.
async function handleUpdate(req: Request, id: string) {
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  const { data: current, error: currentError } = await supabaseAdmin
    .from('challenges')
    .select('start_date, end_date')
    .eq('id', id)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return json({ error: 'אתגר לא נמצא' }, 404);

  const nextStart = body.start !== undefined ? body.start : current.start_date;
  const nextEnd = body.end !== undefined ? body.end : current.end_date;

  if (body.start !== undefined || body.end !== undefined) {
    if (!nextStart || !nextEnd) return json({ error: 'נדרשת תקופת אתגר מלאה' }, 400);
    if (new Date(nextEnd) <= new Date(nextStart)) return json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' }, 400);
    patch.start_date = nextStart;
    patch.end_date = nextEnd;
  }
  if (body.goal !== undefined) {
    const goalNum = Number(body.goal);
    if (!goalNum || goalNum <= 0) return json({ error: 'נדרש יעד גדול מ-0' }, 400);
    patch.goal = goalNum;
  }
  if (body.name !== undefined) {
    if (!String(body.name).trim()) return json({ error: 'נדרש שם לאתגר' }, 400);
    patch.name = String(body.name).trim();
  }
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type)) return json({ error: `סוג חייב להיות אחד מ: ${TYPES.join(', ')}` }, 400);
    patch.type = body.type;
  }
  if (body.audience !== undefined) {
    if (!validAudience(body.audience)) return json({ error: `קהל יעד חייב להיות אחד מ: ${AUDIENCES.join(', ')}` }, 400);
    patch.audience = body.audience;
  }

  const { data, error } = await supabaseAdmin.from('challenges').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw error;
  if (!data) return json({ error: 'אתגר לא נמצא' }, 404);

  return json({ challenge: data });
}
