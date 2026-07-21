import { useEffect, useRef, useState } from 'react';

export function useAnimatedValue(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const raf = useRef<number>(0);
  const startTime = useRef<number>(0);
  const from = useRef(target);

  useEffect(() => {
    if (target === display) return;
    from.current = display;
    startTime.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from.current + (target - from.current) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

export function useAnimatedPct(target: number, duration = 800) {
  const [display, setDisplay] = useState(target);
  const raf = useRef<number>(0);
  const startTime = useRef<number>(0);
  const from = useRef(target);

  useEffect(() => {
    if (Math.abs(target - display) < 0.5) return;
    from.current = display;
    startTime.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from.current + (target - from.current) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return Math.round(display * 10) / 10;
}
