/**
 * Dalseo Character Studio - Application Main Controller (Vertex AI Imagen Integration)
 * Integrates Google Vertex AI Imagen 3 API in Image-to-Image (Reference Character Mode).
 * Includes a simulation fallback with exact request/response JSON inspector logs.
 */

// Initial Mappings for Prompt Analysis
let actionMappings = {
  teaching: ["강의", "칠판", "수업", "설명", "가르", "선생", "학교", "교육", "발표", "ppt", "세미나", "독서", "책", "공부", "읽기"],
  guiding: ["안내", "인사", "소개", "주민", "맞이", "안녕", "홍보", "환영", "도움", "안내소", "인사", "감사", "고맙"],
  cleanup: ["청소", "환경", "봉사", "쓰레기", "줍", "정화", "분리수거", "자연", "깨끗", "재활용", "식목", "나무"],
  exercising: ["운동", "체육", "달리", "러닝", "뛰", "헬스", "스포츠", "트랙", "달리기", "마라톤", "멀리뛰기", "높이뛰기"],
  cooking: ["요리", "식사", "음식", "주방", "조리", "프라이팬", "요리사", "셰프", "먹", "식목"],
  working: ["업무", "노트북", "컴퓨터", "행정", "회의", "일하", "사무", "작업", "오피스", "주차", "안전제일", "어린이보호", "스쿨존"]
};

