'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Supabase 클라이언트 (모듈 스코프 — 환경변수 안전 체크)
// ============================================================
function createSafeSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }
  return createClient(url, key);
}

const supabase = createSafeSupabaseClient();

// ============================================================
// 타입 정의
// ============================================================
type UploadTab = 'scripts' | 'images' | 'bgm';
type ChannelCategory =
  | 'invest' | 'trading' | 'psychology' | 'health'
  | 'economy' | 'ai_trend' | 'travel' | 'quotes' | 'old_tales';
type BgmFolder = 'shared' | 'custom';

interface UploadedFile {
  name: string;
  displaySize: string;
  tab: UploadTab;
  category: ChannelCategory;
  status: 'uploading' | 'done' | 'error';
  storagePath: string;
  publicUrl?: string;
  errorMessage?: string;
}

// ============================================================
// 상수
// ============================================================
const CHANNEL_CATEGORIES: { id: ChannelCategory; emoji: string; label: string }[] = [
  { id: 'invest', emoji: '💰', label: '투자' },
  { id: 'trading', emoji: '📈', label: '트레이딩' },
  { id: 'psychology', emoji: '🧠', label: '심리' },
  { id: 'health', emoji: '💪', label: '건강' },
  { id: 'economy', emoji: '📊', label: '경제' },
  { id: 'ai_trend', emoji: '🤖', label: 'AI트렌드' },
  { id: 'travel', emoji: '✈️', label: '문화/여행' },
  { id: 'quotes', emoji: '💡', label: '명언' },
  { id: 'old_tales', emoji: '📖', label: '야담' },
];

const FILE_SIZE_LIMITS: Record<UploadTab, number> = {
  scripts: 500 * 1024,        // 500KB
  images: 5 * 1024 * 1024,    // 5MB
  bgm: 30 * 1024 * 1024,      // 30MB
};

const TAB_CONFIG: Record<UploadTab, {
  label: string;
  emoji: string;
  description: string;
  accept: string;
  formats: string;
  maxSizeLabel: string;
  tips: string[];
}> = {
  scripts: {
    label: '대본 참고자료',
    emoji: '📝',
    description: '스타일 가이드, 훅 모음, 벤치마크 대본, CTA 템플릿',
    accept: '.txt,.md',
    formats: 'txt, md',
    maxSizeLabel: '500KB',
    tips: [
      '스타일 가이드 → 말투, 금지 표현, 톤 규칙',
      '훅 모음 → 조회수 높았던 첫 문장들',
      '벤치마크 대본 → 잘 된 영상의 대본 전문',
      'CTA 템플릿 → 구독/좋아요 유도 문구',
    ],
  },
  images: {
    label: '이미지 레퍼런스',
    emoji: '🖼️',
    description: '캐릭터 레퍼런스 → character.png로 자동 저장',
    accept: '.png,.jpg,.jpeg,.webp',
    formats: 'png, jpg, webp',
    maxSizeLabel: '5MB',
    tips: [
      '캐릭터 이미지 → 자동으로 character.png로 저장',
      '같은 카테고리에 다시 올리면 기존 파일 덮어쓰기',
      '영상에 반복 등장할 캐릭터를 올려주세요',
    ],
  },
  bgm: {
    label: 'BGM 음악',
    emoji: '🎵',
    description: '공유 BGM 또는 개인 커스텀 BGM',
    accept: '.mp3,.wav',
    formats: 'mp3, wav',
    maxSizeLabel: '30MB',
    tips: [
      '공유 → 모든 카테고리에서 사용 가능한 BGM',
      '커스텀 → 특정 카테고리 전용 BGM',
      '저작권 프리 음원만 업로드하세요',
    ],
  },
};

// ============================================================
// 유틸리티 함수
// ============================================================
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const name = fileName.replace(/\.[^/.]+$/, '');
  const safe = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
  return `${safe}.${ext}`;
}

function isFileSizeValid(file: File, tab: UploadTab): boolean {
  return file.size <= FILE_SIZE_LIMITS[tab];
}

/**
 * 파이프라인 기준 업로드 경로 생성
 *
 * images → {userId}/references/{category}/character.{ext}
 * scripts → {userId}/references/{category}/{timestamp}_{name}
 *           (knowledge_base.txt라는 이름이면 그대로 유지)
 * bgm → {userId}/bgm/shared/{name} 또는 {userId}/bgm/custom/{name}
 */
function buildStoragePath(
  userId: string,
  tab: UploadTab,
  category: ChannelCategory,
  fileName: string,
  bgmFolder: BgmFolder,
): string {
  const safe = sanitizeFileName(fileName);

  switch (tab) {
    case 'images': {
      const ext = safe.split('.').pop() || 'png';
      return `${userId}/references/${category}/character.${ext}`;
    }
    case 'scripts': {
      const isKnowledgeBase = fileName.toLowerCase().includes('knowledge_base');
      const finalName = isKnowledgeBase ? 'knowledge_base.txt' : `${Date.now()}_${safe}`;
      return `${userId}/references/${category}/${finalName}`;
    }
    case 'bgm': {
      return `${userId}/bgm/${bgmFolder}/${safe}`;
    }
  }
}

