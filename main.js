const virtueBar = document.getElementById('virtueGauge');
const karmaBar = document.getElementById('karmaGauge');
const virtuePct = document.getElementById('virtuePct');
const karmaPct = document.getElementById('karmaPct');
const spinBtn = document.getElementById('spinBtn');
const restartBtn = document.getElementById('restartBtn');
const actionReel = document.getElementById('actionReel');
const multiplierReel = document.getElementById('multiplierReel');
const spinResultEl = document.getElementById('spinResult');
const endingMessageEl = document.getElementById('endingMessage');
const endingModal = document.getElementById('endingModal');
const modalMessage = document.getElementById('modalMessage');
const modalActionBtn = document.getElementById('modalActionBtn');
const fxLayer = document.getElementById('fxLayer');

let virtue = 0;
let karma = 0;
let spinning = false;
let originalSpinLabel = spinBtn ? spinBtn.textContent : '';
let spinGen = 0; // 스핀 세대 식별자
let spinSafetyTimerId = null; // transitionend 누락 대비 안전 타이머
let multDelayTimerId = null; // 두 번째 릴 지연 타이머

const virtueActions = [
  { label: '아침 찬물 샤워', base: 8 },
  { label: '108배', base: 12 },
  { label: '30분 염주치기', base: 10 },
  { label: '채식 도시락', base: 9 },
  { label: '경전 읽기', base: 11 },
  { label: '길고양이 밥주기', base: 10 },
  { label: '쓰레기 줍기', base: 8 },
  { label: '지하철 자리 양보', base: 12 },
  { label: '헌혈하기', base: 14 },
  { label: '노인 도와드리기', base: 11 },
  { label: '길 잃은 아이 도와주기', base: 13 },
  { label: '책 기부', base: 9 },
  { label: '장난감 기부', base: 9 },
  { label: '환경 캠페인 참여', base: 10 },
  { label: '나무 심기', base: 12 },
  { label: '플라스틱 줄이기', base: 8 },
  { label: '교통법규 준수', base: 7 },
  { label: '미소로 인사하기', base: 6 },
  { label: '문 열어주기', base: 7 },
  { label: '분리수거 철저', base: 10 },
  { label: '봉사활동 1시간', base: 14 },
  { label: '기부하기', base: 13 },
  { label: '감사 일기 쓰기', base: 8 },
  { label: '명상 10분', base: 9 },
  { label: '물 절약', base: 7 },
  { label: '전기 절약', base: 7 },
  { label: '동물 보호 서명', base: 8 },
  { label: '이웃과 반찬 나눔', base: 11 },
  { label: '직장 동료 칭찬', base: 8 },
  { label: '칭찬 릴레이 참여', base: 9 },
];

const karmaActions = [
  { label: '소주 먹기', base: 8 },
  { label: '강원랜드 가기', base: 15 },
  { label: '치맥 먹기', base: 10 },
  { label: '개미 밟기', base: 7 },
  { label: '욕설하기', base: 9 },
  { label: '음주가무', base: 12 },
  { label: '무단횡단', base: 9 },
  { label: '새치기', base: 10 },
  { label: '쓰레기 투기', base: 11 },
  { label: '분리수거 안함', base: 9 },
  { label: '교통법규 위반', base: 12 },
  { label: '지각하기', base: 7 },
  { label: '뒷담화하기', base: 9 },
  { label: '게임에서 욕설', base: 8 },
  { label: '야식 폭식', base: 8 },
  { label: '무단주차', base: 12 },
  { label: '층간소음 유발', base: 11 },
  { label: '담배꽁초 투기', base: 10 },
  { label: '공공장소 고성방가', base: 10 },
  { label: '노약자석 점유', base: 11 },
  { label: '길막하기', base: 7 },
  { label: '인터넷 악플', base: 12 },
  { label: '약속 파기', base: 10 },
  { label: '반려견 배변 방치', base: 11 },
  { label: '자연 훼손', base: 12 },
  { label: '재촉하며 끼어들기', base: 8 },
  { label: '거짓말하기', base: 9 },
  { label: '허세부리기', base: 7 },
  { label: '사소한 약속 무시', base: 8 },
  { label: '도박 과소비', base: 13 },
];

const multipliers = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6];

