// packages/pipeline/src/voice/ttsStylePrompts.ts
// Gemini 2.5 Flash TTS – Director's Notes 기반 스타일 프롬프트

export type SupportedLang = 'ko' | 'en' | 'pt' | 'es' | 'ja' | 'vi' | 'th' | 'zh';

interface VoiceStyleConfig {
  voiceName: string;
  directorNote: string;   // 자연어 연기 지시
}

// ── 일반 카테고리 (숏폼/롱폼 기본) ──
export const GENERAL_VOICE_STYLES = {
  shorts_default: {
    ko: {
      voiceName: 'Kore',
      directorNote: `# AUDIO PROFILE: 크리에이터
## "정보 전달 숏폼 크리에이터"

### DIRECTOR'S NOTES
Style: 에너지 넘치고 직접적인 한국 유튜브 크리에이터. 마이크 바로 앞에서 시청자에게 직접 말하는 느낌. 핵심 숫자와 놀라운 사실에서 톤을 올려 강조. "이거 진짜 대박인 게요" 같은 감탄을 자연스럽게.
Pacing: 빠르고 에너지 넘치는 페이스. 4.5-5 음절/초. 훅에서 가장 빠르고, 핵심 데이터 직전에 짧은 멈춤.
Accent: 표준 한국어, 20대 후반 서울 억양.`,
    },
    en: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Creator
## "Info Shorts Creator"

### DIRECTOR'S NOTES
Style: Confident American YouTube creator speaking directly to camera. Fast, punchy delivery. Emphasize key numbers with rising intonation. End statements with conviction, not questions.
Pacing: 160-180 wpm. Energetic and driving. Brief pause before big reveals.
Accent: Standard American English, Gen-Z casual but authoritative.`,
    },
    pt: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Criador
## "Criador de Shorts Informativo"

### DIRECTOR'S NOTES
Style: Criadora brasileira animada e acolhedora. Tom caloroso com entusiasmo genuíno. Enfatize números e dados com energia.
Pacing: Ritmo levemente acelerado, natural e fluido.
Accent: Português brasileiro, sotaque paulista jovem.`,
    },
    es: {
      voiceName: 'Sadachbia',
      directorNote: `# AUDIO PROFILE: Creador
## "Creador de Shorts Informativo"

### DIRECTOR'S NOTES
Style: Creador latinoamericano directo y apasionado. Tono seguro, enfatiza cifras y datos con convicción.
Pacing: Ritmo rápido pero claro. Pausas breves antes de datos impactantes.
Accent: Español latinoamericano neutral.`,
    },
    ja: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: クリエイター
## "情報ショートクリエイター"

### DIRECTOR'S NOTES
Style: エネルギッシュなYouTubeクリエイター。丁寧だが緊迫感のあるトーン。数字やキーワードを声のトーンを上げて強調。
Pacing: 7-8モーラ/秒。フックで最速、データ前に短い間。
Accent: 標準東京語アクセント。`,
    },
        vi: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Nhà sáng tạo
## "Nhà sáng tạo Shorts thông tin"

### DIRECTOR'S NOTES
Style: Nhà sáng tạo YouTube Việt Nam trẻ trung, năng động. Nói trực tiếp với khán giả như đang livestream. Nhấn mạnh số liệu và sự thật bất ngờ bằng cách lên giọng.
Pacing: Nhanh và đầy năng lượng. Nhanh nhất ở hook, dừng ngắn trước dữ liệu quan trọng.
Accent: Tiếng Việt chuẩn, giọng Hà Nội trẻ.`,
    },
    th: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: ครีเอเตอร์
## "ครีเอเตอร์ Shorts ให้ข้อมูล"

### DIRECTOR'S NOTES
Style: ครีเอเตอร์ YouTube ไทยที่มีพลัง พูดตรงกับกล้องด้วยความตื่นเต้น เน้นตัวเลขและข้อมูลน่าทึ่งด้วยการขึ้นเสียง
Pacing: เร็วและมีพลัง เร็วสุดที่ hook หยุดสั้นก่อนข้อมูลสำคัญ
Accent: ภาษาไทยมาตรฐาน สำเนียงกรุงเทพ วัยรุ่น`,
    },
    zh: {
      voiceName: 'Kore',
      directorNote: `# AUDIO PROFILE: 创作者
## "信息类短视频创作者"

### DIRECTOR'S NOTES
Style: 充满活力的华语YouTube创作者。直接对镜头说话，像在和观众面对面聊天。用升调强调关键数字和惊人事实。
Pacing: 快速且充满能量。Hook处最快，关键数据前短暂停顿。
Accent: 标准普通话，年轻自然的语调。`,
    },

  },
  longform_default: {
    ko: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: 내레이터
## "다큐멘터리 나레이터"

### DIRECTOR'S NOTES
Style: 차분하고 신뢰감 있는 한국 다큐멘터리 나레이터. 따뜻하지만 권위 있는 톤. 중요한 데이터 포인트 앞에서 살짝 멈춤.
Pacing: 3.5-4 음절/초. 여유 있고 안정적인 리듬.
Accent: 표준 한국어, 30대 중반 아나운서 톤.`,
    },
    en: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: Narrator
## "Documentary Narrator"

### DIRECTOR'S NOTES
Style: Professional documentary narrator combined with podcast host. Warm, measured, authoritative. Strategic pauses before key insights.
Pacing: 140-155 wpm. Steady, unhurried rhythm.
Accent: Standard American English, mature and polished.`,
    },
    pt: {
      voiceName: 'Algieba',
      directorNote: `# AUDIO PROFILE: Narrador
## "Narrador de Documentário"

### DIRECTOR'S NOTES
Style: Narrador de documentário brasileiro experiente. Tom calmo, confiável. Pause antes de dados importantes.
Pacing: Ritmo moderado e estável.
Accent: Português brasileiro culto.`,
    },
    es: {
      voiceName: 'Rasalgethi',
      directorNote: `# AUDIO PROFILE: Narrador
## "Narrador de Documentales"

### DIRECTOR'S NOTES
Style: Narrador de documentales latinoamericano. Tono sereno, confiable. Pausas estratégicas.
Pacing: Ritmo moderado, sin prisa.
Accent: Español latinoamericano neutro, formal.`,
    },
    ja: {
      voiceName: 'Sadaltager',
      directorNote: `# AUDIO PROFILE: ナレーター
## "ドキュメンタリーナレーター"

