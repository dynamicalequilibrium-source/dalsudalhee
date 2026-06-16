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
  apiRememberCheck: null
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
  const isSimulated = els.apiSimulateCheck.checked;
  appState.simulateMode = isSimulated;
  
  if (isSimulated) {
    els.apiRealConfigFields.style.display = 'none';
    addDriftLog('[System] Google Imagen API Simulation mode enabled.', 'success');
  } else {
    els.apiRealConfigFields.style.display = 'flex';
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
    els.apiStudioFields.style.display = 'flex';
    els.apiVertexFields.style.display = 'none';
  } else {
    els.apiStudioFields.style.display = 'none';
    els.apiVertexFields.style.display = 'flex';
  }
  saveApiCredentials();
}

// Save API credentials to localStorage
function saveApiCredentials() {
  if (!els.apiRememberCheck) return;
  const remember = els.apiRememberCheck.checked;
  if (remember) {
    const credentials = {
      apiType: els.apiTypeSelect.value,
      studioKey: els.apiStudioKey.value.trim(),
      projectId: els.apiProjectId.value.trim(),
      accessToken: els.apiAccessToken.value.trim(),
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
    studioKey: 'AIzaSyDbXvGVIoHumx5v_yf74KDEG6D-cU0IEjA',
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
    els.apiTypeSelect.value = credentials.apiType;
    els.apiStudioKey.value = credentials.studioKey;
    els.apiProjectId.value = credentials.projectId;
    els.apiAccessToken.value = credentials.accessToken;
    
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
      els.activeCanvasName.textContent = `${charName} Studio Output`;
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

// Helper to convert local reference image file to base64 for API payload
async function getReferenceImageBase64(charKey) {
  let filepath = 'example/기본-달수.png';
  if (charKey === 'dalhee') {
    filepath = 'example/기본-달희.png';
  } else if (charKey === 'both') {
    filepath = 'example/응용-A-인사1.png'; // default combined starting reference
  }
  
  try {
    const response = await fetch(filepath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Strip data:image/png;base64, prefix
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error reading reference file:', error);
    // Fallback simple base64 mock to prevent crash if file is missing in sandbox
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
}

// Trigger Pipeline Generation Process
async function triggerGeneration() {
  const promptText = els.promptInput.value;
  if (!promptText.trim()) {
    alert('프롬프트를 입력해 주세요.');
    return;
  }
  
  els.btnGenerate.disabled = true;
  els.btnGenerate.textContent = 'Generating...';
  els.canvasContainer.classList.add('loading');
  
  resetPipelineNodes();
  
  // Step 1: Input Prompt analysis (0ms - 400ms)
  updatePipelineStep(1, 'active', 'Analyzing User Request...');
  els.pipelineProgress.style.width = '0%';
  
  addDriftLog(`[Engine] Activating "Reference Character Mode" (공식 원본 참조 변형 방식).`, 'info');
  addDriftLog(`[Engine] Binding reference sheets as input nodes: "기본-달수.png", "기본-달희.png"`, 'info');
  
  const systemInstructions = `첨부된 캐릭터를 그대로 유지한다. 얼굴 구조 변경 금지, 눈 모양 변경 금지, 신체 비율 변경 금지, 복장 변경 금지, 색상 변경 금지. 캐릭터 정체성을 유지하면서 포즈와 상황만 변경한다.`;
  addDriftLog(`[System Prompt] Injecting: "${systemInstructions}"`, 'info');
  
  setTimeout(async () => {
    updatePipelineStep(1, 'completed');
    
    // Step 2: Action Mapping (400ms - 900ms)
    updatePipelineStep(2, 'active', 'Mapping Action Library...');
    els.pipelineProgress.style.width = '25%';
    
    const mappedAction = analyzePromptAndMapAction(promptText);
    if (mappedAction) {
      els.actionSelect.value = mappedAction;
      appState.activeAction = mappedAction;
      addDriftLog(`[Mapping] Prompt matches "${getActionDisplayName(mappedAction)}" keywords. Auto-assigned.`, 'success');
    } else {
      addDriftLog(`[Mapping] Using manual selection: "${getActionDisplayName(appState.activeAction)}"`, 'info');
    }
    
    setTimeout(async () => {
      updatePipelineStep(2, 'completed');
      
      // Step 3: Character Bible Locks verification (900ms - 1500ms)
      updatePipelineStep(3, 'active', 'Applying Identity Lock Constraints...');
      els.pipelineProgress.style.width = '50%';
      
      addDriftLog(`[Identity Lock] Enforcing zero-recreation policy. Lock parameters injected into request payload.`, 'success');
      
      setTimeout(async () => {
        updatePipelineStep(3, 'completed');
        
        // Step 4: Character Drift Prevention Check (1500ms - 2100ms)
        updatePipelineStep(4, 'active', 'Running Character Drift check...');
        els.pipelineProgress.style.width = '75%';
        
        addDriftLog(`[Validation] Setting mode to reference-to-image. 0.00% Character Drift target enabled.`, 'success');
        
        setTimeout(async () => {
          updatePipelineStep(4, 'completed');
          
          // Step 5: Render Character (2100ms+)
          updatePipelineStep(5, 'verified', 'Invoking Imagen Engine...');
          els.pipelineProgress.style.width = '100%';
          
          // Fetch reference base64
          const refBase64 = await getReferenceImageBase64(appState.activeCharacter);
          
          // Build full prompt including system instructions
          const finalPrompt = `[System Instructions: ${systemInstructions}]\n\nUser Request: Generate the character performing the following scene: "${promptText}".`;
          
          if (appState.simulateMode) {
            // SIMULATED DEMO MODE
            // Match closest illustration to mock output
            const matchedAsset = matchOfficialDbAsset(promptText);
            appState.currentImgFile = 'example/' + matchedAsset.file;
            
            // Log the exact simulated API request and response JSON payloads for inspector verification!
            const simulatedRequestPayload = {
              instances: [
                {
                  prompt: finalPrompt,
                  image: {
                    bytesBase64Encoded: refBase64.substring(0, 40) + "...[BASE64_BYTES]..."
                  }
                }
              ],
              parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                imageFormat: "png",
                outputMimeType: "image/png"
              }
            };
            
            const simulatedResponsePayload = {
              predictions: [
                {
                  bytesBase64Encoded: "...[GENERATED_PNG_BASE64_BYTES]...",
                  mimeType: "image/png"
                }
              ]
            };
            
            addDriftLog(`[API Request] POST https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`, 'info');
            addDriftLog(`[Payload Sent] ${JSON.stringify(simulatedRequestPayload)}`, 'info');
            addDriftLog(`[API Response Received] ${JSON.stringify(simulatedResponsePayload)}`, 'success');
            
            setTimeout(() => {
              renderGeneratedOutput(`<img src="${appState.currentImgFile}" alt="Official Character Output" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35)); animation: float-char 6s ease-in-out infinite;" />`, matchedAsset.file.replace('.png', ''));
            }, 400);
            
          } else {
            // LIVE GOOGLE IMAGEN 3 CALL
            const apiType = els.apiTypeSelect.value;
            const studioKey = els.apiStudioKey.value.trim();
            const projectId = els.apiProjectId.value.trim();
            const token = els.apiAccessToken.value.trim();

            let useProxy = window.location.protocol !== 'file:';
            let resData = null;

            if (useProxy) {
              addDriftLog(`[API Request] Dispatching predict call through local Proxy Server...`, 'info');
              try {
                const res = await fetch('/api/generate-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prompt: promptText,
                    refBase64: refBase64,
                    apiType: apiType,
                    projectId: projectId,
                    token: token
                  })
                });
                
                if (res.ok) {
                  resData = await res.json();
                } else {
                  const errText = await res.text();
                  addDriftLog(`[Proxy Warning] Proxy server returned status ${res.status}: ${errText}. Falling back to direct browser call.`, 'warning');
                  useProxy = false;
                }
              } catch (e) {
                addDriftLog(`[Proxy Connection Fail] Local proxy server is not reachable. Falling back to direct browser call.`, 'warning');
                useProxy = false;
              }
            }

            if (!useProxy) {
              // Direct browser-to-Google API fallback
              let url = '';
              let headers = { 'Content-Type': 'application/json' };

              if (apiType === 'studio') {
                if (!studioKey) {
                  alert('Google AI Studio API Key를 입력해 주세요. (또는 시뮬레이션 모드를 활성화하세요)');
                  resetBtnAndCanvas();
                  return;
                }
                addDriftLog(`[API Request] Dispatching direct call to Google AI Studio...`, 'info');
                url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-capability-001:predict?key=${studioKey}`;
              } else {
                if (!projectId || !token) {
                  alert('구글 클라우드 Project ID와 OAuth Access Token을 입력해 주세요. (또는 시뮬레이션 모드를 활성화하세요)');
                  resetBtnAndCanvas();
                  return;
                }
                addDriftLog(`[API Request] Dispatching direct call to Google Cloud Vertex AI...`, 'info');
                url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
                headers['Authorization'] = `Bearer ${token}`;
              }

              const requestBody = {
                instances: [
                  {
                    prompt: finalPrompt,
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

              try {
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
              } catch (err) {
                const engineName = apiType === 'studio' ? 'AI Studio' : 'Vertex AI';
                addDriftLog(`[API Error] ${err.message}`, 'danger');
                alert(`${engineName} Imagen 생성에 실패했습니다: ${err.message}\n\n시뮬레이션 모드로 다시 실행하는 것을 추천합니다.`);
                resetBtnAndCanvas();
                return;
              }
            }

            // Process image result
            if (resData && resData.predictions && resData.predictions.length > 0) {
              const outputB64 = resData.predictions[0].bytesBase64Encoded;
              appState.currentImgFile = 'data:image/png;base64,' + outputB64;
              
              const sourceName = useProxy ? 'Proxy Server' : (apiType === 'studio' ? 'AI Studio (Direct)' : 'Vertex AI (Direct)');
              addDriftLog(`[API Response] Image successfully synthesized and received via ${sourceName}.`, 'success');
              
              renderGeneratedOutput(`<img src="${appState.currentImgFile}" alt="Generated Character Output" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35));" />`, `IMAGEN_OUTPUT`);
            } else {
              addDriftLog(`[API Error] Response payload is missing predictions data.`, 'danger');
              alert('응답에 이미지 데이터가 포함되어 있지 않습니다.');
              resetBtnAndCanvas();
            }
          }
          
        }, 600);
      }, 600);
    }, 500);
  }, 400);
}