// 덕/업보를 번갈아가며 섞은 목록 생성
function interleaveActions(vList, kList) {
  const maxLen = Math.max(vList.length, kList.length);
  const out = [];
  for (let i = 0; i < maxLen; i++) {
    if (i < vList.length) out.push({ ...vList[i], type: 'virtue' });
    if (i < kList.length) out.push({ ...kList[i], type: 'karma' });
  }
  return out;
}

// 합쳐진 행동 목록과 타입 태그(번갈아 병합)
const combinedActions = interleaveActions(virtueActions, karmaActions);

// 리얼 항목의 높이(px)
const ITEM_HEIGHT = 55; // 1행 높이 (기본값, 모바일에선 CSS 변수로 덮어씀)
const VISIBLE_ROWS = 5; // 항상 5행 보이게
const CENTER_ROW_INDEX = 2; // 0-based: 0,1,[2],3,4 → 3번째 중앙
const SPIN_DURATION_MS = 2400; // 절반 속도로 느리게(지속시간 2배)
const MULTI_DELAY_MS = 120;

// 반응형: CSS 변수(--item-height) 기반으로 현재 행 높이를 계산
function getItemHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--item-height').trim();
  const px = parseFloat(raw);
  if (!Number.isNaN(px) && px > 0) return px;
  const probe = document.querySelector('.reel li');
  return probe ? probe.getBoundingClientRect().height : ITEM_HEIGHT;
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function setGauge(target, pctEl, value) {
  const v = clamp(value, 0, 100);
  target.style.width = `${v}%`;
  pctEl.textContent = `${Math.round(v)}%`;
}

function applyEndingIfAny() {
  if (virtue >= 100) {
    showEndingModal('덕업일치를 달성하여 보살이 되었습니다✨', '환생하기');
    return true;
  }
  if (karma >= 100) {
    showEndingModal('인간말종이 되었습니다💀', '서울역으로 가기');
    return true;
  }
  return false;
}

function resetGame() {
  virtue = 0; karma = 0;
  spinning = false;
  // 이전 스핀 타이머/콜백 무효화
  spinGen += 1;
  if (spinSafetyTimerId) { clearTimeout(spinSafetyTimerId); spinSafetyTimerId = null; }
  if (multDelayTimerId) { clearTimeout(multDelayTimerId); multDelayTimerId = null; }
  setGauge(virtueBar, virtuePct, virtue);
  setGauge(karmaBar, karmaPct, karma);
  if (spinResultEl) spinResultEl.textContent = '준비되었습니다.';
  if (endingMessageEl) {
    endingMessageEl.classList.add('hidden');
    endingMessageEl.textContent = '';
  }
  hideEndingModal();
  if (spinBtn) {
    spinBtn.disabled = false;
    spinBtn.classList.remove('spinning');
    spinBtn.textContent = originalSpinLabel || '찌끄려보기';
  }
  // 리얼 위치 초기화
  if (actionReel && multiplierReel) {
    actionReel.style.transition = 'none';
    multiplierReel.style.transition = 'none';
    // 중앙(3번째)에 index 2가 오도록 정렬 (transform=0 기준)
    actionReel.style.transform = 'translateY(0)';
    multiplierReel.style.transform = 'translateY(0)';
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (actionReel && multiplierReel) {
        actionReel.style.transition = '';
        multiplierReel.style.transition = '';
      }
    });
  });
}

function init() {
  // 리얼 DOM 구성
  renderReel(actionReel, combinedActions.map((a) => ({ text: a.label, type: a.type })));
  renderReel(multiplierReel, multipliers.map((m) => ({ text: `x${m}`, type: 'mult' })));
  setGauge(virtueBar, virtuePct, virtue);
  setGauge(karmaBar, karmaPct, karma);

  spinBtn.addEventListener('click', onSpin);
  restartBtn.addEventListener('click', resetGame);
  modalActionBtn.addEventListener('click', () => {
    hideEndingModal();
    resetGame();
  });

  // 초기 정렬: 중앙(3번째)에 index 2가 위치하도록 (0,1,2,3,4가 보임)
  actionReel.style.transition = 'none';
  multiplierReel.style.transition = 'none';
  actionReel.style.transform = 'translateY(0)';
  multiplierReel.style.transform = 'translateY(0)';
  applyHighlight(actionReel, 2);
  applyHighlight(multiplierReel, 2);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      actionReel.style.transition = '';
      multiplierReel.style.transition = '';
    });
  });
}