### DIRECTOR'S NOTES
Style: NHKドキュメンタリーのナレーターのように、落ち着いた専門的な日本語。データの前に間を置く。
Pacing: 適度なペース、安定したリズム。
Accent: 標準東京語、アナウンサー調。`,
    },

        vi: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: Người dẫn chuyện
## "Người dẫn chuyện phim tài liệu"

### DIRECTOR'S NOTES
Style: Người dẫn chuyện phim tài liệu Việt Nam điềm tĩnh và đáng tin cậy. Ấm áp nhưng có uy. Dừng nhẹ trước các điểm dữ liệu quan trọng.
Pacing: 3.5-4 âm tiết/giây. Nhịp điệu ổn định và thoải mái.
Accent: Tiếng Việt chuẩn, giọng phát thanh viên.`,
    },
    th: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: ผู้บรรยาย
## "ผู้บรรยายสารคดี"

### DIRECTOR'S NOTES
Style: ผู้บรรยายสารคดีไทยที่สงบและน่าเชื่อถือ อบอุ่นแต่มีอำนาจ หยุดเล็กน้อยก่อนจุดข้อมูลสำคัญ
Pacing: จังหวะสม่ำเสมอและผ่อนคลาย ไม่เร่งรีบ
Accent: ภาษาไทยมาตรฐาน น้ำเสียงผู้ประกาศข่าว`,
    },
    zh: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: 旁白
## "纪录片旁白"

### DIRECTOR'S NOTES
Style: 冷静且值得信赖的华语纪录片旁白。温暖但权威。在重要数据点前稍作停顿。
Pacing: 每秒3.5-4个音节。稳定从容的节奏。
Accent: 标准普通话，播音员质感。`,
    },

  },
} as const;

// ── 쇼핑 카테고리 ──
export const SHOPPING_VOICE_STYLES = {
  shopping_beauty: {
    ko: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: 뷰티 크리에이터
## "겟레디윗미 뷰티 인플루언서"

### THE SCENE
밝은 자연광이 들어오는 화이트톤 드레싱룸. 거울 앞에 화장품이 펼쳐져 있고, 카메라가 바로 앞에 있다.

### DIRECTOR'S NOTES
Style: 25세 한국 뷰티 인플루언서. 흥분되지만 진짜 느낌. "이거 진짜 미쳤어" 에너지. 제품 장점 나열할 때 속도 올리고, 텍스처 설명할 때 느려지기. 비밀 팁 공유할 때 살짝 속삭이듯이.
Pacing: 빠르고 경쾌한 리듬. 감탄할 때 더 빠르게, 제품 디테일에서 천천히.
Accent: 서울 20대 여성 일상 톤, 자연스러운 리액션.`,
    },
    en: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Beauty Creator
## "Get Ready With Me Beauty Influencer"

### THE SCENE
A bright, white-toned vanity setup with natural lighting. Products spread out on the counter, camera right in front.

### DIRECTOR'S NOTES
Style: Gen-Z beauty reviewer on TikTok. Bubbly, expressive, genuine excitement. Speed up for product features, soften voice for "secret tips." Say brand names clearly and with love.
Pacing: Energetic and bouncy. Faster during excitement, slower for texture and shade descriptions.
Accent: Southern California, young and trendy.`,
    },
    pt: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Criadora de Beleza
## "Influenciadora de Beleza"

### DIRECTOR'S NOTES
Style: Influenciadora de beleza brasileira, animada e autêntica. "Gente, esse produto é INCRÍVEL!" Acelere nos benefícios, suavize a voz para dicas especiais.
Pacing: Rápido e alegre, mais lento para texturas.
Accent: Português brasileiro jovem, sotaque paulista.`,
    },
    es: {
      voiceName: 'Sadachbia',
      directorNote: `# AUDIO PROFILE: Creadora de Belleza
## "Influencer de Belleza"

### DIRECTOR'S NOTES
Style: Influencer de belleza latina, entusiasta y cercana. "¡Esto me cambió la piel!" Acelera en beneficios, baja la voz para tips secretos.
Pacing: Rápido y alegre, más lento para texturas.
Accent: Español latinoamericano, joven y natural.`,
    },
    ja: {
      voiceName: 'Aoede',
      directorNote: `# AUDIO PROFILE: ビューティークリエイター
## "コスメレビュアー"

### DIRECTOR'S NOTES
Style: 美容系YouTuberとして。「これ本当にすごい！」というテンションで。成分説明は丁寧に、おすすめポイントは熱く。
Pacing: 明るくテンポ良く。感動ポイントで加速、成分詳細で減速。
Accent: 標準語、20代女性の自然なトーン。`,
    },

        vi: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Beauty Creator
## "Vietnamese Beauty Influencer"

### THE SCENE
Phòng trang điểm tông trắng với ánh sáng tự nhiên. Mỹ phẩm bày trên bàn, camera ngay trước mặt.

### DIRECTOR'S NOTES
Style: Influencer làm đẹp Việt Nam 25 tuổi. Hào hứng nhưng chân thật. "Sản phẩm này xịn lắm luôn!" Nói nhanh khi liệt kê ưu điểm, chậm lại khi mô tả kết cấu. Thì thầm nhẹ khi chia sẻ bí quyết.
Pacing: Nhanh và vui vẻ, chậm lại ở chi tiết sản phẩm.
Accent: Tiếng Việt chuẩn, giọng nữ trẻ Sài Gòn.`,
    },
    th: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Beauty Creator
## "Thai Beauty Influencer"

### THE SCENE
ห้องแต่งตัวโทนขาวสว่างด้วยแสงธรรมชาติ เครื่องสำอางวางเรียงบนโต๊ะ กล้องอยู่ตรงหน้า

