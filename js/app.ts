// app.ts — 星垣 iOS 前端入口（纯客户端渲染，无服务端依赖）
import { Solar } from 'lunar-typescript';
import { chart as chart_zw, BRANCHES, STEMS, PALACES, starsSort } from './engine/ziwei.ts';
import { bazi, liunian, current_dayun } from './engine/bazi.ts';
import { qimen, daily_qimen } from './engine/qimen.ts';
import { limit_chart, annual_chart, flow_months, flow_day, compose } from './engine/composer.ts';
import * as RD from './reading.ts';
import { getLang, toggleLang, onLangChange, applyStatic, t, bi, term, tx, ganzhi } from './i18n.ts';

type View = 'chart' | 'bazi' | 'qimen';
type Layer = 'benming' | 'limit' | 'annual' | 'month' | 'day';
interface State {
  y: number; mo: number; d: number; hh: number; mi: number; g: string; lon: number;
  view: View; layer: Layer; ref: string; lines: boolean; daily: string;
  qy: number; qmo: number; qd: number; qhh: number; qmi: number;
}
const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT: State = {
  y: 1990, mo: 5, d: 15, hh: 3, mi: 20, g: '女', lon: 120,
  view: 'chart', layer: 'benming', ref: TODAY, lines: true, daily: '',
  qy: 1990, qmo: 5, qd: 15, qhh: 3, qmi: 20,
};
const JU_NAME: Record<number, string> = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
const LAYERS: [Layer, string][] = [['benming', 'layer.benming'], ['limit', 'layer.limit'], ['annual', 'layer.annual'], ['month', 'layer.month'], ['day', 'layer.day']];
const ARCHIVE_KEY = 'xingyuan.archive.v1';
const STATE_KEY = 'xingyuan.state.v1';
const mod = (a: number, n: number) => ((a % n) + n) % n;
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const esc = RD.esc;

// 出生资料按固定位数显示：年4、月2、日2、时2、分2、经度7（含小数点共8字符，如 120.0000）
function formatBirthValue(id: string, v: number): string {
  if (id === 'lon') return v.toFixed(4);
  const len = id === 'y' ? 4 : 2;
  return String(Math.trunc(v)).padStart(len, '0').slice(-len);
}

let S: State = { ...DEFAULT };
let zw: any = null, bz: any = null, qm: any = null;
let overlays: Record<number, string> = {};
let hlBranch = -1;
let currentNote = '';

function loadState(): void {
  try { S = { ...DEFAULT, ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}') }; } catch { /* 用默认 */ }
}
function saveState(): void {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(S)); } catch { /* 隐私模式忽略 */ }
}
function archive(): any[] {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch { return []; }
}
function saveArchive(): void {
  const list = archive();
  const name = `${S.y}-${String(S.mo).padStart(2, '0')}-${String(S.d).padStart(2, '0')} ${S.g} · ${S.hh}:${String(S.mi).padStart(2, '0')}`;
  if (!list.some(x => x.name === name)) list.unshift({ id: Date.now(), name, s: { ...S } });
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list.slice(0, 60))); } catch { /* 忽略 */ }
  renderArchive();
}
function renderArchive(): void {
  const box = $('archiveBody');
  if (!box) return;
  const list = archive();
  box.innerHTML = list.length ? list.map(x =>
    `<div class="arow"><span>${esc(tx(x.name))}</span><button data-archive-load="${x.id}">${t('archive.open')}</button><button data-archive-del="${x.id}">${t('archive.delete')}</button></div>`).join('')
    : `<p class="dw-mute">${t('archive.empty')}</p>`;
}

