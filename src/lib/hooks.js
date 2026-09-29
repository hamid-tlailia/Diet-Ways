import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

export const isDayHour = (h) => h >= 6 && h < 18;

// Resolves 'auto' against the clock and re-checks every minute.
export function useResolvedTheme() {
  const mode = useStore((s) => s.themeMode);
  const now = useNow(60_000);
  if (mode !== 'auto') return mode;
  return isDayHour(new Date(now).getHours()) ? 'day' : 'night';
}
