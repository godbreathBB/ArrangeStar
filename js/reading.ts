// reading.ts — 文案库装载、Markdown 渲染、三页解读与弹层内容（纯客户端）
import { PALACES, BRANCHES, STEMS } from './engine/ziwei.ts';
import { ten_god } from './engine/bazi.ts';
import { getLang, t, bi, term, termBoth, ganzhi, sourceBlock } from './i18n.ts';

const L: any = (window as any).__LIB__ || {};
export const MAJOR = new Set(['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']);
export const HUA_CLASS: Record<string, string> = { '禄': 'lu', '权': 'quan', '科': 'ke', '忌': 'ji' };
const HUA_TAG = ['禄', '权', '科', '忌'];
const isEn = () => getLang() === 'en';
/** 奇门语境里「太阴」是八神，不是紫微的月亮星。 */
const qterm = (s: any) => String(s) === '太阴' ? 'Great Yin' : term(s);

/** 把中文原文与英文导读并置：英文模式只显示英文，中文原文可展开。 */
function bilingual(zh: string, en: string): string {
  if (!isEn()) return zh;
  return `<p class="en-lead">${en}</p>${sourceBlock(zh)}`;
}

export function esc(v: any): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(t: string): string {
  let s = esc(t);
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/`(.+?)`/g, '<code>$1</code>');
  return s;
}