### DIRECTOR'S NOTES
Style: อินฟลูเอนเซอร์ความงามไทยวัย 25 ปี ตื่นเต้นแต่จริงใจ "ตัวนี้ดีมากเลยนะคะ!" เร็วขึ้นเมื่อบอกข้อดี ช้าลงเมื่ออธิบายเนื้อสัมผัส กระซิบเบาๆเมื่อแชร์เคล็ดลับ
Pacing: เร็วและสดใส ช้าลงที่รายละเอียดสินค้า
Accent: ภาษาไทยมาตรฐาน เสียงผู้หญิงวัยรุ่น สำเนียงกรุงเทพ`,
    },
    zh: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: 美妆博主
## "美妆种草达人"

### THE SCENE
明亮的白色系化妆间，自然光透进来。化妆品摆满桌面，镜头就在眼前。

### DIRECTOR'S NOTES
Style: 25岁华语美妆博主。兴奋但真实。"这个真的绝了！"的能量。列举产品优点时加速，描述质地时放慢。分享秘诀时轻声细语。
Pacing: 快速活泼，产品细节处放慢。
Accent: 标准普通话，年轻女性自然语调。`,
    },

  },
  shopping_health: {
    ko: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: 건강 전문가
## "신뢰할 수 있는 건강 어드바이저"

### THE SCENE
깔끔한 홈 오피스. 책상 위에 영양제 병들이 정돈되어 있고, 뒤에 건강 관련 서적이 보인다.

### DIRECTOR'S NOTES
Style: 30대 한국 건강 어드바이저. 약사 친구가 솔직하게 조언해주는 느낌. 성분 설명에서는 차분하고 신뢰감 있게, 개인 체험 결과에서는 살짝 더 에너지 올리기.
Pacing: 전반적으로 차분. 성분명은 또박또박, 결과 공유할 때 약간 빨라짐.
Accent: 표준 한국어, 전문가 톤.`,
    },
    en: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: Health Advisor
## "Trusted Wellness Reviewer"

### DIRECTOR'S NOTES
Style: Credible health & wellness reviewer. Calm, informed, like a trusted friend who researches everything. Measured pace for science, warmer tone for personal results.
Pacing: Steady and measured. Slower for ingredients, slightly faster for personal anecdotes.
Accent: Standard American English, professional and warm.`,
    },
    pt: {
      voiceName: 'Algieba',
      directorNote: `# AUDIO PROFILE: Consultor de Saúde
## "Reviewer de Bem-Estar"

### DIRECTOR'S NOTES
Style: Consultor de saúde brasileiro confiável. Tom calmo e informativo para ingredientes, mais caloroso ao compartilhar resultados pessoais.
Pacing: Moderado e estável. Mais lento para ciência, levemente mais rápido para experiência pessoal.
Accent: Português brasileiro culto.`,
    },
    es: {
      voiceName: 'Rasalgethi',
      directorNote: `# AUDIO PROFILE: Asesor de Salud
## "Reviewer de Bienestar"

### DIRECTOR'S NOTES
Style: Asesor de salud confiable. Tono calmado para ingredientes, más cálido para resultados personales. Credibilidad ante todo.
Pacing: Moderado. Más lento en ciencia, más fluido en experiencia.
Accent: Español latinoamericano, profesional.`,
    },
    ja: {
      voiceName: 'Sadaltager',
      directorNote: `# AUDIO PROFILE: 健康アドバイザー
## "信頼できる健康レビュアー"

### DIRECTOR'S NOTES
Style: 健康アドバイザーとして、信頼感のある落ち着いたトーンで。成分説明は丁寧に、体験談は少し温かく。
Pacing: 全体的に落ち着いたペース。成分名は明確に。
Accent: 標準語、専門家トーン。`,
    },

        vi: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: Chuyên gia sức khỏe
## "Tư vấn viên sức khỏe đáng tin cậy"

### THE SCENE
Văn phòng tại nhà gọn gàng. Lọ thực phẩm chức năng xếp ngay ngắn trên bàn, phía sau là kệ sách về sức khỏe.

### DIRECTOR'S NOTES
Style: Chuyên gia tư vấn sức khỏe Việt Nam 30 tuổi. Như người bạn dược sĩ cho lời khuyên thật lòng. Bình tĩnh và đáng tin khi giải thích thành phần, thêm chút năng lượng khi chia sẻ kết quả cá nhân.
Pacing: Tổng thể bình tĩnh. Rõ ràng khi nói tên thành phần, nhanh hơn chút khi kể trải nghiệm.
Accent: Tiếng Việt chuẩn, giọng chuyên gia.`,
    },
    th: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: ผู้เชี่ยวชาญสุขภาพ
## "ที่ปรึกษาสุขภาพที่น่าเชื่อถือ"

### THE SCENE
โฮมออฟฟิศสะอาดเรียบร้อย ขวดอาหารเสริมเรียงบนโต๊ะ ด้านหลังมีหนังสือเกี่ยวกับสุขภาพ

### DIRECTOR'S NOTES
Style: ที่ปรึกษาสุขภาพไทยวัย 30 ปี เหมือนเพื่อนเภสัชกรที่ให้คำแนะนำจริงใจ สงบและน่าเชื่อถือเมื่ออธิบายส่วนผสม เพิ่มพลังเล็กน้อยเมื่อแชร์ผลลัพธ์ส่วนตัว
Pacing: โดยรวมสงบ ชัดเจนเมื่อพูดชื่อส่วนผสม เร็วขึ้นเล็กน้อยเมื่อเล่าประสบการณ์
Accent: ภาษาไทยมาตรฐาน น้ำเสียงผู้เชี่ยวชาญ`,
    },
    zh: {
      voiceName: 'Charon',
      directorNote: `# AUDIO PROFILE: 健康专家
## "值得信赖的健康顾问"

### THE SCENE
整洁的居家办公室。营养品整齐摆放在桌上，身后是健康类书籍。

### DIRECTOR'S NOTES
Style: 30岁华语健康顾问。像药剂师朋友给你真诚建议。解释成分时冷静可信，分享个人体验时稍微提升能量。
Pacing: 整体沉稳。成分名称清晰发音，分享结果时略加快。
Accent: 标准普通话，专业人士语调。`,
    },

  },
  shopping_home: {
    ko: {
      voiceName: 'Kore',
      directorNote: `# AUDIO PROFILE: 홈 리뷰어
## "가전·인테리어 리뷰어"

### THE SCENE
새로 꾸민 거실. 리뷰할 제품이 테이블 위에 놓여 있고, 생활감이 느껴지는 공간.

### DIRECTOR'S NOTES
Style: 실용적이고 열정적인 홈 리뷰어. "이거 우리 집에 놓으니까 분위기가 확 달라졌어요" 에너지. 스펙 설명할 때 빠르게, 라이프스타일 묘사할 때 느리게.
Pacing: 보통 속도, 스펙에서 약간 빨라지고 결과 보여줄 때 여유롭게.
Accent: 표준 한국어, 친근한 이웃 느낌.`,
    },
    en: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Home Reviewer
## "Home Gadget Reviewer"

### DIRECTOR'S NOTES
Style: Practical home gadget reviewer. Enthusiastic but grounded. Excited about functionality, honest about downsides. Clear enunciation for product names and specs.
Pacing: Normal speed, faster for specs, slower for lifestyle moments.
Accent: Standard American English, relatable and friendly.`,
    },
    pt: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Revisor de Casa
## "Criador de Conteúdo de Casa e Decoração"

### DIRECTOR'S NOTES
Style: Criadora brasileira de conteúdo sobre casa e decoração. Prática e animada. "Olha como ficou!" Acelere nas especificações, desacelere para mostrar o resultado.
Pacing: Normal, mais rápido em specs, mais pausado em lifestyle.
Accent: Português brasileiro, casual e acolhedor.`,
    },
    es: {
      voiceName: 'Sadachbia',
      directorNote: `# AUDIO PROFILE: Revisor del Hogar
## "Creador de Contenido de Hogar"

### DIRECTOR'S NOTES
Style: Creador de contenido de hogar y decoración. Práctico y entusiasta. "¡Mira cómo quedó!" Velocidad normal para especificaciones, más pausado para resultados.
Pacing: Normal, variado según contexto.
Accent: Español latinoamericano, cercano.`,
    },
    ja: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: ホームレビュアー
