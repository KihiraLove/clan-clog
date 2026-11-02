/** Preserve only the bounded deadline through reloads; never save credentials. */
import { useEffect, useState } from 'react';
const storageKey = 'clog:admin-login-cooldown';
function savedDeadline() {
  try {
    const value = sessionStorage.getItem(storageKey);
    const deadline = value && /^\d{13}$/u.test(value) ? Number(value) : 0;
    const remaining = deadline - Date.now();
    return remaining > 0 && remaining <= 60000 ? deadline : 0;
  } catch {
    return 0;
  }
}
export function useLoginCooldown() {
  const [until, setUntil] = useState(savedDeadline);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!until) return;
    const update = () => {
      const time = Date.now();
      setNow(time);
      if (time >= until) {
        setUntil(0);
        try {
          if (sessionStorage.getItem(storageKey) === String(until))
            sessionStorage.removeItem(storageKey);
        } catch {
          /* Storage may be unavailable. */
        }
      }
    };
    const timer = window.setInterval(update, 250);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, [until]);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  const start = (seconds: number) => {
    const deadline = Date.now() + Math.max(1, Math.min(60, seconds)) * 1000;
    setNow(Date.now());
    setUntil(deadline);
    try {
      sessionStorage.setItem(storageKey, String(deadline));
    } catch {
      /* Local memory still enforces the known delay. */
    }
  };
  return { seconds, start };
}
