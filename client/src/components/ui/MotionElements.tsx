import { useEffect, useRef, type ReactNode } from 'react';
import { animate } from 'animejs';

/* ═══════════════════════════════════════════════════════
   Animated Counter — anime.js powered number count-up
   ═══════════════════════════════════════════════════════ */
interface CounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 800, className }: CounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    const from = prev.current;
    const to = value;
    prev.current = to;

    const obj = { val: from };
    const anim = animate(obj, {
      val: to,
      duration,
      ease: 'easeOutExpo',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = String(Math.round(obj.val));
      },
    });

    return () => { anim.revert(); };
  }, [value, duration]);

  return <div ref={ref} className={className}>0</div>;
}

/* ═══════════════════════════════════════════════════════
   Loaders — uiverse.io aesthetic, CSS-only
   ═══════════════════════════════════════════════════════ */

export function PulseRingLoader({ size = 40 }: { size?: number }) {
  return (
    <div className="loader-pulse-ring" style={{ width: size, height: size }}>
      <div className="loader-pulse-ring__ring loader-pulse-ring__ring--1" />
      <div className="loader-pulse-ring__ring loader-pulse-ring__ring--2" />
      <div className="loader-pulse-ring__ring loader-pulse-ring__ring--3" />
    </div>
  );
}

export function WaveBarLoader() {
  return (
    <div className="loader-wave">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="loader-wave__bar" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

export function DotBounceLoader() {
  return (
    <div className="loader-dots">
      {[0, 1, 2].map((i) => (
        <div key={i} className="loader-dots__dot" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export function OrbitLoader({ size = 40 }: { size?: number }) {
  return (
    <div className="loader-orbit" style={{ width: size, height: size }}>
      <div className="loader-orbit__core" />
      <div className="loader-orbit__ring loader-orbit__ring--1" />
      <div className="loader-orbit__ring loader-orbit__ring--2" />
    </div>
  );
}

export function GlitchLoader() {
  return (
    <div className="loader-glitch">
      <div className="loader-glitch__bar" />
      <div className="loader-glitch__bar" />
      <div className="loader-glitch__bar" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GlowCard — hover-activated glow border
   ═══════════════════════════════════════════════════════ */
interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({ children, className, glowColor = 'var(--accent)' }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--glow-x', `${x}px`);
    card.style.setProperty('--glow-y', `${y}px`);
  }

  return (
    <div
      ref={cardRef}
      className={`glow-card ${className ?? ''}`}
      onMouseMove={onMouseMove}
      style={{ '--glow-color': glowColor } as React.CSSProperties}
    >
      <div className="glow-card__spotlight" />
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AnimatedText — character-by-character reveal
   ═══════════════════════════════════════════════════════ */
interface AnimatedTextProps {
  text: string;
  delay?: number;
  staggerDelay?: number;
  className?: string;
}

export function AnimatedText({ text, delay = 0, staggerDelay = 0.03, className }: AnimatedTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chars = ref.current.querySelectorAll('.at-char');
    animate(chars, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 400,
      delay: delay * 1000,
      ease: 'easeOutExpo',
      stagger: staggerDelay * 1000,
    });
  }, [text, delay, staggerDelay]);

  return (
    <div ref={ref} className={`animated-text ${className ?? ''}`}>
      {text.split('').map((char, i) => (
        <span key={i} className="at-char" style={{ display: 'inline-block' }}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   StaggerReveal — anime.js staggered entrance
   ═══════════════════════════════════════════════════════ */
interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}

export function StaggerReveal({ children, className, delay = 100, stagger = 50 }: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const items = ref.current.querySelectorAll('.stagger-item');
    animate(items, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay,
      ease: 'easeOutExpo',
      stagger,
    });
  }, [delay, stagger]);

  return (
    <div ref={ref} className={`stagger-reveal ${className ?? ''}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MagneticButton — button that attracts toward cursor
   ═══════════════════════════════════════════════════════ */
interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  strength?: number;
  [key: string]: any;
}

export function MagneticButton({ children, className, onClick, strength = 0.3, ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)';
  }

  return (
    <button
      ref={ref}
      className={`btn magnetic-btn ${className ?? ''}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   TiltCard — 3D perspective tilt on hover
   ═══════════════════════════════════════════════════════ */
interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}

export function TiltCard({ children, className, maxTilt = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * maxTilt}deg) rotateX(${-y * maxTilt}deg) scale3d(1.02, 1.02, 1.02)`;
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale3d(1, 1, 1)';
  }

  return (
    <div
      ref={ref}
      className={`tilt-card ${className ?? ''}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RippleButton — click ripple effect
   ═══════════════════════════════════════════════════════ */
interface RippleButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  [key: string]: any;
}

export function RippleButton({ children, className, onClick, ...props }: RippleButtonProps) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple-effect';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    onClick?.(e);
  }

  return (
    <button className={`btn ripple-btn ${className ?? ''}`} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   NumberTicker — anime.js smooth number roll
   ═══════════════════════════════════════════════════════ */
interface TickerProps {
  value: number;
  duration?: number;
  className?: string;
}

export function NumberTicker({ value, duration = 1200, className }: TickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    const from = prev.current;
    const to = value;
    prev.current = to;

    const digits = String(Math.abs(Math.round(to))).length;
    const padLen = Math.max(digits, 1);

    const obj = { val: from };
    const anim = animate(obj, {
      val: to,
      duration,
      ease: 'easeOutExpo',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = String(Math.round(obj.val)).padStart(padLen, '0');
        }
      },
    });

    return () => { anim.revert(); };
  }, [value, duration]);

  return <div ref={ref} className={`number-ticker ${className ?? ''}`}>0</div>;
}
