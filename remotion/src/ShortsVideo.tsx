import React from 'react';
import { loadAllFonts } from './load-fonts';
import { AbsoluteFill, Sequence, Audio } from 'remotion';
import { Scene, RenderPresetProps } from './components/Scene';
import { SubtitlePresetProps } from './components/SubtitleWord';

interface WordData {
  word: string;
  start: number;
  end: number;
}

interface SceneData {
  imageUrl: string;
  audioUrl: string;
  words: WordData[];
  subtitleEmphasis: string[];
  durationInFrames: number;
  transition?: string;
}

interface ShortsVideoProps {
  scenes: SceneData[];
  fps: number;
  bgmUrl?: string | null;
  bgmVolume?: number;
  subtitlePreset?: SubtitlePresetProps;
  renderPreset?: RenderPresetProps;
}

export const ShortsVideo: React.FC<ShortsVideoProps> = ({
  scenes,
  fps,
  bgmUrl,
  bgmVolume = 0.15,
  subtitlePreset,
  renderPreset,
}) => {
  loadAllFonts();
  let currentFrame = 0;
  const totalFrames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {bgmUrl && (
        <Sequence from={0} durationInFrames={totalFrames}>
          <Audio src={bgmUrl} volume={bgmVolume} loop />
        </Sequence>
      )}

      {scenes.map((scene, index) => {
        const from = currentFrame;
        currentFrame += scene.durationInFrames;

        return (
          <Sequence
            key={index}
            from={from}
            durationInFrames={scene.durationInFrames}
            name={`Scene ${index + 1}`}
          >
            <Scene
              imageUrl={scene.imageUrl}
              audioUrl={scene.audioUrl}
              words={scene.words}
              subtitleEmphasis={scene.subtitleEmphasis}
              durationInFrames={scene.durationInFrames}
              fps={fps}
              sceneIndex={index}
              transition={scene.transition}
              subtitlePreset={subtitlePreset}
              renderPreset={renderPreset}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
