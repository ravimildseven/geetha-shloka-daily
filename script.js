// script.js - Geetha Shloka Daily

import { CH1 } from './data/ch1.js';

const STORAGE_KEYS = {
  points: 'gsd_points',
  lastCompleted: 'gsd_last_completed',
  streak: 'gsd_streak'
};

const HISTORY_KEY = 'gsd_history'; // optional per-day verse record

// Anchor key to start Chapter 1 from today
const CH1_ANCHOR_KEY = 'gsd_ch1_anchor';
function getOrInitAnchorDate() {
  let key = localStorage.getItem(CH1_ANCHOR_KEY);
  if (!key) {
    const todayKey = fmtDate(new Date());
    localStorage.setItem(CH1_ANCHOR_KEY, todayKey);
    key = todayKey;
  }
  return parseDateKey(key);
}

function fmtDate(date) {
  return date.toISOString().slice(0,10); // YYYY-MM-DD
}

function parseDateKey(key) {
  if (!key) return null;
  const [y,m,d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m-1, d));
}

function daysBetween(a, b) {
  const MS = 24*60*60*1000;
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((db - da) / MS);
}

function indexForDate(date) {
  const anchor = getOrInitAnchorDate(); // starts at Verse 1 on the anchor day
  const n = daysBetween(anchor, date);
  return ((n % CH1.length) + CH1.length) % CH1.length;
}

function loadState() {
  return {
    points: Number(localStorage.getItem(STORAGE_KEYS.points) || '0'),
    lastCompleted: localStorage.getItem(STORAGE_KEYS.lastCompleted) || null,
    streak: Number(localStorage.getItem(STORAGE_KEYS.streak) || '0')
  };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEYS.points, String(state.points));
  if (state.lastCompleted) localStorage.setItem(STORAGE_KEYS.lastCompleted, state.lastCompleted);
  localStorage.setItem(STORAGE_KEYS.streak, String(state.streak));
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); } catch { return {}; }
}
function setHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

function isDebugAllTiles() {
  try {
    const params = new URLSearchParams(window.location.search);
    if ((params.get('debug') || '').toLowerCase() === 'alltiles') return true;
  } catch {}
  return localStorage.getItem('gsd_debug_all_tiles') === '1';
}

function setText(id, text) { document.getElementById(id).textContent = text; }
function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

let selectedIdx = 0;
let todaysIdx = 0;
let verseArtSrc = null;

function getCompletedVersesSet() {
  const hist = getHistory();
  const set = new Set();
  for (const key of Object.keys(hist)) {
    const entry = hist[key];
    if (entry && entry.chapter === 1 && Number.isInteger(entry.verse)) {
      set.add(entry.verse - 1); // zero-based
    }
  }
  return set;
}

function buildChapterGrid() {
  const grid = document.getElementById('chapter-grid');
  grid.innerHTML = '';

  const today = new Date();
  const todayKey = fmtDate(today);
  const state = loadState();
  const completedToday = state.lastCompleted === todayKey;
  const completedSet = getCompletedVersesSet();
  const debugAll = isDebugAllTiles();

  for (let i = 0; i < CH1.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.setAttribute('role', 'listitem');
    btn.title = `Chapter 1, Verse ${i+1}`;
    btn.innerHTML = `<img class=\"tile-logo\" src=\"./assets/sanatana-katha-ai.png\" alt=\"\" onerror=\"this.src='./assets/sanatana-katha-ai.jpg'; this.onerror=null;\"><span class=\"num-badge\">${i+1}</span>`;

    const isToday = i === todaysIdx;
    const isCompleted = completedSet.has(i);
    if (isToday) btn.classList.add('current');
    if (isCompleted) btn.classList.add('completed');

    // Unlock rule: today's verse OR any previously completed verse
    const isUnlocked = debugAll || isToday || isCompleted;
    if (!isUnlocked) {
      btn.disabled = true;
      btn.classList.add('locked');
    }
    
    if (completedToday && isToday) {
      btn.title += ' (Completed today)';
    }
    if (selectedIdx === i) {
      btn.classList.add('selected');
    }

    // A tiny status icon
    const status = document.createElement('span');
    status.className = 'icon';
    status.textContent = isCompleted ? '✔️' : (isUnlocked ? '' : '');
    btn.appendChild(status);

    // Allow clicking any unlocked tile to view it
    if (isUnlocked) {
      btn.addEventListener('click', () => {
        selectVerse(i);
      });
    }

    grid.appendChild(btn);
  }
}