## "家電・インテリアレビュアー"

### DIRECTOR'S NOTES
Style: ホームガジェットレビュアーとして、実用的で明るいトーン。スペックは明確に、使用感は感動を込めて。
Pacing: 通常ペース、スペックでやや加速、結果でゆったり。
Accent: 標準語、親しみやすいトーン。`,
    },

        vi: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Reviewer đồ gia dụng
## "Reviewer nội thất & gia dụng"

### THE SCENE
Phòng khách mới trang trí. Sản phẩm review đặt trên bàn, không gian có hơi thở cuộc sống.

### DIRECTOR'S NOTES
Style: Reviewer đồ gia dụng Việt Nam thực tế và nhiệt tình. "Đặt cái này trong nhà là khác biệt luôn!" Nhanh khi nói spec, chậm khi mô tả lifestyle.
Pacing: Tốc độ bình thường, nhanh hơn ở spec, thong thả khi cho thấy kết quả.
Accent: Tiếng Việt chuẩn, giọng thân thiện như hàng xóm.`,
    },
    th: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: รีวิวเวอร์ของใช้ในบ้าน
## "รีวิวเวอร์เครื่องใช้ไฟฟ้า & ตกแต่งบ้าน"

### THE SCENE
ห้องนั่งเล่นตกแต่งใหม่ สินค้ารีวิววางบนโต๊ะ พื้นที่มีชีวิตชีวา

### DIRECTOR'S NOTES
Style: รีวิวเวอร์ของใช้ในบ้านไทยที่เป็นมิตรและกระตือรือร้น "วางตัวนี้ในบ้านแล้วบรรยากาศเปลี่ยนเลย!" เร็วขึ้นเมื่อพูด spec ช้าลงเมื่อบอก lifestyle
Pacing: ความเร็วปกติ เร็วขึ้นที่ spec ผ่อนคลายเมื่อโชว์ผลลัพธ์
Accent: ภาษาไทยมาตรฐาน เป็นมิตรเหมือนเพื่อนบ้าน`,
    },
    zh: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: 家居评测博主
## "家电·家居评测"

### THE SCENE
新装修的客厅。评测产品放在桌上，空间充满生活气息。

### DIRECTOR'S NOTES
Style: 务实又热情的华语家居评测博主。"这个放在家里氛围完全不一样了！"说参数时加快，描述生活场景时放慢。
Pacing: 正常速度，参数处加快，展示效果时从容。
Accent: 标准普通话，亲切邻居感。`,
    },

  },
  shopping_tech: {
    ko: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: 테크 크리에이터
## "언박싱 테크 유튜버"

### THE SCENE
어두운 조명의 테크 스튜디오. RGB 조명이 뒤에서 빛나고, 박스가 테이블 위에 놓여있다.

### DIRECTOR'S NOTES
Style: 흥분한 한국 테크 유튜버 언박싱 중. "이 스펙 보고 소름 돋았다" 에너지. 스펙 나열할 때 빠르게, 리빌 모먼트 전에 극적인 멈춤. 살짝 너디한 열정.
Pacing: 전반적으로 빠름. 스펙 드롭 시 가장 빠르고, 리빌 전 극적 멈춤.
Accent: 표준 한국어, 20대 남성 테크 덕후 느낌.`,
    },
    en: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Tech Creator
## "Unboxing Tech YouTuber"

### THE SCENE
Dark tech studio with RGB lighting behind. A sealed box sits on the desk.

### DIRECTOR'S NOTES
Style: Tech YouTuber mid-unboxing. High energy, spec-focused. Dramatic pauses before big reveals. "And the battery life? Insane." Confident and slightly nerdy.
Pacing: Fast overall. Fastest during spec drops, dramatic pauses before reveals.
Accent: Standard American English, tech-savvy casual.`,
    },
    pt: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Criador Tech
## "Tech Reviewer Brasileiro"

### DIRECTOR'S NOTES
Style: Tech reviewer brasileiro empolgado. "Olha esse processador, cara!" Rápido nas especificações, pausa dramática antes das revelações.
Pacing: Rápido, com pausas estratégicas.
Accent: Português brasileiro, jovem e tech.`,
    },
    es: {
      voiceName: 'Sadachbia',
      directorNote: `# AUDIO PROFILE: Creador Tech
## "Tech Reviewer Latino"

### DIRECTOR'S NOTES
Style: Tech reviewer latino emocionado por el unboxing. "¡Miren estas especificaciones!" Rápido en specs, pausas dramáticas antes de revelaciones.
Pacing: Rápido con pausas estratégicas.
Accent: Español latinoamericano, joven y tech.`,
    },
    ja: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: テッククリエイター
## "アンボクシング系YouTuber"

### DIRECTOR'S NOTES
Style: テック系YouTuberとしてアンボクシング中のテンション。スペック紹介は素早く、驚きの瞬間前に間を置く。
Pacing: 全体的に速め。スペックで最速、リビール前に劇的な間。
Accent: 標準語、テック好き男性。`,
    },

        vi: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: Tech Creator
## "Unboxing Tech YouTuber Việt Nam"

### THE SCENE
Studio công nghệ ánh sáng tối. Đèn RGB phía sau, hộp sản phẩm trên bàn.

### DIRECTOR'S NOTES
Style: YouTuber công nghệ Việt Nam đang unboxing hào hứng. "Cấu hình này mình nổi da gà luôn!" Nhanh khi liệt kê spec, dừng kịch tính trước reveal. Hơi nerdy và đam mê.
Pacing: Nhanh tổng thể. Nhanh nhất khi drop spec, dừng kịch tính trước reveal.
Accent: Tiếng Việt chuẩn, giọng nam trẻ đam mê công nghệ.`,
    },
    th: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: Tech Creator
## "Unboxing Tech YouTuber ไทย"

### THE SCENE
สตูดิโอเทคโนโลยีแสงมืด ไฟ RGB ด้านหลัง กล่องสินค้าวางบนโต๊ะ

### DIRECTOR'S NOTES
Style: YouTuber เทคไทยกำลัง unboxing อย่างตื่นเต้น "สเปคตัวนี้ขนลุกเลย!" เร็วเมื่อบอก spec หยุดดราม่าก่อน reveal เนิร์ดนิดๆแต่หลงใหล
Pacing: เร็วโดยรวม เร็วสุดตอน drop spec หยุดดราม่าก่อน reveal
Accent: ภาษาไทยมาตรฐาน เสียงชายหนุ่มรักเทค`,
    },
    zh: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: 科技博主
