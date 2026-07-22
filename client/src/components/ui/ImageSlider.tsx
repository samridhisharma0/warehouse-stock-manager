import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/* ═══════════════════════════════════════════════════════
   Slide transition variants
   ═══════════════════════════════════════════════════════ */
type TransitionMode = 'fade' | 'slide' | 'zoom';

const transitionVariants: Record<TransitionMode, { enter: Record<string, number>; exit: Record<string, number> }> = {
  fade: {
    enter: { opacity: 0 },
    exit: { opacity: 0 },
  },
  slide: {
    enter: { opacity: 0, x: 60 },
    exit: { opacity: 0, x: -60 },
  },
  zoom: {
    enter: { opacity: 0, scale: 1.08 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

/* ═══════════════════════════════════════════════════════
   ImageSlider — auto-playing carousel with dots
   ═══════════════════════════════════════════════════════ */
export interface Slide {
  id: string;
  content: ReactNode;
}

interface ImageSliderProps {
  slides: Slide[];
  interval?: number;
  mode?: TransitionMode;
  showDots?: boolean;
  pauseOnHover?: boolean;
  className?: string;
}

export function ImageSlider({
  slides,
  interval = 5000,
  mode = 'fade',
  showDots = true,
  pauseOnHover = true,
  className,
}: ImageSliderProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const goTo = useCallback((i: number) => {
    setCurrent(i);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (reduced || paused || slides.length <= 1) return;
    timerRef.current = setTimeout(next, interval);
    return () => clearTimeout(timerRef.current);
  }, [current, next, paused, reduced, interval, slides.length]);

  const variants = transitionVariants[mode];

  return (
    <div
      className={`image-slider ${className ?? ''}`}
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
      role="region"
      aria-label="Image carousel"
      aria-roledescription="carousel"
    >
      <div className="image-slider__viewport">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            className="image-slider__slide"
            initial={variants.enter}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={variants.exit}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${current + 1} of ${slides.length}`}
          >
            {slides[current].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {showDots && slides.length > 1 && (
        <div className="image-slider__dots" role="tablist">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              className={`image-slider__dot ${i === current ? 'image-slider__dot--active' : ''}`}
              onClick={() => goTo(i)}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!reduced && slides.length > 1 && (
        <div className="image-slider__progress">
          <motion.div
            className="image-slider__progress-bar"
            key={`progress-${current}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: paused ? 0 : interval / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SlideContent — predefined slide layouts
   ═══════════════════════════════════════════════════════ */
interface SlideContentProps {
  icon: string;
  title: string;
  description: string;
  stat?: { value: string; label: string };
  gradient?: string;
}

export function SlideContent({ icon, title, description, stat, gradient }: SlideContentProps) {
  return (
    <div
      className="slide-content"
      style={gradient ? { background: gradient } : undefined}
    >
      <div className="slide-content__icon">{icon}</div>
      <h3 className="slide-content__title">{title}</h3>
      <p className="slide-content__desc">{description}</p>
      {stat && (
        <div className="slide-content__stat">
          <div className="slide-content__stat-value">{stat.value}</div>
          <div className="slide-content__stat-label">{stat.label}</div>
        </div>
      )}
    </div>
  );
}
