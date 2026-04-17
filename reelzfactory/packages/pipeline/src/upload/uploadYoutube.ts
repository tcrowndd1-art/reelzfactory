import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const CATEGORY_TO_YOUTUBE_ID: Record<string, string> = {
  invest: '27',
  trading: '27',
  psychology: '27',
  health: '27',
  economy: '27',
  ai_trend: '28',
  travel: '19',
  quotes: '22',
  old_tales: '24',
  general: '22',
};

export function getYoutubeCategoryId(category: string): string {
  return CATEGORY_TO_YOUTUBE_ID[category] || '22';
}

export interface UploadOptions {
  videoPath: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'private' | 'unlisted' | 'public';
  categoryId?: string;
}

export interface UploadResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

export async function uploadToYoutube(options: UploadOptions): Promise<UploadResult> {
  const {
    videoPath,
    title,
    description,
    tags = [],
    privacyStatus = 'unlisted',
    categoryId = '22',
  } = options;

  console.log('\n━━━ YouTube 업로드 시작 ━━━');
  console.log(`📁 파일: ${videoPath}`);
  console.log(`📌 제목: ${title}`);
  console.log(`🔒 공개설정: ${privacyStatus}`);
  console.log(`📂 카테고리ID: ${categoryId}`);
  console.log(`🏷️ 태그: ${tags.join(', ')}`);

  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`영상 파일이 없어요: ${videoPath}`);
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('YouTube API 키가 .env에 없어요! YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN 확인');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const fileSize = fs.statSync(videoPath).size;
    console.log(`📊 파일 크기: ${(fileSize / 1024 / 1024).toFixed(1)}MB`);
    console.log('⏳ 업로드 중...');

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: (title + ' #Shorts').substring(0, 100),
          description: description + '\n\n#Shorts',
          tags: tags.slice(0, 30),
          categoryId,
          defaultLanguage: 'ko',
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = response.data.id;
    const videoUrl = `https://youtu.be/${videoId}`;

    console.log('\n✅ YouTube 업로드 완료!');
    console.log(`🔗 링크: ${videoUrl}`);
    console.log(`📌 상태: ${privacyStatus}`);

    return {
      success: true,
      videoId: videoId || undefined,
      videoUrl,
    };

  } catch (error: any) {
    console.error(`\n❌ YouTube 업로드 실패: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