function palaceCard(r: any, branch: number, ranges: Record<number, string>): string {
  const name = term(PALACES[mod(r.life - branch, 12)]);
  const stars: string[] = r.stars[branch] || [];
  const majors = stars.filter(s => RD.MAJOR.has(s));
  const minors = stars.filter(s => !RD.MAJOR.has(s));
  const hua = r.hua || {};
  const bright = (r.brightness || {})[branch] || {};
  const starNotes = ((window as any).__LIB__?.['reading/star_notes']?.notes) || {};
  let starHtml = '';
  const one = (s: string, major: boolean) => {
    const tag = hua[s] ? hua[s].tag : '';
    const place = tag ? Number(Object.keys(r.stars).find(k => (r.stars[k] || []).includes(Object.keys(hua).find(k => hua[k] === hua[s]) || '')) ?? -1) : -1;
    const h = tag ? `<sup class="hua ${RD.HUA_CLASS[tag]}"${place >= 0 ? ` data-goto="${place}" data-hua="${tag}" title="${esc(term(tag) + ' ' + t('hua.title'))}"` : ''}>${esc(term(tag))}</sup>` : '';
    const lv = major && bright[s] ? `<i class="lvl">${esc(term(bright[s]))}</i>` : '';
    const note = starNotes[s] ? ` title="${esc(tx(starNotes[s]).slice(0, 120))}"` : '';
    return `<span class="star ${major ? 'major' : 'minor'}" data-star="${esc(s)}"${note}>${esc(term(s))}${h}${lv}</span>`;
  };
  for (const s of majors) starHtml += one(s, true);
  for (const s of minors) starHtml += one(s, false);
  if (!stars.length) starHtml = `<span class="empty">${t('palace.empty')}</span>`;
  let tag = '';
  if (branch === r.life) tag = `<span class="badge life">${t('badge.life')}</span>`;
  else if (branch === r.body) tag = `<span class="badge body">${t('badge.body')}</span>`;
  const cs = (r.changsheng || {})[branch] || '';
  const bs = (r.boshi || {})[branch] || '';
  const gods = (cs || bs) ? `<div class="gods">${esc(cs ? term(cs) : '')}${cs && bs ? ' · ' : ''}${esc(bs ? term(bs) : '')}</div>` : '';
  const on = overlays[branch] ? `<span class="oname">${esc(overlays[branch])}</span>` : '';
  const hl = branch === hlBranch ? ' hl' : '';
  return `<div class="palace${hl}" data-branch="${branch}" data-pname="${esc(name)}" role="button" tabindex="0"
    aria-label="${esc(name + (getLang() === 'en' ? ', activate for a reading of this palace' : '，点开看这一格在说什么'))}">
    <div class="stars">${starHtml}</div>${gods}
    <div class="foot"><span class="pname">${esc(name)}${tag}</span>${on}<span class="rng">${esc(ranges[branch] || '')}</span><span class="pbr">${esc(term(BRANCHES[branch]))}</span></div></div>`;
}

