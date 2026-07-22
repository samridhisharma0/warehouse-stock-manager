import { useMemo } from 'react';
import Lottie from 'lottie-react';
import emptyAnimation from '../data/empty-animation.json';

interface Props {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: Props) {
  const animationData = useMemo(() => emptyAnimation, []);

  return (
    <div className="empty">
      <Lottie
        animationData={animationData}
        loop
        autoplay
        style={{ width: 120, height: 120, margin: '0 auto 16px' }}
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
      <div className="big">{title}</div>
      {subtitle && <div style={{ marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}