function selectVerse(idx) {
  selectedIdx = idx;
  // Update grid to show selection
  buildChapterGrid();
  renderSelected();
}

function renderSelected() {
  const today = new Date();
  const todayKey = fmtDate(today);
  const s = CH1[selectedIdx];

  const sans = document.getElementById('shloka-sanskrit');
  const translit = document.getElementById('shloka-transliteration');
  sans.textContent = s.text || '';
  translit.textContent = s.transliteration || '';
  setText('shloka-source', s.source || '');

  // Try to load per-verse artwork into the card background
  loadVerseArt(selectedIdx);

  const meaningEl = document.getElementById('shloka-meaning');
  meaningEl.textContent = s.meaning || '';

  const state = loadState();
  const lastText = state.lastCompleted ? state.lastCompleted : '—';
  setText('last-completed', lastText);
  setText('points', String(state.points));
  setText('streak', `${state.streak} ${state.streak === 1 ? 'day' : 'days'}`);

  const markBtn = document.getElementById('mark-learned');
  const completedToday = state.lastCompleted === todayKey;
  const isTodaySelection = selectedIdx === todaysIdx;
  markBtn.disabled = completedToday || !isTodaySelection;
  markBtn.textContent = completedToday ? 'Completed today' : (isTodaySelection ? 'Mark as learned' : 'Only today’s verse can be marked');
}

function handleMarkLearned() {
  const today = new Date();
  const todayKey = fmtDate(today);
  const state = loadState();

  // Only allow marking today’s verse
  if (selectedIdx !== todaysIdx) return;
  if (state.lastCompleted === todayKey) return; // already done today

  // Streak update
  const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
  if (state.lastCompleted === fmtDate(yesterday)) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }

  // Points: +10 per completion
  state.points += 10;
  state.lastCompleted = todayKey;
  saveState(state);

  // Record history (optional)
  const hist = getHistory();
  hist[todayKey] = { chapter: 1, verse: selectedIdx + 1 };
  setHistory(hist);

  // Update UI
  maybeReward(state);
  // Rebuild grid to reflect completion
  buildChapterGrid();
  renderSelected();
}

function maybeReward(state) {
  const banner = document.getElementById('reward-banner');
  const rewards = document.getElementById('rewards');
  let msg = '';
  if (state.streak && state.streak % 7 === 0) {
    msg = `Great job! ${state.streak}-day streak! Bonus +20 points!`;
    state.points += 20;
    saveState(state);
  } else if (state.points && state.points % 100 === 0) {
    msg = `Milestone reached: ${state.points} points! Keep it up!`;
  }
  if (msg) {
    banner.textContent = msg;
    show(rewards);
    setTimeout(() => hide(rewards), 5000);
  }
}