// ============================================================
// 컴포넌트
// ============================================================
export default function UploadPage() {
  const params = useParams();
  const userId = params.token as string;

  const [activeTab, setActiveTab] = useState<UploadTab>('scripts');
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>('invest');
  const [bgmFolder, setBgmFolder] = useState<BgmFolder>('shared');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // 토큰 유효성 검사 (숫자만 허용 — 텔레그램 ID)
  useEffect(() => {
    const isNumeric = /^\d+$/.test(userId);
    setIsValidToken(isNumeric && userId.length >= 5);
  }, [userId]);
    // 카테고리/탭 변경 시 Supabase에서 기존 파일 로드
  const loadExistingFiles = useCallback(async () => {
    if (!isValidToken) return;

    try {
      const existingFiles: UploadedFile[] = [];

      // 1) references/{category}/ 에서 이미지 + 스크립트 로드
      const { data: refFiles } = await supabase.storage
        .from('uploads')
        .list(`${userId}/references/${selectedCategory}`, { limit: 50 });

      if (refFiles) {
        for (const f of refFiles) {
          if (!f.name || f.name === '.emptyFolderPlaceholder') continue;

          const isImage = /\.(png|jpg|jpeg|webp)$/i.test(f.name);
          const storagePath = `${userId}/references/${selectedCategory}/${f.name}`;
          const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(storagePath);

          existingFiles.push({
            name: f.name,
            displaySize: formatFileSize(f.metadata?.size || 0),
            tab: isImage ? 'images' : 'scripts',
            category: selectedCategory,
            status: 'done',
            storagePath,
            publicUrl: urlData.publicUrl,
          });
        }
      }

      // 2) bgm/shared/ + bgm/custom/ 로드
      for (const folder of ['shared', 'custom'] as BgmFolder[]) {
        const { data: bgmFiles } = await supabase.storage
          .from('uploads')
          .list(`${userId}/bgm/${folder}`, { limit: 50 });

        if (bgmFiles) {
          for (const f of bgmFiles) {
            if (!f.name || f.name === '.emptyFolderPlaceholder') continue;

            const storagePath = `${userId}/bgm/${folder}/${f.name}`;
            const { data: urlData } = supabase.storage
              .from('uploads')
              .getPublicUrl(storagePath);

            existingFiles.push({
              name: f.name,
              displaySize: formatFileSize(f.metadata?.size || 0),
              tab: 'bgm',
              category: selectedCategory,
              status: 'done',
              storagePath,
              publicUrl: urlData.publicUrl,
            });
          }
        }
      }

      setFiles(existingFiles);
    } catch (err) {
      console.error('Failed to load existing files:', err);
    }
  }, [userId, selectedCategory, isValidToken]);

  useEffect(() => {
    loadExistingFiles();
  }, [loadExistingFiles]);


  const uploadSingleFile = useCallback(async (file: File) => {
    const tab = activeTab;
    const category = selectedCategory;
    const folder = bgmFolder;

    if (!isFileSizeValid(file, tab)) {
      const limit = TAB_CONFIG[tab].maxSizeLabel;
      alert(`파일 크기 초과: ${file.name} (최대 ${limit})`);
      return;
    }

    const storagePath = buildStoragePath(userId, tab, category, file.name, folder);

    const newFile: UploadedFile = {
      name: file.name,
      displaySize: formatFileSize(file.size),
      tab,
      category,
      status: 'uploading',
      storagePath,
    };

    setFiles(prev => [newFile, ...prev]);

    try {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(storagePath);

      setFiles(prev =>
        prev.map(f =>
          f.storagePath === storagePath && f.status === 'uploading'
            ? { ...f, status: 'done', publicUrl: urlData.publicUrl }
            : f
        )
      );
      await loadExistingFiles();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setFiles(prev =>
        prev.map(f =>
          f.storagePath === storagePath && f.status === 'uploading'
            ? { ...f, status: 'error', errorMessage: err.message || '업로드 실패' }
            : f
        )
      );
    }
  }, [activeTab, selectedCategory, bgmFolder, userId]);

  const deleteFile = useCallback(async (file: UploadedFile) => {
    try {
      await supabase.storage.from('uploads').remove([file.storagePath]);
      setFiles(prev => prev.filter(f => f.storagePath !== file.storagePath));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(uploadSingleFile);
  }, [uploadSingleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(uploadSingleFile);
      e.target.value = '';
    }
  }, [uploadSingleFile]);

  // 무효 토큰 화면
  if (isValidToken === false) {
    return (
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <div style={styles.errorBox}>
            <p style={{ fontSize: '48px' }}>🚫</p>
            <h2 style={{ fontSize: '20px', marginTop: '12px' }}>잘못된 접근입니다</h2>
            <p style={{ color: '#888', marginTop: '8px', fontSize: '14px' }}>
              텔레그램 봇에서 받은 링크로 접속해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (isValidToken === null) {
    return (
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <p style={{ textAlign: 'center', color: '#888' }}>확인 중...</p>
        </div>
      </div>
    );
  }

  const tabConfig = TAB_CONFIG[activeTab];
  const currentTabFiles = files.filter(f => f.tab === activeTab);

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
            🎬 ReelzFactory
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>참고자료 & BGM 업로드</p>
        </div>

        {/* 카테고리 선택 */}
        <div style={styles.sectionBox}>
          <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '10px' }}>
            📂 채널 카테고리
          </h3>
          <div style={styles.categoryGrid}>
            {CHANNEL_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  ...styles.categoryButton,
                  border: selectedCategory === cat.id ? '2px solid #2563eb' : '1px solid #333',
                  background: selectedCategory === cat.id ? '#1e3a5f' : '#111',
                  color: selectedCategory === cat.id ? '#60a5fa' : '#888',
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div style={styles.tabBar}>
          {(Object.keys(TAB_CONFIG) as UploadTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabButton,
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                background: activeTab === tab ? '#2563eb' : 'transparent',
                color: activeTab === tab ? 'white' : '#888',
              }}
            >
              {TAB_CONFIG[tab].emoji} {TAB_CONFIG[tab].label}
            </button>
          ))}
        </div>

        {/* 탭 설명 */}
        <div style={styles.sectionBox}>
          <h3 style={{ fontSize: '15px', marginBottom: '8px', color: '#60a5fa' }}>
            {tabConfig.emoji} {tabConfig.label}
          </h3>
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
            {tabConfig.description}
          </p>
          <p style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '12px' }}>
            최대 파일 크기: {tabConfig.maxSizeLabel}
          </p>
          <div style={{ fontSize: '12px', color: '#777' }}>
            {tabConfig.tips.map((tip, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>→ {tip}</div>
            ))}
          </div>
        </div>

        {/* BGM 폴더 선택 */}
        {activeTab === 'bgm' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[
              { value: 'shared' as BgmFolder, label: '🎶 공유 BGM', desc: '모든 카테고리 공용' },
              { value: 'custom' as BgmFolder, label: '🎸 커스텀', desc: '개인 전용' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setBgmFolder(opt.value)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: bgmFolder === opt.value ? '2px solid #2563eb' : '1px solid #333',
                  background: bgmFolder === opt.value ? '#1e3a5f' : '#111',
                  color: bgmFolder === opt.value ? '#60a5fa' : '#888',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* 드래그 앤 드롭 영역 */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
          style={{
            ...styles.dropZone,
            borderColor: isDragging ? '#2563eb' : '#444',
            background: isDragging ? 'rgba(37,99,235,0.1)' : '#111',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>{tabConfig.emoji}</div>
          <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
            파일을 드래그하거나 클릭
          </p>
          <p style={{ color: '#666', fontSize: '13px' }}>
            지원 형식: {tabConfig.formats} · 최대 {tabConfig.maxSizeLabel}
          </p>
          <input
            id="fileInput"
            type="file"
            multiple
            accept={tabConfig.accept}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* 업로드 파일 목록 */}
        {currentTabFiles.length > 0 && (
          <div style={styles.fileList}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#60a5fa' }}>
              업로드된 파일 ({currentTabFiles.length})
            </h3>
            {currentTabFiles.map((f, i) => (
              <div key={f.storagePath} style={{
                ...styles.fileRow,
                borderBottom: i < currentTabFiles.length - 1 ? '1px solid #222' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>
                    {f.tab === 'bgm' ? '🎵' : f.tab === 'images' ? '🖼️' : '📝'}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {f.displaySize} · {CHANNEL_CATEGORIES.find(c => c.id === f.category)?.label}
                    </div>
                    {f.errorMessage && (
                      <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
                        {f.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '18px' }}>
                    {f.status === 'uploading' ? '⏳' : f.status === 'done' ? '✅' : '❌'}
                  </span>
                  {f.status !== 'uploading' && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteFile(f); }}
                      style={styles.deleteButton}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 경로 미리보기 (개발자용) */}
        <div style={{ marginTop: '16px', padding: '12px', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #222' }}>
          <p style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>저장 경로 미리보기:</p>
          <p style={{ fontSize: '11px', color: '#444', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {buildStoragePath(userId, activeTab, selectedCategory, 'example.png', bgmFolder)}
          </p>
        </div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: '11px', marginTop: '24px' }}>
          ReelzFactory © 2026 · Powered by AI
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 스타일 (인라인 — 컴포넌트 밖에서 관리)
// ============================================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
    color: 'white',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  wrapper: {
    maxWidth: '640px',
    margin: '0 auto',
  },
  sectionBox: {
    background: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  categoryButton: {
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    background: '#111',
    borderRadius: '12px',
    padding: '6px',
  },
  tabButton: {
    flex: 1,
    padding: '10px 8px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  dropZone: {
    border: '2px dashed #444',
    borderRadius: '16px',
    padding: '40px 20px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '20px',
  },
  fileList: {
    background: '#111',
    borderRadius: '12px',
    padding: '16px',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#666',
  },
  errorBox: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  },
};