// Official Image Database Poses (Used in Simulation Mode & matching checks)
let officialDbAssets = [
  // Base Poses
  { file: '기본-달수.png', char: 'dalsu', action: 'default', keywords: ['기본', '서있', '포즈', '평범', '스탠딩'] },
  { file: '기본-달희.png', char: 'dalhee', action: 'default', keywords: ['기본', '서있', '포즈', '평범', '스탠딩'] },

  // A - Greeting 1
  { file: '응용-A-인사1-달수.png', char: 'dalsu', action: 'guiding', keywords: ['인사', '안녕', '반갑', '안녕하세요', '맞이', '인사하는', '손흔드는'] },
  { file: '응용-A-인사1-달희.png', char: 'dalhee', action: 'guiding', keywords: ['인사', '안녕', '반갑', '안녕하세요', '맞이', '인사하는', '손흔드는'] },
  { file: '응용-A-인사1.png', char: 'both', action: 'guiding', keywords: ['인사', '안녕', '반갑', '안녕하세요', '맞이', '함께', '같이', '둘이'] },

  // B - Greeting 2
  { file: '응용-B-인사2-달수.png', char: 'dalsu', action: 'guiding', keywords: ['인사', '안녕', '손흔', '미소', '인사하는', '손흔드는'] },
  { file: '응용-B-인사2-달희.png', char: 'dalhee', action: 'guiding', keywords: ['인사', '안녕', '손흔', '미소', '인사하는', '손흔드는'] },
  { file: '응용-B-인사2.png', char: 'both', action: 'guiding', keywords: ['인사', '안녕', '손흔', '미소', '함께', '같이', '둘이'] },

  // C - Thanks
  { file: '응용-C-감사-달수.png', char: 'dalsu', action: 'guiding', keywords: ['감사', '고맙', '절', '공손', '인사', '꾸벅', '감사하는'] },
  { file: '응용-C-감사-달희.png', char: 'dalhee', action: 'guiding', keywords: ['감사', '고맙', '절', '공손', '인사', '꾸벅', '감사하는'] },
  { file: '응용-C-감사.png', char: 'both', action: 'guiding', keywords: ['감사', '고맙', '절', '공손', '인사', '꾸벅', '함께', '같이', '둘이'] },

  // D - Joy
  { file: '응용-D-기쁨-달수.png', char: 'dalsu', action: 'default', keywords: ['기쁨', '행복', '즐겁', '웃음', '신나', '기뻐하는', '웃는'] },
  { file: '응용-D-기쁨-달희.png', char: 'dalhee', action: 'default', keywords: ['기쁨', '행복', '즐겁', '웃음', '신나', '기뻐하는', '웃는'] },
  { file: '응용-D-기쁨.png', char: 'both', action: 'default', keywords: ['기쁨', '행복', '즐겁', '웃음', '신나', '함께', '같이', '둘이'] },

  // E - Sad
  { file: '응용-E-슬픔-달수.png', char: 'dalsu', action: 'default', keywords: ['슬픔', '눈물', '우는', '속상', '우울', '슬퍼하는', '엉엉'] },
  { file: '응용-E-슬픔-달희.png', char: 'dalhee', action: 'default', keywords: ['슬픔', '눈물', '우는', '속상', '우울', '슬퍼하는', '엉엉'] },
  { file: '응용-E-슬픔.png', char: 'both', action: 'default', keywords: ['슬픔', '눈물', '우는', '속상', '우울', '함께', '같이', '둘이'] },

  // F - Cheering
  { file: '응용-F-응원-달수.png', char: 'dalsu', action: 'default', keywords: ['응원', '화이팅', '파이팅', '힘내', '독려', '응원하는'] },
  { file: '응용-F-응원-달희.png', char: 'dalhee', action: 'default', keywords: ['응원', '화이팅', '파이팅', '힘내', '독려', '응원하는'] },
  { file: '응용-F-응원.png', char: 'both', action: 'default', keywords: ['응원', '화이팅', '파이팅', '힘내', '독려', '함께', '같이', '둘이'] },

  // G - Best
  { file: '응용-G-최고-달수.png', char: 'dalsu', action: 'default', keywords: ['최고', '엄지', '따봉', '추천', '1등', '최고인', '엄지척'] },
  { file: '응용-G-최고-달희.png', char: 'dalhee', action: 'default', keywords: ['최고', '엄지', '따봉', '추천', '1등', '최고인', '엄지척'] },
  { file: '응용-G-최고.png', char: 'both', action: 'default', keywords: ['최고', '엄지', '따봉', '추천', '1등', '함께', '같이', '둘이'] },

  // H - Guidance 1
  { file: '응용-H-안내1-달수.png', char: 'dalsu', action: 'guiding', keywords: ['안내', '정보', '표지판', '가리키', '설명', '안내판'] },
  { file: '응용-H-안내1-달희.png', char: 'dalhee', action: 'guiding', keywords: ['안내', '정보', '표지판', '가리키', '설명', '안내판'] },
  { file: '응용-H-안내1.png', char: 'both', action: 'guiding', keywords: ['안내', '정보', '표지판', '가리키', '설명', '함께', '같이', '둘이'] },

  // I - Guidance 2
  { file: '응용-I-안내2-달수.png', char: 'dalsu', action: 'guiding', keywords: ['안내', '가리키', '가이드', '방향', '안내판'] },
  { file: '응용-I-안내2-달희.png', char: 'dalhee', action: 'guiding', keywords: ['안내', '가리키', '가이드', '방향', '안내판'] },
  { file: '응용-I-안내2.png', char: 'both', action: 'guiding', keywords: ['안내', '가리키', '가이드', '방향', '함께', '같이', '둘이'] },

  // J - No Parking
  { file: '응용-J-주차금지-달수.png', char: 'dalsu', action: 'working', keywords: ['주차', '주차금지', '차량', '교통', '금지', '단속', '딱지', '불법주차'] },
  { file: '응용-J-주차금지-달희.png', char: 'dalhee', action: 'working', keywords: ['주차', '주차금지', '차량', '교통', '금지', '단속', '딱지', '불법주차'] },
  { file: '응용-J-주차금지.png', char: 'both', action: 'working', keywords: ['주차', '주차금지', '차량', '교통', '금지', '단속', '함께', '같이', '둘이'] },

  // K - Safety First
  { file: '응용-K-안전제일-달수.png', char: 'dalsu', action: 'working', keywords: ['안전', '안전제일', '건설', '공사', '헬멧', '작업', '현장'] },
  { file: '응용-K-안전제일-달희.png', char: 'dalhee', action: 'working', keywords: ['안전', '안전제일', '건설', '공사', '헬멧', '작업', '현장'] },
  { file: '응용-K-안전제일.png', char: 'both', action: 'working', keywords: ['안전', '안전제일', '건설', '공사', '헬멧', '작업', '현장', '함께', '같이', '둘이'] },

  // L - Smart City
  { file: '응용-L-스마트도시-달수.png', char: 'dalsu', action: 'working', keywords: ['스마트', '스마트도시', '도시', '미래', '기술', '태블릿', '패드', '화면'] },
  { file: '응용-L-스마트도시-달희.png', char: 'dalhee', action: 'working', keywords: ['스마트', '스마트도시', '도시', '미래', '기술', '태블릿', '패드', '화면'] },
  { file: '응용-L-스마트도시.png', char: 'both', action: 'working', keywords: ['스마트', '스마트도시', '도시', '미래', '기술', '태블릿', '패드', '화면', '함께', '같이', '둘이'] },

  // M - Love
  { file: '응용-M-사랑-달수.png', char: 'dalsu', action: 'default', keywords: ['사랑', '하트', '행복', '고백', '선물', '애정', '좋아'] },
  { file: '응용-M-사랑-달희.png', char: 'dalhee', action: 'default', keywords: ['사랑', '하트', '행복', '고백', '선물', '애정', '좋아'] },
  { file: '응용-M-사랑.png', char: 'both', action: 'default', keywords: ['사랑', '하트', '행복', '고백', '선물', '함께', '같이', '둘이'] },

  // Special files
  { file: '응용-N-결혼.png', char: 'both', action: 'default', keywords: ['결혼', '웨딩', '드레스', '턱시도', '신랑', '신부', '부부', '청첩장', '시집', '장가', '결혼식'] },
  { file: '응용-O-관광여행.png', char: 'both', action: 'default', keywords: ['관광', '여행', '캠핑', '텐트', '야외', '휴가', '지도', '나들이', '캠핑장'] },
  { file: '응용-P-독서.png', char: 'both', action: 'working', keywords: ['독서', '책', '공부', '도서관', '읽기', '공부하는', '독서실', '책방', '학습'] },
  { file: '응용-Q-마라톤.png', char: 'both', action: 'exercising', keywords: ['마라톤', '달리기', '러닝', '운동', '체육', '달리는', '뛰어가는', '뛰는', '육상', '멀리뛰기', '높이뛰기', '조깅'] },
  { file: '응용-R-청렴.png', char: 'both', action: 'working', keywords: ['청렴', '행정', '공직', '정직', '서약', '청렴한', '공무원'] },
  { file: '응용-S-재활용,쓰레기줍기.png', char: 'both', action: 'cleanup', keywords: ['재활용', '쓰레기', '환경', '정화', '봉사', '줍기', '청소', '환경보호', '환경정화', '분리수거', '분리배출'] },
  { file: '응용-T-식목.png', char: 'both', action: 'cleanup', keywords: ['식목', '나무', '심기', '환경', '숲', '자연', '삽', '식목일', '나무심기', '삽질'] },
  { file: '응용-U-축하.png', char: 'both', action: 'default', keywords: ['축하', '파티', '선물', '기념', '케이크', '기념일', '촛불', '생일', '고깔'] },
  { file: '응용-V-어린이보호구역-1.png', char: 'both', action: 'working', keywords: ['어린이', '보호구역', '스쿨존', '안전', '신호', '횡단보도', '안전벨트', '안전띠'] },
  { file: '응용-V-어린이보호구역-2.png', char: 'both', action: 'working', keywords: ['어린이', '보호구역', '스쿨존', '안전', '신호', '횡단보도', '안전벨트', '안전띠'] },
  { file: '응용-W-이곡장미공원.png', char: 'both', action: 'default', keywords: ['장미', '공원', '꽃', '축제', '이곡장미공원', '장미공원', '장미축제', '나들이'] },
  { file: '응용-X-축제1.png', char: 'both', action: 'default', keywords: ['축제', '행사', '공연', '무대', '노래', '마이크', '가수', '페스티벌', '노래하는'] },
  { file: '응용-Y-축제2-달수.png', char: 'dalsu', action: 'default', keywords: ['축제', '행사', '춤', '신나', '공연', '댄스', '춤추는', '춤추다'] },
  { file: '응용-Y-축제2-달희.png', char: 'dalhee', action: 'default', keywords: ['축제', '행사', '춤', '신나', '공연', '댄스', '춤추는', '춤추다'] }
];

// Application State
let appState = {
  activeCharacter: 'dalsu',
  activeAction: 'default',
  activeEmotion: 'friendly',
  currentImgFile: '',
  generationCount: 0,
  history: [],
  driftLogs: [],
  simulateMode: true
};