function chartView(r: any, age: number, year: number, ref: string): string {
  overlays = {}; hlBranch = -1;
  const ranges: Record<number, string> = {};
  for (const x of r.limits || []) ranges[BRANCHES.indexOf(x.branch)] = `${x.start}–${x.end}`;
  const lm = new Date(ref + 'T12:00:00');
  if (S.layer === 'limit') {
    const lim = (r.limits || []).find((x: any) => x.start <= age && age <= x.end);
    if (lim) { const chart = limit_chart(r, age); overlays = overlayNames(chart.life); hlBranch = mod(chart.life, 12); }
  } else if (S.layer === 'annual') {
    const ann = annual_chart(r, year); overlays = overlayNames(ann.life); hlBranch = mod(ann.life, 12);
  } else if (S.layer === 'month' || S.layer === 'day') {
    const months = flow_months(r, year, r.lunar[1], r.hour_branch_i);
    const lunarM = Math.abs(Solar.fromYmd(lm.getFullYear(), lm.getMonth() + 1, lm.getDate()).getLunar().getMonth());
    const mon = months[Math.min(Math.max(lunarM, 1), 12) - 1];
    let life = mon.palace;
    if (S.layer === 'day') life = flow_day(lm.getFullYear(), lm.getMonth() + 1, lm.getDate(), mon.palace).palace;
    overlays = overlayNames(life); hlBranch = mod(life, 12);
  }
  const pos: Record<number, [number, number]> = {
    5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 4: [2, 1], 9: [2, 4],
    3: [3, 1], 10: [3, 4], 2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
  };
  let cells = '';
  for (const [b, [row, col]] of Object.entries(pos)) {
    cells += `<div style="grid-area:${row}/${col}" class="gcell">${palaceCard(r, +b, ranges)}</div>`;
  }
  const layerName = t(LAYERS.find(x => x[0] === S.layer)?.[1] || 'layer.benming');
  const center = `<div class="center"><div class="cinner">
    <div class="cname">${t('center.name')}</div>
    <div class="cline">${JU_NAME[r.ju] ? term(JU_NAME[r.ju]) : ''} · ${esc(term(S.g))}${getLang() === 'en' ? ' ' : ''}${t('center.gender')} · ${layerName}</div>
    <div class="cline">${t('center.solarTime')} ${String(r.tst[0]).padStart(2, '0')}:${String(r.tst[1]).padStart(2, '0')}（${esc(term(BRANCHES[r.hour_branch_i]))}）</div>
    <div class="cline">${t('center.lunar')} ${r.lunar[0]}${r.lunar[3] ? t('center.leap') : ''}${r.lunar[1]}/${r.lunar[2]}</div>
    <div class="cline">${t('center.lifePalace')} ${esc(ganzhi(STEMS[r.life_stem] + BRANCHES[r.life]))} · ${t('center.bodyPalace')} ${esc(term(BRANCHES[r.body]))}</div>
    <div class="cline">${term('紫微')} ${esc(term(BRANCHES[r.ziwei]))} · ${term('天府')} ${esc(term(BRANCHES[r.tianfu]))}</div>
    <div class="legend"><span class="hua lu">${term('禄')}</span><span class="hua quan">${term('权')}</span><span class="hua ke">${term('科')}</span><span class="hua ji">${term('忌')}</span><span class="lvl">${bi('庙旺平陷', 'Brightness')}</span></div>
  </div></div>`;
  let out = `<div class="grid${S.lines ? '' : ''}">${cells}${center}<svg class="tri-lines" aria-hidden="true"></svg></div>`;
  try {
    const lib = RD.ziweiLibrary(getLang());
    const md = compose(r, lib, age, year, ref, getLang())
      .replace(/（[^（）]{0,10}第[^（）]{0,8}章[^（）]{0,10}p\d+[^（）]{0,8}）/g, '')
      .replace(/（p\d+）/g, '');
    out += `<details class="dsec readmore" style="margin-top:14px"><summary>${t('readmore.ziwei')}</summary>${RD.mdBlock(md)}</details>`;
  } catch (e: any) { out += `<p class="err">${t('err.reading')}${esc(e.message || e)}</p>`; }
  return out;
}

function overlayNames(life: number): Record<number, string> {
  const out: Record<number, string> = {};
  for (let b = 0; b < 12; b++) out[b] = t('layer.limit') + term(PALACES[mod(life - b, 12)]);
  return out;
}

function baziView(r: any, year: number, age: number): string {
  const ln = liunian(r, year);
  const dy = current_dayun(r, age);
  (window as any).__CURRENT_LIUNIAN_ZH__ = `${year} 年是 **${ln.ganzhi}** 年，流年天干对你成 **${ln.gan_god}**，地支属 **${ln.zhi_wx}**。` +
    (dy ? `眼下走 **${dy.ganzhi}** 运，运干 **${dy.gan_god}**。` : '');
  (window as any).__CURRENT_LIUNIAN__ = getLang() === 'en'
    ? `**${year}** is a **${ganzhi(ln.ganzhi)}** year. Its stem forms **${term(ln.gan_god)}** for you; its branch element is **${term(ln.zhi_wx)}**.` +
      (dy ? `\n\nYou are currently in the **${ganzhi(dy.ganzhi)}** major fortune, with **${term(dy.gan_god)}** as its stem god.` : '')
    : `${year} 年是 **${ln.ganzhi}** 年，流年天干对你成 **${ln.gan_god}**，地支属 **${ln.zhi_wx}**。` +
      (dy ? `眼下走 **${dy.ganzhi}** 运，运干 **${dy.gan_god}**。` : '');
  let h = `<div class="dsec"><h2>${t('section.pillars')}</h2>` + RD.baziPillarsHtml(r) + '</div>';
  h += `<div class="dsec"><h2>${t('section.wuxing')}</h2>` + RD.baziWuxingHtml(r) +
    `<p class="ratio">${t('bazi.wuxingNote')}</p></div>`;
  h += `<div class="dsec"><h2>${t('section.pattern')}</h2>` + RD.baziCardsHtml(r) + '</div>';
  if (r.dayun?.length) h += `<div class="dsec"><h2>${t('section.dayun')}</h2><p class="ratio">${t('bazi.qiyun')} ` +
    `${r.qi_yun.year} ${t('birth.year')} ${r.qi_yun.month} ${t('birth.month')}，${r.qi_yun.forward ? t('bazi.forward') : t('bazi.backward')}</p>` + RD.dayunHtml(r, age) + '</div>';
  for (const sec of RD.baziSections(r, year, age)) {
    h += `<div class="dsec"><h2>${esc(sec.title)}</h2>${RD.mdBlock(sec.body)}</div>`;
  }
  return h;
}

