import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type TransitionType = 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'zoomIn' | 'zoomOut' | 'dissolve' | 'cut';

interface TransitionWrapperProps {
  type: TransitionType;
  durationInFrames: number;
  transitionFrames?: number;
  children: React.ReactNode;
}

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  type,
  durationInFrames,
  transitionFrames = 8,
  children,
}) => {
  const frame = useCurrentFrame();

  if (type === 'cut') {
    return <>{children}</>;
  }

  const safeDuration = Math.max(durationInFrames, transitionFrames + 1);
  const safeTransition = Math.min(transitionFrames, Math.floor(safeDuration / 3));

  const enterProgress = interpolate(frame, [0, safeTransition], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exitStart = safeDuration - safeTransition;
  const exitProgress = interpolate(
    frame,
    [exitStart, safeDuration],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const isEntering = frame < safeTransition;
  const isExiting = frame > exitStart;

  const getEnterStyle = (): React.CSSProperties => {
    switch (type) {
      case 'fade':
        return { opacity: enterProgress };
      case 'slideLeft':
        return {
          opacity: enterProgress,
          transform: `translateX(${(1 - enterProgress) * 100}%)`,
        };
      case 'slideRight':
        return {
          opacity: enterProgress,
          transform: `translateX(${(1 - enterProgress) * -100}%)`,
        };
      case 'slideUp':
        return {
          opacity: enterProgress,
          transform: `translateY(${(1 - enterProgress) * 100}%)`,
        };
      case 'zoomIn':
        return {
          opacity: enterProgress,
          transform: `scale(${0.6 + enterProgress * 0.4})`,
        };
      case 'zoomOut':
        return {
          opacity: enterProgress,
          transform: `scale(${1.4 - enterProgress * 0.4})`,
        };
      case 'dissolve':
        return {
          opacity: enterProgress,
          filter: `blur(${(1 - enterProgress) * 8}px)`,
        };
      default:
        return {};
    }
  };

  const getExitStyle = (): React.CSSProperties => {
    switch (type) {
      case 'fade':
        return { opacity: exitProgress };
      case 'slideLeft':
        return {
          opacity: exitProgress,
          transform: `translateX(${(1 - exitProgress) * -100}%)`,
        };
      case 'slideRight':
        return {
          opacity: exitProgress,
          transform: `translateX(${(1 - exitProgress) * 100}%)`,
        };
      case 'slideUp':
        return {
          opacity: exitProgress,
          transform: `translateY(${(1 - exitProgress) * -50}%)`,
        };
      case 'zoomIn':
        return {
          opacity: exitProgress,
          transform: `scale(${1 + (1 - exitProgress) * 0.3})`,
        };
      case 'zoomOut':
        return {
          opacity: exitProgress,
          transform: `scale(${1 - (1 - exitProgress) * 0.3})`,
        };
      case 'dissolve':
        return {
          opacity: exitProgress,
          filter: `blur(${(1 - exitProgress) * 8}px)`,
        };
      default:
        return {};
    }
  };

  const activeStyle = isExiting ? getExitStyle() : isEntering ? getEnterStyle() : {};

  return (
    <div style={{ width: '100%', height: '100%', ...activeStyle }}>
      {children}
    </div>
  );
};

const TRANSITION_CYCLE: TransitionType[] = ['fade', 'slideLeft', 'zoomIn', 'dissolve', 'slideUp', 'zoomOut', 'slideRight'];

export const getAutoTransition = (sceneIndex: number): TransitionType => {
  return TRANSITION_CYCLE[sceneIndex % TRANSITION_CYCLE.length];
};