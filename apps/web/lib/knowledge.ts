// ============================================================
// Knowledge Base Loader - 기존 pipeline/assets/knowledge 연동
// ============================================================

export interface KnowledgePack {
  niche: string;
  hooks: any[];
  scripts: any;
  compliance: any;
  character: any;
  factbase: any[];
}

// 로컬 assets에서 knowledge pack 로드
// 경로: packages/pipeline/assets/knowledge/{niche}/
export async function loadKnowledgePack(niche: string): Promise<KnowledgePack | null> {
  try {
    const basePath = `/api/knowledge/${niche}`;
    const res = await fetch(basePath);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Knowledge pack을 프롬프트에 주입할 텍스트로 변환
export function knowledgeToPromptText(pack: KnowledgePack): string {
  const sections: string[] = [];

  // 1. 허용 클레임
  if (pack.compliance?.allowed_claims) {
    sections.push(`[허용 표현]\n${pack.compliance.allowed_claims.map((c: any) => `- ${c.expression || c}`).join('\n')}`);
  }

  // 2. 훅 모음
  if (pack.hooks.length > 0) {
    const hookTexts = pack.hooks.flatMap((hookFile: any) => {
      if (Array.isArray(hookFile.hooks)) {
        return hookFile.hooks.slice(0, 5).map((h: any) => `- [${h.category || h.type}] ${h.hook_text || h.text || h.hook || h.name}`);
      }
      if (Array.isArray(hookFile.scenes)) {
        return hookFile.scenes.slice(0, 5).map((s: any) => `- [${s.category}] ${s.scene_idea || s.description}`);
      }
      if (Array.isArray(hookFile.frameworks)) {
        return hookFile.frameworks.slice(0, 3).map((f: any) => `- [${f.name}] ${f.hook_example || f.description}`);
      }
      return [];
    });
    if (hookTexts.length > 0) {
      sections.push(`[검증된 훅 모음]\n${hookTexts.join('\n')}`);
    }
  }

  // 3. 바이럴 구조
  if (pack.scripts?.structures) {
    const structures = pack.scripts.structures.slice(0, 3).map((s: any) =>
      `- ${s.id}: ${s.phases?.map((p: any) => p.phase).join(' → ') || s.description}`
    );
    sections.push(`[바이럴 구조 템플릿]\n${structures.join('\n')}`);
  }

  // 4. 캐릭터
  if (pack.character) {
    const char = pack.character;
    sections.push(`[캐릭터]\n이름: ${char.character_name || char.name}\n마스터 프롬프트: ${char.master_prompt || ''}\n스타일: ${char.style_suffix || ''}`);
  }

  // 5. 팩트베이스
  if (pack.factbase.length > 0) {
    const facts = pack.factbase.flatMap((fb: any) => {
      if (fb.ingredients) return fb.ingredients.slice(0, 5).map((i: any) => `- ${i.name}: ${i.key_benefit || i.description}`);
      if (fb.products) return fb.products.slice(0, 5).map((p: any) => `- ${p.name}: ${p.key_benefit || p.description}`);
      return [];
    });
    if (facts.length > 0) {
      sections.push(`[성분/제품 팩트]\n${facts.join('\n')}`);
    }
  }

  return sections.join('\n\n');
}

// 사용 가능한 니치 목록
export function getAvailableNiches(): string[] {
  // 현재는 하드코딩, 나중에 API에서 동적 로드
  return ['nutrilite'];
}

// 니치별 캐릭터 목록
export function getCharactersForNiche(niche: string): string[] {
  const characterMap: Record<string, string[]> = {
    nutrilite: ['nutrilite_bot_v1', 'acerola_c_v1', 'cal_mag_d_v1', 'double_x_v1', 'omega3_marine_v1'],
  };
  return characterMap[niche] || [];
}