/** 与服务端 md_to_html 等价的轻量渲染：标题、表格、列表、引用、段落。 */
export function mdBlock(text: string): string {
  const lines = String(text || '').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(x => x.trim());
        if (!cells.every(c => /^[-: ]*$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length) {
        const head = rows[0].map(c => `<th>${inline(c)}</th>`).join('');
        const body = rows.slice(1).map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('');
        out.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      }
      continue;
    }
    if (/^#{1,4} /.test(line)) {
      const m = line.match(/^(#+) (.*)$/)!;
      out.push(`<h${Math.min(m[1].length + 1, 4)}>${inline(m[2])}</h${Math.min(m[1].length + 1, 4)}>`);
    } else if (line.startsWith('> ')) {
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*] /, ''))}</li>`);
        i++;
      }
      out.push('<ul>' + items.join('') + '</ul>');
    } else if (line.trim()) {
      const paras: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|>|  *[-*] |\|)/.test(lines[i])) {
        paras.push(lines[i].trim()); i++;
      }
      out.push(`<p>${paras.map(inline).join('<br>')}</p>`);
      continue;
    }
    i++;
  }
  return out.join('\n');
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

// ── 紫微文案库 ───────────────────────────────────────────────
function notes(name: string): any { return L['reading/' + name] || {}; }

export function ziweiLibrary(lang: 'zh' | 'en' = 'zh'): any {
  const ns = (name: string): any => lang === 'en' ? (L['reading_en/' + name] || L['reading/' + name] || {}) : (L['reading/' + name] || {});
  const tpl = ns('templates_v03').templates || [];
  const pairs = ns('pairs_v01').pairs || [];
  const pats = ns('patterns').patterns || {};
  const aux = ns('career_aux') || {};
  const charts = ns('pan144').charts || {};
  const templates = new Map<string, { text: string }>();
  for (const t of tpl) templates.set(t.star + '|' + t.dimension, t);
  const pairMap = new Map<string, string>();
  for (const p of pairs) pairMap.set([...p.stars].sort().join('|'), p.text);
  return {
    templates, pairs: pairMap, patterns: pats,
    downNotes: ns('down_notes').notes || {},
    wealthNotes: ns('wealth_notes').notes || {},
    healthNotes: ns('health_notes').notes || {},
    careerNotes: ns('career_notes').notes || {},
    careerAux: aux, pan144: charts,
  };
}

export const PALACE_GIST: Record<string, string> = {
  '命宫': '整张盘从你开始：性格、做事的底色，还有这张盘的调子，先在这里看一眼就好。',
  '兄弟': '手足、同辈，还有一起搭伙做事的人，都装在这一格里。',
  '夫妻': '伴侣和亲密关系，也藏着你怎么表达在意、怎么和人相处。',
  '子女': '孩子、晚辈，还有你手上的作品和新点子，都算这一格的事。',
  '财帛': '和钱相处的方式：怎么挣、怎么花、心里怎么看，不是存款数字。',
  '疾厄': '身体和作息的小提醒，哪里容易累、哪里需要慢一点。',
  '迁移': '出门在外、换个环境时的样子，正好是命宫对面的那一格。',
  '交友': '朋友、伙伴，还有并肩做事的人，都在这里照面。',
  '官禄': '工作、角色和想做成的事；和命宫、财帛一起看，会更清楚。',
  '田宅': '家、住的地方，还有让你觉得踏实的那点底子。',
  '福德': '心里过得舒不舒服、能不能松下来，这一格最懂。',
  '父母': '长辈、上级，还有一路被照拂着长大的那些事。',
};

export const PALACE_GIST_EN: Record<string, string> = {
  '命宫': 'The chart starts with you: temperament, your way of doing things, and the overall tone of the chart.',
  '兄弟': 'Siblings, peers, and the people you work side by side with.',
  '夫妻': 'Partners and close relationships — also how you show that you care.',
  '子女': 'Children, younger people, and the work and ideas you bring into the world.',
  '财帛': 'How you relate to money: how it comes, how it goes, and what it means to you — not a bank balance.',
  '疾厄': 'Gentle reminders about the body and daily rhythms: where you tire easily, where to slow down.',
  '迁移': 'How you are away from home or in a new setting — the palace opposite the Life Palace.',
  '交友': 'Friends, partners, and the people who stand with you.',
  '官禄': 'Work, roles, and what you want to build; read it together with Life and Wealth.',
  '田宅': 'Home, where you live, and the foundations that make you feel secure.',
  '福德': 'How at ease you feel inside, and whether you can truly switch off.',
  '父母': 'Elders, supervisors, and the care you received while growing up.',
};

const DIM_EN: Record<string, string> = {
  '性格': 'personality', '事业': 'career', '财运': 'wealth', '健康': 'health', '感情': 'relationships',
};

/** 单宫抽屉：宫名、星曜、四化、三方四正与该宫白话。 */
export function drawerHtml(r: any, branch: number): string {
  const zhName = PALACES[mod(r.life - branch, 12)];
  const name = term(zhName);
  const opp = mod(branch + 6, 12);
  const oppName = term(PALACES[mod(r.life - opp, 12)]);
  const stars = r.stars[branch] || [];
  const bright = (r.brightness || {})[branch] || {};
  const hua: Record<string, string> = {};
  for (const [s, v] of Object.entries(r.hua || {}) as any) hua[s] = v.tag;
  const major = stars.filter((s: string) => MAJOR.has(s));
  const notesLib = notes('star_notes').notes || {};

  const chips = stars.map((s: string) => {
    const cls = MAJOR.has(s) ? 'chip-major' : 'chip-minor';
    const lv = bright[s] ? `<i class="lvl">${esc(term(bright[s]))}</i>` : '';
    const h = hua[s] ? `<sup class="hua ${HUA_CLASS[hua[s]]}">${esc(term(hua[s]))}</sup>` : '';
    return `<span class="chip ${cls}" data-star="${esc(s)}" title="${t('drawer.tapNote')}">${esc(term(s))}${h}${lv}</span>`;
  }).join('') || `<span class="empty">${t('drawer.starEmpty')}</span>`;
  const majorLine = major.length
    ? major.map((s: string) => term(s) + (bright[s] ? `<i class="lvl">${esc(term(bright[s]))}</i>` : '')).join(' · ')
    : `${t('drawer.borrow')} ${esc(term(BRANCHES[opp]))}`;

  const tag2: Record<string, [string, number]> = {};
  for (const [st, v] of Object.entries(r.hua || {}) as any) {
    for (let b = 0; b < 12; b++) if ((r.stars[b] || []).includes(st)) { tag2[v.tag] = [st, b]; break; }
  }
  const huaBody = HUA_TAG.filter(tg => tag2[tg]).map(tg => {
    const [st, b] = tag2[tg];
    const pn = term(PALACES[mod(r.life - b, 12)]);
    return `<div class="dw-hua"><a class="dw-goto hua ${HUA_CLASS[tg]}" data-goto="${b}">${esc(term(tg))}</a>` +
      `<a class="dw-goto" data-goto="${b}">${esc(term(st))} ${isEn() ? 'in' : '落在'} ${esc(pn)}（${esc(term(BRANCHES[b]))}）</a></div>`;
  }).join('') || `<p class="dw-mute">${t('drawer.noHua')}</p>`;

  const tri = [mod(branch + 4, 12), mod(branch + 8, 12), opp].map(b =>
    `<a class="dw-goto" data-goto="${b}">${term(PALACES[mod(r.life - b, 12)])}（${term(BRANCHES[b])}）</a>`).join('');

  // 这一格的解读：主星性格维度 + 星曜注解，去重后只留一份
  const lib = ziweiLibrary();
  const dim = ({ '命宫': '性格', '身宫': '性格', '官禄': '事业', '财帛': '财运', '疾厄': '健康', '夫妻': '感情' } as any)[zhName] || '性格';
  const seen = new Set<string>();
  const paras: string[] = [];
  const used: string[] = [];
  for (const st of major) {
    const tp = lib.templates.get(st + '|' + dim);
    if (tp && !seen.has(tp.text)) { seen.add(tp.text); paras.push(`**${st}**：${tp.text}`); used.push(st); }
    if (notesLib[st] && !seen.has(notesLib[st])) { seen.add(notesLib[st]); paras.push(`**${st}：**${notesLib[st]}`); used.push(st); }
  }
  let body: string;
  if (!paras.length) body = `<p>${t('drawer.noText')}</p>`;
  else {
    const zh = mdBlock(paras.join('\n\n'));
    if (isEn()) {
      const lead = `Plain-language notes from the site's text library for ${[...new Set(used)].map(termBoth).join(', ')} · ${DIM_EN[dim] || dim}. The original Chinese wording is kept below.`;
      body = `<p class="en-lead">${esc(lead)}</p>${sourceBlock(zh)}`;
    } else body = zh;
  }
  const gist = isEn() ? (PALACE_GIST_EN[zhName] || '') : (PALACE_GIST[zhName] || '');
  return `<section class="dw" data-branch="${branch}">
    <div class="dw-head"><div class="dw-name">${name}<span class="dw-br">${term(BRANCHES[branch])}</span></div>
    <button class="dw-x" data-close="1" title="${t('drawer.close')}" aria-label="${t('drawer.close')}">×</button></div>
    <div class="dw-major">${majorLine}</div><div class="dw-stars">${chips}</div>
    <a class="dw-opp" data-goto="${opp}">${t('drawer.opp')} · ${oppName}（${term(BRANCHES[opp])}）→</a>
    <details class="dw-sec" open><summary>${t('drawer.sec1')}</summary>${body}</details>
    <details class="dw-sec"><summary>${t('drawer.sec2')}</summary>${huaBody}</details>
    <details class="dw-sec"><summary>${t('drawer.sec3')}</summary><div class="dw-tris">${tri}</div></details>
    <details class="dw-sec"><summary>${t('drawer.sec4')}</summary><p class="dw-gist">${esc(gist)}</p></details>
  </section>`;
}

export function starSheetHtml(star: string): string {
  const d = notes('star_notes');
  const meta = (d.meta || {})[star] || {};
  const kind = meta.type || meta.kind || '星曜';
  const note = (d.notes || {})[star] || '';
  const tpl = notes('templates_v03').templates || [];
  const bits = tpl.filter((t: any) => t.star === star).slice(0, 5)
    .map((t: any) => `<span class="ss-hit" data-dim="${esc(t.dimension)}">${esc(term(t.dimension))}<span>→</span></span>`).join('');
  const body = isEn()
    ? `<p class="en-lead">${esc(`${termBoth(star)} — ${term(kind)}. The original Chinese star note is kept below.`)}</p>${sourceBlock(esc(note))}`
    : esc(note);
  return `<div class="ss" data-star="${esc(star)}"><div class="ss-head"><div class="ss-name">${esc(term(star))}<span class="ss-kind">${esc(term(kind))}</span></div>
    <button class="dw-x" data-close-star="1" aria-label="${t('drawer.close')}">×</button></div>
    <p class="ss-note">${body}</p>
    ${bits ? `<div class="ss-sec"><b>${t('ss.sec')}</b>${bits}</div>` : ''}
    <p class="ss-cite">${t('ss.cite')}</p></div>`;
}

