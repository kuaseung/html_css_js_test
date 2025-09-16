// ========= Constants & State =========
const LS = {
  diary: 'diary-text',
  level: 'diary-level',
  showAll: 'diary-show-translations',
  saves: 'diary-saved-sentences',
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const els = {
  year: $('#year'),
  level: $('#level-select'),
  btnApplyLevel: $('#btn-apply-level'),
  toggleAll: $('#toggle-all-trans'),
  cards: $('#cards-grid'),
  sidebar: $('#sidebar-list'),
  diary: $('#diary'),
  btnSave: $('#btn-save'),
  btnLoad: $('#btn-load'),
  btnClear: $('#btn-clear'),
  downloadJson: $('#download-json'),
};

let appData = null; // sentences.json content
let currentLevelKey = 'kindergarten';
let showAllTranslations = false;
let voices = [];
let savedSentences = [];

// ========= Utilities =========
function setYear() {
  if (els.year) els.year.textContent = String(new Date().getFullYear());
}

function saveDiary() {
  localStorage.setItem(LS.diary, els.diary.value);
}
function loadDiary() {
  const v = localStorage.getItem(LS.diary);
  if (v != null) els.diary.value = v;
}
function saveLevel(key) {
  localStorage.setItem(LS.level, key);
}
function loadLevel() {
  const v = localStorage.getItem(LS.level);
  if (v && els.level.querySelector(`option[value="${v}"]`)) return v;
  return 'kindergarten';
}
function saveShowAll(flag) {
  localStorage.setItem(LS.showAll, flag ? '1' : '0');
}
function loadShowAll() {
  return localStorage.getItem(LS.showAll) === '1';
}

function sentenceId(idx) { return `s-${idx}`; }

function loadSaves() {
  try {
    const raw = localStorage.getItem(LS.saves) || '[]';
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) savedSentences = arr.filter(x => x && typeof x.en === 'string' && typeof x.ko === 'string');
  } catch { savedSentences = []; }
}
function saveSaves() {
  localStorage.setItem(LS.saves, JSON.stringify(savedSentences));
}
function isSavedSentence(s) {
  return savedSentences.some(x => x.en === s.en && x.ko === s.ko);
}
function toggleSaveSentence(s) {
  const idx = savedSentences.findIndex(x => x.en === s.en && x.ko === s.ko);
  if (idx >= 0) {
    savedSentences.splice(idx, 1);
  } else {
    savedSentences.unshift({ en: s.en, ko: s.ko });
  }
  saveSaves();
  renderSidebarSaved();
}

// ========= Data Fetch =========
async function fetchSentences() {
  // Fetch local JSON; works on GitHub Pages if files are in same repo
  const res = await fetch('sentences.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load sentences.json');
  return res.json();
}