## "开箱科技YouTuber"

### THE SCENE
暗色调科技工作室。RGB灯光在身后闪烁，产品包装盒放在桌上。

### DIRECTOR'S NOTES
Style: 兴奋的华语科技YouTuber正在开箱。"这个配置看到我直接起鸡皮疙瘩！"列参数时快速，揭晓时刻前戏剧性停顿。略带极客热情。
Pacing: 整体偏快。参数时最快，reveal前戏剧性停顿。
Accent: 标准普通话，年轻男性科技迷。`,
    },

  },
  shopping_fashion: {
    ko: {
      voiceName: 'Aoede',
      directorNote: `# AUDIO PROFILE: 패션 크리에이터
## "데일리룩 패션 인플루언서"

### THE SCENE
미니멀한 화이트 배경의 촬영 공간. 옷걸이에 오늘의 아이템들이 걸려있다.

### DIRECTOR'S NOTES
Style: 트렌디한 한국 패션 인플루언서. 자신감 넘치는 스타일리시한 바이브. "이 핏 실화?" 에너지. 옷 입어보면서 친구에게 말하는 자연스러운 리듬. 형용사를 살짝 늘여서 강조.
Pacing: 자연스럽고 여유로운 리듬. 감탄할 때 약간 빠르게.
Accent: 서울 20대 여성, 세련된 일상 톤.`,
    },
    en: {
      voiceName: 'Aoede',
      directorNote: `# AUDIO PROFILE: Fashion Creator
## "Fashion Haul Influencer"

### DIRECTOR'S NOTES
Style: Stylish fashion influencer doing a haul. Confident, casual, "obsessed with this fit" energy. Natural conversational flow, emphasize texture and color words.
Pacing: Natural and relaxed. Slightly faster during excitement.
Accent: American English, trendy and polished.`,
    },
    pt: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Criadora de Moda
## "Influenciadora de Moda"

### DIRECTOR'S NOTES
Style: Influenciadora de moda brasileira. Confiante e estilosa. "Gente, esse caimento!" Ritmo natural como se estivesse experimentando roupa com amigas.
Pacing: Natural e descontraído, mais animado nos favoritos.
Accent: Português brasileiro, jovem e fashion.`,
    },
    es: {
      voiceName: 'Sadachbia',
      directorNote: `# AUDIO PROFILE: Creadora de Moda
## "Influencer de Moda"

### DIRECTOR'S NOTES
Style: Influencer de moda latina. Confiada y cercana. "¡Este outfit me encanta!" Ritmo natural como probándose ropa con amigas.
Pacing: Natural y relajado, más rápido en favoritos.
Accent: Español latinoamericano, joven y trendy.`,
    },
    ja: {
      voiceName: 'Aoede',
      directorNote: `# AUDIO PROFILE: ファッションクリエイター
## "デイリーコーデ インフルエンサー"

### DIRECTOR'S NOTES
Style: ファッション系インフルエンサーとして、トレンディで自信のあるトーン。「このシルエット最高」という自然な会話調で。
Pacing: 自然なリズム、お気に入りでやや加速。
Accent: 標準語、おしゃれな20代女性。`,
    },

        vi: {
      voiceName: 'Aoede',
      directorNote: `# AUDIO PROFILE: Fashion Creator
## "Vietnamese Fashion Influencer"

### THE SCENE
Không gian chụp hình nền trắng tối giản. Trang phục hôm nay treo trên giá.

### DIRECTOR'S NOTES
Style: Influencer thời trang Việt Nam sành điệu. Tự tin và phong cách. "Outfit này có thật không?" Nhịp tự nhiên như đang thử đồ và nói chuyện với bạn. Kéo dài tính từ để nhấn mạnh.
Pacing: Tự nhiên và thoải mái. Nhanh hơn chút khi phấn khích.
Accent: Tiếng Việt chuẩn, giọng nữ trẻ thời thượng.`,
    },
    th: {
      voiceName: 'Aoede',
      directorNote: `# AUDIO PROFILE: Fashion Creator
## "Thai Fashion Influencer"

### THE SCENE
สตูดิโอถ่ายรูปพื้นขาวมินิมอล ชุดวันนี้แขวนอยู่บนราว

### DIRECTOR'S NOTES
Style: อินฟลูเอนเซอร์แฟชั่นไทยมีสไตล์ มั่นใจและเท่ "ฟิตนี้จริงเหรอ?" จังหวะเป็นธรรมชาติเหมือนลองเสื้อผ้าแล้วคุยกับเพื่อน ลากคำคุณศัพท์เพื่อเน้น
Pacing: เป็นธรรมชาติและผ่อนคลาย เร็วขึ้นเล็กน้อยเมื่อตื่นเต้น
Accent: ภาษาไทยมาตรฐาน เสียงหญิงสาวทันสมัย`,
    },
    zh: {
      voiceName: 'Aoede',
      directorNote: `# AUDIO PROFILE: 时尚博主
## "每日穿搭时尚达人"

### THE SCENE
极简白色背景的拍摄空间。今天的单品挂在衣架上。

### DIRECTOR'S NOTES
Style: 时尚华语博主。自信又有范儿。"这个版型绝了！"像在试衣间和闺蜜聊天的自然节奏。形容词稍微拉长来强调。
Pacing: 自然从容。兴奋时略加快。
Accent: 标准普通话，年轻女性时尚感。`,
    },

  },
  shopping_food: {
    ko: {
      voiceName: 'Kore',
      directorNote: `# AUDIO PROFILE: 푸드 크리에이터
## "맛집·식품 리뷰어"

### THE SCENE
따뜻한 조명의 주방 또는 카페. 리뷰할 음식이 예쁘게 플레이팅되어 있다.

### DIRECTOR'S NOTES
Style: 한국 푸드 리뷰어. "이거 한 입 먹는 순간 멈출 수 없음" 에너지. 맛 묘사에서 진짜 즐거움과 감각적 표현. 맛 설명할 때 느리게, 흥분할 때 빠르게. 먹는 소리를 상상하게 만들기.
Pacing: 맛 묘사에서 천천히 음미하듯, 추천 멘트에서 에너지 올리기.
Accent: 표준 한국어, 친근하고 맛있는 느낌.`,
    },
    en: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Food Creator
## "Food Review Creator"

### DIRECTOR'S NOTES
Style: Food content creator mid-taste-test. Genuine pleasure and surprise. "Oh my god, the crunch!" Slow for flavor descriptions, fast for excitement. Make the listener hungry.
Pacing: Slow and savoring for taste, fast and excited for recommendations.
Accent: Standard American English, expressive and warm.`,
    },
    pt: {
      voiceName: 'Leda',
      directorNote: `# AUDIO PROFILE: Criador de Comida
## "Food Blogger"

### DIRECTOR'S NOTES
Style: Food blogger brasileira experimentando algo delicioso. "Ai meu Deus, essa textura!" Desacelere nas descrições de sabor, acelere na empolgação.
Pacing: Lento e saboroso para sabor, rápido para entusiasmo.
Accent: Português brasileiro, caloroso e expressivo.`,
    },
    es: {
      voiceName: 'Sadachbia',
      directorNote: `# AUDIO PROFILE: Creador de Comida
## "Food Blogger"

### DIRECTOR'S NOTES
Style: Food blogger latina probando algo increíble. "¡Dios mío, esa textura!" Más lento en descripciones de sabor, rápido en la emoción.
Pacing: Lento para sabor, rápido para emoción.
Accent: Español latinoamericano, expresivo y cálido.`,
    },
    ja: {
      voiceName: 'Fenrir',
      directorNote: `# AUDIO PROFILE: フードクリエイター
## "グルメレビュアー"

### DIRECTOR'S NOTES
Style: フードレビュアーとして、美味しいものを食べている瞬間のテンション。味の描写はゆっくり、興奮はスピードアップ。
Pacing: 味わい描写でゆっくり、おすすめで加速。
Accent: 標準語、親しみやすいグルメ好き。`,
    },

        vi: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Food Creator
## "Vietnamese Food Reviewer"

### THE SCENE
Nhà bếp ánh sáng ấm hoặc quán cafe. Món ăn review được bày biện đẹp mắt.

### DIRECTOR'S NOTES
Style: Food reviewer Việt Nam. "Cắn một miếng là không dừng được luôn!" Mô tả vị với niềm vui thật sự và biểu cảm giác quan. Chậm khi tả vị, nhanh khi hào hứng. Khiến người nghe thèm.
Pacing: Chậm và thưởng thức khi tả vị, nhanh và hào hứng khi giới thiệu.
Accent: Tiếng Việt chuẩn, thân thiện và ngon lành.`,
    },
    th: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: Food Creator