function initEvents() {
  document.getElementById('mark-learned').addEventListener('click', handleMarkLearned);
  const toggleBtn = document.getElementById('show-meaning');
  const meaningEl = document.getElementById('shloka-meaning');
  toggleBtn.addEventListener('click', () => {
    meaningEl.hidden = !meaningEl.hidden;
    toggleBtn.textContent = meaningEl.hidden ? 'Show meaning' : 'Hide meaning';
  });

  document.getElementById('play-audio').addEventListener('click', playAudio);
  document.getElementById('stop-audio').addEventListener('click', stopAudio);
  document.getElementById('copy-verse').addEventListener('click', copyVerse);
  document.getElementById('save-png').addEventListener('click', savePng);

  const btnAll = document.getElementById('btn-toggle-all');
  if (btnAll) btnAll.addEventListener('click', () => {
    const to = isDebugAllTiles() ? '0' : '1';
    localStorage.setItem('gsd_debug_all_tiles', to);
    buildChapterGrid();
  });
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) btnReset.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.points);
    localStorage.removeItem(STORAGE_KEYS.lastCompleted);
    localStorage.removeItem(STORAGE_KEYS.streak);
    localStorage.removeItem(HISTORY_KEY);
    alert('Progress cleared.');
    renderSelected();
    buildChapterGrid();
  });
  const btnAbout = document.getElementById('btn-about');
  if (btnAbout) btnAbout.addEventListener('click', () => openAbout());
  document.addEventListener('click', (e) => {
    const tgt = e.target;
    if (tgt && tgt.getAttribute && tgt.getAttribute('data-close') === 'modal') {
      closeAbout();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = document.getElementById('about-modal');
      if (m && !m.hidden) closeAbout();
    }
  });

  // Chapters overview
  const backBtn = document.getElementById('btn-back-chapters');
  if (backBtn) backBtn.addEventListener('click', showOverview);
  const brandHome = document.getElementById('brand-home');
  if (brandHome) brandHome.addEventListener('click', showOverview);
  const homeBtn = document.getElementById('btn-home');
  if (homeBtn) homeBtn.addEventListener('click', showOverview);
  const aboutLink = document.getElementById('link-about-more');
  if (aboutLink) aboutLink.addEventListener('click', (e)=>{ e.preventDefault(); openAbout(); });
  const guide = document.getElementById('guide');
  if (guide) {
    // Restore persisted state
    const open = localStorage.getItem('gsd_guide_open');
    if (open === '1') guide.setAttribute('open','');
    guide.addEventListener('toggle', () => {
      localStorage.setItem('gsd_guide_open', guide.open ? '1' : '0');
    });
  }
}

function buildChaptersOverview() {
  const grid = document.getElementById('chapters-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i=1;i<=18;i++){
    const btn = document.createElement('button');
    const disabled = i !== 1;
    btn.className = 'chapter-tile' + (disabled ? ' disabled' : '');
    // set background image per chapter if available (assets/ch{n}-hero-1.*), else fallback to ch1 hero
    setChapterTileBackground(btn, i);
    const num = document.createElement('div'); num.className = 'ch-num'; num.textContent = i;
    const label = document.createElement('div'); label.className = 'ch-label'; label.textContent = `Chapter ${i}`;
    btn.appendChild(num); btn.appendChild(label);
    if (!disabled) {
      btn.addEventListener('click', showChapter1);
    } else {
      btn.addEventListener('click', () => alert('Coming soon: Chapters 2–18'));
    }
    grid.appendChild(btn);
  }
}

function showOverview() {
  const ov = document.getElementById('chapters-overview');
  const d1 = document.getElementById('ch1-detail');
  if (ov) ov.hidden = false; if (d1) d1.hidden = true;
  localStorage.setItem('gsd_last_chapter_open','0');
}

function showChapter1() {
  const ov = document.getElementById('chapters-overview');
  const d1 = document.getElementById('ch1-detail');
  if (ov) ov.hidden = true; if (d1) d1.hidden = false;
  localStorage.setItem('gsd_last_chapter_open','1');
  loadChapterArt();
  buildChapterGrid();
  renderSelected();
}

function setChapterTileBackground(el, idx) {
  const candidates = [
    `./assets/ch${idx}-hero-1.jpg`, `./assets/ch${idx}-hero-1.png`, `./assets/ch${idx}-hero-1.webp`,
    `./assets/ch1-hero-1.jpg`, `./assets/ch1-hero-1.png`, `./assets/ch1-hero-1.webp`
  ];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) return;
    const src = candidates[i++];
    const tester = new Image();
    tester.onload = () => { el.style.backgroundImage = `url(${src})`; };
    tester.onerror = tryNext;
    tester.src = src;
  };
  tryNext();
}

