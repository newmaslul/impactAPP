// Ported from server/routes/auth.js. One Edge Function handling all auth
// sub-routes (register/login/biometric-login/forgot-password/me), routed
// internally by path suffix — keeps deploy count down vs. one function
// per route. Password hashing uses bcryptjs directly here (trusted
// server context), same library and behavior as the Express version.

import bcrypt from 'npm:bcryptjs@2';
import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { signToken, getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import { toPublicUser } from '../_shared/serialize.ts';

const PHONE_RE = /^0\d{8,9}$/;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const path = new URL(req.url).pathname;

  try {
    if (path.endsWith('/register') && req.method === 'POST') return await handleRegister(req);
    if (path.endsWith('/login') && req.method === 'POST') return await handleLogin(req);
    if (path.endsWith('/biometric-login') && req.method === 'POST') return await handleBiometricLogin(req);
    if (path.endsWith('/forgot-password') && req.method === 'POST') return await handleForgotPassword(req);
    if (path.endsWith('/me') && req.method === 'GET') return await handleMe(req);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleRegister(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { phone, username, department, password, biometricEnabled, role, classId } = body;
  const accountRole = role === 'student' ? 'student' : 'employee';

  if (!PHONE_RE.test(String(phone || '').trim())) return json({ error: 'מספר טלפון לא תקין' }, 400);
  if (!username || !String(username).trim()) return json({ error: 'נדרש שם משתמש' }, 400);
  if (!password || password.length < 6) return json({ error: 'הסיסמה צריכה להכיל לפחות 6 תווים' }, 400);
  if (accountRole === 'student' && !classId) return json({ error: 'נדרשת כיתה' }, 400);

  const normalizedPhone = String(phone).trim();
  const { data: existing } = await supabaseAdmin.from('users').select('*').eq('phone', normalizedPhone).maybeSingle();

  // An admin-invited row has no password yet — registering with that
  // phone completes/activates the same account instead of failing as a
  // duplicate.
  if (existing && existing.password_hash) {
    return json({ error: 'המספר הזה כבר רשום — נסו להתחבר במקום' }, 409);
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const departmentValue = accountRole === 'student' ? '' : (department || '');

  let user;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        username: String(username).trim(), department: departmentValue, role: accountRole,
        class_id: classId ?? null, password_hash: passwordHash, biometric_enabled: !!biometricEnabled, status: 'active',
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    user = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        phone: normalizedPhone, username: String(username).trim(), department: departmentValue, role: accountRole,
        class_id: classId ?? null, password_hash: passwordHash, biometric_enabled: !!biometricEnabled,
      })
      .select()
      .single();
    if (error) throw error;
    user = data;
  }

  return json({ token: signToken(user), user: toPublicUser(user) }, 201);
}

async function handleLogin(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { phone, password } = body;
  if (!PHONE_RE.test(String(phone || '').trim())) return json({ error: 'מספר טלפון לא תקין' }, 400);

  const { data: user } = await supabaseAdmin.from('users').select('*').eq('phone', String(phone).trim()).maybeSingle();
  if (!user || !user.password_hash || !bcrypt.compareSync(password || '', user.password_hash)) {
    return json({ error: 'מספר טלפון או סיסמה שגויים' }, 401);
  }

  return json({ token: signToken(user), user: toPublicUser(user) });
}

// Same documented simplification as the Express version: trusts that the
// client already completed a real local WebAuthn biometric check (see
// src/hooks/useBiometricAuth.js) and just issues a session for that
// phone — nothing is verified server-side against a stored public key.
async function handleBiometricLogin(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { phone } = body;
  const { data: user } = await supabaseAdmin.from('users').select('*').eq('phone', String(phone || '').trim()).maybeSingle();
  if (!user) return json({ error: 'משתמש לא נמצא' }, 404);
  return json({ token: signToken(user), user: toPublicUser(user) });
}

async function handleForgotPassword(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { phone } = body;
  if (!PHONE_RE.test(String(phone || '').trim())) return json({ error: 'מספר טלפון לא תקין' }, 400);
  // Security-conscious: always say the same thing whether or not the
  // number is registered. No SMS provider wired up — nothing is sent.
  return json({ ok: true });
}

async function handleMe(req: Request) {
  const userId = getUserIdFromRequest(req);
  const { data: user, error } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!user) return json({ error: 'משתמש לא נמצא' }, 404);
  return json({ user: toPublicUser(user) });
}
