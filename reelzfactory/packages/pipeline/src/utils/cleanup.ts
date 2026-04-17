import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// 파일 정리 유틸리티
// ============================================================

/**
 * outputs 폴더 용량 체크 (MB 단위)
 */
export function getOutputsFolderSize(outputDir: string = './outputs'): number {
  if (!fs.existsSync(outputDir)) return 0;

  let totalSize = 0;
  const files = getAllFiles(outputDir);
  for (const file of files) {
    totalSize += fs.statSync(file).size;
  }
  return totalSize / (1024 * 1024);
}

/**
 * 오래된 프로젝트 폴더 삭제 (기본 7일)
 */
export function cleanupOldProjects(
  outputDir: string = './outputs',
  maxAgeDays: number = 7
): { deleted: number; freedMB: number } {
  if (!fs.existsSync(outputDir)) return { deleted: 0, freedMB: 0 };

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let freedBytes = 0;

  const entries = fs.readdirSync(outputDir);
  for (const entry of entries) {
    const fullPath = path.join(outputDir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && entry.startsWith('project_')) {
      const age = now - stat.mtimeMs;
      if (age > maxAgeMs) {
        const folderSize = getFolderSize(fullPath);
        fs.rmSync(fullPath, { recursive: true, force: true });
        deleted++;
        freedBytes += folderSize;
        console.log(`🗑️ 삭제: ${entry} (${(folderSize / 1024 / 1024).toFixed(1)}MB)`);
      }
    }
  }

  const freedMB = freedBytes / (1024 * 1024);
  if (deleted > 0) {
    console.log(`✅ 정리 완료: ${deleted}개 폴더, ${freedMB.toFixed(1)}MB 확보`);
  }
  return { deleted, freedMB };
}

/**
 * 용량 초과 시 가장 오래된 것부터 삭제 (기본 5GB)
 */
export function enforceStorageLimit(
  outputDir: string = './outputs',
  maxSizeMB: number = 5000
): void {
  let currentSize = getOutputsFolderSize(outputDir);
  if (currentSize <= maxSizeMB) return;

  console.log(`⚠️ 용량 초과: ${currentSize.toFixed(0)}MB / ${maxSizeMB}MB`);

  const entries = fs.readdirSync(outputDir)
    .filter((e) => e.startsWith('project_'))
    .map((e) => ({
      name: e,
      path: path.join(outputDir, e),
      time: fs.statSync(path.join(outputDir, e)).mtimeMs,
    }))
    .sort((a, b) => a.time - b.time);

  for (const entry of entries) {
    if (currentSize <= maxSizeMB) break;
    const size = getFolderSize(entry.path);
    fs.rmSync(entry.path, { recursive: true, force: true });
    currentSize -= size / (1024 * 1024);
    console.log(`🗑️ 용량 확보: ${entry.name} 삭제`);
  }
}

/**
 * 파이프라인 에러 로그 저장
 */
export function logPipelineError(
  topic: string,
  step: string,
  error: Error,
  outputDir: string = './outputs'
): void {
  const logDir = path.join(outputDir, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    topic,
    step,
    error: error.message,
    stack: error.stack,
  };

  const logFile = path.join(logDir, `errors_${new Date().toISOString().split('T')[0]}.json`);
  let logs: any[] = [];

  if (fs.existsSync(logFile)) {
    try {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch {}
  }

  logs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  console.log(`📝 에러 로그 저장: ${logFile}`);
}

// ============================================================
// 내부 헬퍼
// ============================================================
function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function getFolderSize(dir: string): number {
  return getAllFiles(dir).reduce((sum, file) => sum + fs.statSync(file).size, 0);
}