# ReelzFactory 프로젝트 현재 상태

> 최종 업데이트: 2026-03-29

## 아키텍처
- **Next.js** (apps/web) + **Remotion** (remotion/) + **Supabase**
- 파이프라인: 대본생성 → 이미지생성 → TTS → 렌더링 → YouTube 업로드

---

## 완료된 작업

### Voice (TTS)
1. 3엔진 분기: Google Gemini / OpenAI / Clone (Fish Audio)
2. VoiceSettingsModal — 엔진별 완전 분리 UI (Google 탭/OpenAI 보이스 선택/Clone 감정 매핑 표시)
3. fishModelId를 채널 voice_preset에서 읽도록 연동 (`useVoiceGeneration.ts` 134줄)
4. fishEmotionMap 유틸리티 (`constants/fishEmotionMap.ts`) — sceneType/emotionLevel → Fish 감정 태그
5. generateFishVoice 함수 (`generate-voice/route.ts`) — Fish Audio S2 API 호출
6. Gemini → OpenAI 자동 폴백 + 일관성 재생성 로직

### Image
1. 6개 스타일: viral-meme, drama-noir, clean-vector, money-data, logic-sketch, brand-face
2. 4개 엔진: flux-pro, nano-banana, flux-max, nano-banana-pro (ENGINE_MAP in generate-images/route.ts)
3. 9:16 / 16:9 비율 선택
4. 병렬 처리 (CONCURRENCY=3) + 자동 폴백 (1차 실패 시 다른 엔진으로 재시도)
5. Supabase `prompt_templates` 테이블에 6개 스타일 지침서 저장 (block_type='image_style')
6. generate-images API에서 스타일 템플릿 DB 조회 후 프롬프트에 주입
7. 채널 프리셋에서 styleOverride, colorScheme, promptPrefix, referenceImages, engine, aspectRatio 전달

### Subtitle / Render
1. 채널 preset → useRenderPipeline → /api/render → JSON → render.mjs → Remotion 전달 완료
2. subtitlePreset + renderPreset이 inputProps로 Remotion 컴포지션에 전달됨
3. Scene.tsx에 GROUP_MAX_CHARS=14 자막 그룹핑 제한 추가
4. postProcessWords 함수로 Whisper STT 빈 토큰/% 기호 분리 방지

### Settings / 채널
1. Settings 페이지: API 키 링크 + 입력 상태 표시 (filled count)
2. 채널 상세 페이지: Voice/Image/Subtitle/Render/YouTube 프리셋 편집 (완전 한글화)
3. 채널 이미지 탭: 레퍼런스 이미지 업로드 (Supabase Storage 'uploads' 버킷)
4. YouTube 채널 검증 기능 (Data API v3 연동)
5. ElevenLabs 제거, Fish Audio 추가

---

## 핵심 파일 경로

### API Routes
- `apps/web/app/api/generate-script/route.ts` — 대본 생성 API
- `apps/web/app/api/generate-images/route.ts` — 이미지 생성 API (스타일 템플릿 + 엔진 분기 + 병렬 + 폴백)
- `apps/web/app/api/generate-voice/route.ts` — TTS API (3엔진 분기 + Gemini→OpenAI 폴백)
- `apps/web/app/api/render/route.ts` — 렌더 데이터 준비 (subtitlePreset/renderPreset 포함)
- `apps/web/app/api/render-video/route.ts` — Remotion 렌더 실행

### Hooks
- `apps/web/hooks/pipeline/useVoiceGeneration.ts` — TTS 훅 (voiceEngine 상태 + fishModelId 전달)
- `apps/web/hooks/pipeline/useImageGeneration.ts` — 이미지 생성 훅 (채널 preset 반영)
- `apps/web/hooks/pipeline/useRenderPipeline.ts` — 렌더 훅 (subtitlePreset/renderPreset 전달)
- `apps/web/hooks/pipeline/useScriptGeneration.ts` — 대본 생성 훅

