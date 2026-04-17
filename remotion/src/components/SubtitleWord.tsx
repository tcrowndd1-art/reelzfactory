import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { PRETENDARD } from '../load-fonts';

export interface SubtitlePresetProps {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  bgColor?: string;
  bgPadding?: string;
  bgBorderRadius?: number;
  highlightColor?: string;
  highlightStyle?: 'color' | 'background';
  animation?: 'popIn' | 'fadeIn' | 'slideUp' | 'none';
  positionY?: number;
}

interface SubtitleWordProps {
  word: string;
  startFrame: number;
  endFrame: number;
  isEmphasis: boolean;
  emphasisWords?: Set<string>;
  preset?: SubtitlePresetProps;
}

const DEFAULT_PRESET: SubtitlePresetProps = {
  fontFamily: `'${PRETENDARD}', 'Pretendard', 'Inter', Arial, sans-serif`,
  fontSize: 80,
  fontWeight: 900,
  textColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 5,
  bgColor: 'transparent',
  bgPadding: '0px',
  bgBorderRadius: 0,
  highlightColor: '#FFD700',
  highlightStyle: 'color',
  animation: 'popIn',
  positionY: 65,
};

export const SubtitleWord: React.FC<SubtitleWordProps> = ({
  word,
  startFrame,
  endFrame,
  isEmphasis,
  emphasisWords,
  preset,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = { ...DEFAULT_PRESET, ...preset };

  if (frame < startFrame || frame > endFrame + 10) return null;

  let opacity = 1;
  let scale = 1;
  let translateY = 0;

  if (p.animation === 'popIn') {
    const s = spring({ frame: frame - startFrame, fps, config: { damping: 15, stiffness: 200 } });
    opacity = s;
    scale = interpolate(s, [0, 1], [0.7, 1]);
  } else if (p.animation === 'fadeIn') {
    opacity = interpolate(frame - startFrame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  } else if (p.animation === 'slideUp') {
    const s = spring({ frame: frame - startFrame, fps, config: { damping: 18, stiffness: 180 } });
    opacity = s;
    translateY = interpolate(s, [0, 1], [20, 0]);
  }

  const fadeOut = interpolate(frame, [endFrame - 3, endFrame + 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  opacity *= fadeOut;

  const textShadow = p.strokeWidth
    ? `${p.strokeWidth}px ${p.strokeWidth}px 0 ${p.strokeColor}, -${p.strokeWidth}px -${p.strokeWidth}px 0 ${p.strokeColor}, ${p.strokeWidth}px -${p.strokeWidth}px 0 ${p.strokeColor}, -${p.strokeWidth}px ${p.strokeWidth}px 0 ${p.strokeColor}, 0 ${p.strokeWidth}px 0 ${p.strokeColor}, 0 -${p.strokeWidth}px 0 ${p.strokeColor}, ${p.strokeWidth}px 0 0 ${p.strokeColor}, -${p.strokeWidth}px 0 0 ${p.strokeColor}`
    : 'none';

  const renderWords = () => {
    const tokens = word.split(/(\s+)/);
    return tokens.map((token, idx) => {
      const trimmed = token.trim();
      if (!trimmed) return <span key={idx}>{token}</span>;

      const isHighlighted = emphasisWords
        ? emphasisWords.has(trimmed.toLowerCase()) ||
          emphasisWords.has(trimmed.replace(/[!?.,]/g, '').toLowerCase())
        : isEmphasis;

      return (
        <span
          key={idx}
          style={{
            color: isHighlighted ? (p.highlightColor || '#FFD700') : (p.textColor || '#FFFFFF'),
            fontWeight: isHighlighted ? 900 : p.fontWeight,
            fontSize: isHighlighted ? `${(p.fontSize || 80) * 1.5}px` : undefined,
          }}
        >
          {token}
        </span>
      );
    });
  };

  return (
    <span
      style={{
        display: 'inline-block',
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        fontSize: `${p.fontSize}px`,
        fontWeight: p.fontWeight,
        fontFamily: p.fontFamily,
        textShadow,
        backgroundColor: p.bgColor,
        padding: p.bgPadding,
        borderRadius: `${p.bgBorderRadius}px`,
        margin: '2px 0',
        letterSpacing: '-0.5px',
        lineHeight: 1.3,
      }}
    >
      {renderWords()}
    </span>
  );
};