import { useCallback, useEffect, useRef, useState } from 'react';

const LERP = 0.15;

export function CustomCursor() {
  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const rippleContainerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const rafId = useRef(0);

  const animate = useCallback(() => {
    pos.current.x += (target.current.x - pos.current.x) * LERP;
    pos.current.y += (target.current.y - pos.current.y) * LERP;

    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${target.current.x}px, ${target.current.y}px) translate(-50%, -50%)`;
    }
    if (outerRef.current) {
      outerRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%) scale(${pressed ? 0.85 : hovering ? 1.4 : 1})`;
    }

    rafId.current = requestAnimationFrame(animate);
  }, [hovering, pressed]);

  useEffect(() => {
    const isTouchDevice = matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 1024px)').matches;
    if (isTouchDevice) return;

    const onMouseMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    const onMouseDown = (e: MouseEvent) => {
      setPressed(true);
      spawnRipple(e.clientX, e.clientY);
    };

    const onMouseUp = () => setPressed(false);

    const onMouseOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('a, button, [role="button"], input, select, textarea, label, .nav-link, .pill, .metric, .row-actions, [data-cursor-hover]')) {
        setHovering(true);
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('a, button, [role="button"], input, select, textarea, label, .nav-link, .pill, .metric, .row-actions, [data-cursor-hover]')) {
        setHovering(false);
      }
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseover', onMouseOver, { passive: true });
    document.addEventListener('mouseout', onMouseOut, { passive: true });
    document.documentElement.classList.add('has-custom-cursor');

    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.documentElement.classList.remove('has-custom-cursor');
      cancelAnimationFrame(rafId.current);
    };
  }, [animate]);

  function spawnRipple(x: number, y: number) {
    const container = rippleContainerRef.current;
    if (!container) return;

    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    container.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove());
  }

  return (
    <>
      <div className="cursor-dot" ref={innerRef} />
      <div
        className={`cursor-ring${hovering ? ' cursor-ring--hover' : ''}${pressed ? ' cursor-ring--press' : ''}`}
        ref={outerRef}
      />
      <div className="cursor-ripple-container" ref={rippleContainerRef} />
    </>
  );
}
