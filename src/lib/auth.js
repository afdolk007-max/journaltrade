'use client';

const SESSION_AUTH_KEY = 'dexornit_session_active';
const SESSION_ACTIVITY_KEY = 'dexornit_last_activity';
const PIN_KEY = 'dexornit_user_pin_hash';
const LEGACY_PIN_KEY = 'dexornit_user_pin';
const PIN_SALT = 'dexornit_journal_security_salt_2026';
const DEFAULT_PIN = '123456';

// 1 Hour Inactivity Timeout (in milliseconds)
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 3600000 ms

/**
 * Hash PIN using SHA-256 with salt
 */
export async function hashPin(pin) {
  if (!pin) return '';
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const enc = new TextEncoder().encode(pin + PIN_SALT);
      const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      console.warn('Crypto subtle failed, using standard hash:', e);
    }
  }
  // Simple fallback hash
  let h = 0;
  const str = pin + PIN_SALT;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return `hash_${h}`;
}

export async function setStoredPin(newPin) {
  if (typeof window === 'undefined') return false;
  if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    return false;
  }
  const hashed = await hashPin(newPin);
  localStorage.setItem(PIN_KEY, hashed);
  localStorage.removeItem(LEGACY_PIN_KEY); // Clean up legacy plaintext
  return true;
}

/**
 * Record user activity timestamp
 */
export function touchSessionActivity() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
}

/**
 * Check if the current session is valid and not expired (> 1 hour inactivity)
 */
export function checkIsAuthenticated() {
  if (typeof window === 'undefined') return false;
  
  const isSessionActive = sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
  if (!isSessionActive) return false;

  const lastActivity = Number(sessionStorage.getItem(SESSION_ACTIVITY_KEY) || 0);
  const now = Date.now();

  // If last activity is missing or expired beyond 1 hour
  if (!lastActivity || (now - lastActivity > INACTIVITY_TIMEOUT_MS)) {
    // Session expired
    clearSession();
    return false;
  }

  return true;
}

/**
 * Log in with 6-digit PIN (Session-bound, isolated per browser/tab)
 */
export async function loginWithPin(inputPin) {
  if (typeof window === 'undefined' || !inputPin) return false;
  
  const storedHash = localStorage.getItem(PIN_KEY);
  const legacyPin = localStorage.getItem(LEGACY_PIN_KEY);

  let isValid = false;

  if (storedHash) {
    const inputHash = await hashPin(inputPin);
    isValid = inputHash === storedHash;
  } else if (legacyPin) {
    // Transparently upgrade legacy plaintext PIN to SHA-256 hash
    isValid = inputPin === legacyPin;
    if (isValid) {
      await setStoredPin(legacyPin);
    }
  } else {
    // Default PIN: 123456
    const defaultHash = await hashPin(DEFAULT_PIN);
    const inputHash = await hashPin(inputPin);
    isValid = inputHash === defaultHash;
    if (isValid) {
      localStorage.setItem(PIN_KEY, defaultHash);
    }
  }

  if (isValid) {
    sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
    return true;
  }
  return false;
}

/**
 * Clear session data
 */
export function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_AUTH_KEY);
  sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
  localStorage.removeItem('dexornit_authenticated'); // clean any legacy key
}

/**
 * Lock/Logout and redirect to login page
 */
export function logout(reason = '') {
  if (typeof window === 'undefined') return;
  clearSession();
  const url = reason ? `/login?reason=${encodeURIComponent(reason)}` : '/login';
  window.location.href = url;
}