function randomIndex(n) { return Math.floor(Math.random() * n); }

function onSpin() {
  if (spinning) return;
  if (virtue >= 100 || karma >= 100) return;
  spinning = true;
  spinBtn.disabled = true;
  spinBtn.classList.add('spinning');
  if (originalSpinLabel === '') originalSpinLabel = spinBtn.textContent;
  spinBtn.textContent = '찌끄리는 중...';
  const myGen = ++spinGen;

  const actionIdx = randomIndex(combinedActions.length);
  const multIdx = randomIndex(multipliers.length);

  // 더 자연스러운 슬롯 효과를 위해 동일 목록을 3회 이상 반복
  const repeatCount = 4;
  const actionList = repeatItems(combinedActions, repeatCount);
  const multList = repeatItems(multipliers, repeatCount);

  renderReel(actionReel, actionList.map((a) => ({ text: a.label, type: a.type })));
  renderReel(multiplierReel, multList.map((m) => ({ text: `x${m}`, type: 'mult' })));

  // 타겟을 마지막 블록이 아닌 가운데 블록으로 배치하여 항상 아래쪽 아이템이 보이도록 함
  const actionLen = combinedActions.length;
  const multLen = multipliers.length;
  const middleBlock = Math.floor(repeatCount / 2); // repeatCount=4 → 2(0-index 기준 3번째 블록)
  const targetActionRow = middleBlock * actionLen + actionIdx;
  const targetMultRow = middleBlock * multLen + multIdx;

  // 윈도우 중앙(선택 셀)에 정렬되도록 보정
  // 항상 5행, 중앙(CENTER_ROW_INDEX)에 목표가 오도록 변환값 계산
  const h = getItemHeight();
  const actionTranslate = -(targetActionRow - CENTER_ROW_INDEX) * h;
  const multTranslate = -(targetMultRow - CENTER_ROW_INDEX) * h;

  // 강제 리셋 → 리플로우 → 트랜지션 시작으로 항상 transitionend가 발생하도록 보장
  actionReel.style.transition = 'none';
  multiplierReel.style.transition = 'none';
  actionReel.style.transform = 'translateY(0)';
  multiplierReel.style.transform = 'translateY(0)';
  forceReflow(actionReel);
  forceReflow(multiplierReel);

  actionReel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(.13,.67,.13,.98)`;
  multiplierReel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(.13,.67,.13,.98)`;

  // 약간의 시간차로 리얼 느낌 추가
  requestAnimationFrame(() => {
    actionReel.style.transform = `translateY(${actionTranslate}px)`;
    multDelayTimerId = setTimeout(() => {
      multiplierReel.style.transform = `translateY(${multTranslate}px)`;
    }, MULTI_DELAY_MS);
  });

  const chosenAction = combinedActions[actionIdx];
  const chosenMult = multipliers[multIdx];

  let endedCount = 0;
  let finished = false;
  const finalize = () => {
    if (myGen !== spinGen) return; // 리셋 등으로 무효화된 콜백이면 중단
    if (finished) return;
    finished = true;
    // 결과 반영
    const delta = Math.round(chosenAction.base * chosenMult);
    const kind = chosenAction.type;
    if (kind === 'virtue') {
      virtue = clamp(virtue + delta, 0, 100);
      setGauge(virtueBar, virtuePct, virtue);
    } else {
      karma = clamp(karma + delta, 0, 100);
      setGauge(karmaBar, karmaPct, karma);
    }

    const sign = kind === 'virtue' ? '덕' : '업보';

    const ended = applyEndingIfAny();
    // 버튼 상태 복구
    spinBtn.classList.remove('spinning');
    spinBtn.textContent = originalSpinLabel || 'SPIN!';
    if (!ended) {
      spinBtn.disabled = false;
    }
    spinning = false;
    spinSafetyTimerId = null;
    multDelayTimerId = null;

    // 하이라이트 갱신
    applyHighlight(actionReel, targetActionRow);
    applyHighlight(multiplierReel, targetMultRow);

    actionReel.removeEventListener('transitionend', onEnd);
    multiplierReel.removeEventListener('transitionend', onEnd);
  };

  const onEnd = (e) => {
    if (e.target !== actionReel && e.target !== multiplierReel) return;
    endedCount += 1;
    if (endedCount >= 2) finalize();
  };

  // 중복 리스너 방지: 기존 리스너 제거 후 등록
  actionReel.removeEventListener('transitionend', onEnd);
  multiplierReel.removeEventListener('transitionend', onEnd);
  actionReel.addEventListener('transitionend', onEnd, { once: true });
  multiplierReel.addEventListener('transitionend', onEnd, { once: true });

  // transitionend 누락 방지를 위한 안전 타임아웃
  spinSafetyTimerId = setTimeout(() => finalize(), SPIN_DURATION_MS + MULTI_DELAY_MS + 300);
}

