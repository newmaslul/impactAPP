// Thin client for the real backend in /server. Falls back to
// http://localhost:4000 for local dev; set VITE_API_URL at build time to
// point the deployed frontend at a hosted backend.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
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
  const headers = { 'Content-Type': 'application/json' };
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
    throw new Error('לא הצלחנו להתחבר לשרת. ודאו שהשרת רץ ונסו שוב.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'שגיאה לא צפויה');
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (phone, password) => request('/api/auth/login', { method: 'POST', body: { phone, password } }),
  biometricLogin: (phone) => request('/api/auth/biometric-login', { method: 'POST', body: { phone } }),
  forgotPassword: (phone) => request('/api/auth/forgot-password', { method: 'POST', body: { phone } }),
  me: () => request('/api/auth/me', { auth: true }),

  adminListEmployees: () => request('/api/admin/employees'),
  adminUpdateEmployee: (id, payload) => request(`/api/admin/employees/${id}`, { method: 'PATCH', body: payload }),
  adminDeleteEmployee: (id) => request(`/api/admin/employees/${id}`, { method: 'DELETE' }),
  adminInviteEmployee: (payload) => request('/api/admin/employees/invite', { method: 'POST', body: payload }),
};
