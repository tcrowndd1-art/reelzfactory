import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface SubtitleWordProps {
  word: string;
  startFrame: number;
  endFrame: number;
  isEmphasis: boolean;
}

export const SubtitleWord: React.FC<SubtitleWordProps> = ({
  word,
  startFrame,
  endFrame,
  isEmphasis,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeEnd = Math.max(endFrame, startFrame + 3);

  const appearSpring = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: {
      damping: 12,
      stiffness: 200,
      mass: 0.5,
    },
  });

  const fadeIn = interpolate(
    frame,
    [startFrame, startFrame + 2],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const fadeOut = interpolate(
    frame,
    [safeEnd - 2, safeEnd],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  const emphasisPulse = isEmphasis
    ? interpolate(
        frame,
        [startFrame, startFrame + 4, startFrame + 8, startFrame + 12],
        [1, 1.15, 1.05, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 1;

  const scale = appearSpring * emphasisPulse;

  const translateY = interpolate(
    appearSpring,
    [0, 1],
    [20, 0]
  );

  const isVisible = frame >= startFrame && frame <= safeEnd;
  if (!isVisible) return null;

  const glowIntensity = isEmphasis
    ? interpolate(frame, [startFrame, startFrame + 6], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // 화이트보드 스타일: 흰 배경에서도 잘 보이도록 어두운 텍스트 + 배경 박스
  return (
    <span
      style={{
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        display: 'inline-block',
        color: isEmphasis ? '#FFD700' : '#FFFFFF',
        fontSize: isEmphasis ? '72px' : '60px',
        fontWeight: isEmphasis ? 900 : 700,
        textShadow: isEmphasis
          ? `0 0 ${8 + glowIntensity * 15}px rgba(255, 215, 0, ${0.3 + glowIntensity * 0.4}), 2px 2px 6px rgba(0,0,0,0.9)`
          : '2px 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
        marginRight: '8px',
        marginBottom: '4px',
        fontFamily: "'Noto Sans KR', 'Pretendard', Arial, sans-serif",
        letterSpacing: isEmphasis ? '1px' : '0px',
      }}
    >
      {word}
    </span>
  );
};
