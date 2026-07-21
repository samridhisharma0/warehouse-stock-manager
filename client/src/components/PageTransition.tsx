import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(2px)' },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.16, 1, 0.3, 1] as const,
  duration: 0.4,
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
