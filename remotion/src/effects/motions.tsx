import { interpolate, useCurrentFrame } from 'remotion';

export type MotionType = 'kenBurns' | 'parallax' | 'shake' | 'float' | 'pulse' | 'none';
export type MotionIntensity = 'low' | 'medium' | 'high';

interface MotionConfig {
  scale: [number, number];
  x: [number, number];
  y: [number, number];
  rotate?: [number, number];
}

const INTENSITY_MULTIPLIER: Record<MotionIntensity, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
};

// Ken Burns 프리셋 (Scene.tsx 기존 것을 확장)
const KEN_BURNS_PRESETS: Record<string, MotionConfig> = {
  zoom_in: { scale: [1, 1.18], x: [0, -10], y: [0, -8] },
  zoom_out: { scale: [1.2, 1], x: [-10, 0], y: [-5, 0] },
  pan_left: { scale: [1.12, 1.12], x: [40, -40], y: [0, -5] },
  pan_right: { scale: [1.12, 1.12], x: [-40, 40], y: [-5, 0] },
  pan_up: { scale: [1.1, 1.15], x: [-10, 10], y: [20, -20] },
  pan_down: { scale: [1.15, 1.1], x: [10, -10], y: [-20, 20] },
  zoom_pan_left: { scale: [1, 1.2], x: [30, -30], y: [0, -10] },
  zoom_pan_right: { scale: [1.2, 1], x: [-30, 30], y: [-10, 0] },
};

export const getKenBurnsStyle = (
  frame: number,
  durationInFrames: number,
  preset: string,
  intensity: MotionIntensity = 'medium'
): React.CSSProperties => {
  const config = KEN_BURNS_PRESETS[preset] || KEN_BURNS_PRESETS.zoom_in;
  const mult = INTENSITY_MULTIPLIER[intensity];

  const scale = interpolate(frame, [0, durationInFrames], config.scale, { extrapolateRight: 'clamp' });
  const x = interpolate(frame, [0, durationInFrames], [config.x[0] * mult, config.x[1] * mult], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, durationInFrames], [config.y[0] * mult, config.y[1] * mult], { extrapolateRight: 'clamp' });

  return {
    transform: `scale(${scale}) translate(${x}px, ${y}px)`,
  };
};

// Shake 효과 (긴장감 씬에 적용)
export const getShakeStyle = (
  frame: number,
  startFrame: number,
  intensity: MotionIntensity = 'medium'
): React.CSSProperties => {
  const mult = INTENSITY_MULTIPLIER[intensity];
  const elapsed = frame - startFrame;
  if (elapsed < 0) return {};

  const shakeX = Math.sin(elapsed * 1.5) * 3 * mult;
  const shakeY = Math.cos(elapsed * 1.8) * 2 * mult;

  return {
    transform: `translate(${shakeX}px, ${shakeY}px)`,
  };
};

// Float 효과 (부드러운 떠다니기)
export const getFloatStyle = (
  frame: number,
  intensity: MotionIntensity = 'medium'
): React.CSSProperties => {
  const mult = INTENSITY_MULTIPLIER[intensity];
  const floatY = Math.sin(frame * 0.05) * 8 * mult;
  const floatX = Math.cos(frame * 0.03) * 4 * mult;

  return {
    transform: `translate(${floatX}px, ${floatY}px)`,
  };
};

// Pulse 효과 (강조 순간에 사용)
export const getPulseStyle = (
  frame: number,
  startFrame: number,
  durationFrames: number = 15,
  intensity: MotionIntensity = 'medium'
): React.CSSProperties => {
  const mult = INTENSITY_MULTIPLIER[intensity];
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > durationFrames) return {};

  const pulseScale = interpolate(
    elapsed,
    [0, durationFrames * 0.3, durationFrames],
    [1, 1 + 0.08 * mult, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return {
    transform: `scale(${pulseScale})`,
  };
};

// 자동 Ken Burns 선택 (씬 인덱스 기반 순환)
const KB_CYCLE = Object.keys(KEN_BURNS_PRESETS);

export const getAutoKenBurns = (sceneIndex: number): string => {
  return KB_CYCLE[sceneIndex % KB_CYCLE.length];
};
