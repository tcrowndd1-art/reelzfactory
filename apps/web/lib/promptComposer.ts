// lib/promptComposer.ts — Supabase 기반 프롬프트 블록 조합기

import { supabase } from './supabase';

interface ComposedPrompt {
  systemPrompt: string;
  categoryOverlay: string;
  source: 'supabase' | 'fallback';
}

// prompt_templates에서 블록 가져오기
async function fetchBlock(blockType: string, mode: string, name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('content')
    .eq('block_type', blockType)
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.warn(`[PromptComposer] Block not found: ${blockType}/${mode}/${name}`, error?.message);
    return null;
  }
  return data.content;
}

// knowledge_packs에서 카테고리 오버레이 가져오기
async function fetchOverlay(category: string, mode?: string): Promise<string | null> {
  if (mode) {
    const { data } = await supabase
      .from('knowledge_packs')
      .select('content')
      .eq('category', category)
      .eq('pack_type', 'overlay')
      .eq('mode', mode)
      .eq('is_active', true)
      .limit(1);
    if (data && data.length > 0) {
      const content = data[0].content;
      if (typeof content === 'string') return content;
      if (typeof content === 'object') return JSON.stringify(content, null, 2);
    }
  }
  const { data, error } = await supabase
    .from('knowledge_packs')
    .select('content')
    .eq('category', category)
    .eq('pack_type', 'overlay')
    .eq('mode', 'all')
    .eq('is_active', true)
    .limit(1);
  if (error || !data || data.length === 0) {
    console.warn(`[PromptComposer] Overlay not found: ${category}/${mode}`, error?.message);
    return null;
  }
  const content = data[0].content;
  if (typeof content === 'string') return content;
  if (typeof content === 'object') return JSON.stringify(content, null, 2);
  return null;
}


// 숏폼 프롬프트 조합: common_core + shorts_core + format_adapter + category_overlay
export async function composeShortformPrompt(
  category: string,
  format: string
): Promise<ComposedPrompt> {
  const [commonCore, shortsCore, adapter, overlay] = await Promise.all([
    fetchBlock('core', 'all', 'common_core'),
    fetchBlock('core', 'shorts', 'shorts_core'),
    fetchBlock('adapter', 'shorts', `adapter_${format}`),
    fetchOverlay(category, 'shorts'),
  ]);

  if (!commonCore || !shortsCore) {
    console.warn('[PromptComposer] Core blocks missing, using fallback');
    return { systemPrompt: '', categoryOverlay: '', source: 'fallback' };
  }

  const parts = [commonCore, shortsCore];
  if (adapter) parts.push(adapter);

  return {
    systemPrompt: parts.join('\n\n---\n\n'),
    categoryOverlay: overlay || '',
    source: 'supabase',
  };
}

// 롱폼 프롬프트 조합: common_core + longform_core + source_adapter + category_overlay
export async function composeLongformPrompt(
  category: string,
  sourceType: string
): Promise<ComposedPrompt> {
  const [commonCore, longformCore, adapter, overlay] = await Promise.all([
    fetchBlock('core', 'all', 'common_core'),
    fetchBlock('core', 'longform', 'longform_core'),
    fetchBlock('adapter', 'longform', `adapter_${sourceType}`),
    fetchOverlay(category, 'longform'),
  ]);

  if (!commonCore || !longformCore) {
    console.warn('[PromptComposer] Core blocks missing, using fallback');
    return { systemPrompt: '', categoryOverlay: '', source: 'fallback' };
  }

  const parts = [commonCore, longformCore];
  if (adapter) parts.push(adapter);

  return {
    systemPrompt: parts.join('\n\n---\n\n'),
    categoryOverlay: overlay || '',
    source: 'supabase',
  };
}

// Validator 프롬프트 가져오기
export async function fetchValidatorPrompt(mode: 'shorts' | 'longform'): Promise<string | null> {
  return fetchBlock('validator', mode, `validator_${mode}`);
}

// 스타일 지침서 가져오기
export async function fetchStyleGuide(imageStyle: string): Promise<string | null> {
  const styleName = `style_${imageStyle.replace(/-/g, "_")}`;
  const visualDna = await fetchBlock('image_style', 'all', styleName);

  // style_engine도 가져와서 합침
  const engineName = `${imageStyle.replace(/-/g, "_")}_engine`;
  const productionEngine = await fetchBlock('style_engine', 'longform', engineName);

  if (visualDna && productionEngine) {
    return `${visualDna}\n\n${"=".repeat(50)}\n${productionEngine}`;
  }
  return visualDna || productionEngine || null;
}