// ── 八字解读 ─────────────────────────────────────────────────
const GOD_GROUP: Record<string, string> = {
  '比肩': '比劫', '劫财': '比劫', '食神': '食伤', '伤官': '食伤', '正财': '财', '偏财': '财',
  '正官': '官杀', '七杀': '官杀', '正印': '印', '偏印': '印',
};
const WX_COLOR: Record<string, string> = { '木': '#4fa87e', '火': '#e08373', '土': '#d9a94e', '金': '#c9a227', '水': '#6f9bd8' };
const WX_ORDER = ['木', '火', '土', '金', '水'];
const HIDE: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'], '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
  '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
};
export function wuxingCounts(pillars: any[]): [Record<string, number>, number] {
  const c: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  const gw: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  const scale: Record<string, number[]> = {
    year: [1, 1, 1], month: [3, 1.5, 0.5], day: [1.5, 0.75, 0.3], hour: [1, 0.5, 0.3],
  };
  const keys = ['year', 'month', 'day', 'hour'];
  pillars.forEach((p, i) => {
    c[gw[p.gan.charAt(0)]] += 1;
    const ws = scale[keys[i]] || scale.year;
    (HIDE[p.zhi.charAt(0)] || []).forEach((g, j) => { c[gw[g]] += ws[Math.min(j, ws.length - 1)]; });
  });
  const total = Object.values(c).reduce((a, b) => a + b, 0) || 1;
  return [c, total];
}

export function baziPillarsHtml(r: any): string {
  const p = r.pillars;
  let h = '<table class="bazi"><thead><tr><th class="lab">　</th>';
  for (const col of p) h += `<th>${esc(term(col.name))} ${isEn() ? 'Pillar' : '柱'}</th>`;
  h += '</tr></thead><tbody>';
  const row = (lab: string, cls: string, fn: (x: any) => string) =>
    `<tr class="${cls}"><td class="lab">${lab}</td>` + p.map(fn).join('') + '</tr>';
  h += row(term('十神'), 'tg', x => `<td class="${x.name === '日' ? 'dm' : ''}">${esc(term(x.shi_shen))}</td>`);
  h += row(term('天干'), 'gz', x => `<td><span class="big" style="color:${WX_COLOR[x.gan_wx]}">${esc(term(x.gan))}</span><i class="wx">${esc(term(x.gan_wx))}</i></td>`);
  h += row(term('地支'), 'gz', x => `<td><span class="big" style="color:${WX_COLOR[x.zhi_wx]}">${esc(term(x.zhi))}</span><i class="wx">${esc(term(x.zhi_wx))}</i></td>`);
  h += row(term('藏干'), 'hide', x => '<td>' + (x.hide || []).map((y: any) =>
    `<span style="color:${WX_COLOR[y.wx]}">${esc(term(y.gan))}</span><i class="god">${esc(term(y.god))}</i>`).join('<br>') + '</td>');
  h += row(term('纳音'), 'ny', x => `<td>${esc(term(x.nayin))}</td>`);
  return h + '</tbody></table>';
}

export function baziCardsHtml(r: any): string {
  const { day_master: d, strength: st, geju: gj, xiji: xj } = r;
  const dm = `${term(d.gan)}（${term(d.yy)}${term(d.wx)}）`;
  const reason = gj.reason ? (isEn() ? sourceBlock(esc(gj.reason)) : esc(gj.reason)) : '';
  const items: [string, string, string][] = [
    [t('bcard.dayMaster'), dm, ''],
    [t('bcard.strength'), term(st.label), `${term(xj.lean)} · ${t('bcard.help')} ${Math.round(st.ratio * 100)}%`],
    [t('bcard.pattern'), term(gj.name), reason],
    [t('bcard.xi'), (xj.xi || []).map(term).join('、'), ''],
    [t('bcard.ji'), (xj.ji || []).map(term).join('、'), ''],
  ];
  return '<div class="bcardwrap">' + items.map(([n, v, note]) =>
    `<div class="bcard"><span class="bn">${n}</span><span class="bv">${esc(v)}</span>` +
    (note ? `<span class="bs">${note}</span>` : '') + '</div>').join('') + '</div>';
}

export function baziWuxingHtml(r: any): string {
  const [c, total] = wuxingCounts(r.pillars);
  const peak = Math.max(...Object.values(c)) || 1;
  return '<div class="wxchart">' + WX_ORDER.map(w => {
    const v = c[w] || 0;
    return `<div class="wxrow"><span class="wxname" style="color:${WX_COLOR[w]}">${term(w)}</span>` +
      `<span class="wxbar"><i style="width:${(v / peak * 100).toFixed(1)}%;background:${WX_COLOR[w]}"></i></span>` +
      `<span class="wxval">${v.toFixed(2)}（${Math.round(v / total * 100)}%）</span></div>`;
  }).join('') + '</div>';
}

export function dayunHtml(r: any, age: number | null): string {
  const aria = isEn() ? `Major Fortune, ${r.dayun.length} steps, scroll horizontally` : `大运，共 ${r.dayun.length} 步，可左右滚动`;
  return `<div class="dayuntrack" role="group" aria-label="${aria}" tabindex="0">` +
    r.dayun.map((d: any) => {
      const on = age !== null && d.start_age <= age && age <= d.end_age;
      return `<div class="dchip${on ? ' on' : ''}"><b>${esc(ganzhi(d.ganzhi))}</b><span>${d.start_age}–${d.end_age}${isEn() ? ' yrs' : '岁'}</span><span>${esc(term(d.gan_god))}</span></div>`;
    }).join('') + '</div>';
}

