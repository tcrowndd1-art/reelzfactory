import React from 'react';
import {
  AbsoluteFill,
  Img,
  Audio,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import { SubtitleWord, SubtitlePresetProps } from './SubtitleWord';
import { TransitionWrapper, getAutoTransition } from '../effects/transitions';
import { getKenBurnsStyle, getAutoKenBurns } from '../effects/motions';

interface WordData {
  word: string;
  start: number;
  end: number;
}

export interface RenderPresetProps {
  transitions?: readonly string[] | string[];
  transitionMode?: 'auto' | 'fixed' | 'random';
  motionStyle?: 'kenBurns' | 'shake' | 'float' | 'pulse' | 'none';
  motionIntensity?: 'low' | 'medium' | 'high';
}

interface SceneProps {
  imageUrl: string;
  audioUrl: string;
  words: WordData[];
  subtitleEmphasis: string[];
  durationInFrames: number;
  fps: number;
  sceneIndex?: number;
  transition?: string;
  subtitlePreset?: SubtitlePresetProps;
  renderPreset?: RenderPresetProps;
}

export const Scene: React.FC<SceneProps> = ({
  imageUrl,
  audioUrl,
  words,
  subtitleEmphasis,
  durationInFrames,
  fps,
  sceneIndex = 0,
  transition,
  subtitlePreset,
  renderPreset,
}) => {
  const frame = useCurrentFrame();
  const { fps: videoFps } = useVideoConfig();

  // --- 트랜지션 결정 ---
  const transitionList = renderPreset?.transitions ?? ['fade', 'slideLeft', 'zoomIn', 'dissolve'];
  const transitionMode = renderPreset?.transitionMode ?? 'auto';

  let selectedTransition: string;
  if (transition) {
    selectedTransition = transition;
  } else if (transitionMode === 'random') {
    selectedTransition = transitionList[Math.floor(Math.random() * transitionList.length)];
  } else if (transitionMode === 'fixed') {
    selectedTransition = String(transitionList[0] ?? 'fade');
  } else {
    selectedTransition = getAutoTransition(sceneIndex);
  }

  // --- 모션 스타일 결정 ---
  const motionStyle = renderPreset?.motionStyle ?? 'kenBurns';
  const intensity = renderPreset?.motionIntensity ?? 'medium';

  const intensityScale = intensity === 'low' ? 0.6 : intensity === 'high' ? 1.4 : 1.0;

  let imageTransform = '';
  if (motionStyle === 'kenBurns') {
    const kb = getAutoKenBurns(sceneIndex);
    const style = getKenBurnsStyle(frame, durationInFrames, kb);
    const adjScale = 1 + (style.scale - 1) * intensityScale;
    const adjX = style.translateX * intensityScale;
    const adjY = style.translateY * intensityScale;
    imageTransform = `scale(${adjScale}) translate(${adjX}px, ${adjY}px)`;
  } else if (motionStyle !== 'none') {
    imageTransform = 'scale(1.05)';
  }

  // --- 진입/퇴장 애니메이션 ---
  const enterSpring = spring({
    frame,
    fps: videoFps,
    config: { damping: 20, stiffness: 100, mass: 0.8 },
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacity = Math.min(enterSpring, exitOpacity);

  // --- 자막 그룹핑 ---
  const emphasisSet = new Set(subtitleEmphasis.map((w) => w.toLowerCase()));
  const GROUP_MAX_SEC = 1.2;
  const GROUP_MAX_CHARS = 14;

  const groups: { text: string; start: number; end: number; hasEmphasis: boolean }[] = [];
  let currentGroup: { words: string[]; start: number; end: number; hasEmphasis: boolean } = {
    words: [], start: 0, end: 0, hasEmphasis: false,
  };

  words.forEach((w, i) => {
    if (currentGroup.words.length === 0) {
      currentGroup.start = w.start;
    }

    currentGroup.words.push(w.word);
    currentGroup.end = w.end;
    if (emphasisSet.has(w.word.toLowerCase())) currentGroup.hasEmphasis = true;

    const isPunctuation = /[.!?。，,：:；;]$/.test(w.word);
    const duration = currentGroup.end - currentGroup.start;
    const isLast = i === words.length - 1;
    const nextWord = words[i + 1];
    const hasGap = nextWord ? (nextWord.start - w.end) > 0.3 : false;

    const groupText = currentGroup.words.join(' ');
    const charCount = groupText.replace(/\s/g, '').length;
    if (isPunctuation || duration >= GROUP_MAX_SEC || charCount >= GROUP_MAX_CHARS || hasGap || isLast) {
      groups.push({
        text: currentGroup.words.join(' '),
        start: currentGroup.start,
        end: currentGroup.end,
        hasEmphasis: currentGroup.hasEmphasis,
      });
      currentGroup = { words: [], start: 0, end: 0, hasEmphasis: false };
    }
  });

  return (
    <TransitionWrapper
      type={selectedTransition}

      durationInFrames={durationInFrames}
    >
      <AbsoluteFill style={{ opacity, backgroundColor: '#0a0a0a' }}>
        {/* 이미지 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          {imageUrl ? (
            <Img
              src={imageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: imageTransform || undefined,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              }}
            />
          )}
        </div>

        {/* Voice Audio */}
        {audioUrl && <Audio src={audioUrl} volume={1} />}

        {/* 자막 */}
        <AbsoluteFill
          style={{
            top: `${subtitlePreset?.positionY || 65}%`,
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingLeft: '32px',
            paddingRight: '32px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              maxWidth: '90%',
            }}
          >
            {(() => {
              const currentTimeSec = frame / fps;
              const activeGroup = groups.find((g, i) => {
                const nextGroup = groups[i + 1];
                const groupEnd = nextGroup ? nextGroup.start : g.end + 0.5;
                return currentTimeSec >= g.start && currentTimeSec < groupEnd;
              });
              if (!activeGroup) return null;
              const sf = Math.round(activeGroup.start * fps);
              const ef = Math.round(activeGroup.end * fps);
              return (
                <SubtitleWord
                  key={`${sf}-${activeGroup.text}`}
                  word={activeGroup.text}
                  startFrame={sf}
                  endFrame={ef}
                  isEmphasis={false}
                  emphasisWords={emphasisSet}
                  preset={subtitlePreset}
                />
              );
            })()}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </TransitionWrapper>
  );
};