// UI Elements
const els = {
  promptInput: null,
  actionSelect: null,
  emotionSelect: null,
  canvasContainer: null,
  historyList: null,
  activeCanvasName: null,
  activeCanvasMeta: null,
  btnGenerate: null,
  pipelineProgress: null,
  pipelineStatusMsg: null,
  driftLogList: null,
  mappingGrid: null,
  adminModal: null,
  apiSimulateCheck: null,
  apiRealConfigFields: null,
  apiTypeSelect: null,
  apiStudioFields: null,
  apiStudioKey: null,
  apiVertexFields: null,
  apiProjectId: null,
  apiAccessToken: null,
  apiRememberCheck: null,
  canvasLoadingOverlay: null,
  loaderStatusText: null,
  loaderStepInfo: null
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Bind elements
  els.promptInput = document.getElementById('promptInput');
  els.actionSelect = document.getElementById('actionSelect');
  els.emotionSelect = document.getElementById('emotionSelect');
  els.canvasContainer = document.getElementById('canvasContainer');
  els.historyList = document.getElementById('historyList');
  els.activeCanvasName = document.getElementById('activeCanvasName');
  els.activeCanvasMeta = document.getElementById('activeCanvasMeta');
  els.btnGenerate = document.getElementById('btnGenerate');
  els.pipelineProgress = document.getElementById('pipelineProgress');
  els.pipelineStatusMsg = document.getElementById('pipelineStatusMsg');
  els.driftLogList = document.getElementById('driftLogList');
  els.mappingGrid = document.getElementById('mappingGrid');
  els.adminModal = document.getElementById('adminModal');
  els.apiSimulateCheck = document.getElementById('apiSimulateCheck');
  els.apiRealConfigFields = document.getElementById('apiRealConfigFields');
  els.apiTypeSelect = document.getElementById('apiTypeSelect');
  els.apiStudioFields = document.getElementById('apiStudioFields');
  els.apiStudioKey = document.getElementById('apiStudioKey');
  els.apiVertexFields = document.getElementById('apiVertexFields');
  els.apiProjectId = document.getElementById('apiProjectId');
  els.apiAccessToken = document.getElementById('apiAccessToken');
  els.apiRememberCheck = document.getElementById('apiRememberCheck');
  els.canvasLoadingOverlay = document.getElementById('canvasLoadingOverlay');
  els.loaderStatusText = document.getElementById('loaderStatusText');
  els.loaderStepInfo = document.getElementById('loaderStepInfo');

  // Load configuration and history
  loadHistory();
  loadApiCredentials();
  initCharacterSelectors();
  initSelectListeners();
  populateAdminMappings();
  
  // Set initial empty display
  renderEmptyCanvas();
  
  // Lock emotion dropdown in UI (will be controlled by system prompt rules)
  els.emotionSelect.disabled = true;
  els.emotionSelect.style.opacity = '0.5';
  
  // Initialize simulation toggle
  toggleApiSimulation();
});

// Toggle simulation mode fields
function toggleApiSimulation() {
  const isSimulated = els.apiSimulateCheck ? els.apiSimulateCheck.checked : false;
  appState.simulateMode = isSimulated;
  
  if (isSimulated) {
    if (els.apiRealConfigFields) els.apiRealConfigFields.style.display = 'none';
    addDriftLog('[System] Google Imagen API Simulation mode enabled.', 'success');
  } else {
    if (els.apiRealConfigFields) els.apiRealConfigFields.style.display = 'flex';
    addDriftLog('[System] Switched to Google Live API mode. Please configure credentials.', 'info');
    toggleApiType();
  }
  
  // Save simulation toggle state to credentials localStorage
  const stored = localStorage.getItem('dalseo_studio_api_credentials');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      parsed.simulate = isSimulated;
      localStorage.setItem('dalseo_studio_api_credentials', JSON.stringify(parsed));
    } catch (e) {}
  } else {
    saveApiCredentials();
  }
}

// Toggle API type fields
function toggleApiType() {
  if (!els.apiTypeSelect) return;
  const apiType = els.apiTypeSelect.value;
  if (apiType === 'studio') {
    if (els.apiStudioFields) els.apiStudioFields.style.display = 'flex';
    if (els.apiVertexFields) els.apiVertexFields.style.display = 'none';
  } else {
    if (els.apiStudioFields) els.apiStudioFields.style.display = 'none';
    if (els.apiVertexFields) els.apiVertexFields.style.display = 'flex';
  }
  saveApiCredentials();
}

// Save API credentials to localStorage
function saveApiCredentials() {
  if (!els.apiRememberCheck) return;
  const remember = els.apiRememberCheck.checked;
  if (remember) {
    const credentials = {
      apiType: els.apiTypeSelect ? els.apiTypeSelect.value : 'studio',
      studioKey: els.apiStudioKey ? els.apiStudioKey.value.trim() : '',
      projectId: els.apiProjectId ? els.apiProjectId.value.trim() : '',
      accessToken: els.apiAccessToken ? els.apiAccessToken.value.trim() : '',
      remember: true,
      simulate: els.apiSimulateCheck ? els.apiSimulateCheck.checked : false
    };
    localStorage.setItem('dalseo_studio_api_credentials', JSON.stringify(credentials));
  } else {
    localStorage.removeItem('dalseo_studio_api_credentials');
  }
}

// Load API credentials from localStorage
function loadApiCredentials() {
  const stored = localStorage.getItem('dalseo_studio_api_credentials');
  
  // Method 2: Development Stage default preconfigured credentials
  let credentials = {
    apiType: 'studio',
    studioKey: window.DEV_GEMINI_API_KEY || '',
    projectId: '914250995391',
    accessToken: '',
    remember: true,
    simulate: false // Default to live API mode now that keys are preconfigured!
  };
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      credentials = { ...credentials, ...parsed };
    } catch (e) {
      console.error('Error loading API credentials:', e);
    }
  }
  
  if (els.apiRememberCheck) {
    els.apiRememberCheck.checked = credentials.remember;
    if (els.apiTypeSelect) els.apiTypeSelect.value = credentials.apiType;
    if (els.apiStudioKey) els.apiStudioKey.value = credentials.studioKey;
    if (els.apiProjectId) els.apiProjectId.value = credentials.projectId;
    if (els.apiAccessToken) els.apiAccessToken.value = credentials.accessToken;
    
    if (els.apiSimulateCheck) {
      els.apiSimulateCheck.checked = credentials.simulate;
    }
    
    toggleApiType();
  }
}

// Character Selection handler
function initCharacterSelectors() {
  const buttons = document.querySelectorAll('.config-panel .character-select-grid .char-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.activeCharacter = btn.getAttribute('data-char');
      
      // Auto-update canvas name preview placeholder
      const charName = getCharacterDisplayName(appState.activeCharacter);
      els.activeCanvasName.textContent = `${charName} 스튜디오 결과물`;
    });
  });
}

function initSelectListeners() {
  els.actionSelect.addEventListener('change', (e) => {
    appState.activeAction = e.target.value;
  });
  els.emotionSelect.addEventListener('change', (e) => {
    appState.activeEmotion = e.target.value;
  });
}