export function baziSections(r: any, year: number, age: number): { title: string; body: string }[] {
  const secs: { title: string; body: string }[] = [];
  const push = (zhTitle: string, enTitle: string, zhBody: string, enBody: string) =>
    secs.push({ title: isEn() ? enTitle : zhTitle, body: isEn() ? enBody : zhBody });
  const src = (s: string, label?: string) => sourceBlock(esc(s), label);
  const st = r.strength, xj = r.xiji, gj = r.geju;
  const month = r.pillars[1].zhi.charAt(0), day = r.pillars[2].gan.charAt(0), dayZhi = r.pillars[2].zhi.charAt(0);
  push('四柱概览', 'Four Pillars at a glance',
    r.pillars.map((p: any) => `**${p.name}柱 ${p.ganzhi}**（${p.nayin}）`).join('　') +
    `\n\n日主 **${r.day_master.gan}${r.day_master.yy}${r.day_master.wx}**，生在 **${month}月**。十神：${r.pillars.map((p: any) => p.shi_shen).join('、')}。`,
    r.pillars.map((p: any) => `**${term(p.name)} ${ganzhi(p.ganzhi)}** (${term(p.nayin)})`).join('　') +
    `\n\nDay Master **${term(r.day_master.gan)} (${term(r.day_master.yy)} ${term(r.day_master.wx)})**, born in the **${term(month)}** month. Ten Gods: ${r.pillars.map((p: any) => term(p.shi_shen)).join(', ')}.`);
  push('日主强弱', 'Day Master strength',
    `帮身 ${st.help.toFixed(2)} 分，耗身 ${st.drain.toFixed(2)} 分，帮身占 **${Math.round(st.ratio * 100)}%**，判为 **${st.label}**（${xj.lean}）。` +
    `\n\n月令${st.de_ling ? '帮身' : '不帮身'}，${st.de_di ? '地支有根' : '地支根浅'}，${st.de_shi ? '天干有助' : '天干少助'}。强弱只是方向，还要看通关与调候。`,
    `Supporting forces **${st.help.toFixed(2)}**, draining forces ${st.drain.toFixed(2)}; support makes up **${Math.round(st.ratio * 100)}%** of the total, classed as **${term(st.label)}** (${term(xj.lean)}).` +
    `\n\nThe month command ${st.de_ling ? 'supports' : 'does not support'} the Day Master; the branches ${st.de_di ? 'provide roots' : 'have shallow roots'}; the stems ${st.de_shi ? 'offer help' : 'offer little help'}. Strength is a direction, not a verdict — mediation and climate matter too.`);
  const cheng = (notes('geju').cheng_bai || {})[gj.name];
  push('格局', 'Structure',
    `**${gj.name}** —— ${gj.reason || ''}\n\n月令 ${month}，本气 ${gj.ben_qi}（${gj.ben_qi_god}）。` +
    (cheng ? `\n\n**成败要点**：${cheng}` : ''),
    `**${term(gj.name)}** — ${gj.reason ? src(gj.reason) : ''}\n\nMonth command: ${term(month)}; primary qi ${term(gj.ben_qi)} (${term(gj.ben_qi_god)}).` +
    (cheng ? `\n\n${src(cheng, 'Classic notes on what makes this structure succeed or fail')}` : ''));
  const hj = (notes('houjue').months || {})[month];
  if (hj && hj.length) {
    const zh = hj.slice(0, 3).map((x: any) => `**${x.ju}**\n\n${x.hua}`).join('\n\n');
    push(`月令诗诀 · ${month}月`, `Seasonal verses · ${term(month)} month`, zh,
      `Traditional verses for the **${term(month)}** month. ${src(zh, 'Show the Chinese verses')}`);
  }
  const th = r.tiaohou;
  if (th) push('调候', 'Climate regulation',
    `日主 **${th.gan || day}** 生在 **${th.season}**，调候取 **${(th.items || []).join('、')}**。\n\n${th.why || ''}\n\n调候只管寒暖燥湿，与格局用神不一致时以格局为准。`,
    `Day Master **${term(th.gan || day)}** born in **${term(th.season)}**; climate regulation draws on **${(th.items || []).map(term).join('、')}**.` +
    `\n\n${th.why ? src(th.why) : ''}\n\nClimate regulation only addresses warmth, coolness, dryness and dampness. When it conflicts with the structure's useful element, the structure takes precedence.`);
  const xq = notes('xingqing');
  const gx = (xq.gan || {})[day], zx = (xq.zhi || {})[dayZhi];
  const xqBits: string[] = [];
  if (gx) xqBits.push(`**日干 ${day} · ${gx.xiang}**：${gx.xing}\n\n顺：${gx.xi}\n\n不顺：${gx.ji}`);
  if (zx) xqBits.push(`**月支 ${month} · ${zx.xiang}**：${zx.xing}`);
  if (xqBits.length) {
    const zh = xqBits.join('\n\n');
    push('性格', 'Temperament', zh,
      `Classic character notes keyed to the **${term(day)}** day stem and the **${term(month)}** month branch. ${src(zh, 'Show the Chinese character notes')}`);
  }
  const jk = notes('jiankang');
  const jkZh = `日主 **${day}${r.day_master.wx}**，${jk.gan_neifu?.[day] ? `内腑看 ${jk.gan_neifu[day]}、外在看 ${jk.gan_waizhi?.[day] || ''}。` : ''}${dayZhi ? `日支 ${dayZhi} 主 ${jk.zhi_buwei?.[dayZhi] || '相应部位'}。` : ''}\n\n${jk.yao || ''}`;
  push('身体', 'Body & health', jkZh,
    `The Chinese source below maps the Day Master and day branch to organ systems and body areas, with a note on where to pay attention. ${src(jkZh, 'Show the Chinese source')}`);
  if (r.shensha && r.shensha.length) {
    const zh = r.shensha.map((s: any) => `**${s.name}**（${s.where}）：${s.note || ''}`).join('\n\n');
    push('神煞', 'Shen Sha (symbolic stars)', zh,
      r.shensha.map((s: any) => `**${term(s.name)}** — ${src(esc(s.where) + (s.note ? '：' + s.note : ''))}`).join('\n\n'));
  }
  if (r.pillars.map((p: any) => p.nayin).some(Boolean)) {
    const ny = notes('nayin').items || {};
    const zh = r.pillars.map((p: any) => `**${p.name}柱 ${p.ganzhi} · ${p.nayin}**：${ny[p.nayin] || ''}`).join('\n\n');
    push('纳音', 'Na Yin (elemental imagery)', zh,
      r.pillars.map((p: any) => `**${term(p.name)} ${ganzhi(p.ganzhi)} · ${term(p.nayin)}** — ${src(String(ny[p.nayin] || ''))}`).join('\n\n'));
  }
  const yun = notes('yun_notes');
  const cur = r.dayun.find((d: any) => d.start_age <= age && age <= d.end_age);
  const yunZh = `起运 ${r.qi_yun.year} 年 ${r.qi_yun.month} 个月，${r.qi_yun.forward ? '顺' : '逆'}行，共 ${r.dayun.length} 步。` +
    (cur ? `\n\n眼下走 **${cur.ganzhi}** 运（${cur.start_age}–${cur.end_age} 岁），运干是 **${cur.gan_god}**。` : '') +
    `\n\n${yun.dayun?.judge || ''}`;
  push('行运', 'Major Fortune',
    yunZh,
    `Major Fortune begins after ${r.qi_yun.year} years and ${r.qi_yun.month} months, running ${r.qi_yun.forward ? 'forward' : 'backward'} for ${r.dayun.length} steps.` +
    (cur ? `\n\nYou are currently in the **${ganzhi(cur.ganzhi)}** step (ages ${cur.start_age}–${cur.end_age}), with **${term(cur.gan_god)}** as its stem god.` : '') +
    `\n\n${yun.dayun?.judge ? src(yun.dayun.judge, 'Show the Chinese note on this fortune') : ''}`);
  if (typeof (window as any).__CURRENT_LIUNIAN__ === 'string') {
    push(`流年 ${year}`, `Annual chart ${year}`,
      String((window as any).__CURRENT_LIUNIAN_ZH__ || ''), (window as any).__CURRENT_LIUNIAN__);
  }
  push('说明', 'About this reading',
    '四柱、藏干、十神、纳音与大运按节气历排定；旺衰与喜忌由规则推出，属于参考，不是断语。神煞只作倾向，不单独定吉凶。',
    'The Four Pillars, hidden stems, Ten Gods, Na Yin and Major Fortune are derived from the solar-term calendar. Strength and favorable / unfavorable elements follow explicit rules and are for reference, not prediction. Shen Sha indicate tendencies only and never decide auspiciousness on their own.');
  return secs;
}