// 초기화 실행
init();

// ------- 헬퍼 -------
function renderReel(ul, items) {
  ul.innerHTML = items.map((it) => {
    const typeAttr = it.type ? ` data-type="${it.type}"` : '';
    return `<li${typeAttr}>${it.text}</li>`;
  }).join('');
}

function repeatItems(arr, times) {
  const out = [];
  for (let i = 0; i < times; i++) out.push(...arr);
  return out;
}

function forceReflow(el) {
  // eslint-disable-next-line no-unused-expressions
  el && el.offsetHeight;
}

function showEndingModal(message, actionLabel) {
  modalMessage.textContent = message;
  modalActionBtn.textContent = actionLabel;
  endingModal.classList.remove('hidden');
  spinBtn.disabled = true;
  // FX: 엔딩 타입에 따라 연출
  if (message.includes('보살')) {
    triggerPetalBurst();
  } else if (message.includes('인간말종')) {
    triggerDarkness();
  }
}

function hideEndingModal() {
  endingModal.classList.add('hidden');
}

function applyHighlight(ul, visibleIndex) {
  const items = ul.querySelectorAll('li');
  items.forEach((li) => li.classList.remove('active'));
  const idx = Math.max(0, Math.min(items.length - 1, visibleIndex));
  const target = items[idx];
  if (target) target.classList.add('active');
}

// ---------- FX ----------
function triggerPetalBurst() {
  if (!fxLayer) return;
  // 중앙 폭발 스케일 연출(모달 위로)
  const burst = document.createElement('div');
  burst.style.position = 'fixed';
  burst.style.inset = '0';
  burst.style.display = 'grid';
  burst.style.placeItems = 'center';
  burst.style.zIndex = '56';
  const center = document.createElement('div');
  center.textContent = '🌸';
  center.style.fontSize = '64px';
  center.style.animation = 'petalBurst 600ms ease-out forwards';
  burst.appendChild(center);
  fxLayer.appendChild(burst);
  setTimeout(() => burst.remove(), 700);

  // 상단에서 떨어지는 꽃
  const count = 36;
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'petal';
    span.textContent = '🌸';
    const startX = Math.random() * window.innerWidth;
    span.style.left = `${startX}px`;
    span.style.setProperty('--x', `${(Math.random() * 40 - 20)}vw`);
    span.style.animationDuration = `${1.6 + Math.random() * 1.0}s`;
    span.style.fontSize = `${18 + Math.random() * 22}px`;
    fxLayer.appendChild(span);
    setTimeout(() => span.remove(), 2600);
  }
}

function triggerDarkness() {
  if (!fxLayer) return;
  // 암전 오버레이 추가
  const dark = document.createElement('div');
  dark.className = 'darkness';
  fxLayer.appendChild(dark);
  setTimeout(() => dark.remove(), 2200);

  // 해골 낙하
  const count = 22;
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'skull';
    span.textContent = '💀';
    const startX = Math.random() * window.innerWidth;
    span.style.left = `${startX}px`;
    span.style.setProperty('--x', `${(Math.random() * 20 - 10)}vw`);
    span.style.animationDuration = `${1.3 + Math.random() * 0.8}s`;
    span.style.fontSize = `${18 + Math.random() * 24}px`;
    fxLayer.appendChild(span);
    setTimeout(() => span.remove(), 2100);
  }
}