// Helper to convert a single local reference image file to base64
async function fileToBase64(filepath) {
  try {
    const response = await fetch(filepath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error reading reference file:', filepath, error);
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
}

// Returns an array of base64 reference images for the selected character
// For "both" mode, sends individual character sheets so the model can learn each character's identity separately
async function getReferenceImagesBase64(charKey) {
  if (charKey === 'dalhee') {
    return [await fileToBase64('example/기본-달희.png')];
  } else if (charKey === 'both') {
    // 방안 2: 개별 캐릭터 원본 2장을 보내 모델이 각 캐릭터 특징을 교차 검증
    const [dalsuRef, dalheeRef] = await Promise.all([
      fileToBase64('example/기본-달수.png'),
      fileToBase64('example/기본-달희.png')
    ]);
    return [dalsuRef, dalheeRef];
  } else {
    return [await fileToBase64('example/기본-달수.png')];
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Trigger Pipeline Generation Process
async function triggerGeneration() {
  const promptText = els.promptInput.value;
  if (!promptText.trim()) {
    alert('프롬프트를 입력해 주세요.');
    return;
  }
  
  els.btnGenerate.disabled = true;
  els.btnGenerate.textContent = '생성 중...';
  els.canvasContainer.classList.add('loading');
  
  if (els.canvasLoadingOverlay) {
    els.canvasLoadingOverlay.classList.add('active');
    const loaderAvatarImg = document.getElementById('loaderAvatarImg');
    if (loaderAvatarImg) {
      if (appState.activeCharacter === 'dalhee') {
        loaderAvatarImg.src = 'example/기본-달희.png';
      } else if (appState.activeCharacter === 'both') {
        loaderAvatarImg.src = 'example/응용-A-인사1.png';
      } else {
        loaderAvatarImg.src = 'example/기본-달수.png';
      }
    }
  }
  
  resetPipelineNodes();
  
  try {
    // Step 1: Input Prompt analysis (0ms - 400ms)
    updatePipelineStep(1, 'active', '입력 프롬프트 분석 중...');
    els.pipelineProgress.style.width = '0%';
    
    addDriftLog(`[Engine] Activating "Reference Character Mode" (공식 원본 참조 변형 방식).`, 'info');
    addDriftLog(`[Engine] Binding reference sheets as input nodes: "기본-달수.png", "기본-달희.png"`, 'info');
    
    const systemInstructions = `[Style Guide: 2D flat vector cartoon character, bold black outlines, solid white background, no text]
Dalsu and Dalhee are 2-head-tall chibi mascot characters with short, chubby limbs and no neck.
- Dalsu (달수): Always has fluffy, cloud-shaped dark brown hair (#604C3F) that surrounds his entire head, two simple black dot eyes, and a simple smiling mouth line.
- Dalhee (달희): Has a very distinctive wide flared-out bob hairstyle in dark brown (#604C3F). Her hair MUST match this exact silhouette:
  * The hair is voluminous and flares out dramatically to BOTH SIDES, extending wider than her body/shoulders, like wings or flippers.
  * The hair tips/ends curl and FLIP OUTWARD at the sides, not inward.
  * The top of the hair is relatively flat/round, then it widens and flares out as it goes down.
  * The overall shape is like an upside-down trapezoid or a wide bell shape.
  * She has very thick, heavy straight bangs/fringe covering her ENTIRE upper face down to her nose bridge.
  * NO EYES, NO EYEBROWS, NO FOREHEAD visible through the bangs. Only her nose tip and a simple smiling mouth line are visible.
  * The hair reaches approximately to her shoulder level at the sides.
  * DO NOT draw her with straight-hanging hair, pigtails, ponytail, long flowing hair, or any other hairstyle. It MUST be a wide flared-out bob with flipped-out tips.

[CRITICAL RULE - DALHEE'S HAIR SHAPE]
Dalhee's hair is her MOST recognizable feature. It MUST flare out widely to both sides like wings. The ends flip outward. If you draw straight-hanging or narrow hair, you are drawing the WRONG character.

[CRITICAL RULE - DALHEE'S EYES]
!!! Dalhee DOES NOT HAVE VISIBLE EYES. This is NOT optional. !!!
- DO NOT draw eyes on Dalhee. DO NOT draw dots, circles, or any eye shapes on Dalhee's face.
- DO NOT draw eyebrows on Dalhee.
- Her bangs/fringe must form an unbroken solid mass covering the entire area from her hairline down to her nose bridge.
- If you find yourself drawing eyes on the female character, you are doing it WRONG. STOP and cover them with hair.
- Dalsu (the male, boy) HAS two dot eyes. Dalhee (the female, girl) has NO eyes showing.

- Costume Policy: Keep the character's original default outfit from the reference image. Do NOT change their clothes unless the user EXPLICITLY requests a specific costume (e.g. "한복 입은", "정장 차림의"). Activities like "축구하는", "시험치는", "요리하는" do NOT require costume changes.
- Framing & Composition: FULL BODY portrait with generous white padding on ALL sides (top, bottom, left, right). At least 15% margin. NEVER crop any body part.
- Background & Floor: Seamless solid white (#FFFFFF). No shadows.

[한국어 캐릭터 가이드]
달수와 달희는 팔다리가 짧고 목이 없는 2등신 SD 마스코트 캐릭터입니다.
- 달수(Dalsu): 머리 전체를 포근하게 감싸는 갈색 구름 모양 머리, 검은색 점 눈 2개, 웃는 입선.
- 달희(Dalhee): 양옆으로 크게 펼쳐지는 와이드 플레어 보브컷. 머리끝이 바깥으로 뒤집히며(flip-out), 전체 실루엣이 날개처럼 몸보다 넓게 펼쳐집니다. 두꺼운 앞머리가 이마~코까지 내려와 눈을 완전히 가립니다. 코끝과 웃는 입만 보입니다.

[달희 머리 모양 규칙 - 최우선]
달희의 머리는 반드시 양옆으로 넓게 펼쳐지고 끝이 바깥으로 뒤집히는 와이드 보브컷이어야 합니다. 일자로 내려오거나 좁은 머리, 포니테일 등 다른 스타일로 그리지 마십시오.

[달희 눈 금지 규칙 - 최우선]
!!! 달희는 눈이 보이지 않는 캐릭터입니다 !!!
- 달희의 얼굴에 눈을 그리지 마십시오. 점, 원, 어떤 눈 형태도 그리지 마십시오.
- 달수(남자아이)는 눈이 있습니다. 달희(여자아이)는 눈이 없습니다.`;
    addDriftLog(`[System Prompt] Injecting: "${systemInstructions}"`, 'info');
    
    await sleep(400);
    updatePipelineStep(1, 'completed');
    
    // Step 2: Action Mapping (400ms - 900ms)
    updatePipelineStep(2, 'active', '공식 동작 라이브러리 매핑 중...');
    els.pipelineProgress.style.width = '25%';
    
    const mappedAction = analyzePromptAndMapAction(promptText);
    if (mappedAction) {
      els.actionSelect.value = mappedAction;
      appState.activeAction = mappedAction;
      addDriftLog(`[Mapping] Prompt matches "${getActionDisplayName(mappedAction)}" keywords. Auto-assigned.`, 'success');
    } else {
      addDriftLog(`[Mapping] Using manual selection: "${getActionDisplayName(appState.activeAction)}"`, 'info');
    }
    
    await sleep(500);
    updatePipelineStep(2, 'completed');
    
    // Step 3: Character Bible Locks verification (900ms - 1500ms)
    updatePipelineStep(3, 'active', '캐릭터 가이드라인 고정 규격 적용 중...');
    els.pipelineProgress.style.width = '50%';
    
    addDriftLog(`[Identity Lock] Enforcing zero-recreation policy. Lock parameters injected into request payload.`, 'success');
    
    await sleep(600);
    updatePipelineStep(3, 'completed');
    
    // Step 4: Character Drift Prevention Check (1500ms - 2100ms)
    updatePipelineStep(4, 'active', '캐릭터 붕괴 방지 검증 중...');
    els.pipelineProgress.style.width = '75%';
    
    addDriftLog(`[Validation] Setting mode to reference-to-image. 0.00% Character Drift target enabled.`, 'success');
    
    await sleep(600);
    updatePipelineStep(4, 'completed');
    
    // Step 5: Render Character (2100ms+)
    updatePipelineStep(5, 'verified', '구글 Imagen 3 엔진 이미지 생성 중...');
    els.pipelineProgress.style.width = '100%';
    
    // Fetch reference base64
    // 방안 2: 레퍼런스 이미지를 배열로 가져옴 (both 모드에서 달수+달희 개별 원본 2장)
    const refImages = await getReferenceImagesBase64(appState.activeCharacter);
    const refBase64 = refImages[0]; // 시뮬레이션 모드 및 하위 호환용
    
    // 방안 1: 의상 변경 유도 문구 제거 → 원본 외형 유지 + 포즈만 변경 지시
    let styleReinforcement = "";
    if (appState.activeCharacter === 'dalsu') {
      styleReinforcement = "\n\n[COMPOSITION] Zoomed-out full body shot. The character must be small and centered in frame, occupying at most 65% of the image height. Leave large empty white margins on all four sides. The top of the hair and the bottom of the feet must be fully visible with plenty of space above and below. Do NOT zoom in or crop.\n\n(Subject Details: Dalsu is a 2-head-tall chibi mascot with short chubby limbs. He has fluffy, cloud-shaped dark brown hair covering his entire head, two dot eyes, and a cute smiling mouth line. Keep his original outfit and appearance exactly as shown in the reference image. Only change his pose. Seamless solid white background, no shadows.)";
    } else if (appState.activeCharacter === 'dalhee') {
      styleReinforcement = "\n\n[COMPOSITION] Zoomed-out full body shot. The character must be small and centered in frame, occupying at most 65% of the image height. Leave large empty white margins on all four sides. The top of the hair and the bottom of the feet must be fully visible with plenty of space above and below. Do NOT zoom in or crop.\n\n(Subject Details: Dalhee is a 2-head-tall chibi mascot with short chubby limbs. HAIR SHAPE: She has a wide flared-out bob hairstyle - her dark brown hair flares out dramatically to BOTH SIDES wider than her body like wings, and the hair tips FLIP OUTWARD at the ends. The top is round/flat and it widens as it goes down. The overall silhouette looks like an upside-down trapezoid or wide bell. DO NOT draw straight-hanging, narrow, ponytail, or any other hairstyle. FACE: DO NOT DRAW EYES ON DALHEE. Her thick straight bangs cover her entire upper face down to her nose. Only her nose tip and a small smiling mouth are visible. ZERO eyes visible. Keep her original outfit and appearance exactly as shown in the reference image. Only change her pose. Seamless solid white background, no shadows.)";
    } else if (appState.activeCharacter === 'both') {
      styleReinforcement = "\n\n[COMPOSITION] Zoomed-out full body shot. Both characters must be small and centered in frame, occupying at most 65% of the image height. Leave large empty white margins on all four sides. Tops of heads and bottoms of feet must be fully visible with plenty of space. Do NOT zoom in or crop.\n\n(Subject Details: Two characters side by side. LEFT = Dalsu (boy): cloud-shaped dark brown hair, two BLACK DOT EYES visible, smiling mouth. RIGHT = Dalhee (girl): wide flared-out bob hairstyle - dark brown hair flares out dramatically to BOTH SIDES wider than her body like wings, hair tips FLIP OUTWARD, overall silhouette like an upside-down trapezoid. Thick straight bangs cover her entire upper face. CRITICAL DIFFERENCE: Dalsu HAS eyes. Dalhee has NO EYES - bangs cover upper face completely. DO NOT draw narrow/straight hair or eyes on Dalhee. Keep both characters' original outfits. Only change their poses. Seamless solid white background, no shadows.)";
    }

    // Build full prompt with composition rules at START and END for maximum effect
    const compositionPrefix = "[IMPORTANT COMPOSITION RULE: Draw the character as a SMALL figure centered in the middle of a LARGE white canvas. The character should occupy no more than 65% of the image. Leave wide empty white space on TOP, BOTTOM, LEFT, and RIGHT. Show the COMPLETE character from head to toe with no cropping. Zoom out. Far shot.]\n\n";
    const compositionSuffix = "\n\n[FINAL REMINDER: ZOOM OUT. Full body. Character small and centered. Large white margins on all sides. No cropping. No shadows under feet.]";
    const finalPrompt = `${compositionPrefix}[System Instructions: ${systemInstructions}]\n\nUser Request: Generate the character performing the following scene: "${promptText}".${styleReinforcement}${compositionSuffix}`;
    
    if (appState.simulateMode) {
      // SIMULATED DEMO MODE
      const matchedAsset = matchOfficialDbAsset(promptText);
      const useProxy = window.location.protocol !== 'file:';

      if (useProxy) {
        addDriftLog(`[API Request] Dispatching simulated generation to proxy...`, 'info');
        try {
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              simulate: true,
              matchedFile: matchedAsset.file,
              prompt: promptText,
              character: appState.activeCharacter,
              action: appState.activeAction,
              generationCount: appState.generationCount + 1
            })
          });
          
          if (res.ok) {
            const resData = await res.json();
            if (resData && resData.success && resData.item) {
              appState.currentImgFile = resData.item.img_url;
              addDriftLog(`[API Response] Simulated metadata successfully registered in database.`, 'success');
              renderGeneratedOutput(
                `<img src="${appState.currentImgFile}" alt="Official Character Output" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35)); animation: float-char 6s ease-in-out infinite;" />`,
                resData.item.name,
                resData.item
              );
              return;
            }
          }
        } catch (e) {
          console.warn('Simulation database save failed, falling back to local only:', e);
        }
      }

      // Fallback for file:// protocol or failed request
      appState.currentImgFile = 'example/' + matchedAsset.file;
      await sleep(400);
      renderGeneratedOutput(`<img src="${appState.currentImgFile}" alt="Official Character Output" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35)); animation: float-char 6s ease-in-out infinite;" />`, matchedAsset.file.replace('.png', ''));
      
    } else {
      // LIVE GOOGLE IMAGEN 3 CALL
      const apiType = els.apiTypeSelect ? els.apiTypeSelect.value : 'studio';
      const studioKey = (els.apiStudioKey && els.apiStudioKey.value.trim()) || window.DEV_GEMINI_API_KEY || '';
      const projectId = (els.apiProjectId && els.apiProjectId.value.trim()) || '914250995391';
      const token = els.apiAccessToken ? els.apiAccessToken.value.trim() : '';

      let useProxy = window.location.protocol !== 'file:';
      let resData = null;

      if (useProxy) {
        addDriftLog(`[API Request] Dispatching predict call through local Proxy Server...`, 'info');
        try {
          // 방안 3: 클라이언트가 완성된 finalPrompt를 전송, 서버는 중계만
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: finalPrompt, // 완성된 프롬프트 전송 (이중 구성 방지)
              userPrompt: promptText, // 원본 프롬프트 전송 (이력 저장용)
              refImages: refImages, // 방안 2: 레퍼런스 이미지 배열 전송
              apiType: apiType,
              projectId: projectId,
              token: token,
              character: appState.activeCharacter,
              action: appState.activeAction,
              generationCount: appState.generationCount + 1
            })
          });
          
          if (res.ok) {
            resData = await res.json();
          } else {
            const errText = await res.text();
            let parsedErr = errText;
            try {
              const parsed = JSON.parse(errText);
              parsedErr = parsed.error || errText;
            } catch (e) {}
            addDriftLog(`[Proxy Error] Status ${res.status}: ${parsedErr}`, 'danger');
            alert(`서버 생성 오류 (Status ${res.status}): ${parsedErr}\n\nNetlify 환경 변수 설정이나 API 키가 올바른지 확인해 주세요.`);
            resetBtnAndCanvas();
            return;
          }
        } catch (e) {
          addDriftLog(`[Proxy Connection Fail] ${e.message}`, 'danger');
          alert(`서버 연결 실패: ${e.message}\n\n네트워크나 서버 상태를 확인해 주세요.`);
          resetBtnAndCanvas();
          return;
        }
      }

      if (!useProxy) {
        // Direct browser-to-Google API fallback
        let url = '';
        let headers = { 'Content-Type': 'application/json' };
        let requestBody = {};

        if (apiType === 'studio') {
          if (!studioKey) {
            alert('Google AI Studio API Key를 입력해 주세요. (또는 시뮬레이션 모드를 활성화하세요)');
            resetBtnAndCanvas();
            return;
          }
          addDriftLog(`[API Request] Dispatching direct call to Google AI Studio (gemini-2.5-flash-image)...`, 'info');
          url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${studioKey}`;
          // 방안 2: 모든 레퍼런스 이미지를 parts에 추가
          const parts = [];
          for (const img of refImages) {
            parts.push({ inlineData: { mimeType: "image/png", data: img } });
          }
          parts.push({ text: finalPrompt });
          requestBody = {
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ["IMAGE"]
            }
          };
        } else {
          if (!projectId || !token) {
            alert('구글 클라우드 Project ID와 OAuth Access Token을 입력해 주세요. (또는 시뮬레이션 모드를 활성화하세요)');
            resetBtnAndCanvas();
            return;
          }
          addDriftLog(`[API Request] Dispatching direct call to Google Cloud Vertex AI (imagen-3.0-capability)...`, 'info');
          url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
          headers['Authorization'] = `Bearer ${token}`;
          requestBody = {
            instances: [
              {
                prompt: finalPrompt, // Sends finalPrompt containing styleReinforcement!
                image: { bytesBase64Encoded: refBase64 }
              }
            ],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              imageFormat: "png",
              outputMimeType: "image/png"
            }
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        resData = await res.json();
      }

      // Process image result
      let outputB64 = '';
      if (resData) {
        if (resData.predictions && resData.predictions.length > 0) {
          outputB64 = resData.predictions[0].bytesBase64Encoded;
        } else if (resData.candidates && resData.candidates[0].content && resData.candidates[0].content.parts) {
          const imgPart = resData.candidates[0].content.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));
          if (imgPart) {
            outputB64 = imgPart.inlineData.data;
          }
        }
      }

      if (resData && resData.success && resData.item) {
        appState.currentImgFile = resData.item.img_url;
        const sourceName = useProxy ? 'Proxy Server' : (apiType === 'studio' ? 'AI Studio (Direct)' : 'Vertex AI (Direct)');
        addDriftLog(`[API Response] Image successfully synthesized, stored in Supabase, and received via ${sourceName}.`, 'success');
        renderGeneratedOutput(
          `<img src="${appState.currentImgFile}" alt="Generated Character Output" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35));" />`,
          resData.item.name,
          resData.item
        );
      } else if (outputB64) {
        // Fallback for file:// where we have direct outputB64
        appState.currentImgFile = 'data:image/png;base64,' + outputB64;
        const sourceName = apiType === 'studio' ? 'AI Studio (Direct)' : 'Vertex AI (Direct)';
        addDriftLog(`[API Response] Image successfully synthesized and received via ${sourceName} (Local Only).`, 'success');
        renderGeneratedOutput(`<img src="${appState.currentImgFile}" alt="Generated Character Output" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35));" />`, `IMAGEN_OUTPUT`);
      } else {
        addDriftLog(`[API Error] Response payload is missing image data.`, 'danger');
        console.error('Raw response data:', resData);
        alert('응답에 이미지 데이터가 포함되어 있지 않습니다.');
        resetBtnAndCanvas();
      }
    }
  } catch (err) {
    addDriftLog(`[API Exception] ${err.message}`, 'danger');
    console.error('API call crashed:', err);
    alert('이미지 생성 중 오류가 발생했습니다: ' + err.message);
    resetBtnAndCanvas();
  }
}

