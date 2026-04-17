// constants/engineMap.ts — 엔진 라우팅 설정 (OpenRouter 모델 ID 매핑)

export interface EngineConfig {
    modelId: string;
    maxTokens: number;
    label: string;
    costTier: "budget" | "standard" | "premium";
}

export const ENGINE_MAP: Record<string, EngineConfig> = {
    "claude-sonnet-4.6": {
        modelId: "anthropic/claude-sonnet-4.6",
        maxTokens: 16384,
        label: "Claude Sonnet 4.6",
        costTier: "premium",
    },
    "gemini-2.5-pro": {
        modelId: "google/gemini-2.5-pro",
        maxTokens: 16384,
        label: "Gemini 2.5 Pro",
        costTier: "standard",
    },
    "gemini-2.5-flash": {
        modelId: "google/gemini-2.5-flash",
        maxTokens: 16384,
        label: "Gemini 2.5 Flash",
        costTier: "budget",
    },
    "gpt-4o": {
        modelId: "openai/gpt-4o",
        maxTokens: 8192,
        label: "GPT-4o",
        costTier: "standard",
    },
    "kimi-k2.5": {
        modelId: "moonshotai/kimi-k2.5",
        maxTokens: 16384,
        label: "Kimi K2.5",
        costTier: "budget",
    },
} as const;

/** auto 선택 시 용도별 기본 엔진 */
export const AUTO_DEFAULTS = {
    shorts: "claude-sonnet-4.6",
    longform: "claude-sonnet-4.6",
    data: "kimi-k2.5",
} as const;

/** engineKey → OpenRouter 모델 ID 변환. auto면 mode 기반 자동 선택 */
export function resolveEngine(
    engineKey: string,
    mode: "shorts" | "longform" | "data"
): EngineConfig {
    const key = engineKey === "auto"
        ? AUTO_DEFAULTS[mode]
        : engineKey;
    return ENGINE_MAP[key] ?? ENGINE_MAP[AUTO_DEFAULTS[mode]];
}