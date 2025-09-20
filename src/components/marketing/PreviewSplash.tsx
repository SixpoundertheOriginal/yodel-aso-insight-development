import React from 'react';
import { Button } from '@/components/ui/button';

type Cta = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

export type PreviewSplashProps = {
  title: string;
  subtitle?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  backgroundUrl?: string; // defaults to /brand/splash.png
};

/**
 * Full-bleed splash hero with subtle motion.
 * - Respects prefers-reduced-motion.
 * - Falls back to static image (and <noscript> image).
 */
export const PreviewSplash: React.FC<PreviewSplashProps> = ({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  backgroundUrl = '/brand/splash.png',
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = React.useMemo(() => {
    try {
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);

  // Enhanced motion visuals (Yodel brand): vertical radio-wave fields, orange bokeh glow, subtle sparks, parallax at 45fps cap
  React.useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
    const FPS = 45;
    const FRAME_INTERVAL = 1000 / FPS; // ~22.2ms
    let lastTime = 0;

    // Parallax target from pointer and scroll
    const parallax = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;  // -0.5..0.5
      const dy = (e.clientY - cy) / r.height; // -0.5..0.5
      parallax.x = Math.max(-0.5, Math.min(0.5, dx)) * 12; // px drift
      parallax.y = Math.max(-0.5, Math.min(0.5, dy)) * 8;
    };
    const onScroll = () => {
      parallax.y = (window.scrollY % 200) / 200 * 6; // gentle drift on scroll
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Elements
    type Bokeh = { x: number; y: number; r: number; z: number; vx: number; vy: number; alpha: number };
    type Spark = { x: number; y: number; life: number; vx: number; vy: number };
    type Column = { x: number; phase: number; speed: number; spacing: number };

    let bokeh: Bokeh[] = [];
    let sparks: Spark[] = [];
    let columns: Column[] = [];

    const seed = () => {
      const mobile = isMobile();
      const bokehCount = mobile ? 10 : 20;
      bokeh = Array.from({ length: bokehCount }).map(() => ({
        x: Math.random(),
        y: Math.random(),
        r: (mobile ? 5 : 8) + Math.random() * (mobile ? 8 : 12),
        z: 0.4 + Math.random() * 0.9,
        vx: (Math.random() - 0.5) * 0.015,
        vy: (Math.random() - 0.5) * 0.015,
        alpha: 0.10 + Math.random() * 0.18,
      }));
      // Vertical radio-wave columns
      const colCount = mobile ? 6 : 10;
      const spacing = mobile ? 70 : 90;
      columns = Array.from({ length: colCount }).map((_, i) => ({
        x: (i + 0.5) * spacing,
        phase: Math.random() * Math.PI * 2,
        speed: (mobile ? 0.006 : 0.01) + Math.random() * 0.006,
        spacing,
      }));
      sparks = [];
    };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * DPR);
      canvas.height = Math.floor(height * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawBokeh = (w: number, h: number) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of bokeh) {
        p.x += (p.vx * (0.25 + p.z)) / 1000 * w;
        p.y += (p.vy * (0.25 + p.z)) / 1000 * h;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;

        const gx = p.x * w + parallax.x * (0.3 + p.z * 0.2);
        const gy = p.y * h + parallax.y * (0.3 + p.z * 0.2);
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, p.r * (1 + p.z * 0.7));
        grad.addColorStop(0, `rgba(255, 158, 66, ${p.alpha})`); // #FF9E42 glow
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawRadioFields = (w: number, h: number) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tealCount = isMobile() ? 6 : 10; // Sparse teal highlights
      for (const col of columns) {
        col.phase += col.speed;
        const x = col.x + parallax.x * 0.5;
        // Vertical field: dotted glow pulses
        const steps = isMobile() ? 22 : 36;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const y = t * h;
          const osc = Math.sin((t * Math.PI * 6) + col.phase) * 0.5 + 0.5; // 0..1
          const r = 1.2 + osc * 2.4; // small dots varying
          const alpha = 0.08 + osc * 0.22;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
          grad.addColorStop(0, `rgba(255, 122, 26, ${alpha})`); // #FF7A1A
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, r * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Teal micro-highlights (very sparse)
      for (let i = 0; i < tealCount; i++) {
        const x = (i / tealCount) * w + ((i % 2) * 15);
        const y = (Math.sin((i + Date.now() / 600) * 0.6) * 0.5 + 0.5) * h;
        const r = 1.5;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 10);
        grad.addColorStop(0, 'rgba(33, 230, 193, 0.18)'); // #21E6C1
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawRibbons = (w: number, h: number) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const dots = isMobile() ? 28 : 48;
      for (const r of ribbons) {
        r.phase += r.speed;
        for (let i = 0; i <= dots; i++) {
          const t = i / dots;
          const x = t * w;
          const baseY = r.offsetY * h;
          const y = baseY + Math.sin(t * Math.PI * 2 * r.freq + r.phase) * r.amp + parallax.y * 0.8;
          const radius = 1 + Math.sin(t * Math.PI * 2) * 0.5 + 1.5;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, 10);
          grad.addColorStop(0, `hsla(${r.hue}, 80%, 60%, 0.35)`);
          grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawSparks = (w: number, h: number) => {
      // Spawn occasional spark (warm white / orange)
      const mobile = isMobile();
      if (Math.random() < (mobile ? 0.02 : 0.04) && sparks.length < (mobile ? 4 : 8)) {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        const y = Math.random() * h * 0.8 + h * 0.1;
        const x = side === 'left' ? -10 : w + 10;
        const speed = mobile ? 0.8 : 1.2;
        sparks.push({ x, y, life: 1, vx: side === 'left' ? speed : -speed, vy: (Math.random() - 0.5) * 0.3 });
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.02;
        if (s.life <= 0 || s.x < -20 || s.x > w + 20) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,158,66,0.9)';
        ctx.strokeStyle = 'rgba(255,158,66,0.85)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    };

    const step = (ts: number) => {
      if (ts - lastTime < FRAME_INTERVAL) {
        rafId = requestAnimationFrame(step);
        return;
      }
      lastTime = ts;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // Order: radio fields, bokeh mid, sparks top
      drawRadioFields(width, height);
      drawBokeh(width, height);
      drawSparks(width, height);

      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, [reducedMotion]);

  const CtaButton: React.FC<Cta & { fallbackVariant?: Cta['variant'] }> = ({ label, href, onClick, variant, fallbackVariant }) => (
    href ? (
      <a href={href} aria-label={label}>
        <Button size="lg" variant={variant || fallbackVariant || 'default'}>{label}</Button>
      </a>
    ) : (
      <Button size="lg" variant={variant || fallbackVariant || 'default'} onClick={onClick} aria-label={label}>
        {label}
      </Button>
    )
  );

  return (
    <section className="relative min-h-[60vh] md:min-h-screen overflow-hidden" style={{ backgroundColor: '#0B0F14' }}>
      {/* Background image with gradient overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-no-repeat bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      <div className="absolute inset-0" aria-hidden="true" style={{
        background:
          'linear-gradient(to bottom, rgba(11,15,20,0.92) 0%, rgba(11,15,20,0.88) 50%, rgba(11,15,20,0.94) 100%)'
      }} />

      {/* Motion layer (hidden when reduced motion) */}
      <div className="absolute inset-0 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 container mx-auto px-4 py-16 md:py-28 flex items-center justify-center min-h-[60vh] md:min-h-screen">
        <div className="max-w-3xl text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 md:mt-6 text-zinc-300 text-base md:text-lg leading-relaxed">
              {subtitle}
            </p>
          )}
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            {primaryCta && <CtaButton {...primaryCta} />}
            {secondaryCta && <CtaButton {...secondaryCta} variant={secondaryCta.variant || 'outline'} />}
          </div>
          {/* Reserve space to avoid CLS */}
          <div className="mt-0 h-0" aria-hidden="true" />
        </div>
      </div>

      {/* No-script fallback */}
      <noscript>
        <img src={backgroundUrl} alt="Product splash" className="absolute inset-0 w-full h-full object-cover" />
      </noscript>
    </section>
  );
};

export default PreviewSplash;
