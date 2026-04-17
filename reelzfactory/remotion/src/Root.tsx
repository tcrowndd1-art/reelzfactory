import React from 'react';
import { Composition } from 'remotion';
import { ShortsVideo } from './ShortsVideo';

export const RemotionRoot: React.FC = () => {
  const fps = 30;

  const defaultProps = {
    fps,
    scenes: [
      {
        imageUrl: '',
        audioUrl: '',
        words: [],
        subtitleEmphasis: [],
        durationInFrames: 90,
      },
    ],
  };

  return (
    <>
      <Composition
        id="ShortsVideo"
        component={ShortsVideo}
        durationInFrames={600}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={async ({ props }) => {
          const total = props.scenes.reduce(
            (sum: number, s: any) => sum + s.durationInFrames,
            0
          );
          return {
            durationInFrames: total || 90,
            fps: props.fps || 30,
            width: 1080,
            height: 1920,
          };
        }}
      />
    </>
  );
};