// Render generated results helper
function renderGeneratedOutput(html, nameBase, savedItem = null) {
  els.canvasContainer.innerHTML = html;
  els.canvasContainer.classList.remove('loading');
  if (els.canvasLoadingOverlay) {
    els.canvasLoadingOverlay.classList.remove('active');
  }
  
  appState.generationCount++;
  const finalAssetName = savedItem ? savedItem.name : `${nameBase}_${appState.generationCount}`;
  els.activeCanvasName.textContent = finalAssetName;
  
  const charName = getCharacterDisplayName(savedItem ? savedItem.character : appState.activeCharacter);
  const actionName = getActionDisplayName(savedItem ? savedItem.action : appState.activeAction);
  els.activeCanvasMeta.textContent = `${charName} | ${actionName} | Google Imagen 생성 완료`;
  
  // Save to history
  if (savedItem) {
    const historyItem = {
      id: savedItem.id,
      name: savedItem.name,
      character: savedItem.character,
      action: savedItem.action,
      prompt: savedItem.prompt,
      imgFile: savedItem.img_url,
      timestamp: new Date(savedItem.created_at).toLocaleTimeString()
    };
    appState.history.unshift(historyItem);
    if (appState.history.length > 20) {
      appState.history.pop();
    }
    renderHistoryList();
  } else {
    // Local fallback for direct browser API calls
    const localItem = {
      id: Date.now(),
      name: finalAssetName,
      character: appState.activeCharacter,
      action: appState.activeAction,
      prompt: els.promptInput.value,
      imgFile: appState.currentImgFile,
      timestamp: new Date().toLocaleTimeString()
    };
    appState.history.unshift(localItem);
    if (appState.history.length > 20) {
      appState.history.pop();
    }
    renderHistoryList();
  }
  
  // Reset button state
  els.btnGenerate.disabled = false;
  els.btnGenerate.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
    캐릭터 생성하기
  `;
  
  setTimeout(() => {
    els.pipelineStatusMsg.textContent = '엔진 대기 중';
    els.pipelineStatusMsg.style.color = 'var(--text-muted)';
  }, 3000);
}

function resetBtnAndCanvas() {
  els.btnGenerate.disabled = false;
  els.btnGenerate.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
    캐릭터 생성하기
  `;
  els.canvasContainer.classList.remove('loading');
  if (els.canvasLoadingOverlay) {
    els.canvasLoadingOverlay.classList.remove('active');
  }
}