function loadChapterArt() {
  const img = document.getElementById('chapter-art');
  const candidates = [
    './assets/ch1-hero-1.jpg', './assets/ch1-hero-1.png', './assets/ch1-hero-1.webp',
    './assets/ch1-hero-2.jpg', './assets/ch1-hero-2.png', './assets/ch1-hero-2.webp'
  ];
  let i = 0;
  const apply = (src) => {
    if (img) img.src = src;
    // also set page background
    document.body.style.setProperty('--bg-url', `url(${src})`);
  };
  const tryNext = () => {
    if (i >= candidates.length) {
      const fig = img && img.closest ? img.closest('figure') : null;
      if (fig) fig.remove();
      return;
    }
    const src = candidates[i++];
    const tester = new Image();
    tester.onload = () => apply(src);
    tester.onerror = tryNext;
    tester.src = src;
  };
  tryNext();
}

function validateDataset() {
  const missing = [];
  if (!Array.isArray(CH1) || CH1.length !== 47) {
    console.warn('CH1 length expected 47, got', Array.isArray(CH1) ? CH1.length : CH1);
  }
  CH1.forEach((v, idx) => {
    if (!v || !v.text || !v.transliteration) missing.push(idx+1);
  });
  if (missing.length) {
    console.warn('CH1 missing fields for verses:', missing.join(', '));
  } else {
    console.info('CH1 dataset OK: 47 verses with Sanskrit + transliteration');
  }
}

function playAudio() {
  const s = CH1[selectedIdx];
  const textToSpeak = s.text;
  
  if ('speechSynthesis' in window) {
    // Stop any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN'; // Hindi locale for better Sanskrit pronunciation
    utterance.rate = 0.7; // Slower rate for better comprehension
    utterance.pitch = 1.0;
    
    speechSynthesis.speak(utterance);
  } else {
    alert('Audio playback is not supported in your browser.');
  }
}

function loadVerseArt(idx) {
  const cardArt = document.querySelector('.verse-card .verse-art');
  if (!cardArt) return;
  const n = (idx + 1);
  const base = `./assets/ch1/${n}`;
  const candidates = [ `${base}.jpg`, `${base}.png`, `${base}.webp` ];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) { cardArt.style.backgroundImage = 'none'; return; }
    const src = candidates[i++];
    const tester = new Image();
    tester.onload = () => { cardArt.style.backgroundImage = `url(${src})`; verseArtSrc = src; autoOverlayForCard(src); };
    tester.onerror = tryNext;
    tester.src = src;
  };
  tryNext();
}

function stopAudio() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

function copyVerse() {
  const s = CH1[selectedIdx];
  const parts = [s.text || '', '', s.transliteration || '', s.source || ''];
  const text = parts.filter(Boolean).join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => alert('Verse copied!')); 
  } else {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    alert('Verse copied!');
  }
}

