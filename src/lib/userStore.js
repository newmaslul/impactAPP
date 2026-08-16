// Local, no-backend user store. There is no server yet, so "the system"
// this checks against is just this browser's localStorage — good enough to
// demo "log in, or register if you're not found," but it won't recognize
// you on a different device or browser. Accounts are keyed by phone number
// (the login screen's identifier) rather than email. Passwords are
// intentionally never stored, even locally: login only ever checks that an
// account with that phone number exists, matching how the rest of the
// app's auth is a client-side demo (see Splash.jsx).

const USERS_KEY = 'maslul:users';
const CURRENT_USER_KEY = 'maslul:currentUserPhone';
const BIOMETRIC_USER_KEY = 'maslul:biometricUserPhone';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private-browsing or storage disabled — nothing persists this session */
  }
}

export function getUsers() {
  return readJSON(USERS_KEY, []);
}

export function findUserByPhone(phone) {
  const normalized = phone.trim();
  return getUsers().find((u) => u.phone === normalized) ?? null;
}

export function saveUser(user) {
  const normalized = { ...user, phone: user.phone.trim() };
  const users = getUsers().filter((u) => u.phone !== normalized.phone);
  writeJSON(USERS_KEY, [...users, normalized]);
  return normalized;
}

export function setCurrentUserPhone(phone) {
  localStorage.setItem(CURRENT_USER_KEY, phone.trim());
}

export function getCurrentUser() {
  const phone = localStorage.getItem(CURRENT_USER_KEY);
  return phone ? findUserByPhone(phone) : null;
}

export function setBiometricUserPhone(phone) {
  localStorage.setItem(BIOMETRIC_USER_KEY, phone.trim());
}

export function getBiometricUserPhone() {
  return localStorage.getItem(BIOMETRIC_USER_KEY);
}