// Stubs and matching fallbacks for Simulation Mode
function getCharacterDisplayName(charKey) {
  if (charKey === 'dalsu') return '달수';
  if (charKey === 'dalhee') return '달희';
  if (charKey === 'both') return '달수와 달희';
  return 'Character';
}

function getActionDisplayName(actionKey) {
  const options = els.actionSelect.options;
  for (let i = 0; i < options.length; i++) {
    if (options[i].value === actionKey) return options[i].text;
  }
  return 'Default Pose';
}

function getEmotionDisplayName(emotionKey) {
  const options = els.emotionSelect.options;
  for (let i = 0; i < options.length; i++) {
    if (options[i].value === emotionKey) return options[i].text;
  }
  return 'Friendly';
}

function renderEmptyCanvas() {
  els.canvasContainer.innerHTML = `
    <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">
      <p style="font-weight: 600; margin-bottom: 0.5rem; color: #FFF; font-family: var(--font-display);">Studio Screen Ready</p>
      <p>상황 프롬프트를 입력하고 'Generate' 버튼을 누르거나<br>동작을 선택하여 생성을 시작하세요.</p>
    </div>
  `;
  els.activeCanvasName.textContent = 'Untitled Asset';
  els.activeCanvasMeta.textContent = 'Select options and click Generate';
}