function savePng() {
  const card = document.getElementById('shloka-card');
  const s = CH1[selectedIdx];
  const W = 1200, H = 628; // social share size
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const drawText = (text, x, y, maxWidth, lineHeight, font) => {
    ctx.font = font;
    const words = text.split(/\s+/);
    let line = '';
    let yy = y;
    for (let i=0;i<words.length;i++){
      const test = line ? line + ' ' + words[i] : words[i];
      const w = ctx.measureText(test).width;
      if (w > maxWidth && line) { ctx.fillText(line, x, yy); yy += lineHeight; line = words[i]; }
      else { line = test; }
    }
    if (line) ctx.fillText(line, x, yy);
    return yy + lineHeight;
  };

  const draw = () => {
    // Background art
    if (verseArtSrc) {
      const img = new Image();
      img.onload = () => {
        // cover
        const ratio = Math.max(W/img.width, H/img.height);
        const iw = img.width*ratio, ih = img.height*ratio;
        const ix = (W - iw)/2, iy = (H - ih)/2;
        ctx.drawImage(img, ix, iy, iw, ih);
        // overlay
        ctx.fillStyle = 'rgba(15,16,32,0.42)';
        ctx.fillRect(0,0,W,H);
        drawForeground();
      };
      img.src = verseArtSrc;
    } else {
      ctx.fillStyle = '#101226'; ctx.fillRect(0,0,W,H);
      drawForeground();
    }
  };

  const drawForeground = () => {
    // Card panel
    const pad = 48;
    const cardW = W - pad*2, cardH = H - pad*2;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, pad, pad, cardW, cardH, 24, true, true);

    // Source badge
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.85;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(s.source || '', pad+24, pad+40);
    ctx.globalAlpha = 1;

    // Sanskrit
    ctx.fillStyle = '#f6f7fb';
    const nextY = drawText(s.text || '', pad+24, pad+84, cardW-48, 42, '700 36px "Noto Sans Devanagari", serif');

    // Transliteration
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    drawText(s.transliteration || '', pad+24, nextY+10, cardW-48, 34, '400 26px system-ui, sans-serif');

    // Footer text
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('geetha-shloka-daily', pad+24, H - pad - 18);

    // download
    canvas.toBlob((blob)=>{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `BG-1-${selectedIdx+1}.png`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };

  draw();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) ctx.fill(); if (stroke) ctx.stroke();
}

function openAbout(){
  const m = document.getElementById('about-modal');
  if (m) {
    // reflect current preference in checkbox
    const pref = localStorage.getItem('gsd_about_auto');
    const cb = document.getElementById('about-show-next');
    if (cb) cb.checked = (pref === '1');
    m.hidden = false;
  }
}

function closeAbout(){
  const m = document.getElementById('about-modal');
  if (!m) return;
  const cb = document.getElementById('about-show-next');
  if (cb && cb.checked) {
    localStorage.setItem('gsd_about_auto','1');
    localStorage.removeItem('gsd_about_seen');
  } else {
    localStorage.setItem('gsd_about_auto','0');
    localStorage.setItem('gsd_about_seen','1');
  }
  m.hidden = true;
}

function autoOverlayForCard(src){
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32; const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, 32, 32);
    const d = cx.getImageData(0,0,32,32).data;
    let r=0,g=0,b=0; const n=32*32; for(let i=0;i<n;i++){ r+=d[i*4]; g+=d[i*4+1]; b+=d[i*4+2]; }
    r/=n; g/=n; b/=n; const lum = 0.2126*r + 0.7152*g + 0.0722*b; // 0..255
    // Higher luminance => stronger overlay
    const alpha = Math.min(0.62, Math.max(0.25, (lum/255)*0.62));
    const overlay = `linear-gradient(180deg, rgba(15,16,32,${alpha*0.4}), rgba(15,16,32,${alpha}))`;
    const card = document.getElementById('shloka-card');
    if (card) card.style.setProperty('--verse-overlay', overlay);
  };
  img.src = src;
}

// Initialize
(function init() {
  const today = new Date();
  todaysIdx = indexForDate(today);
  selectedIdx = todaysIdx;
  buildChaptersOverview();
  const lastOpen = localStorage.getItem('gsd_last_chapter_open');
  if (lastOpen === '1') showChapter1(); else showOverview();
  renderSelected();
  initEvents();
  validateDataset();
  // Show About once per device (prefers gsd_about_auto if set)
  const auto = localStorage.getItem('gsd_about_auto');
  const fallbackSeen = localStorage.getItem('gsd_about_seen');
  if (auto === '1' || (auto === null && fallbackSeen !== '1')) {
    setTimeout(() => openAbout(), 800);
  }
})();
