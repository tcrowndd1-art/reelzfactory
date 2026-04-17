// constants/formatMatrix.ts — 포맷×카테고리 허용 매트릭스

export const FORMAT_CATEGORY_MATRIX: Record<string, string[]> = {
  invest:     ['allegory', 'factbomb', 'pov'],
  economy:    ['allegory'],
  psychology: ['allegory', 'factbomb', 'pov', 'mystery'],
  health:     ['factbomb', 'compare'],
  hotissue:   ['allegory', 'factbomb', 'compare', 'pov', 'mystery'],
};

export const FORMAT_OPTIONS = [
  { id: 'allegory',  icon: '🐵', label: '우화/메타포' },
  { id: 'factbomb',  icon: '⚡', label: '팩트폭격' },
  { id: 'compare',   icon: '⚖️', label: '비교/리뷰' },
  { id: 'pov',       icon: '👁️', label: 'POV/시뮬' },
  { id: 'mystery',   icon: '🔍', label: '미스터리' },
];
