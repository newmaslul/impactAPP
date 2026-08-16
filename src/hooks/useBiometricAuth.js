import { useCallback, useEffect, useState } from 'react';

// Real WebAuthn platform-authenticator flow — this genuinely invokes the
// phone's Face ID / fingerprint / Windows Hello prompt. There is no backend
// yet, so nothing is verified server-side: the first successful ceremony
// registers a passkey and its id is kept in localStorage; every later
// "quick login" re-verifies against that same passkey. The browser still
// refuses to succeed without real biometric verification, so this isn't a
// fake button — it just isn't tied to an account system yet.

const CRED_ID_KEY = 'maslul:webauthn:credId';
const RP_NAME = 'מסלול IMPACT';

function bufToBase64url(buf) {
  let str = '';
  new Uint8Array(buf).forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuf(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export function useBiometricAuth() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supported =
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
      if (!supported) return;
      try {
        const ok = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!cancelled) setAvailable(ok);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  const hasSavedCredential = typeof window !== 'undefined' && !!localStorage.getItem(CRED_ID_KEY);

  const authenticate = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const savedId = localStorage.getItem(CRED_ID_KEY);
      if (savedId) {
        await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ id: base64urlToBuf(savedId), type: 'public-key' }],
            userVerification: 'required',
            timeout: 60000,
          },
        });
      } else {
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: RP_NAME },
            user: {
              id: crypto.getRandomValues(new Uint8Array(16)),
              name: 'maslul-user',
              displayName: 'משתמש מסלול',
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' },
            ],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
            timeout: 60000,
          },
        });
        localStorage.setItem(CRED_ID_KEY, bufToBase64url(cred.rawId));
      }
      setBusy(false);
      return true;
    } catch {
      setBusy(false);
      setError('האימות הביומטרי נכשל או בוטל.');
      return false;
    }
  }, []);

  return { available, hasSavedCredential, busy, error, authenticate };
}
