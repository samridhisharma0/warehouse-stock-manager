import { useCallback, useMemo } from 'react';
import { ParticlesProvider, Particles } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';

export function ParticlesBg() {
  const init = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const options = useMemo(
    () => ({
      fullScreen: false,
      background: { color: 'transparent' },
      fpsLimit: 60,
      particles: {
        number: { value: 45, density: { enable: true, area: 800 } },
        color: { value: '#3b82f6' },
        opacity: { value: { min: 0.08, max: 0.22 } },
        size: { value: { min: 0.5, max: 2.5 } },
        move: {
          enable: true,
          speed: 0.4,
          direction: 'none' as const,
          outModes: { default: 'out' as const },
        },
        links: {
          enable: true,
          distance: 140,
          color: '#3b82f6',
          opacity: 0.07,
          width: 1,
        },
      },
      detectRetina: true,
    }),
    [],
  );

  return (
    <ParticlesProvider init={init}>
      <Particles
        id="login-particles"
        options={options}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    </ParticlesProvider>
  );
}
