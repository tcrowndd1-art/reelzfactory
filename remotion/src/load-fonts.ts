// remotion/src/load-fonts.ts — 폰트 로더
import { staticFile } from "remotion";

const FONT_MAP: Record<string, { file: string; weight: string }[]> = {
  "Pretendard Variable": [
    { file: "PretendardVariable.woff2", weight: "100 900" },
  ],
  "Gaegu": [
    { file: "Gaegu-Regular.woff2", weight: "400" },
    { file: "Gaegu-Bold.woff2", weight: "700" },
  ],
  "Caveat": [
    { file: "Caveat-Regular.woff2", weight: "400" },
  ],
  "Noto Sans KR": [
    { file: "NotoSansKR-Regular.woff2", weight: "400" },
    { file: "NotoSansKR-Bold.woff2", weight: "700" },
    { file: "NotoSansKR-Black.woff2", weight: "900" },
  ],
  "Inter": [
    { file: "Inter-Regular.woff2", weight: "400" },
    { file: "Inter-Bold.woff2", weight: "700" },
  ],
  "Black Han Sans": [
    { file: "BlackHanSans-Regular.woff2", weight: "400" },
  ],
};

const loadedFonts = new Set<string>();

export function loadFont(fontFamily: string): string {
  if (loadedFonts.has(fontFamily)) return fontFamily;
  const variants = FONT_MAP[fontFamily];
  if (!variants) return fontFamily;

  for (const v of variants) {
    const font = new FontFace(fontFamily, `url(${staticFile(`fonts/${v.file}`)})`, {
      weight: v.weight,
      style: "normal",
    });
    font.load().then((f) => document.fonts.add(f))
      .catch((err) => console.warn(`Font load failed: ${fontFamily}`, err));
  }
  loadedFonts.add(fontFamily);
  return fontFamily;
}

export function loadAllFonts() {
  Object.keys(FONT_MAP).forEach(loadFont);
}

// 하위 호환
export const loadPretendard = () => loadFont("Pretendard Variable");
export const PRETENDARD = "Pretendard Variable";