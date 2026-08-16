// Local, no-backend user store. There is no server yet, so "the system"
// this checks against is just this browser's localStorage — good enough to
// demo "log in, or register if you're not found," but it won't recognize
// you on a different device or browser. Passwords are intentionally never
// stored, even locally: login only ever checks that an account with that
// email exists, matching how the rest of the app's auth is a client-side
// demo (see Splash.jsx).

const USERS_KEY = 'maslul:users';
const CURRENT_USER_KEY = 'maslul:currentUserEmail';
const BIOMETRIC_USER_KEY = 'maslul:biometricUserEmail';

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

export function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return getUsers().find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export function saveUser(user) {
  const normalized = { ...user, email: user.email.trim().toLowerCase() };
  const users = getUsers().filter((u) => u.email.toLowerCase() !== normalized.email);
  writeJSON(USERS_KEY, [...users, normalized]);
  return normalized;
}

export function setCurrentUserEmail(email) {
  localStorage.setItem(CURRENT_USER_KEY, email.trim().toLowerCase());
}

export function getCurrentUser() {
  const email = localStorage.getItem(CURRENT_USER_KEY);
  return email ? findUserByEmail(email) : null;
}

export function setBiometricUserEmail(email) {
  localStorage.setItem(BIOMETRIC_USER_KEY, email.trim().toLowerCase());
}

export function getBiometricUserEmail() {
  return localStorage.getItem(BIOMETRIC_USER_KEY);
}