export function dailyBaziBar(r: any, dayGz: string, dateStr: string): string {
  const copy = (L['reading_bazi/daily_bazi_copy'] || {}).gods || {};
  const god = ten_god(r.day_master.gan, dayGz.charAt(0));
  const group = GOD_GROUP[god] || '';
  const fav = (r.xiji.xi || []).some((x: string) => x.includes(group));
  const g = copy[god] || {};
  const sentence = `今日逢${god}，${g[fav ? 'shun' : 'ni'] || (fav ? '宜顺势而为' : '宜谨慎从事')}`;
  const evidence = `${god}属${group}，今天算${fav ? '喜' : '忌'}的方向｜喜：${(r.xiji.xi || []).join('、') || '—'}　忌：${(r.xiji.ji || []).join('、') || '—'}`;
  const sentenceEn = `Today brings ${termBoth(god)} — ${fav ? 'work with the current rather than against it' : 'slow down and keep a little in reserve'}.`;
  const evidenceEn = `${term(god)} belongs to the ${term(group)} group; today falls on the ${fav ? 'favorable' : 'unfavorable'} side. Favorable: ${(r.xiji.xi || []).map(term).join(', ') || '—'} · Unfavorable: ${(r.xiji.ji || []).map(term).join(', ') || '—'}`;
  return `<div class="dailybar"><div class="db-top"><span class="db-tag">${t('daily.tag')}</span><span>${esc(dateStr)}</span>
    <span class="db-src">${t('daily.src')}</span></div>
    <p class="db-main">${isEn() ? esc(sentenceEn) : esc(sentence)}</p>
    <p class="db-evidence">${isEn() ? esc(evidenceEn) : esc(evidence)}</p>
    ${isEn() ? sourceBlock(esc(`今日一句：${sentence}\n依据：${evidence}`), 'Show the Chinese source') : ''}</div>`;
}

// ── 奇门解读 ─────────────────────────────────────────────────
const DOOR_LV: Record<string, number> = { '开门': 1, '休门': 1, '生门': 2, '景门': 0, '伤门': -1, '杜门': -1, '死门': -2, '惊门': -1 };
const REL: Record<string, string> = {
  '比和': '门和宫是一家人，顺', '门生': '门生着宫，事情有人往上托', '宫生门': '宫养着门，环境帮衬',
  '门迫': '门克着宫，硬顶着走，费力', '门制': '宫克着门，手脚被环境拴着',
};
const REL_EN: Record<string, string> = {
  '比和': 'Door and palace agree — smooth.', '门生': 'The door supports the palace — help comes from above.',
  '宫生门': 'The palace feeds the door — the setting helps.',
  '门迫': 'The door presses against the palace — forced progress, high effort.',
  '门制': 'The palace restrains the door — your hands are tied by circumstances.',
};