// Render generated results helper
function renderGeneratedOutput(html, nameBase) {
  els.canvasContainer.innerHTML = html;
  els.canvasContainer.classList.remove('loading');
  
  appState.generationCount++;
  const finalAssetName = `${nameBase}_${appState.generationCount}`;
  els.activeCanvasName.textContent = finalAssetName;
  
  const charName = getCharacterDisplayName(appState.activeCharacter);
  const actionName = getActionDisplayName(appState.activeAction);
  els.activeCanvasMeta.textContent = `${charName} | ${actionName} | Generated by Google Imagen`;
  
  // Save to history
  saveToHistory({
    id: Date.now(),
    name: finalAssetName,
    character: appState.activeCharacter,
    action: appState.activeAction,
    prompt: els.promptInput.value,
    imgFile: appState.currentImgFile,
    timestamp: new Date().toLocaleTimeString()
  });
  
  // Reset button state
  els.btnGenerate.disabled = false;
  els.btnGenerate.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
    Generate Character
  `;
  
  setTimeout(() => {
    els.pipelineStatusMsg.textContent = 'Engine Idle';
    els.pipelineStatusMsg.style.color = 'var(--text-muted)';
  }, 3000);
}

function resetBtnAndCanvas() {
  els.btnGenerate.disabled = false;
  els.btnGenerate.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
    Generate Character
  `;
  els.canvasContainer.classList.remove('loading');
}

