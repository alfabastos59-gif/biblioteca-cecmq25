// @ts-nocheck
import React, { useEffect, useRef } from 'react';

export type TrailEffectType = 'patinhas' | 'brilho' | 'livros';

export interface MouseTrailProps {
  enabled?: boolean;
  effectType?: TrailEffectType;
  particleDensity?: number; // 1 a 3
  glowIntensity?: number;   // 0.5 a 1.5
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  currentLife: number;
  color: string;
  rotation: number;
  type: 'paw' | 'star' | 'book';
}

export const MouseTrailCanvas: React.FC<MouseTrailProps> = ({
  enabled = true,
  effectType = 'patinhas',
  particleDensity = 2,
  glowIntensity = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const pawStepToggleRef = useRef<boolean>(false);
  const distanceSinceLastPawRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Ajusta o tamanho do canvas para a resolução da tela
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const colors = ['#f59e0b', '#fb923c', '#38bdf8', '#10b981', '#fef08a'];

    // Captura o movimento do mouse
    const onMouseMove = (e: MouseEvent) => {
      if (!enabled) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      if (!lastMousePosRef.current) {
        lastMousePosRef.current = { x: currentX, y: currentY };
        return;
      }

      const dx = currentX - lastMousePosRef.current.x;
      const dy = currentY - lastMousePosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // 1. EFEITO PATINHAS DE GATO 🐾
      if (effectType === 'patinhas') {
        distanceSinceLastPawRef.current += dist;
        const stepDist = 28 / Math.max(1, particleDensity * 0.7);

        // Gera uma patinha alternando esquerda/direita a cada intervalo de distância
        if (distanceSinceLastPawRef.current >= stepDist) {
          distanceSinceLastPawRef.current = 0;
          pawStepToggleRef.current = !pawStepToggleRef.current;
          const isLeft = pawStepToggleRef.current;

          const perpAngle = angle + (isLeft ? -Math.PI / 2 : Math.PI / 2);
          const pawX = currentX + Math.cos(perpAngle) * 8;
          const pawY = currentY + Math.sin(perpAngle) * 8;

          particlesRef.current.push({
            x: pawX,
            y: pawY,
            vx: (Math.random() - 0.5) * 0.2,
            vy: -0.3,
            size: 14,
            alpha: 0.95,
            maxLife: 45,
            currentLife: 45,
            color: '#f59e0b',
            rotation: angle + Math.PI / 2, // Aponta para a direção do movimento
            type: 'paw',
          });
        }
      }

      // 2. EFEITO BRILHO ESTELAR ✨
      if (effectType === 'brilho') {
        const count = Math.min(5, Math.floor(dist / 6) * particleDensity);
        for (let i = 0; i < count; i++) {
          particlesRef.current.push({
            x: currentX + (Math.random() - 0.5) * 10,
            y: currentY + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2 - 0.5,
            size: 4 + Math.random() * 5,
            alpha: 1,
            maxLife: 35,
            currentLife: 35,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            type: 'star',
          });
        }
      }

      lastMousePosRef.current = { x: currentX, y: currentY };
    };

    // Explosão suave ao clicar
    const onMouseDown = (e: MouseEvent) => {
      if (!enabled) return;
      for (let i = 0; i < 15; i++) {
        const pAngle = (Math.PI * 2 * i) / 15;
        const speed = 2 + Math.random() * 3;
        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(pAngle) * speed,
          vy: Math.sin(pAngle) * speed,
          size: effectType === 'patinhas' ? 12 : 5,
          alpha: 1,
          maxLife: 35,
          currentLife: 35,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          type: effectType === 'patinhas' ? 'paw' : 'star',
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });

    // Desenho de uma Patinha de Gato Completa
    const drawPaw = (c: CanvasRenderingContext2D, p: Particle) => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.globalAlpha = p.alpha;
      c.fillStyle = p.color;
      c.shadowColor = '#f59e0b';
      c.shadowBlur = 8 * glowIntensity;

      // Almofadinha central grande
      c.beginPath();
      c.ellipse(0, 2, p.size * 0.45, p.size * 0.38, 0, 0, Math.PI * 2);
      c.fill();

      // Dedo esquerdo
      c.beginPath();
      c.ellipse(-p.size * 0.32, -p.size * 0.3, p.size * 0.16, p.size * 0.22, -0.25, 0, Math.PI * 2);
      c.fill();

      // Dedo central
      c.beginPath();
      c.ellipse(0, -p.size * 0.44, p.size * 0.18, p.size * 0.24, 0, 0, Math.PI * 2);
      c.fill();

      // Dedo direito
      c.beginPath();
      c.ellipse(p.size * 0.32, -p.size * 0.3, p.size * 0.16, p.size * 0.22, 0.25, 0, Math.PI * 2);
      c.fill();

      c.restore();
    };

    // Desenho de Estrela de 4 pontas
    const drawStar = (c: CanvasRenderingContext2D, p: Particle) => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.globalAlpha = p.alpha;
      c.fillStyle = p.color;
      c.shadowColor = p.color;
      c.shadowBlur = 8 * glowIntensity;

      c.beginPath();
      for (let i = 0; i < 4; i++) {
        c.lineTo(Math.cos((i * Math.PI) / 2) * p.size, Math.sin((i * Math.PI) / 2) * p.size);
        c.lineTo(
          Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (p.size * 0.3),
          Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (p.size * 0.3)
        );
      }
      c.closePath();
      c.fill();
      c.restore();
    };

    // Loop de Animação 60 FPS
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.currentLife -= 1;
        p.alpha = Math.max(0, p.currentLife / p.maxLife);

        if (p.currentLife <= 0 || p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        if (p.type === 'paw') {
          drawPaw(ctx, p);
        } else {
          drawStar(ctx, p);
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [enabled, effectType, particleDensity, glowIntensity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
};

export default MouseTrailCanvas;