/** 八门 / 九星 / 八神的常用短注，英文模式直接可读。 */
const QIMEN_EN: Record<string, { gist: string; yong?: string; ji?: string }> = {
  '开门': { gist: 'Open: matters handled in the open and through proper channels — process is on your side.', yong: 'Meetings, negotiation, opening a business, taking office, formal applications.', ji: 'Avoid back-door deals — an Open Door brings hidden matters to light.' },
  '休门': { gist: 'Rest: pause, reconcile, and let patience do the work.', yong: 'Mediation, reconciling, stepping back in a negotiation, recuperation.', ji: 'Avoid rushing or forcing — Rest needs time.' },
  '生门': { gist: 'Life: growth, resources and steady gain.', yong: 'Seeking wealth, starting a venture, asking for support.', ji: 'Avoid greed and shortcuts — Life favors sustained effort.' },
  '伤门': { gist: 'Injury: friction and loss; useful only for action that needs an edge.', yong: 'Competition, pursuit, firm boundaries.', ji: 'Avoid delicate negotiation and anything you want to keep intact.' },
  '杜门': { gist: 'Blockage: concealment, sealing off, matters held back.', yong: 'Keeping things private, focused study, guarding resources.', ji: 'Avoid promotion or travel that depends on open access.' },
  '景门': { gist: 'Vision: visibility, documents, reputation and appearances.', yong: 'Presentations, applications, exams, spreading news, creative work.', ji: 'Do not rely on appearances alone or chase fame without substance.' },
  '死门': { gist: 'Death: endings, stillness, concluding matters.', yong: 'Closing old affairs, letting go, final and solemn matters.', ji: 'Avoid new beginnings or anything that needs momentum.' },
  '惊门': { gist: 'Shock: surprises, alarms and unsettled news.', yong: 'Announcements, persuasion, debate, sudden developments.', ji: 'Avoid long-term commitments or trusting unverified news.' },
  '天蓬': { gist: 'Bold and unorthodox: favorable timing breaks new ground; poor timing brings excess, loss and trouble.' },
  '天芮': { gist: 'The sick star: where it lands, matters drag on or turn chronic — a sign to treat the root first.' },
  '天冲': { gist: 'Impetuous and direct: quick action and movement, with a tendency to charge ahead.' },
  '天辅': { gist: 'Supportive and cultured: teachers, helpers and quiet assistance.' },
  '天禽': { gist: 'The central star: stability, mediation and balanced judgment.' },
  '天心': { gist: 'Clear-headed and strategic: planning, medicine and sound judgment.' },
  '天柱': { gist: 'Resistant and brittle: pressure, collapse and the need to bend.' },
  '天任': { gist: 'Steady and dependable: patient work, land and accumulation.' },
  '天英': { gist: 'Bright and volatile: visible results, media, and flashes that quickly fade.' },
  '值符': { gist: 'Head of the eight deities: authority, patrons and proper channels.' },
  '腾蛇': { gist: 'Unstable and illusory: mixed messages, repetition and anxiety.' },
  '太阴': { gist: 'Quiet and hidden: behind-the-scenes help, subtlety and careful timing.' },
  '六合': { gist: 'Cooperation and agreement: partnerships, mediation, things brought together.' },
  '白虎': { gist: 'Pressure and force: conflict, hazards, and a need for caution.' },
  '玄武': { gist: 'Secrecy and loss: hidden motives, theft and unclear information.' },
  '九地': { gist: 'Stillness and depth: patience, concealment and long-term holding.' },
  '九天': { gist: 'Height and expansion: visibility, travel and ambitious plans.' },
};

const QLIB = () => ({
  doors: L['reading_qimen/doors'] || {}, stars: L['reading_qimen/stars'] || {}, shens: L['reading_qimen/shens'] || {},
});

export function qimenCellHtml(c: any, r: any, gejuMap: Record<string, any[]>): string {
  const { doors, stars, shens } = QLIB();
  const lv = DOOR_LV[c.door] ?? 0;
  let cls = 'qpal' + (lv >= 1 ? ' good' : lv <= -1 ? ' bad' : '') + (c.shen === '值符' ? ' zf' : '') + (c.kong ? ' kong' : '');
  if (r.shi_gan_palace === Number(Object.keys(r.palaces).find(k => r.palaces[k] === c))) cls += ' yongshen';
  const badges = (c.is_ma ? `<span class="qbadge ma">${t('qcell.ma')}</span>` : '') + (c.kong ? `<span class="qbadge kong">${t('qcell.kong')}</span>` : '');
  const tian = term(c.tian_yi) + (c.qin_yi ? `<i class="qqin">/${esc(term(c.qin_yi))}</i>` : '');
  const star = c.star === '天芮' ? '天芮禽' : c.star;
  const parts: string[] = [];
  const dEn = QIMEN_EN[c.door], sEn = QIMEN_EN[c.star], shEn = QIMEN_EN[c.shen];
  if (isEn()) {
    parts.push(`${term(c.name)} (${term(c.dir)}).`);
    if (dEn) parts.push(`${term(c.door)}: ${dEn.gist}`, `Good for: ${dEn.yong}`, `Avoid: ${dEn.ji}`);
    else if (doors[c.door]) parts.push(`${term(c.door)}: ${doors[c.door].gist}（中文）`);
    if (sEn) parts.push(`${term(c.star)}: ${sEn.gist}`);
    else if (stars[c.star]) parts.push(`${term(c.star)}: ${stars[c.star].gist}（中文）`);
    if (shEn) parts.push(`${qterm(c.shen)}: ${shEn.gist}`);
    else if (shens[c.shen]) parts.push(`${qterm(c.shen)}: ${shens[c.shen].gist}（中文）`);
    if (c.kong) parts.push(t('qcell.kongNote'));
    if (c.is_ma) parts.push(t('qcell.maNote'));
    for (const g of (gejuMap[c.name] || [])) if (c.di_yi) parts.push(`Ke Ying · ${term(g.name)} (${term(g.level)}): ${g.text}（中文）`);
  } else {
    parts.push(`${c.name}（${c.dir}）。`);
    if (doors[c.door]) parts.push(`${c.door}：${doors[c.door].gist}`, `宜：${doors[c.door].yong} 忌：${doors[c.door].ji}`);
    if (stars[c.star]) parts.push(`${c.star}：${stars[c.star].gist}`);
    if (shens[c.shen]) parts.push(`${c.shen}：${shens[c.shen].gist}`);
    if (c.kong) parts.push(t('qcell.kongNote'));
    if (c.is_ma) parts.push(t('qcell.maNote'));
    for (const g of (gejuMap[c.name] || [])) if (c.di_yi) parts.push(`克应·${g.name}（${g.level}）：${g.text}`);
  }
  return `<div class="${cls}" data-qnote="${esc(parts.join(' '))}" role="button" tabindex="0"
    aria-label="${esc(isEn() ? `${term(c.name)}, ${term(c.door)}, ${term(c.star)}, ${qterm(c.shen)}, activate for notes` : `${c.name}，${c.door} ${c.star} ${c.shen}，点开看这一格在说什么`)}">
    <div class="qtop"><span class="qgong">${esc(term(c.name))}</span>${badges}</div>
    <div class="qtian"><b>${tian}</b><span class="qstar">${esc(term(star))}</span></div>
    <div class="qdoor">${esc(term(c.door))}</div>
    <div class="qbottom"><span class="qshen">${esc(c.shen ? qterm(c.shen) : '—')}</span><span class="qdi">${isEn() ? 'Earth' : '地'} ${esc(term(c.di_yi))}</span></div></div>`;
}

