// onboarding.ts — 首次启动引导动画页
// 借鉴 Best-Flutter-UI-Templates 的 introduction_animation 结构：
// 跳过 / 返回 → 插画 → 标题与说明 → 指示点 + 圆形下一步 → 末页进入应用。
// 插画全部内联 SVG，深空星盘风格，不依赖任何外部图片资源。

import { t, getLang, onLangChange } from './i18n.ts';

const STORAGE_KEY = 'xingyuan.intro.v1';
const PAGE_COUNT = 5;

// 每页的内联 SVG 插画：星轨、十二宫、四柱、九宫、本机档案
const ART: string[] = [
  `<svg viewBox="0 0 240 200" role="img" aria-label="star chart">
    <defs><radialGradient id="ig0"><stop offset="0" stop-color="#c9a227" stop-opacity=".38"/><stop offset="1" stop-color="#c9a227" stop-opacity="0"/></radialGradient></defs>
    <circle cx="120" cy="100" r="78" fill="url(#ig0)"/>
    <g class="spin" style="transform-origin:120px 100px">
      <ellipse cx="120" cy="100" rx="96" ry="38" fill="none" stroke="#c9a227" stroke-opacity=".5" transform="rotate(-24 120 100)"/>
      <circle cx="209" cy="64" r="5" fill="#e9e2c8"/>
    </g>
    <g class="spin-rev" style="transform-origin:120px 100px">
      <ellipse cx="120" cy="100" rx="96" ry="38" fill="none" stroke="#e9e2c8" stroke-opacity=".28" transform="rotate(28 120 100)"/>
      <circle cx="31" cy="136" r="4" fill="#c9a227"/>
    </g>
    <circle cx="120" cy="100" r="52" fill="none" stroke="#c9a227" stroke-opacity=".35" stroke-dasharray="3 7"/>
    <circle cx="120" cy="100" r="30" fill="rgba(201,162,39,.16)" stroke="#c9a227" stroke-opacity=".7"/>
    <path d="M120 74 L126 94 L146 100 L126 106 L120 126 L114 106 L94 100 L114 94 Z" fill="#e9e2c8"/>
    <circle class="twinkle" cx="46" cy="46" r="2.4" fill="#e9e2c8"/><circle class="twinkle d1" cx="196" cy="152" r="2" fill="#c9a227"/>
  </svg>`,
  `<svg viewBox="0 0 240 200" role="img" aria-label="twelve palaces">
    <g class="spin-slow" style="transform-origin:120px 100px">
      ${Array.from({ length: 12 }, (_, i) => { const a = (i * 30 - 90) * Math.PI / 180; const x = 120 + 78 * Math.cos(a), y = 100 + 78 * Math.sin(a); return `<line x1="120" y1="100" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#c9a227" stroke-opacity=".22"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 3 === 0 ? 8 : 5}" fill="${i % 3 === 0 ? '#c9a227' : '#e9e2c8'}" fill-opacity=".85"/>`; }).join('')}
    </g>
    <circle cx="120" cy="100" r="60" fill="none" stroke="#c9a227" stroke-opacity=".3"/>
    <circle cx="120" cy="100" r="34" fill="rgba(201,162,39,.14)" stroke="#e9e2c8" stroke-opacity=".5"/>
    <circle cx="120" cy="100" r="11" fill="#c9a227"/>
    <text x="120" y="105" text-anchor="middle" font-size="12" fill="#141a2e" font-weight="700">命</text>
  </svg>`,
  `<svg viewBox="0 0 240 200" role="img" aria-label="four pillars">
    ${['年', '月', '日', '时'].map((c, i) => { const x = 36 + i * 48; return `<g><rect x="${x}" y="52" width="38" height="96" rx="8" fill="rgba(233,226,200,.06)" stroke="#c9a227" stroke-opacity=".5"/><text x="${x + 19}" y="78" text-anchor="middle" font-size="11" fill="#a9a3bd">${c}</text><line x1="${x + 8}" y1="90" x2="${x + 30}" y2="90" stroke="#c9a227" stroke-opacity=".3"/><text x="${x + 19}" y="124" text-anchor="middle" font-size="17" font-family="serif" fill="#e9e2c8">${['甲', '乙', '丙', '丁'][i]}</text><text x="${x + 19}" y="142" text-anchor="middle" font-size="17" font-family="serif" fill="#c9a227">${['子', '丑', '寅', '卯'][i]}</text></g>`; }).join('')}
    <path d="M30 168 Q120 188 210 168" fill="none" stroke="#c9a227" stroke-opacity=".35" stroke-dasharray="4 6"/>
  </svg>`,
  `<svg viewBox="0 0 240 200" role="img" aria-label="nine palaces">
    <g class="float">
      ${Array.from({ length: 9 }, (_, i) => { const c = i % 3, r = Math.floor(i / 3); const x = 54 + c * 46, y = 34 + r * 46; const center = i === 4; return `<rect x="${x}" y="${y}" width="40" height="40" rx="6" fill="${center ? 'rgba(201,162,39,.28)' : 'rgba(233,226,200,.05)'}" stroke="${center ? '#c9a227' : '#e9e2c8'}" stroke-opacity="${center ? '.95' : '.25'}"/><text x="${x + 20}" y="${y + 26}" text-anchor="middle" font-size="15" fill="${center ? '#e9e2c8' : '#a9a3bd'}">${i + 1}</text>`; }).join('')}
    </g>
    <path d="M54 34 L192 166 M192 34 L54 166" stroke="#c9a227" stroke-opacity=".16"/>
  </svg>`,
  `<svg viewBox="0 0 240 200" role="img" aria-label="local device">
    <circle cx="120" cy="100" r="72" fill="rgba(201,162,39,.07)" stroke="#c9a227" stroke-opacity=".28" stroke-dasharray="3 7"/>
    <rect x="72" y="74" width="96" height="72" rx="12" fill="rgba(233,226,200,.06)" stroke="#c9a227" stroke-opacity=".7"/>
    <path d="M96 74 V60 a24 24 0 0 1 48 0 V74" fill="none" stroke="#e9e2c8" stroke-opacity=".8" stroke-width="4"/>
    <circle cx="120" cy="104" r="8" fill="#c9a227"/><path d="M120 110 v14" stroke="#c9a227" stroke-width="4" stroke-linecap="round"/>
    <circle class="twinkle" cx="52" cy="52" r="2.4" fill="#e9e2c8"/><circle class="twinkle d1" cx="190" cy="150" r="2" fill="#c9a227"/>
  </svg>`,
];

function seen(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}
function markSeen(): void {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* 隐私模式忽略 */ }
}

let idx = 0;
let root: HTMLElement | null = null;
let pageEls: HTMLElement[] = [];
let dotEls: HTMLElement[] = [];

function build(): void {
  if (root) return;
  root = document.createElement('div');
  root.id = 'onboarding';
  root.className = 'onboarding';
  root.innerHTML = `
    <div class="intro-card" role="dialog" aria-modal="true" aria-label="ArrangeStar intro">
      <div class="intro-top">
        <button type="button" class="intro-back" data-act="back" aria-label="${t('intro.back')}">&#8249;</button>
        <button type="button" class="intro-skip" data-act="skip">${t('intro.skip')}</button>
      </div>
      <div class="intro-stage">
        ${ART.map((svg, i) => `<section class="intro-page" data-page="${i}">
          <div class="intro-art">${svg}</div>
          <h2 class="intro-title" data-i18n="intro.${i + 1}.title">${t(`intro.${i + 1}.title`)}</h2>
          <p class="intro-sub" data-i18n="intro.${i + 1}.sub">${t(`intro.${i + 1}.sub`)}</p>
          <p class="intro-desc" data-i18n="intro.${i + 1}.desc">${t(`intro.${i + 1}.desc`)}</p>
        </section>`).join('')}
      </div>
      <div class="intro-bottom">
        <div class="intro-dots">${ART.map((_, i) => `<button type="button" class="intro-dot" data-act="goto" data-i="${i}" aria-label="${i + 1}"></button>`).join('')}</div>
        <button type="button" class="intro-next" data-act="next"><span class="intro-next-text">${t('intro.next')}</span><span class="intro-arrow">&#8250;</span></button>
      </div>
    </div>`;
  document.body.appendChild(root);
  pageEls = Array.from(root.querySelectorAll('.intro-page'));
  dotEls = Array.from(root.querySelectorAll('.intro-dot'));
  root.addEventListener('click', onClick);
  onLangChange(() => { if (root) refreshText(); });
}

function refreshText(): void {
  if (!root) return;
  (root.querySelector('.intro-skip') as HTMLElement).textContent = t('intro.skip');
  (root.querySelector('.intro-back') as HTMLElement).setAttribute('aria-label', t('intro.back'));
  pageEls.forEach((p, i) => {
    (p.querySelector('.intro-title') as HTMLElement).textContent = t(`intro.${i + 1}.title`);
    (p.querySelector('.intro-sub') as HTMLElement).textContent = t(`intro.${i + 1}.sub`);
    (p.querySelector('.intro-desc') as HTMLElement).textContent = t(`intro.${i + 1}.desc`);
  });
  showPage(idx);
}

function showPage(n: number): void {
  idx = Math.max(0, Math.min(PAGE_COUNT - 1, n));
  pageEls.forEach((p, i) => p.classList.toggle('on', i === idx));
  dotEls.forEach((d, i) => d.classList.toggle('on', i === idx));
  if (!root) return;
  const back = root.querySelector('.intro-back') as HTMLElement;
  back.style.visibility = idx === 0 ? 'hidden' : 'visible';
  (root.querySelector('.intro-next-text') as HTMLElement).textContent = idx === PAGE_COUNT - 1 ? t('intro.start') : t('intro.next');
  root.querySelector('.intro-next')!.classList.toggle('enter', idx === PAGE_COUNT - 1);
  (root.querySelector('.intro-card') as HTMLElement).dataset.page = String(idx);
}

function close(): void {
  markSeen();
  if (root) { root.classList.remove('on'); root.setAttribute('aria-hidden', 'true'); }
  document.body.classList.remove('intro-open');
}

function onClick(e: Event): void {
  const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'next') { if (idx === PAGE_COUNT - 1) close(); else showPage(idx + 1); }
  else if (act === 'back') showPage(idx - 1);
  else if (act === 'skip') close();
  else if (act === 'goto') showPage(Number(el.dataset.i));
}

/** 首次启动自动显示；已看过则跳过。 */
export function initIntro(): void {
  if (seen()) return;
  build();
  showPage(0);
  if (root) { root.classList.add('on'); root.removeAttribute('aria-hidden'); }
  document.body.classList.add('intro-open');
}

/** 从设置里主动重看。 */
export function replayIntro(): void {
  build();
  showPage(0);
  if (root) { root.classList.add('on'); root.removeAttribute('aria-hidden'); }
  document.body.classList.add('intro-open');
}