### Pages / Components
- `apps/web/app/create/[id]/page.tsx` — 파이프라인 오케스트레이터
- `apps/web/app/channels/[id]/page.tsx` — 채널 상세 (프리셋 편집)
- `apps/web/app/settings/page.tsx` — API 키 관리
- `apps/web/components/pipeline/VoiceSettingsModal.tsx` — 보이스 설정 모달 (엔진별 분리 UI)

### Constants
- `apps/web/constants/presets.ts` — 기본 프리셋 값 (engine: "flux-pro")
- `apps/web/constants/fishEmotionMap.ts` — Fish Audio 감정 태그 매핑
- `apps/web/constants/voiceConfig.ts` — Google TTS 보이스 설정

### Remotion
- `remotion/src/ShortsVideo.tsx` — 메인 컴포지션
- `remotion/src/components/Scene.tsx` — 씬 렌더링 (subtitlePreset + renderPreset 적용)
- `remotion/src/components/SubtitleWord.tsx` — 자막 워드별 렌더링
- `remotion/src/effects/transitions.tsx` — 7개 전환 효과
- `remotion/src/effects/motions.tsx` — 4개 모션 효과
- `remotion/src/load-fonts.ts` — 폰트 로딩 (현재 Pretendard만)
- `remotion/render.mjs` — 실제 렌더링 스크립트 (subtitlePreset/renderPreset inputProps 전달)

### Store
- `apps/web/lib/store.ts` — localStorage 기반 설정 관리 (apiKeys, channel)
- `apps/web/lib/supabase.ts` — Supabase 클라이언트

---

## Supabase 테이블

| 테이블 | 용도 |
|--------|------|
| `channels` | 채널 프로필 + 프리셋 (voice_preset, image_preset, subtitle_preset, render_preset) |
| `prompt_templates` | 프롬프트 템플릿 (block_type, category, mode, name, content, variables) |
| `image_library` | 이미지 재활용 (channel_id, style, engine, image_url, prompt, seed, aspect_ratio, tags) |
| `productions` | 프로젝트 |
| `pipeline_logs` | 로그 |

---

## 환경 변수 (.env)

| 변수 | 용도 |
|------|------|
| `GEMINI_API_KEY` | Google Gemini TTS (⚠️ 중복 있음 — 38행 삭제 필요) |
| `GOOGLE_TTS_API_KEY` | Google Cloud TTS |
| `OPENROUTER_API_KEY` | 대본 생성 |
| `REPLICATE_API_TOKEN` | Replicate |
| `FAL_KEY` | fal.ai 이미지 생성 |
| `SUPABASE_URL / ANON_KEY` | Supabase |
| `NEXT_PUBLIC_SUPABASE_URL / ANON_KEY` | 클라이언트 Supabase |
| `NEXT_PUBLIC_FISH_VOICE_ID` | Fish Audio 기본 모델 ID (⚠️ 미추가 상태) |
| `FISH_AUDIO_API_KEY` | Fish Audio API 키 (⚠️ 미추가 상태) |
| `YOUTUBE_*` | YouTube API |
| `ELEVENLABS_API_KEY` | (레거시, 사용 안 함) |

---

## 미완료 / TODO

- [ ] `.env`에 `NEXT_PUBLIC_FISH_VOICE_ID` + `FISH_AUDIO_API_KEY` 추가
- [ ] `.env` GEMINI_API_KEY 중복 제거 (38행)
- [ ] MONEY-DATA negative prompt 이중 방어
- [ ] BRAND-FACE characterRefUrl 필수 경고 UI
- [ ] image_library 자동 저장 (이미지 재활용)
- [ ] load-fonts.ts에 Gaegu, Caveat, Noto Sans KR 등 추가 폰트 로딩
- [ ] generate-script API에 스타일 템플릿 로드 추가
- [ ] 전체 파이프라인 E2E 테스트