// ========= TTS =========
function loadVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
}
function pickEnglishVoice() {
  if (!voices || voices.length === 0) return null;
  // Prefer en-US female if available, otherwise any en*
  const preferred = voices.find(v => /en-US/i.test(v.lang) && /female/i.test(v.name));
  if (preferred) return preferred;
  const en = voices.find(v => /^en[-_]/i.test(v.lang));
  return en || voices[0];
}
function speak(text) {
  if (!('speechSynthesis' in window)) {
    alert('TTS is not supported in this browser.');
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  const v = pickEnglishVoice();
  if (v) u.voice = v;
  u.rate = 1.0;
  u.pitch = 1.0;
  u.lang = (v && v.lang) || 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ========= Rendering =========
function renderCards(levelData) {
  els.cards.innerHTML = '';
  const frag = document.createDocumentFragment();
  const max = Math.min(20, levelData.sentences.length);
  for (let i = 0; i < max; i++) {
    const s = levelData.sentences[i];
    const card = document.createElement('article');
    card.className = 'card' + (showAllTranslations ? ' show-ko' : '');
    card.dataset.id = sentenceId(i);

    const pEn = document.createElement('p');
    pEn.className = 'card__text';
    pEn.textContent = s.en;
    pEn.title = s.en;
    pEn.addEventListener('click', () => appendToDiary(s.en));

    const pKo = document.createElement('p');
    pKo.className = 'card__trans';
    pKo.textContent = s.ko;
    pKo.title = s.ko;
    pKo.addEventListener('click', () => appendToDiary(s.ko));

    const actions = document.createElement('div');
    actions.className = 'card__actions';

    const btnToggle = document.createElement('button');
    btnToggle.className = 'btn';
    btnToggle.type = 'button';
    btnToggle.textContent = '번역';
    btnToggle.addEventListener('click', () => {
      card.classList.toggle('show-ko');
    });
    const btnSpeak = document.createElement('button');
    btnSpeak.className = 'btn';
    btnSpeak.type = 'button';
    btnSpeak.textContent = '발음 재생';
    btnSpeak.addEventListener('click', () => speak(s.en));

    const btnSaveSentence = document.createElement('button');
    btnSaveSentence.className = 'btn';
    btnSaveSentence.type = 'button';
    const setSaveBtnState = () => {
      const saved = isSavedSentence(s);
      btnSaveSentence.textContent = saved ? '저장됨' : '저장';
      btnSaveSentence.setAttribute('aria-pressed', String(saved));
    };
    setSaveBtnState();
    btnSaveSentence.addEventListener('click', () => {
      toggleSaveSentence(s);
      setSaveBtnState();
    });

    actions.append(btnToggle, btnSpeak, btnSaveSentence);
    card.append(pEn, pKo, actions);
    frag.appendChild(card);
  }
  els.cards.appendChild(frag);
}

function renderSidebarSaved() {
  if (!els.sidebar) return;
  els.sidebar.innerHTML = '';
  const frag = document.createDocumentFragment();
  savedSentences.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'sidebar__item';
    li.dataset.index = String(i);
    li.draggable = true;

    const wrapper = document.createElement('div');
    wrapper.className = 'sidebar__row';
    const textWrap = document.createElement('div');
    textWrap.className = 'sidebar__text';
    textWrap.innerHTML = `<strong class="en">${escapeHtml(s.en)}</strong><span class="ko">${escapeHtml(s.ko)}</span>`;
    textWrap.addEventListener('click', () => appendToDiary(s.en));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn--sm btn--danger';
    delBtn.type = 'button';
    delBtn.textContent = '삭제';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      savedSentences.splice(i, 1);
      saveSaves();
      renderSidebarSaved();
    });

    wrapper.append(textWrap, delBtn);
    li.appendChild(wrapper);

    // Drag & Drop events
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(i));
      e.dataTransfer.effectAllowed = 'move';
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      li.classList.add('dragover');
    });
    li.addEventListener('dragleave', () => li.classList.remove('dragover'));
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('dragover');
      const from = Number(e.dataTransfer.getData('text/plain'));
      const to = i;
      if (!Number.isNaN(from) && from !== to) {
        const [moved] = savedSentences.splice(from, 1);
        savedSentences.splice(to, 0, moved);
        saveSaves();
        renderSidebarSaved();
      }
    });

    frag.appendChild(li);
  });
  els.sidebar.appendChild(frag);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function appendToDiary(text) {
  if (!els.diary) return;
  const cur = els.diary.value;
  const sep = cur && !cur.endsWith('\n') ? '\n' : '';
  els.diary.value = cur + sep + text;
  saveDiary();
}

function applyShowAllButton() {
  els.toggleAll.setAttribute('aria-pressed', String(showAllTranslations));
  // 버튼 라벨은 간단히 "번역"으로 유지
  els.toggleAll.textContent = '번역';
}

function render() {
  if (!appData) return;
  const levelData = appData.levels[currentLevelKey];
  if (!levelData) return;
  renderCards(levelData);
  renderSidebarSaved();
  applyShowAllButton();
}

// ========= Events =========
function setupEvents() {
  if (els.btnSave) {
    els.btnSave.addEventListener('click', () => {
      saveDiary();
      els.btnSave.textContent = '저장됨!';
      setTimeout(() => (els.btnSave.textContent = '저장'), 1000);
    });
  }
  if (els.btnLoad) {
    els.btnLoad.addEventListener('click', () => {
      loadDiary();
      els.btnLoad.textContent = '불러왔어요';
      setTimeout(() => (els.btnLoad.textContent = '불러오기'), 1000);
    });
  }
  if (els.btnClear) {
    els.btnClear.addEventListener('click', () => {
      if (!els.diary) return;
      els.diary.value = '';
      saveDiary();
    });
  }
  if (els.diary) {
    els.diary.addEventListener('input', saveDiary);
  }

  // Level changes only when Apply is clicked
  if (els.btnApplyLevel) {
    els.btnApplyLevel.addEventListener('click', () => {
      currentLevelKey = els.level.value;
      saveLevel(currentLevelKey);
      render();
    });
  }

  if (els.toggleAll) {
    els.toggleAll.addEventListener('click', () => {
      showAllTranslations = !showAllTranslations;
      saveShowAll(showAllTranslations);
      render();
    });
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
    loadVoices();
  }
}

// ========= Init =========
async function init() {
  setYear();
  // Init persisted state
  currentLevelKey = loadLevel();
  if (els.level) els.level.value = currentLevelKey;
  showAllTranslations = loadShowAll();
  applyShowAllButton();
  if (els.diary) loadDiary();
  loadSaves();

  // Link to JSON for transparency
  if (els.downloadJson) {
    els.downloadJson.href = 'sentences.json';
    els.downloadJson.target = '_blank';
    els.downloadJson.rel = 'noopener';
  }

  try {
    appData = await fetchSentences();
    render();
  } catch (e) {
    console.error(e);
    if (els.cards) {
      els.cards.innerHTML = '<p>문장을 불러오지 못했습니다. 페이지를 새로고침 해주세요.</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