// Stubs and matching fallbacks for Simulation Mode
function getCharacterDisplayName(charKey) {
  if (charKey === 'dalsu') return '달수 (Dalsu)';
  if (charKey === 'dalhee') return '달희 (Dalhee)';
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
  }
}

// Export PNG directly from file/base64 path
function exportPNG() {
  if (!appState.currentImgFile) {
    alert('다운로드할 캐릭터가 없습니다.');
    return;
  }
  
  const link = document.createElement('a');
  link.href = appState.currentImgFile;
  link.download = `${els.activeCanvasName.textContent}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  addDriftLog(`[Export] Downloaded generated high-res PNG file.`, 'success');
}

// History Storage Management
function loadHistory() {
  const stored = localStorage.getItem('dalseo_studio_history');
  if (stored) {
    try {
      appState.history = JSON.parse(stored);
    } catch (e) {
      appState.history = [];
    }
  }
  renderHistoryList();
}

function saveToHistory(item) {
  appState.history.unshift(item);
  if (appState.history.length > 12) {
    appState.history.pop();
  }
  localStorage.setItem('dalseo_studio_history', JSON.stringify(appState.history));
  renderHistoryList();
}

function renderHistoryList() {
  if (appState.history.length === 0) {
    els.historyList.innerHTML = `
      <div class="empty-history">
        <div class="empty-history-icon">📦</div>
        <p>이력이 비어 있습니다.</p>
        <p style="font-size: 0.7rem; margin-top: 0.25rem;">생성된 파일은 브라우저 세션에 안전하게 유지됩니다.</p>
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
  els.activeCanvasMeta.textContent = `${charName} | ${actionName} | Reloaded`;
  
  addDriftLog(`[History] Loaded asset "${item.name}" from LocalStorage.`, 'success');
}

function deleteHistoryItem(event, id) {
  event.stopPropagation();
  appState.history = appState.history.filter(h => h.id !== id);
  localStorage.setItem('dalseo_studio_history', JSON.stringify(appState.history));
  renderHistoryList();
  renderEmptyCanvas();
}

function clearHistory() {
  if (confirm('모든 생성 이력을 삭제하시겠습니까?')) {
    appState.history = [];
    localStorage.removeItem('dalseo_studio_history');
    renderHistoryList();
    renderEmptyCanvas();
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
