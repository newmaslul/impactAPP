// Thin client for the Supabase Edge Functions backend (supabase/functions/).
// BASE_URL defaults to the deployed project; ANON_KEY is the
// publishable/anon key — safe to ship in the frontend build, required by
// Supabase's edge gateway on every request via the `apikey` header (RLS
// on the actual tables is what keeps data safe, not this key).

const BASE_URL = import.meta.env.VITE_API_URL || 'https://qhkeqzulojmuguwzkknx.supabase.co/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fz3zetvaDYlrDblJZTMzuQ_XqpTysYG';
const TOKEN_KEY = 'maslul:token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json', apikey: ANON_KEY };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('לא הצלחנו להתחבר לשרת. נסו שוב.');
  }

  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'שגיאה לא צפויה');
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (phone, password) => request('/auth/login', { method: 'POST', body: { phone, password } }),
  biometricLogin: (phone) => request('/auth/biometric-login', { method: 'POST', body: { phone } }),
  forgotPassword: (phone) => request('/auth/forgot-password', { method: 'POST', body: { phone } }),
  me: () => request('/auth/me', { auth: true }),

  adminListEmployees: () => request('/admin-employees'),
  adminUpdateEmployee: (id, payload) => request(`/admin-employees/${id}`, { method: 'PATCH', body: payload }),
  adminDeleteEmployee: (id) => request(`/admin-employees/${id}`, { method: 'DELETE' }),
  adminInviteEmployee: (payload) => request('/admin-employees/invite', { method: 'POST', body: payload }),

  activitySync: (payload) => request('/activity/sync', { method: 'POST', body: payload, auth: true }),
  activityToday: () => request('/activity/today', { auth: true }),
  activityHistory: (days = 30) => request(`/activity/history?days=${days}`, { auth: true }),
  activitySummary: () => request('/activity/summary', { auth: true }),
  activityConfig: () => request('/activity/config'),
  updateActivityConfig: (payload) => request('/activity/config', { method: 'PUT', body: payload }),
  deleteHealthData: (source) => request(`/activity/health-data?source=${encodeURIComponent(source)}`, { method: 'DELETE', auth: true }),

  adminListSchools: () => request('/admin-schools'),
  adminCreateSchool: (payload) => request('/admin-schools', { method: 'POST', body: payload }),
  adminDeleteSchool: (id) => request(`/admin-schools/${id}`, { method: 'DELETE' }),
  adminListClasses: () => request('/admin-classes'),
  adminCreateClass: (payload) => request('/admin-classes', { method: 'POST', body: payload }),
  adminDeleteClass: (id) => request(`/admin-classes/${id}`, { method: 'DELETE' }),

  listContent: () => request('/content', { auth: true }),
  completeContent: (id) => request(`/content/${id}/complete`, { method: 'POST', auth: true }),

  adminListContent: () => request('/admin-content'),
  adminCreateContent: (payload) => request('/admin-content', { method: 'POST', body: payload }),
  adminUpdateContent: (id, payload) => request(`/admin-content/${id}`, { method: 'PATCH', body: payload }),
  adminDeleteContent: (id) => request(`/admin-content/${id}`, { method: 'DELETE' }),

  syncSleepSamples: (samples) => request('/sleep/samples', { method: 'POST', body: { samples }, auth: true }),
  sleepToday: () => request('/sleep/today', { auth: true }),
  sleepHistory: (days = 30) => request(`/sleep/history?days=${days}`, { auth: true }),
  sleepSummary: () => request('/sleep/summary', { auth: true }),
  sleepConfig: () => request('/sleep/config'),
  updateSleepConfig: (payload) => request('/sleep/config', { method: 'PUT', body: payload }),
};