export function qimenGridHtml(r: any): string {
  const gejuMap: Record<string, any[]> = {};
  for (const g of r.geju || []) (gejuMap[r.palaces[g.palace].name] ||= []).push(g);
  const pos = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
  const gz = r.ganzhi, ju = r.ju;
  let h = `<div class="qgrid" role="group" aria-label="${t('qgrid.aria')}">`;
  for (const row of pos) {
    h += '<div class="qrow">';
    for (const p of row) {
      if (p === 5) {
        h += `<div class="qpal qcenter"><div class="qjuname">${esc(term(ju.name))}</div>
          <div class="qline">${esc(ganzhi(gz.year))} ${t('qgrid.year')} ${esc(ganzhi(gz.month))} ${t('qgrid.month')} ${esc(ganzhi(gz.day))} ${t('qgrid.day')} · ${esc(ganzhi(gz.hour))} ${t('qgrid.hour')}</div>
          <div class="qline">${esc(term(ju.jieqi))} ${esc(term(ju.yuan))}</div>
          <div class="qline">${t('qgrid.zhifu')} ${esc(term(r.zhifu.star))} ${t('qgrid.land')} ${esc(term(r.palaces[r.zhifu.land].name))} · ${t('qgrid.zhishi')} ${esc(term(r.zhishi.door))} ${t('qgrid.land')} ${esc(term(r.palaces[r.zhishi.land].name))}</div></div>`;
      } else h += qimenCellHtml(r.palaces[p], r, gejuMap);
    }
    h += '</div>';
  }
  return h + '</div>';
}