## "Thai Food Reviewer"

### THE SCENE
ครัวแสงอุ่นหรือคาเฟ่ อาหารรีวิวจัดจานสวยงาม

### DIRECTOR'S NOTES
Style: Food reviewer ไทย "กัดคำแรกแล้วหยุดไม่ได้เลย!" บรรยายรสชาติด้วยความสุขแท้จริงและการแสดงออกทางประสาทสัมผัส ช้าเมื่อบรรยายรส เร็วเมื่อตื่นเต้น ทำให้คนฟังหิว
Pacing: ช้าและลิ้มรสเมื่อบรรยาย เร็วและตื่นเต้นเมื่อแนะนำ
Accent: ภาษาไทยมาตรฐาน เป็นมิตรและน่ากิน`,
    },
    zh: {
      voiceName: 'Puck',
      directorNote: `# AUDIO PROFILE: 美食博主
## "美食探店达人"

### THE SCENE
暖色灯光的厨房或咖啡厅。评测美食精美摆盘。

### DIRECTOR'S NOTES
Style: 华语美食博主。"咬一口就停不下来！"用真实的愉悦感和感官表达描述味道。描述味道时放慢，兴奋时加快。让听众馋到不行。
Pacing: 品味描述时慢慢享受，推荐时快速兴奋。
Accent: 标准普通话，亲切又有食欲感。`,
    },

  },
} as const;

// ── 유틸리티 ──
type AllCategories = keyof typeof SHOPPING_VOICE_STYLES;

// ── 카테고리별 음성 옵션 (남녀 각 3개) ──
export const VOICE_OPTIONS: Record<string, {
  male: { voiceName: string; label: string }[];
  female: { voiceName: string; label: string }[];
}> = {
  shopping_tech:    { male: [{ voiceName: 'Fenrir', label: '흥분형 언박서 ⭐' }, { voiceName: 'Puck', label: '밝은 에너지' }, { voiceName: 'Charon', label: '차분한 분석가' }], female: [{ voiceName: 'Leda', label: '밝고 트렌디 ⭐' }, { voiceName: 'Kore', label: '단단한 전문가' }, { voiceName: 'Aoede', label: '경쾌한 리뷰어' }] },
  shopping_home:    { male: [{ voiceName: 'Puck', label: '밝은 실용파 ⭐' }, { voiceName: 'Charon', label: '신뢰형 전문가' }, { voiceName: 'Fenrir', label: '열정 리뷰어' }], female: [{ voiceName: 'Kore', label: '실용 리뷰어 ⭐' }, { voiceName: 'Sulafat', label: '따뜻한 이웃' }, { voiceName: 'Leda', label: '밝은 에너지' }] },
  shopping_beauty:  { male: [{ voiceName: 'Puck', label: '밝은 에너지 ⭐' }, { voiceName: 'Enceladus', label: '속삭임 ASMR' }, { voiceName: 'Fenrir', label: '흥분형' }], female: [{ voiceName: 'Leda', label: '밝은 인플루언서 ⭐' }, { voiceName: 'Aoede', label: '경쾌한 뷰티' }, { voiceName: 'Achernar', label: '부드러운 톤' }] },
  shopping_health:  { male: [{ voiceName: 'Charon', label: '신뢰형 전문가 ⭐' }, { voiceName: 'Algieba', label: '부드러운 어드바이저' }, { voiceName: 'Rasalgethi', label: '정보 전달형' }], female: [{ voiceName: 'Sulafat', label: '따뜻한 전문가 ⭐' }, { voiceName: 'Kore', label: '단단한 신뢰' }, { voiceName: 'Vindemiatrix', label: '부드러운 상담' }] },
  shopping_fashion: { male: [{ voiceName: 'Puck', label: '밝은 스타일 ⭐' }, { voiceName: 'Zubenelgenubi', label: '캐주얼 톤' }, { voiceName: 'Achird', label: '친근한 톤' }], female: [{ voiceName: 'Aoede', label: '경쾌한 패셔니스타 ⭐' }, { voiceName: 'Leda', label: '밝고 트렌디' }, { voiceName: 'Despina', label: '부드러운 스타일' }] },
  shopping_food:    { male: [{ voiceName: 'Puck', label: '밝은 푸디 ⭐' }, { voiceName: 'Fenrir', label: '흥분형 먹방' }, { voiceName: 'Achird', label: '친근한 맛집' }], female: [{ voiceName: 'Kore', label: '에너지 푸디 ⭐' }, { voiceName: 'Leda', label: '밝은 리뷰어' }, { voiceName: 'Sulafat', label: '따뜻한 감성' }] },
  shorts_default:   { male: [{ voiceName: 'Puck', label: '밝은 에너지 ⭐' }, { voiceName: 'Fenrir', label: '흥분형' }, { voiceName: 'Kore', label: '단단한 톤' }], female: [{ voiceName: 'Kore', label: '단단한 크리에이터 ⭐' }, { voiceName: 'Leda', label: '밝은 에너지' }, { voiceName: 'Aoede', label: '경쾌한 톤' }] },
  longform_default: { male: [{ voiceName: 'Charon', label: '다큐 나레이터 ⭐' }, { voiceName: 'Algieba', label: '부드러운 톤' }, { voiceName: 'Schedar', label: '균형잡힌 톤' }], female: [{ voiceName: 'Sulafat', label: '따뜻한 나레이터 ⭐' }, { voiceName: 'Vindemiatrix', label: '부드러운 톤' }, { voiceName: 'Gacrux', label: '성숙한 톤' }] },
};

// ── 카테고리별 추천 성별 ──
export const RECOMMENDED_GENDER: Record<string, 'male' | 'female'> = {
  shopping_tech: 'male',
  shopping_home: 'female',
  shopping_beauty: 'female',
  shopping_health: 'male',
  shopping_fashion: 'female',
  shopping_food: 'female',
  invest: 'male',
  trading: 'male',
  psychology: 'female',
  health: 'male',
  economy: 'male',
  ai_trend: 'male',
  travel: 'female',
  quotes: 'male',
  old_tales: 'male',
};

export function getVoiceStyle(
  category: string,
  language: SupportedLang,
  isLongform: boolean,
  gender?: 'male' | 'female',
  voiceNameOverride?: string
): VoiceStyleConfig {
  // 1) 쇼핑 카테고리 체크
  if (category in SHOPPING_VOICE_STYLES) {
    const styles = SHOPPING_VOICE_STYLES[category as AllCategories];
    const style = styles[language] || styles.en || styles.ko;

    // 음성 직접 선택 (추후 텔레그램 UI용)
    if (voiceNameOverride) {
      return { ...style, voiceName: voiceNameOverride };
    }
    // 성별 오버라이드
    if (gender) {
      const optionKey = category as string;
      const options = VOICE_OPTIONS[optionKey];
      if (options) {
        const picks = gender === 'male' ? options.male : options.female;
        return { ...style, voiceName: picks[0].voiceName }; // ⭐ 첫 번째 = 추천
      }
    }
    return style;
  }

  // 2) 일반 → 숏폼/롱폼 디폴트
  const key = isLongform ? 'longform_default' : 'shorts_default';
  const style = GENERAL_VOICE_STYLES[key][language] || GENERAL_VOICE_STYLES[key].en || GENERAL_VOICE_STYLES[key].ko;

  if (voiceNameOverride) {
    return { ...style, voiceName: voiceNameOverride };
  }
  if (gender) {
    const options = VOICE_OPTIONS[key];
    if (options) {
      const picks = gender === 'male' ? options.male : options.female;
      return { ...style, voiceName: picks[0].voiceName };
    }
  }
  return style;
}


// ═══════════════════════════════════════════════════════════
// [ANIMATION] 애니메이션 장르 음성 스타일 (인지 부조화 전략)
// ═══════════════════════════════════════════════════════════

export const ANIMATION_VOICE_STYLES = {
  cognitive_gap: {
    ko: {
      male: {
        voiceName: 'Charon',
        directorNote: `# AUDIO PROFILE: 인지 부조화 - 권위형