function qimenForm(): string {
  return `<form class="bar" id="qmform" style="margin:0 0 12px">
    <label><span data-i18n="qform.date">${t('qform.date')}</span> <input type="date" id="qdate" value="${S.qy}-${String(S.qmo).padStart(2, '0')}-${String(S.qd).padStart(2, '0')}"></label>
    <label><span data-i18n="qform.time">${t('qform.time')}</span> <input type="time" id="qclock" value="${String(S.qhh).padStart(2, '0')}:${String(S.qmi).padStart(2, '0')}"></label>
    <button type="button" id="qmgo">${t('qform.go')}</button></form>`;
}

function qimenView(r: any): string {
  let h = qimenForm() + `<div class="dsec"><h2>${t('qimen.grid')}</h2>` + RD.qimenGridHtml(r) +
    `<p class="ratio">${t('qimen.gridNote')}</p></div>`;
  if (r.fu_yin) h = h.replace('<div class="dsec">', `<p class="ratio"><b>${t('qimen.fuyin')}</b>：${t('qimen.fuyinNote')}</p><div class="dsec">`);
  if (r.fan_yin) h = h.replace('<div class="dsec">', `<p class="ratio"><b>${t('qimen.fanyin')}</b>：${t('qimen.fanyinNote')}</p><div class="dsec">`);
  for (const sec of RD.qimenSections(r)) h += `<div class="dsec"><h2>${esc(sec.title)}</h2>${RD.mdBlock(sec.body)}</div>`;
  return h;
}

function dailyBarHtml(): string {
  try {
    const day = S.daily || TODAY;
    const [y, m, d] = day.split('-').map(Number);
    const gz = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar().getDay();
    const r = bz || bazi(S.y, S.mo, S.d, S.hh, S.mi, S.g);
    return RD.dailyBaziBar(r, gz, day);
  } catch { return ''; }
}

function go(): void {
  const out = $('out');
  try {
    S.y = parseInt(($('y') as HTMLInputElement).value, 10);
    S.mo = parseInt(($('mo') as HTMLInputElement).value, 10);
    S.d = parseInt(($('d') as HTMLInputElement).value, 10);
    S.hh = parseInt(($('hh') as HTMLInputElement).value, 10);
    S.mi = parseInt(($('mi') as HTMLInputElement).value, 10) || 0;
    S.g = ($('g') as HTMLSelectElement).value;
    S.lon = parseFloat(($('lon') as HTMLInputElement).value) || 120;
    S.ref = ($('ref') as HTMLInputElement).value || TODAY;
    if (!(1900 <= S.y && S.y <= 2100)) throw new Error(t('err.year'));
    if (!(60 <= S.lon && S.lon <= 150)) throw new Error(t('err.lon'));
  } catch (e: any) {
    out.innerHTML = `<div class="err">${esc(e.message || e)}</div>`; return;
  }
  saveState();
  const ref = new Date(S.ref + 'T12:00:00');
  const year = ref.getFullYear();
  const age = year - S.y + 1;
  try {
    zw = chart_zw(S.y, S.mo, S.d, S.hh, S.mi, { lon: S.lon, gender: S.g });
    bz = bazi(S.y, S.mo, S.d, S.hh, S.mi, S.g);
    let content = '';
    if (S.view === 'chart') content = chartView(zw, age, year, S.ref);
    else if (S.view === 'bazi') content = baziView(bz, year, age);
    else {
      qm = qimen(S.qy, S.qmo, S.qd, S.qhh, S.qmi);
      content = qimenView(qm);
    }
    out.innerHTML = `<div id="dailybar">${dailyBarHtml()}</div>` + content;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', (x as HTMLElement).dataset.view === S.view));
    document.querySelectorAll('.vt').forEach(x => x.classList.toggle('on', (x as HTMLElement).dataset.layer === S.layer));
    $('linesBtn').textContent = S.lines ? t('btn.hideLines') : t('btn.showLines');
    document.body.classList.toggle('lines-off', !S.lines);
    if (S.view === 'chart' && S.palaceName) { /* 保留选中宫 */ }
  } catch (e: any) {
    out.innerHTML = `<div class="err">${esc(e.message || e)}</div>`;
  }
}