export function qimenSections(r: any): { title: string; body: string }[] {
  const { doors, stars, shens } = QLIB();
  const ju = r.ju, gz = r.ganzhi;
  const secs: { title: string; body: string }[] = [];
  const push = (zhTitle: string, enTitle: string, zhBody: string, enBody: string) =>
    secs.push({ title: isEn() ? enTitle : zhTitle, body: isEn() ? enBody : zhBody });
  const src = (s: string, label?: string) => sourceBlock(esc(s), label);
  const rel = (k: string) => isEn() ? (REL_EN[k] || '') : (REL[k] || '');
  const fy = r.fu_yin ? (isEn() ? '\n\n**Fu Yin**: stars and doors return to their home palaces — hold, do not push.' : '\n\n**伏吟**：星门各回本宫，宜守不宜动。') : '';
  const fy2 = r.fan_yin ? (isEn() ? '\n\n**Fan Yin**: stars and doors sit opposite their homes — quick but repetitive.' : '\n\n**反吟**：星门坐对宫，事快而反复。') : '';
  const classicNote = '起局用拆补法：节气管局、符头管元。另有置闰法（《金函玉镜》卷五「超神接气法」），只在节气交界几天可能差一元，这是流派分野，不是排错。';

  push('一、这张局', '1 · This chart',
    `**${ju.name}**（${ju.yuan}，${ju.method}）。${gz.year}年${gz.month}月${gz.day}日${gz.hour}时起局；当日属 **${ju.jieqi}**，日符头 **${ju.futou}**。\n\n${classicNote}` + fy + fy2,
    `**${term(ju.name)}** (${term(ju.yuan)}, ${ju.method}). Cast for ${ganzhi(gz.year)} / ${ganzhi(gz.month)} / ${ganzhi(gz.day)}, ${ganzhi(gz.hour)} hour; solar term **${term(ju.jieqi)}**, day fu head **${term(ju.futou)}**.\n\nThe split-supplement method sets the chart by solar term and the yuan by the fu head. An intercalary method also exists (the “method of matching spirit and qi”, Jin Han Yu Jing vol. 5); around solar-term boundaries it can differ by one yuan — a school difference, not a calculation error.` + fy + fy2);

  const zf = r.zhifu, zs = r.zhishi;
  const zc = r.palaces[zf.land], sc = r.palaces[zs.land];
  const st = stars[zf.star] || {}, dr = doors[zs.door] || {};
  const zfStarEn = QIMEN_EN[zf.star]?.gist || st.gist || '';
  const zsDoorEn = QIMEN_EN[zs.door]?.gist || dr.gist || '';
  push('二、值符与值使', '2 · Value Officer & Value Envoy',
    `值符是本旬领班的星——**${zf.star}**携${zf.yi}落在${zc.name}；值使是当值的门——**${zs.door}**落在${sc.name}。\n\n**${zf.star}**：${st.gist || ''}${r.star_state?.[zf.star] ? '它此刻' + r.star_state[zf.star] + '。' : ''}\n\n**${zs.door}**：${dr.gist || ''}眼下落在${sc.name}，${REL[sc.door_rel] || ''}。`,
    `The Value Officer is the leading star of this xun — **${term(zf.star)}** carries ${term(zf.yi)} into ${term(zc.name)}. The Value Envoy is the door on duty — **${term(zs.door)}** lands in ${term(sc.name)}.\n\n**${term(zf.star)}**: ${zfStarEn}${r.star_state?.[zf.star] ? ` Currently ${r.star_state[zf.star]}（中文）.` : ''}\n\n**${term(zs.door)}**: ${zsDoorEn} It now sits in ${term(sc.name)} — ${rel(sc.door_rel)}`);

  const gZh: string[] = [], gEn: string[] = [];
  if (r.dunfa?.length) {
    gZh.push(`这一局成了 **${r.dunfa.map((x: any) => x.name).join('、')}**。` + r.dunfa.map((x: any) => `- **${x.name}**：${x.text}`).join('\n'));
    gEn.push(`This chart forms **${r.dunfa.map((x: any) => term(x.name)).join(', ')}**.` + r.dunfa.map((x: any) => `- **${term(x.name)}**: ${src(x.text)}`).join('\n'));
  }
  if (r.wubuyu) {
    gZh.push(`**五不遇时**：时干${r.wubuyu.hour}克日干${r.wubuyu.day}，旧书视为择吉大忌。`);
    gEn.push(`**Five Non-Meetings hour**: the hour stem ${term(r.wubuyu.hour)} overcomes the day stem ${term(r.wubuyu.day)} — old texts treat it as a poor time to initiate.`);
  }
  if (r.liuyi_jixing) {
    gZh.push(`**六仪击刑**：旬首${r.liuyi_jixing.yi}落在${r.liuyi_jixing.name}，此宫之事宜缓办。`);
    gEn.push(`**Six Yi punishment**: the xun head ${term(r.liuyi_jixing.yi)} lands in ${term(r.liuyi_jixing.name)} — matters tied to this palace should be slowed down.`);
  }
  const shown = new Set<string>();
  for (const pal of [r.shi_gan_palace, zf.land]) {
    if (!pal) continue;
    for (const x of (r.geju || []).filter((x: any) => x.palace === pal)) {
      if (shown.has(x.name + pal)) continue;
      shown.add(x.name + pal);
      gZh.push(`**${x.name}**（${r.palaces[pal].name}）：${x.text}`);
      gEn.push(`**${term(x.name)}** (${term(r.palaces[pal].name)}): ${src(x.text)}`);
    }
  }
  if (!shown.size) {
    gZh.push('这一局无成名吉凶格，属平常之局——平常局最宜平常事。');
    gEn.push('No named auspicious or inauspicious pattern forms — an ordinary chart, best used for ordinary matters.');
  }
  push('三、格局', '3 · Patterns',
    gZh.join('\n\n') + '\n\n克应按天盘干加地盘干取自《金函玉镜》卷二「十干克应诀」，是旧书的话，说得重，降一档听就好。',
    gEn.join('\n\n') + '\n\nKe Ying readings come from the “Ten Stems and Their Responses” in Jin Han Yu Jing vol. 2. The old wording is severe; take it down a notch.');

  if (r.shi_gan_palace) {
    const c = r.palaces[r.shi_gan_palace];
    const s = stars[c.star] || {}, d = doors[c.door] || {};
    const zh = `时干${gz.hour.charAt(0)}落在${c.name}（${c.dir}方），这一格上坐着 **${c.star}** 和 **${c.door}**${c.shen ? '，还有' + c.shen : ''}。\n\n- ${c.star}：${s.gist || ''}\n- 宜：${d.yong || ''}\n- 忌：${d.ji || ''}` +
      (c.door_rel === '门迫' || c.door_rel === '门制' ? `\n\n这一格 **${c.door_rel}**——${REL[c.door_rel]}。时间、预算、耐心各留两成。` : '') +
      (c.kong ? '\n\n**落空**：事情悬着、约定易变，改期或等出旬填实，别急着下注。' : '');
    const en = `The hour stem ${term(gz.hour.charAt(0))} lands in ${term(c.name)} (${term(c.dir)}), with **${term(c.star)}** and **${term(c.door)}**${c.shen ? `, plus ${qterm(c.shen)}` : ''}.\n\n- ${term(c.star)}: ${QIMEN_EN[c.star]?.gist || s.gist || ''}\n- Good for: ${QIMEN_EN[c.door]?.yong || d.yong || ''}\n- Avoid: ${QIMEN_EN[c.door]?.ji || d.ji || ''}` +
      (c.door_rel === '门迫' || c.door_rel === '门制' ? `\n\nThis palace is **${term(c.door_rel)}** — ${rel(c.door_rel)} Leave room in time, budget and patience.` : '') +
      (c.kong ? '\n\n**Void**: matters hang in the air and plans may change. Reschedule or wait for the xun to fill; do not commit yet.' : '');
    push('四、问事的人（时干落宫）', '4 · The person asking (hour-stem palace)', zh, en);
  }

  const rowsZh = [9, 2, 7, 6, 1, 8, 3, 4].map(p => {
    const c = r.palaces[p], lv = DOOR_LV[c.door] ?? 0;
    const tag = [lv >= 1 ? '吉方' : lv <= -1 ? '缓行' : '', c.kong ? '落空' : '', c.is_ma ? '驿马' : '', c.shen === '值符' ? '值符' : ''].filter(Boolean);
    return `- **${c.dir}（${c.name}）**：${c.door} / ${c.star}${tag.length ? '（' + tag.join('、') + '）' : ''}`;
  });
  const rowsEn = [9, 2, 7, 6, 1, 8, 3, 4].map(p => {
    const c = r.palaces[p], lv = DOOR_LV[c.door] ?? 0;
    const tag = [lv >= 1 ? 'Auspicious' : lv <= -1 ? 'Go slowly' : '', c.kong ? 'Void' : '', c.is_ma ? 'Horse' : '', c.shen === '值符' ? 'Value Officer' : ''].filter(Boolean);
    return `- **${term(c.dir)} (${term(c.name)})**: ${term(c.door)} / ${term(c.star)}${tag.length ? ` (${tag.join(', ')})` : ''}`;
  });
  const fourZh = ['九天', '九地', '太阴', '六合'].map(s => {
    const p = Number(Object.keys(r.palaces).find(k => r.palaces[k].shen === s));
    if (!p) return '';
    const c = r.palaces[p];
    return `**${s}**在${c.name}（${c.dir}方）`;
  }).filter(Boolean);
  const fourEn = ['九天', '九地', '太阴', '六合'].map(s => {
    const p = Number(Object.keys(r.palaces).find(k => r.palaces[k].shen === s));
    if (!p) return '';
    const c = r.palaces[p];
    return `**${qterm(s)}** in ${term(c.name)} (${term(c.dir)})`;
  }).filter(Boolean);
  if (fourZh.length) { rowsZh.push('', '四吉方位：' + fourZh.join('、') + '。'); rowsEn.push('', 'Four auspicious directions: ' + fourEn.join(', ') + '.'); }
  push('五、方位速查', '5 · Direction quick reference', rowsZh.join('\n'), rowsEn.join('\n'));
  push('六、丑话说在前面', '6 · A word of caution',
    '奇门旧籍几乎全是为行军打仗写的。今天用它挑方位、辅助决策，取的是「天时地利」的框架，不是占断祸福的铁口。吉格当成顺风的窗口，凶格当成多留余量的提醒——决定还是你的。',
    'Most old Qi Men texts were written for military campaigning. Used today for timing and direction, the useful part is the framework of “heavenly timing and earthly advantage” — not fixed predictions. Treat auspicious patterns as a favorable window and difficult ones as a prompt to leave margin. The decision is still yours.');
  return secs;
}

export function qimenNotesHtml(raw: string): string { return mdBlock(raw); }