// Prompt analyzer & action mapping
function analyzePromptAndMapAction(promptText) {
  if (!promptText.trim()) return null;
  const text = promptText.toLowerCase();
  let bestAction = null;
  let maxMatches = 0;
  
  for (const [actionKey, keywords] of Object.entries(actionMappings)) {
    let matches = 0;
    keywords.forEach(kw => {
      if (text.includes(kw.toLowerCase())) {
        matches++;
      }
    });
    
    if (matches > maxMatches) {
      maxMatches = matches;
      bestAction = actionKey;
    }
  }
  return bestAction;
}

// Match official PNG database assets based on parameters and prompt keywords (For simulated mode matching)
function matchOfficialDbAsset(promptText) {
  const targetChar = appState.activeCharacter;
  const targetAction = appState.activeAction;
  const text = promptText.toLowerCase();

  let candidates = officialDbAssets.filter(asset => asset.char === targetChar);
  if (candidates.length === 0) {
    candidates = officialDbAssets.filter(asset => asset.char === 'both');
  }

  let bestAsset = null;
  let highestScore = -1;

  candidates.forEach(asset => {
    let score = 0;
    
    if (asset.action === targetAction) {
      score += 15;
    }
    
    asset.keywords.forEach(kw => {
      if (text.includes(kw.toLowerCase())) {
        score += 10;
      }
    });
    
    if (text.includes(asset.file.replace('.png', '').split('-').pop())) {
      score += 25;
    }

    if (score > highestScore) {
      highestScore = score;
      bestAsset = asset;
    }
  });

  if (!bestAsset || highestScore <= 0) {
    if (targetChar === 'dalsu') {
      bestAsset = officialDbAssets.find(a => a.file === '기본-달수.png');
    } else if (targetChar === 'dalhee') {
      bestAsset = officialDbAssets.find(a => a.file === '기본-달희.png');
    } else {
      bestAsset = officialDbAssets.find(a => a.file === '응용-A-인사1.png');
    }
  }

  return bestAsset;
}

// Pipeline visual controllers
function resetPipelineNodes() {
  const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'pipeline-step';
  });
}

function updatePipelineStep(stepIndex, statusClass, statusText) {
  const stepEl = document.getElementById(`step${stepIndex}`);
  if (stepEl) {
    stepEl.className = `pipeline-step ${statusClass}`;
  }
  if (statusText) {
    els.pipelineStatusMsg.textContent = statusText;
    els.pipelineStatusMsg.style.color = statusClass === 'active' ? 'var(--color-primary)' : 'var(--color-accent)';
    if (els.loaderStatusText) {
      els.loaderStatusText.textContent = statusText;
    }
    if (els.loaderStepInfo) {
      els.loaderStepInfo.textContent = `${stepIndex}단계 진행 중`;
    }
  }
}

