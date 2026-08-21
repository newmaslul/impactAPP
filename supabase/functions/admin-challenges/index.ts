// Admin CRUD for the "צור אתגר" form (ChallengeForm.jsx / AdminChallenges.jsx).

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const TYPES = ['steps', 'distance', 'sleep'];
const SCOPES = ['personal', 'class', 'cross_grade'];
const RECURRENCES = ['once', 'daily', 'weekly', 'monthly'];

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
  const { data, error } = await supabaseAdmin.from('challenges').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return json({ challenges: data ?? [] });
}

async function handleCreate(req: Request) {
  const { name, type, scope, recurrence, start, end, recurrenceBoundUntil, goal } = await req.json().catch(() => ({}));

  if (!name || !String(name).trim()) return json({ error: 'נדרש שם לאתגר' }, 400);
  if (!TYPES.includes(type)) return json({ error: `סוג חייב להיות אחד מ: ${TYPES.join(', ')}` }, 400);
  if (!SCOPES.includes(scope)) return json({ error: `קהל תחרות חייב להיות אחד מ: ${SCOPES.join(', ')}` }, 400);
  const recurrenceValue = recurrence || 'once';
  if (!RECURRENCES.includes(recurrenceValue)) return json({ error: `תדירות חייבת להיות אחת מ: ${RECURRENCES.join(', ')}` }, 400);
  const goalNum = Number(goal);
  if (!goalNum || goalNum <= 0) return json({ error: 'נדרש יעד גדול מ-0' }, 400);

  const row: Record<string, unknown> = { name: String(name).trim(), type, scope, recurrence: recurrenceValue, goal: goalNum };

  if (recurrenceValue === 'once') {
    if (!start || !end) return json({ error: 'נדרשת תקופת אתגר מלאה' }, 400);
    if (new Date(end) <= new Date(start)) return json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' }, 400);
    row.start_date = start;
    row.end_date = end;
  } else if (recurrenceBoundUntil) {
    row.recurrence_bound_until = recurrenceBoundUntil;
  }

  const { data, error } = await supabaseAdmin.from('challenges').insert(row).select().single();
  if (error) throw error;

  return json({ challenge: data }, 201);
}

// Admin table's inline edit covers תקופה/תחום בזמן + יעד — name/type/
// scope/recurrence aren't editable there today (no UI path sends them,
// same reasoning as before), but accepting them costs nothing.
async function handleUpdate(req: Request, id: string) {
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  const { data: current, error: currentError } = await supabaseAdmin
    .from('challenges').select('recurrence, start_date, end_date').eq('id', id).maybeSingle();
  if (currentError) throw currentError;
  if (!current) return json({ error: 'אתגר לא נמצא' }, 404);

  const recurrence = body.recurrence !== undefined ? body.recurrence : current.recurrence;

  if (recurrence === 'once' && (body.start !== undefined || body.end !== undefined)) {
    const nextStart = body.start !== undefined ? body.start : current.start_date;
    const nextEnd = body.end !== undefined ? body.end : current.end_date;
    if (!nextStart || !nextEnd) return json({ error: 'נדרשת תקופת אתגר מלאה' }, 400);
    if (new Date(nextEnd) <= new Date(nextStart)) return json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' }, 400);
    patch.start_date = nextStart;
    patch.end_date = nextEnd;
  }
  if (body.recurrenceBoundUntil !== undefined) {
    patch.recurrence_bound_until = body.recurrenceBoundUntil || null;
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
  if (body.scope !== undefined) {
    if (!SCOPES.includes(body.scope)) return json({ error: `קהל תחרות חייב להיות אחד מ: ${SCOPES.join(', ')}` }, 400);
    patch.scope = body.scope;
  }

  const { data, error } = await supabaseAdmin.from('challenges').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw error;
  if (!data) return json({ error: 'אתגר לא נמצא' }, 404);

  return json({ challenge: data });
}
