import { useEffect, useState } from 'react';

export function useMounted(delay = 0) {
  const [mounted, setMounted] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return mounted;
}