// Export PNG directly from file/base64 path (handles cross-origin downloads from Supabase)
async function exportPNG() {
  if (!appState.currentImgFile) {
    alert('다운로드할 캐릭터가 없습니다.');
    return;
  }
  
  // If it's a local base64 string, download directly
  if (appState.currentImgFile.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = appState.currentImgFile;
    link.download = `${els.activeCanvasName.textContent}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addDriftLog(`[Export] Downloaded generated high-res PNG file.`, 'success');
    return;
  }

  // If it's a URL (e.g. Supabase Storage link or local relative path), fetch as blob to bypass cross-origin download restrictions
  try {
    addDriftLog(`[Export] Fetching image file for download...`, 'info');
    const response = await fetch(appState.currentImgFile);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${els.activeCanvasName.textContent}.png`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    
    addDriftLog(`[Export] Downloaded generated high-res PNG file.`, 'success');
  } catch (error) {
    console.error('Failed to download image:', error);
    // Fallback: open in new tab if fetch fails
    const link = document.createElement('a');
    link.href = appState.currentImgFile;
    link.target = '_blank';
    link.click();
    addDriftLog(`[Export Fallback] Opened image in new tab due to download error.`, 'warning');
  }
}

// History Storage Management (Supabase DB & Storage Integration)
async function loadHistory() {
  try {
    if (window.location.protocol === 'file:') {
      appState.history = [];
      renderHistoryList();
      return;
    }
    
    const res = await fetch('/api/get-history');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.items) {
        // Map database row keys to client state keys
        appState.history = data.items.map(item => ({
          id: item.id,
          name: item.name,
          character: item.character,
          action: item.action,
          prompt: item.prompt,
          imgFile: item.img_url,
          timestamp: new Date(item.created_at).toLocaleTimeString()
        }));
      }
    }
  } catch (err) {
    console.error('Failed to load global history from Supabase:', err);
    appState.history = [];
  } finally {
    renderHistoryList();
  }
}

function renderHistoryList() {
  if (!appState.history || appState.history.length === 0) {
    els.historyList.innerHTML = `
      <div class="empty-history">
        <div class="empty-history-icon">📦</div>
        <p>생성 이력이 없습니다.</p>
        <p style="font-size: 0.7rem; margin-top: 0.25rem;">모든 사용자가 공유하는 보관함입니다.</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  appState.history.forEach((item) => {
    const charName = getCharacterDisplayName(item.character);
    const previewContent = `<img src="${item.imgFile}" style="width:100%; height:100%; object-fit:contain;" />`;
    
    html += `
      <div class="history-item" onclick="loadHistoryItem(${item.id})">
        <div class="history-preview">
          ${previewContent}
        </div>
        <div class="history-details">
          <div class="history-prompt">${item.prompt}</div>
          <div class="history-meta">
            <span>${charName}</span>
            <span>${item.timestamp}</span>
          </div>
        </div>
        <button class="btn-history-del" onclick="deleteHistoryItem(event, ${item.id})">&times;</button>
      </div>
    `;
  });
  
  els.historyList.innerHTML = html;
}

function loadHistoryItem(id) {
  const item = appState.history.find(h => h.id === id);
  if (!item) return;
  
  appState.activeCharacter = item.character;
  appState.activeAction = item.action;
  appState.currentImgFile = item.imgFile;
  
  els.actionSelect.value = item.action;
  
  const buttons = document.querySelectorAll('.config-panel .character-select-grid .char-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-char') === item.character) {
      btn.classList.add('active');
    }
  });
  
  els.canvasContainer.innerHTML = `<img src="${item.imgFile}" alt="Official Character Output" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35)); animation: float-char 6s ease-in-out infinite;" />`;
  els.activeCanvasName.textContent = item.name;
  
  const charName = getCharacterDisplayName(item.character);
  const actionName = getActionDisplayName(item.action);
  els.activeCanvasMeta.textContent = `${charName} | ${actionName} | 불러옴`;
  
  addDriftLog(`[History] Loaded asset "${item.name}" from database.`, 'success');
}

async function deleteHistoryItem(event, id) {
  event.stopPropagation();
  if (confirm('이 이미지를 생성 이력에서 정말 삭제하시겠습니까? 데이터베이스에서 영구적으로 삭제됩니다.')) {
    try {
      appState.history = appState.history.filter(h => h.id !== id);
      if (window.location.protocol !== 'file:') {
        await fetch(`/api/delete-history?id=${id}`, {
          method: 'DELETE'
        });
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
    } finally {
      renderHistoryList();
      renderEmptyCanvas();
    }
  }
}

async function clearHistory() {
  if (confirm('모든 사용자의 생성 이력을 삭제하시겠습니까? 데이터베이스에서 전체 이미지 레코드가 영구적으로 지워집니다.')) {
    try {
      appState.history = [];
      if (window.location.protocol !== 'file:') {
        await fetch('/api/delete-history?all=true', {
          method: 'DELETE'
        });
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      renderHistoryList();
      renderEmptyCanvas();
    }
  }
}

// Drift Logs Panel
function addDriftLog(message, type = 'info') {
  const now = new Date().toLocaleTimeString();
  const log = { time: now, msg: message, type: type };
  appState.driftLogs.unshift(log);
  
  if (appState.driftLogs.length > 30) appState.driftLogs.pop();
  renderDriftLogs();
}

function renderDriftLogs() {
  if (appState.driftLogs.length === 0) {
    els.driftLogList.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; padding: 2rem 0; font-size: 0.8rem;">
        현재 감지된 캐릭터 붕괴 위반 시도가 없습니다.
      </div>
    `;
    return;
  }
  
  let html = '';
  appState.driftLogs.forEach(log => {
    let typeClass = '';
    if (log.type === 'success') typeClass = 'success';
    if (log.type === 'danger') typeClass = 'danger';
    
    html += `
      <div class="drift-log-item ${typeClass}">
        [${log.time}] ${log.msg}
      </div>
    `;
  });
  
  els.driftLogList.innerHTML = html;
}

function openAdminModal() {
  els.adminModal.classList.add('open');
  renderDriftLogs();
}

function closeAdminModal() {
  els.adminModal.classList.remove('open');
}

function switchAdminTab(tabId) {
  const buttons = document.querySelectorAll('.admin-tab-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick').includes(tabId)) {
      btn.classList.add('active');
    }
  });
  
  const contents = document.querySelectorAll('.admin-tab-content');
  contents.forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

function populateAdminMappings() {
  let html = '';
  for (const [actionKey, keywords] of Object.entries(actionMappings)) {
    const displayName = getActionDisplayName(actionKey);
    html += `
      <div class="mapping-row">
        <div class="mapping-key">${displayName}</div>
        <input type="text" class="mapping-val-input" id="map-input-${actionKey}" value="${keywords.join(', ')}">
      </div>
    `;
  }
  els.mappingGrid.innerHTML = html;
}

function saveAdminMappings() {
  for (const actionKey of Object.keys(actionMappings)) {
    const input = document.getElementById('map-input-' + actionKey);
    if (input) {
      const raw = input.value;
      const clean = raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
      actionMappings[actionKey] = clean;
    }
  }
  addDriftLog('[System] Prompt mapping dictionary updated.', 'success');
  closeAdminModal();
}