function setLayer(layer: Layer): void {
  S.layer = layer; saveState(); go();
}

function showDrawer(branch: number): void {
  if (!zw) return;
  const drawer = $('drawer');
  drawer.innerHTML = zw ? RD.drawerHtml(zw, branch) : '';
  drawer.querySelector('.dw')?.classList.add('on');
  drawer.classList.add('open');
  document.body.classList.add('dw-open');
  const palace = document.querySelector(`.palace[data-branch="${branch}"]`) as HTMLElement | null;
  document.querySelectorAll('.palace').forEach(x => x.classList.remove('pick'));
  document.querySelectorAll('.grid').forEach(x => x.classList.remove('picked'));
  if (palace) { palace.classList.add('pick'); palace.closest('.grid')?.classList.add('picked'); }
  drawLines(branch);
}

function closeDrawer(): void {
  $('drawer').classList.remove('open');
  document.body.classList.remove('dw-open');
  document.querySelectorAll('.palace').forEach(x => x.classList.remove('pick'));
  document.querySelectorAll('.tri, .opp').forEach(x => x.classList.remove('tri', 'opp'));
  document.querySelectorAll('.grid').forEach(x => x.classList.remove('picked'));
  document.querySelector('.tri-lines')?.replaceChildren();
}

function drawLines(branch: number): void {
  const svg = document.querySelector('.tri-lines') as unknown as SVGSVGElement | null;
  const grid = document.querySelector('.grid') as HTMLElement | null;
  if (!svg || !grid) return;
  const gb = grid.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${gb.width} ${gb.height}`);
  svg.replaceChildren();
  const center = (b: number): [number, number] | null => {
    const el = document.querySelector(`.palace[data-branch="${b}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.left - gb.left + r.width / 2, r.top - gb.top + r.height / 2];
  };
  const from = center(branch);
  if (!from) return;
  const ns = 'http://www.w3.org/2000/svg';
  for (const [b, cls] of [[mod(branch + 4, 12), 'tri'], [mod(branch + 8, 12), 'tri'], [mod(branch + 6, 12), 'opp']] as [number, string][]) {
    const el = document.querySelector(`.palace[data-branch="${b}"]`) as HTMLElement | null;
    el?.classList.add(cls);
    const to = center(b);
    if (!to) continue;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', String(from[0])); line.setAttribute('y1', String(from[1]));
    line.setAttribute('x2', String(to[0])); line.setAttribute('y2', String(to[1]));
    line.setAttribute('class', cls === 'tri' ? 'ln-tri' : 'ln-opp');
    svg.appendChild(line);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', String(to[0])); dot.setAttribute('cy', String(to[1])); dot.setAttribute('r', '3');
    dot.setAttribute('class', cls === 'tri' ? 'ln-tri-dot' : 'ln-opp-dot');
    svg.appendChild(dot);
  }
}

function showStar(star: string): void {
  if (!((window as any).__LIB__?.['reading/star_notes']?.notes || {})[star]) return;
  $('starsheet').innerHTML = RD.starSheetHtml(star);
  $('starsheet').classList.add('open');
  $('starsheet').setAttribute('aria-hidden', 'false');
  $('starmask').classList.add('open');
}
function closeStar(): void {
  $('starsheet').classList.remove('open');
  $('starsheet').setAttribute('aria-hidden', 'true');
  $('starmask').classList.remove('open');
}

function showNote(text: string): void {
  const p = $('notepanel');
  if (!text) { p.hidden = true; return; }
  p.textContent = text; p.hidden = false;
}

function togglePanel(id: string): void {
  const el = $(id);
  el.classList.toggle('open');
  if (el.classList.contains('open') && id === 'archivePanel') renderArchive();
}

function readQimenForm(): void {
  const date = ($('qdate') as HTMLInputElement).value.split('-').map(Number);
  const clock = ($('qclock') as HTMLInputElement).value.split(':').map(Number);
  if (date.length === 3) { S.qy = date[0]; S.qmo = date[1]; S.qd = date[2]; }
  if (clock.length === 2) { S.qhh = clock[0]; S.qmi = clock[1]; }
  saveState(); go();
}

