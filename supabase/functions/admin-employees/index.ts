// Ported from server/routes/employees.js.
// NOTE: intentionally open in this prototype — same caveat as the
// Express version, needs an admin-role gate before production.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { toPublicUser } from '../_shared/serialize.ts';

const PHONE_RE = /^0\d{8,9}$/;

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('admin-employees');
  return idx >= 0 ? segments.slice(idx + 1) : [];
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const rest = restSegments(req);

  try {
    if (rest.length === 0 && req.method === 'GET') return await handleList();
    if (rest[0] === 'invite' && req.method === 'POST') return await handleInvite(req);
    if (rest.length === 1 && req.method === 'PATCH') return await handlePatch(req, rest[0]);
    if (rest.length === 1 && req.method === 'DELETE') return await handleDelete(rest[0]);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleList() {
  const { data, error } = await supabaseAdmin.from('users').select('*').order('points', { ascending: false });
  if (error) throw error;
  return json({ employees: (data ?? []).map(toPublicUser) });
}

async function handlePatch(req: Request, id: string) {
  const body = await req.json().catch(() => ({}));
  const { department, role, status } = body;

  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('id', id).maybeSingle();
  if (!existing) return json({ error: 'משתמש לא נמצא' }, 404);

  const patch: Record<string, unknown> = {};
  if (department !== undefined) patch.department = department;
  if (role !== undefined) patch.role = role;
  if (status !== undefined) patch.status = status;

  const { data, error } = await supabaseAdmin.from('users').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return json({ employee: toPublicUser(data) });
}

async function handleDelete(id: string) {
  const { error, count } = await supabaseAdmin.from('users').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  if (!count) return json({ error: 'משתמש לא נמצא' }, 404);
  return new Response(null, { status: 204, headers: corsHeaders });
}

async function handleInvite(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, phone, department, role } = body;
  if (!name || !String(name).trim()) return json({ error: 'נדרש שם' }, 400);
  if (!PHONE_RE.test(String(phone || '').trim())) return json({ error: 'מספר טלפון לא תקין' }, 400);

  const normalizedPhone = String(phone).trim();
  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('phone', normalizedPhone).maybeSingle();
  if (existing) return json({ error: 'כבר קיים משתמש עם המספר הזה' }, 409);

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      phone: normalizedPhone, username: String(name).trim(), department: department || '',
      role: role || 'employee', status: 'invited', password_hash: null,
    })
    .select()
    .single();
  if (error) throw error;

  return json({ employee: toPublicUser(data) }, 201);
}
