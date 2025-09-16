// ===== Constants & State =====
const STORAGE_KEYS = {
  items: 'todo-items',
  lang: 'todo-lang',
  filter: 'todo-filter',
};

const i18n = {
  ko: {
    title: '나의 투두리스트',
    input_label: '할 일 입력',
    input_placeholder: '해야 할 일을 입력하세요',
    add: '추가',
    filter_all: '전체',
    filter_active: '미완료',
    filter_completed: '완료',
    count_total: '전체',
    count_active: '미완료',
    delete: '삭제',
    edit_placeholder: '내용을 수정하세요',
  },
  en: {
    title: 'My Todo List',
    input_label: 'Add a task',
    input_placeholder: 'Type a task...',
    add: 'Add',
    filter_all: 'All',
    filter_active: 'Active',
    filter_completed: 'Completed',
    count_total: 'Total',
    count_active: 'Active',
    delete: 'Delete',
    edit_placeholder: 'Edit task...',
  },
};

let state = {
  items: [],
  filter: 'all', // 'all' | 'active' | 'completed'
  lang: 'ko',
};

// ===== Utilities =====
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  localStorage.setItem(STORAGE_KEYS.lang, state.lang);
  localStorage.setItem(STORAGE_KEYS.filter, state.filter);
}

function loadState() {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.items) || '[]');
    if (Array.isArray(items)) state.items = items;
  } catch {}
  const lang = localStorage.getItem(STORAGE_KEYS.lang);
  if (lang === 'ko' || lang === 'en') state.lang = lang;
  const filter = localStorage.getItem(STORAGE_KEYS.filter);
  if (filter === 'all' || filter === 'active' || filter === 'completed') state.filter = filter;
}

// ===== DOM =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const els = {
  today: $('#today'),
  year: $('#year'),
  title: document.querySelector('[data-i18n="title"]'),
  form: $('#add-form'),
  input: $('#todo-input'),
  list: $('#todo-list'),
  countAll: $('#count-all'),
  countActive: $('#count-active'),
  filterButtons: $$('.filter'),
  langToggle: $('#lang-toggle'),
};

function formatToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return state.lang === 'ko' ? `${y}-${m}-${d}` : `${m}/${d}/${y}`;
}

function setTodayAndYear() {
  if (els.today) els.today.textContent = formatToday();
  if (els.year) els.year.textContent = String(new Date().getFullYear());
}

// ===== i18n =====
function applyI18n() {
  const dict = i18n[state.lang];
  // Elements with data-i18n (innerText)
  $$('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (dict[key]) node.textContent = dict[key];
  });
  // Elements with data-i18n-placeholder
  $$('[data-i18n-placeholder]').forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (dict[key]) node.setAttribute('placeholder', dict[key]);
  });
  // Update dynamic labels like delete buttons in list
  $$('.todo-item .delete-btn').forEach((btn) => {
    btn.setAttribute('aria-label', dict.delete);
    btn.textContent = dict.delete;
  });
  // Update edit input placeholders
  $$('.todo-item .edit-input').forEach((inp) => {
    inp.setAttribute('placeholder', dict.edit_placeholder);
  });
  setTodayAndYear();
}

// ===== Rendering =====
function filteredItems() {
  if (state.filter === 'active') return state.items.filter((it) => !it.completed);
  if (state.filter === 'completed') return state.items.filter((it) => it.completed);
  return state.items;
}

function updateCounters() {
  const total = state.items.length;
  const active = state.items.filter((it) => !it.completed).length;
  els.countAll.textContent = String(total);
  els.countActive.textContent = String(active);
}

function createItemElement(item) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (item.completed ? ' completed' : '');
  li.dataset.id = item.id;

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = item.completed;
  checkbox.addEventListener('change', () => {
    item.completed = checkbox.checked;
    item.updatedAt = Date.now();
    li.classList.toggle('completed', item.completed);
    saveState();
    updateCounters();
    // Keep item in list; just visual change
  });

  // Text span
  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = item.text;
  text.title = item.text;

  // Edit input
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'edit-input';
  editInput.value = item.text;
  editInput.setAttribute('placeholder', i18n[state.lang].edit_placeholder);

  function enterEdit() {
    li.classList.add('editing');
    editInput.value = item.text;
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
  }

  function exitEdit(save) {
    if (save) {
      const v = editInput.value.trim();
      if (v) {
        item.text = v;
        item.updatedAt = Date.now();
        text.textContent = v;
        text.title = v;
        saveState();
      }
    }
    li.classList.remove('editing');
  }

  text.addEventListener('dblclick', () => enterEdit());
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enterEdit();
  });

  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      exitEdit(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitEdit(false);
    }
  });
  editInput.addEventListener('blur', () => exitEdit(true));

  // Actions
  const actions = document.createElement('div');
  actions.className = 'actions';

  const del = document.createElement('button');
  del.className = 'btn delete-btn';
  del.type = 'button';
  del.textContent = i18n[state.lang].delete;
  del.setAttribute('aria-label', i18n[state.lang].delete);
  del.addEventListener('click', () => {
    const idx = state.items.findIndex((x) => x.id === item.id);
    if (idx !== -1) {
      state.items.splice(idx, 1);
      saveState();
      render();
    }
  });

  actions.appendChild(del);

  li.appendChild(checkbox);
  li.appendChild(text);
  li.appendChild(editInput);
  li.appendChild(actions);

  return li;
}

function render() {
  // Update filter active button
  els.filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === state.filter;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  // List
  els.list.innerHTML = '';
  const items = filteredItems();
  const frag = document.createDocumentFragment();
  items.forEach((item) => frag.appendChild(createItemElement(item)));
  els.list.appendChild(frag);

  updateCounters();
  applyI18n();
}

// ===== Events =====
function setupEvents() {
  // Add new item
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text) return;
    const now = Date.now();
    state.items.push({ id: uid(), text, completed: false, createdAt: now, updatedAt: now });
    els.input.value = '';
    saveState();
    render();
    els.input.focus();
  });

  // Filters
  els.filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      if (f === 'all' || f === 'active' || f === 'completed') {
        state.filter = f;
        saveState();
        render();
      }
    });
  });

  // Language toggle
  els.langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'ko' ? 'en' : 'ko';
    saveState();
    applyI18n();
  });

  // Accessibility: Enter on input already handled by form submit
}

// ===== Init =====
function init() {
  loadState();
  setupEvents();
  setTodayAndYear();
  render();
}

document.addEventListener('DOMContentLoaded', init);
