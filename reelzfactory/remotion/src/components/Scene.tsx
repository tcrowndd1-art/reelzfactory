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
import { SubtitleWord } from './SubtitleWord';

interface WordData {
  word: string;
  start: number;
  end: number;
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
}

export const Scene: React.FC<SceneProps> = ({
  imageUrl,
  audioUrl,
  words,
  subtitleEmphasis,
  durationInFrames,
  fps,
  sceneIndex = 0,
  transition = 'zoom_in',
}) => {
  const frame = useCurrentFrame();
  const { fps: videoFps } = useVideoConfig();

  const kenBurnsEffects: Record<string, { scale: [number, number]; x: [number, number]; y: [number, number] }> = {
    zoom_in: { scale: [1, 1.18], x: [0, -10], y: [0, -8] },
    zoom_out: { scale: [1.2, 1], x: [-10, 0], y: [-5, 0] },
    pan_left: { scale: [1.12, 1.12], x: [40, -40], y: [0, -5] },
    pan_right: { scale: [1.12, 1.12], x: [-40, 40], y: [-5, 0] },
    pan_up: { scale: [1.1, 1.15], x: [-10, 10], y: [20, -20] },
    pan_down: { scale: [1.15, 1.1], x: [10, -10], y: [-20, 20] },
    zoom_pan_left: { scale: [1, 1.2], x: [30, -30], y: [0, -10] },
    zoom_pan_right: { scale: [1.2, 1], x: [-30, 30], y: [-10, 0] },
  };

  const effectKeys = Object.keys(kenBurnsEffects);
  const effectName = transition in kenBurnsEffects ? transition : effectKeys[sceneIndex % effectKeys.length];
  const effect = kenBurnsEffects[effectName];

  const scale = interpolate(frame, [0, durationInFrames], effect.scale, { extrapolateRight: 'clamp' });
  const translateX = interpolate(frame, [0, durationInFrames], effect.x, { extrapolateRight: 'clamp' });
  const translateY = interpolate(frame, [0, durationInFrames], effect.y, { extrapolateRight: 'clamp' });

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

  const emphasisSet = new Set(
    subtitleEmphasis.map((w) => w.toLowerCase())
  );

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: '#0a0a0a' }}>
      {/* 이미지 풀스크린 (헤더 없음) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          <Img
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#0a0a0a' }} />
        )}
      </div>

      {/* Voice Audio */}
      {audioUrl && <Audio src={audioUrl} volume={1} />}

      {/* 하단 자막 — 화면 하단 중앙 */}
      <AbsoluteFill
        style={{
          top: '72%',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: '40px',
          paddingRight: '40px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '1000px',
            gap: '4px',
          }}
        >
          {(() => {
            const groups: { text: string; start: number; end: number; hasEmphasis: boolean }[] = [];
            let current = { text: '', start: 0, end: 0, hasEmphasis: false };
            words.forEach((w, i) => {
              if (i === 0) current.start = w.start;
              current.text += (current.text ? ' ' : '') + w.word;
              current.end = w.end;
              if (emphasisSet.has(w.word.toLowerCase())) current.hasEmphasis = true;
              const isEnd = /[.!?。，,]$/.test(w.word) || i === words.length - 1;
              if (isEnd) {
                groups.push({ ...current });
                current = { text: '', start: 0, end: 0, hasEmphasis: false };
              }
            });
            return groups.map((g, i) => {
              const startFrame = Math.round(g.start * fps);
              const endFrame = Math.round(g.end * fps);
              return (
                <SubtitleWord
                  key={i}
                  word={g.text}
                  startFrame={startFrame}
                  endFrame={endFrame}
                  isEmphasis={g.hasEmphasis}
                />
              );
            });
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
