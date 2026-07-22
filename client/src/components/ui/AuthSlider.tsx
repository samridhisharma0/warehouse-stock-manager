import { ImageSlider, SlideContent, type Slide } from './ImageSlider';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/* ═══════════════════════════════════════════════════════
   AuthSlider — visual carousel for auth aside panels
   ═══════════════════════════════════════════════════════ */

const loginSlides: Slide[] = [
  {
    id: 'track',
    content: (
      <SlideContent
        icon="▦"
        title="Track every unit"
        description="Real-time inventory with health indicators, low-stock alerts, and zero oversells."
        gradient="linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.06) 100%)"
      />
    ),
  },
  {
    id: 'fulfil',
    content: (
      <SlideContent
        icon="⊞"
        title="Fulfil with confidence"
        description="Atomic order processing ensures stock is never oversold. Partial fills backorder automatically."
        gradient="linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.06) 100%)"
      />
    ),
  },
  {
    id: 'ship',
    content: (
      <SlideContent
        icon="◈"
        title="Ship anywhere"
        description="Zone-based shipping calculator with volumetric weight, vehicle routing, and cost breakdown."
        gradient="linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(239,68,68,0.06) 100%)"
      />
    ),
  },
];

const registerSlides: Slide[] = [
  {
    id: 'secure',
    content: (
      <SlideContent
        icon="🔒"
        title="Secure by default"
        description="JWT authentication with bcrypt-hashed passwords. Your credentials are never stored in plaintext."
        gradient="linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(236,72,153,0.06) 100%)"
      />
    ),
  },
  {
    id: 'instant',
    content: (
      <SlideContent
        icon="⚡"
        title="Up in seconds"
        description="Create an account, add your first product, and start tracking inventory immediately."
        gradient="linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(16,185,129,0.06) 100%)"
      />
    ),
  },
  {
    id: 'grow',
    content: (
      <SlideContent
        icon="📈"
        title="Scale with ease"
        description="From a handful of SKUs to thousands — the engine stays fast and the data stays accurate."
        gradient="linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(139,92,246,0.06) 100%)"
      />
    ),
  },
];

interface AuthSliderProps {
  mode: 'login' | 'register';
}

export function AuthSlider({ mode }: AuthSliderProps) {
  const reduced = useReducedMotion();
  const slides = mode === 'login' ? loginSlides : registerSlides;

  return (
    <div className="auth-slider">
      <ImageSlider
        slides={slides}
        interval={reduced ? 999999 : 5000}
        mode="slide"
        showDots
        className="auth-slider__carousel"
      />
    </div>
  );
}