window.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyStatic();
  onLangChange(() => { closeStar(); closeDrawer(); showNote(''); renderArchive(); go(); });
  for (const [id, v] of [['y', S.y], ['mo', S.mo], ['d', S.d], ['hh', S.hh], ['mi', S.mi], ['lon', S.lon]] as [string, number][]) {
    ($(id) as HTMLInputElement).value = formatBirthValue(id, v);
  }
  ($('g') as HTMLSelectElement).value = S.g;
  ($('ref') as HTMLInputElement).value = S.ref;
  ($('daily') as HTMLInputElement).value = S.daily || '';

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const tab = t.closest('.tab') as HTMLElement | null;
    if (tab && tab.dataset.view) { S.view = tab.dataset.view as View; saveState(); go(); return; }
    const vt = t.closest('.vt') as HTMLElement | null;
    if (vt && vt.dataset.layer) { setLayer(vt.dataset.layer as Layer); return; }
    if (t.closest('#go')) { go(); return; }
    if (t.closest('#qmgo')) { readQimenForm(); return; }
    if (t.closest('#todayBtn')) { togglePanel('settingsPanel'); return; }
    if (t.closest('#archiveBtn')) { togglePanel('archivePanel'); return; }
    if (t.closest('#settingsBtn')) { togglePanel('settingsPanel'); return; }
    if (t.closest('#langBtn')) { toggleLang(); return; }
    if (t.closest('#linesBtn')) { S.lines = !S.lines; saveState(); go(); return; }
    if (t.closest('#saveBtn')) { saveArchive(); return; }
    const al = t.closest('[data-archive-load]') as HTMLElement | null;
    if (al) {
      const item = archive().find(x => String(x.id) === al.dataset.archiveLoad);
      if (item) { S = { ...DEFAULT, ...item.s }; saveState(); location.reload(); }
      return;
    }
    const ad = t.closest('[data-archive-del]') as HTMLElement | null;
    if (ad) {
      try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive().filter(x => String(x.id) !== ad.dataset.archiveDel))); } catch { /* 忽略 */ }
      renderArchive(); return;
    }
    if (t.closest('#clearArchive')) {
      if (confirm(t('confirm.clearArchive'))) { localStorage.removeItem(ARCHIVE_KEY); renderArchive(); }
      return;
    }
    if (t.closest('#replayIntro')) {
      // 新引导为原生 onboarding.js，挂在 window 上；未就绪时静默降级
      const intro = (window as any).XyOnboarding;
      if (intro) intro.replay();
      return;
    }
    const goto = t.closest('[data-goto]') as HTMLElement | null;
    if (goto) { showDrawer(Number(goto.dataset.goto)); return; }
    if (t.closest('[data-close]')) { closeDrawer(); return; }
    if (t.closest('[data-close-star]')) { closeStar(); return; }
    const star = t.closest('[data-star]') as HTMLElement | null;
    if (star && star.dataset.star) { showStar(star.dataset.star); return; }
    const qpal = t.closest('.qpal[data-qnote]') as HTMLElement | null;
    if (qpal) { showNote(qpal.dataset.qnote || ''); return; }
    const palace = t.closest('.palace') as HTMLElement | null;
    if (palace) { showDrawer(Number(palace.dataset.branch)); return; }
    if (!t.closest('.notepanel')) showNote('');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeStar(); closeDrawer(); showNote(''); }
    if (e.key === 'Enter' || e.key === ' ') {
      const t = e.target as HTMLElement;
      if (t.classList?.contains('qpal') || t.classList?.contains('palace')) { e.preventDefault(); t.click(); }
    }
  });

  ($('ref') as HTMLInputElement).addEventListener('change', () => { S.ref = ($('ref') as HTMLInputElement).value || TODAY; saveState(); go(); });
  ($('daily') as HTMLInputElement).addEventListener('change', () => {
    S.daily = ($('daily') as HTMLInputElement).value; saveState();
    $('dailybar').innerHTML = dailyBarHtml();
  });
  window.addEventListener('resize', () => {
    const open = document.querySelector('.palace.pick') as HTMLElement | null;
    if (open) drawLines(Number(open.dataset.branch));
  });
  go();
  // 首次引导由原生 js/onboarding.js 接管（在 bundle.js 之后加载，自动初始化）
});
