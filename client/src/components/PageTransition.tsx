import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════
   Route-aware page transitions
   ═══════════════════════════════════════════════════════ */

type TransitionDirection = 'up' | 'down' | 'left' | 'right' | 'fade';

const directionVariants: Record<TransitionDirection, Variants> = {
  up: {
    initial: { opacity: 0, y: 40, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -20, filter: 'blur(2px)' },
  },
  down: {
    initial: { opacity: 0, y: -40, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: 20, filter: 'blur(2px)' },
  },
  left: {
    initial: { opacity: 0, x: 60, filter: 'blur(4px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, x: -60, filter: 'blur(2px)' },
  },
  right: {
    initial: { opacity: 0, x: -60, filter: 'blur(4px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, x: 60, filter: 'blur(2px)' },
  },
  fade: {
    initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 1.01, filter: 'blur(2px)' },
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.16, 1, 0.3, 1] as const,
  duration: 0.45,
};

interface PageTransitionProps {
  children: ReactNode;
  direction?: TransitionDirection;
}

export function PageTransition({ children, direction = 'up' }: PageTransitionProps) {
  const variants = directionVariants[direction];

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Route direction map — defines transition direction per route
   ═══════════════════════════════════════════════════════ */
export const routeTransitionMap: Record<string, TransitionDirection> = {
  '/dashboard': 'up',
  '/products': 'left',
  '/orders': 'right',
  '/shipping': 'down',
  '/login': 'fade',
  '/register': 'fade',
};

export function getRouteDirection(pathname: string): TransitionDirection {
  return routeTransitionMap[pathname] ?? 'up';
}