## "귀여운 캐릭터 + 낮고 권위 있는 목소리"

### DIRECTOR'S NOTES
Style: 깊고 권위 있으면서 따뜻한 멘토. 귀여운 캐릭터에서 나오는 예상 밖의 진지한 목소리가 핵심.
로봇이 아닌, 따뜻하지만 명령하는 듯한 톤. 핵심 데이터에서 톤을 올리고 잠깐 멈춤.
Pacing: 차분하고 측정된 페이스. 3.5-4 음절/초. 문장 사이 의도적 pause.
Accent: 표준 한국어, 30대 중반 서울 남성.`,
        speed: 0.95,
      },
      female: {
        voiceName: 'Kore',
        directorNote: `# AUDIO PROFILE: 인지 부조화 - 권위형 (여성)
## "귀여운 캐릭터 + 낮고 권위 있는 여성 목소리"

### DIRECTOR'S NOTES
Style: 여성치고 낮은 음역대, 권위 있지만 따뜻함. 자신감 있는 교수가 귀여운 캐릭터 안에 있는 느낌.
각 문장이 무게감 있게 착지. 핵심 숫자 앞에서 살짝 멈춤.
Pacing: 측정되고 신중한 페이스. 3.5-4 음절/초.
Accent: 표준 한국어, 30대 초반 서울 여성.`,
        speed: 0.95,
      },
    },
    en: {
      male: {
        voiceName: 'Charon',
        directorNote: `# AUDIO PROFILE: Cognitive Gap - Authority
## "Cute character + Deep authoritative voice"

### DIRECTOR'S NOTES
Style: Deep, authoritative, calm confidence. Like a wise mentor speaking through a cute character. NOT robotic — warm but commanding. Measured pace with deliberate pauses for impact.
Pacing: 120-140 wpm. Deliberate and gravitational.
Accent: Standard American English, baritone register.`,
        speed: 0.95,
      },
      female: {
        voiceName: 'Kore',
        directorNote: `# AUDIO PROFILE: Cognitive Gap - Authority (Female)
## "Cute character + Low authoritative female voice"

### DIRECTOR'S NOTES
Style: Low-pitched for female, authoritative yet warm. Like a confident professor in a cute costume. Each sentence lands with weight.
Pacing: 120-140 wpm. Measured and deliberate.
Accent: Standard American English, alto register.`,
        speed: 0.95,
      },
    },
  },
  provocateur: {
    ko: {
      male: {
        voiceName: 'Puck',
        directorNote: `# AUDIO PROFILE: 도발자 - 팩폭형
