import { useCallback, useEffect, useState } from 'react';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(MOTION_QUERY).matches
      : false
  );

  useEffect(() => {
    const mql = window.matchMedia(MOTION_QUERY);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

export function useGsapContext() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reduced]);

  const shouldAnimate = useCallback(() => !reduced, [reduced]);
  const duration = useCallback(
    (ms: number) => (reduced ? 0 : ms),
    [reduced]
  );

  return { reduced, shouldAnimate, duration };
}

/* ─── useGsapParallax — subtle scroll-driven parallax ─── */
export function useGsapParallax(selector: string, speed = 0.15) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let rafId = 0;
    let ticking = false;

    function onScroll() {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          const elements = document.querySelectorAll(selector);
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          elements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const offset = (scrollY - rect.top) * speed;
            (el as HTMLElement).style.transform = `translateY(${offset}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [selector, speed, reduced]);
}
