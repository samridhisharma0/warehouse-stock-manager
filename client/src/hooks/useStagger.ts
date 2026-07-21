import { useEffect, useState } from 'react';

export function useStagger<T>(items: T[], delayPer = 60): boolean[] {
  const [visible, setVisible] = useState<boolean[]>(() => items.map(() => false));

  useEffect(() => {
    setVisible(items.map(() => false));
    const timers: ReturnType<typeof setTimeout>[] = [];
    items.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisible((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * delayPer));
    });
    return () => timers.forEach(clearTimeout);
  }, [items, delayPer]);

  return visible;
}
