// Which phone number this device's local WebAuthn passkey (see
// useBiometricAuth.js) belongs to. This is inherently device-local
// information — not account data — so unlike the rest of auth it stays in
// localStorage rather than the backend.
const KEY = 'maslul:biometricPhone';

export function getBiometricPhone() {
  return localStorage.getItem(KEY);
}

export function setBiometricPhone(phone) {
  localStorage.setItem(KEY, phone.trim());
}