## "귀여운 캐릭터 + 빠르고 도발적인 목소리"

### DIRECTOR'S NOTES
Style: 빠르고 도발적, 약간 공격적. 귀여운 몸에 갇힌 퍼스널 트레이너가 변명을 꾸짖는 느낌.
높은 에너지, 펀치감 있는 전달. 짧은 문장이 강하게 타격. 나쁜 건강 습관에 자비 없음.
Pacing: 매우 빠름. 5.5-6 음절/초. 팩트 폭격 시 더 빨라짐.
Accent: 표준 한국어, 20대 후반 에너지틱한 남성.`,
        speed: 1.15,
      },
      female: {
        voiceName: 'Leda',
        directorNote: `# AUDIO PROFILE: 도발자 - 팩폭형 (여성)
## "귀여운 캐릭터 + 빠르고 사이다 같은 여성 목소리"

### DIRECTOR'S NOTES
Style: 날카롭고 빠르고 당당함. 귀여운 코스튬 입은 눈치 없는 코치. 각 문장이 진실의 뺨때리기.
에너지틱하고 사과 없음. 터프한 사랑과 진심 어린 케어의 믹스.
Pacing: 매우 빠름. 5.5-6 음절/초.
Accent: 표준 한국어, 20대 후반 당당한 여성.`,
        speed: 1.15,
      },
    },
    en: {
      male: {
        voiceName: 'Puck',
        directorNote: `# AUDIO PROFILE: Provocateur
## "Cute character + Fast provocative voice"

### DIRECTOR'S NOTES
Style: Fast, provocative, slightly aggressive. Like a personal trainer trapped in a cute body. High energy, punchy delivery. Short sentences hit hard.
Pacing: 170-190 wpm. Relentless and driving.
Accent: Standard American English, energetic young male.`,
        speed: 1.15,
      },
      female: {
        voiceName: 'Leda',
        directorNote: `# AUDIO PROFILE: Provocateur (Female)
## "Cute character + Sharp sassy female voice"

### DIRECTOR'S NOTES
Style: Sharp, fast, sassy. No-nonsense coach in a cute costume. Each sentence is a truth slap. Energetic and unapologetic.
Pacing: 170-190 wpm.
Accent: Standard American English, confident young female.`,
        speed: 1.15,
      },
    },
  },
  gravity: {
    ko: {
      male: {
        voiceName: 'Orus',
        directorNote: `# AUDIO PROFILE: 중력감 - CEO형
## "귀여운 캐릭터 + 극도로 느리고 무거운 목소리"

### DIRECTOR'S NOTES
Style: 극도로 느리고 깊고 중력감. 마스코트를 통해 억만장자의 비밀을 공개하는 CEO.
문장 사이 긴 멈춤. 모든 단어에 무게감. 속삭임에서 파워로 다이나믹.
조용히 시작해서 권위로 빌드업.
Pacing: 매우 느림. 2.5-3 음절/초. 의도적인 긴 pause.
Accent: 표준 한국어, 40대 중반 깊은 남성.`,
        speed: 0.85,
      },
      female: {
        voiceName: 'Aoede',
        directorNote: `# AUDIO PROFILE: 중력감 - CEO형 (여성)
## "귀여운 캐릭터 + 느리고 풍부한 여성 목소리"

### DIRECTOR'S NOTES
Style: 느리고 풍부하고 거의 최면적. 장난스러운 캐릭터를 통해 말하는 럭셔리 다큐멘터리 나레이터.
의도적이고 자기적. 각 멈춤이 기대감을 만듦. 벨벳 목소리 아래 강철.
Pacing: 매우 느림. 2.5-3 음절/초.
Accent: 표준 한국어, 30대 후반 우아한 여성.`,
        speed: 0.85,
      },
    },
    en: {
      male: {
        voiceName: 'Orus',
        directorNote: `# AUDIO PROFILE: Gravity - CEO
## "Cute character + Extremely slow deep voice"

### DIRECTOR'S NOTES
Style: Extremely slow, deep, gravitational. Like a CEO revealing a billion-dollar secret through a mascot. Long pauses. Every word carries weight. Whisper-to-power dynamic.
Pacing: 90-110 wpm. Glacial and magnetic.
Accent: Standard American English, deep baritone.`,
        speed: 0.85,
      },
      female: {
        voiceName: 'Aoede',
        directorNote: `# AUDIO PROFILE: Gravity - CEO (Female)
## "Cute character + Slow rich hypnotic female voice"

### DIRECTOR'S NOTES
Style: Slow, rich, almost hypnotic. Like a luxury documentary narrator in a playful character. Deliberate, magnetic. Velvet voice with steel underneath.
Pacing: 90-110 wpm.
Accent: Standard American English, rich alto.`,
        speed: 0.85,
      },
    },
  },
};

// 씬별 감정 오버라이드 태그
export const ANIMATION_SCENE_OVERRIDES = {
  cognitive_gap: {
    hook: '[Tone: 충격적으로, 첫 단어를 강하게, 짧은 침묵 후 시작]',
    agitate: '[Tone: 점점 심각하게, 속도 약간 빠르게]',
    solution: '[Tone: 확신에 차서, 따뜻하지만 단호하게]',
    cta: '[Tone: 부드럽지만 명확하게, 마지막 단어 강조]',
  },
  provocateur: {
    hook: '[Tone: 도발적으로, 질문을 던지듯, 빠르게]',
    agitate: '[Tone: 화난 듯, 팩트로 때리듯]',
    solution: '[Tone: 약간 누그러지며, 그래도 강하게]',
    cta: '[Tone: 도전적으로, 할 거야 말 거야?]',
  },
  gravity: {
    hook: '[Tone: 속삭이듯 시작, 마지막 단어만 크게]',
    agitate: '[Tone: 무겁게, 한 단어씩 끊어서]',
    solution: '[Tone: 점점 힘이 실리며, 확신]',
    cta: '[Tone: 조용하지만 울림 있게, 여운 남기기]',
  },
};

// 애니메이션 스타일 선택 함수
export function getAnimationVoiceStyle(
  tone: 'cognitive_gap' | 'provocateur' | 'gravity',
  lang: SupportedLang,
  gender: 'male' | 'female'
): VoiceStyleConfig & { speed: number } {
  const style = ANIMATION_VOICE_STYLES[tone];
  const langStyle = style[lang] || style['ko'];
  return langStyle[gender];
}
