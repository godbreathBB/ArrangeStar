// reading.ts — 文案库装载、Markdown 渲染、三页解读与弹层内容（纯客户端）
import { PALACES, BRANCHES, STEMS } from './engine/ziwei.ts';
import { ten_god } from './engine/bazi.ts';

const L: any = (window as any).__LIB__ || {};
export const MAJOR = new Set(['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']);
export const HUA_CLASS: Record<string, string> = { '禄': 'lu', '权': 'quan', '科': 'ke', '忌': 'ji' };
const HUA_TAG = ['禄', '权', '科', '忌'];

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

export function ziweiLibrary(): any {
  const tpl = notes('templates_v03').templates || [];
  const pairs = notes('pairs_v01').pairs || [];
  const pats = notes('patterns').patterns || {};
  const aux = notes('career_aux') || {};
  const charts = notes('pan144').charts || {};
  const templates = new Map<string, { text: string }>();
  for (const t of tpl) templates.set(t.star + '|' + t.dimension, t);
  const pairMap = new Map<string, string>();
  for (const p of pairs) pairMap.set([...p.stars].sort().join('|'), p.text);
  return {
    templates, pairs: pairMap, patterns: pats,
    downNotes: notes('down_notes').notes || {},
    wealthNotes: notes('wealth_notes').notes || {},
    healthNotes: notes('health_notes').notes || {},
    careerNotes: notes('career_notes').notes || {},
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

/** 单宫抽屉：宫名、星曜、四化、三方四正与该宫白话。 */
export function drawerHtml(r: any, branch: number): string {
  const name = PALACES[mod(r.life - branch, 12)];
  const opp = mod(branch + 6, 12);
  const oppName = PALACES[mod(r.life - opp, 12)];
  const stars = r.stars[branch] || [];
  const bright = (r.brightness || {})[branch] || {};
  const hua: Record<string, string> = {};
  for (const [s, v] of Object.entries(r.hua || {}) as any) hua[s] = v.tag;
  const major = stars.filter((s: string) => MAJOR.has(s));
  const notesLib = notes('star_notes').notes || {};

  const chips = stars.map((s: string) => {
    const cls = MAJOR.has(s) ? 'chip-major' : 'chip-minor';
    const lv = bright[s] ? `<i class="lvl">${esc(bright[s])}</i>` : '';
    const h = hua[s] ? `<sup class="hua ${HUA_CLASS[hua[s]]}">${hua[s]}</sup>` : '';
    return `<span class="chip ${cls}" data-star="${esc(s)}" title="点一下看注解">${esc(s)}${h}${lv}</span>`;
  }).join('') || '<span class="empty">这一格暂时空着</span>';
  const majorLine = major.length
    ? major.map((s: string) => s + (bright[s] ? `<i class="lvl">${esc(bright[s])}</i>` : '')).join(' · ')
    : `这一格空着，借对面的 ${BRANCHES[opp]} 一起看`;

  const tag2: Record<string, [string, number]> = {};
  for (const [st, v] of Object.entries(r.hua || {}) as any) {
    for (let b = 0; b < 12; b++) if ((r.stars[b] || []).includes(st)) { tag2[v.tag] = [st, b]; break; }
  }
  const huaBody = HUA_TAG.filter(t => tag2[t]).map(t => {
    const [st, b] = tag2[t];
    const pn = PALACES[mod(r.life - b, 12)];
    return `<div class="dw-hua"><a class="dw-goto hua ${HUA_CLASS[t]}" data-goto="${b}">${t}</a>` +
      `<a class="dw-goto" data-goto="${b}">${esc(st)} 落在 ${pn}（${BRANCHES[b]}）</a></div>`;
  }).join('') || '<p class="dw-mute">今年这张盘里，暂时没有四化落进来。</p>';

  const tri = [mod(branch + 4, 12), mod(branch + 8, 12), opp].map(b =>
    `<a class="dw-goto" data-goto="${b}">${PALACES[mod(r.life - b, 12)]}（${BRANCHES[b]}）</a>`).join('');

  // 这一格的解读：主星性格维度 + 星曜注解，去重后只留一份
  const lib = ziweiLibrary();
  const dim = ({ '命宫': '性格', '身宫': '性格', '官禄': '事业', '财帛': '财运', '疾厄': '健康', '夫妻': '感情' } as any)[name] || '性格';
  const seen = new Set<string>();
  const paras: string[] = [];
  for (const st of major) {
    const t = lib.templates.get(st + '|' + dim);
    if (t && !seen.has(t.text)) { seen.add(t.text); paras.push(`**${st}**：${t.text}`); }
    if (notesLib[st] && !seen.has(notesLib[st])) { seen.add(notesLib[st]); paras.push(`**${st}：**${notesLib[st]}`); }
  }
  const body = paras.length ? mdBlock(paras.join('\n\n')) : '<p>这一格暂时还没有可写下的解读，先看看别的吧。</p>';
  return `<section class="dw" data-branch="${branch}">
    <div class="dw-head"><div class="dw-name">${name}<span class="dw-br">${BRANCHES[branch]}</span></div>
    <button class="dw-x" data-close="1" title="关闭" aria-label="关闭解读">×</button></div>
    <div class="dw-major">${majorLine}</div><div class="dw-stars">${chips}</div>
    <a class="dw-opp" data-goto="${opp}">对面 · ${oppName}（${BRANCHES[opp]}）→</a>
    <details class="dw-sec" open><summary>这一格在说什么</summary>${body}</details>
    <details class="dw-sec"><summary>四化去了哪</summary>${huaBody}</details>
    <details class="dw-sec"><summary>三方四正</summary><div class="dw-tris">${tri}</div></details>
    <details class="dw-sec"><summary>这一格管什么</summary><p class="dw-gist">${esc(PALACE_GIST[name] || '')}</p></details>
  </section>`;
}

export function starSheetHtml(star: string): string {
  const d = notes('star_notes');
  const meta = (d.meta || {})[star] || {};
  const kind = meta.type || meta.kind || '星曜';
  const note = (d.notes || {})[star] || '';
  const tpl = notes('templates_v03').templates || [];
  const bits = tpl.filter((t: any) => t.star === star).slice(0, 5)
    .map((t: any) => `<span class="ss-hit" data-dim="${esc(t.dimension)}">${esc(t.dimension)}<span>→</span></span>`).join('');
  return `<div class="ss" data-star="${esc(star)}"><div class="ss-head"><div class="ss-name">${esc(star)}<span class="ss-kind">${esc(kind)}</span></div>
    <button class="dw-x" data-close-star="1" aria-label="关闭">×</button></div>
    <p class="ss-note">${esc(note)}</p>
    ${bits ? `<div class="ss-sec"><b>看看它在各维度的说法</b>${bits}</div>` : ''}
    <p class="ss-cite">以上依据本站文案库，是白话改写，不是宿命断语。</p></div>`;
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
  for (const col of p) h += `<th>${esc(col.name)}柱</th>`;
  h += '</tr></thead><tbody>';
  const row = (lab: string, cls: string, fn: (x: any) => string) =>
    `<tr class="${cls}"><td class="lab">${lab}</td>` + p.map(fn).join('') + '</tr>';
  h += row('十神', 'tg', x => `<td class="${x.name === '日' ? 'dm' : ''}">${esc(x.shi_shen)}</td>`);
  h += row('天干', 'gz', x => `<td><span class="big" style="color:${WX_COLOR[x.gan_wx]}">${esc(x.gan)}</span><i class="wx">${esc(x.gan_wx)}</i></td>`);
  h += row('地支', 'gz', x => `<td><span class="big" style="color:${WX_COLOR[x.zhi_wx]}">${esc(x.zhi)}</span><i class="wx">${esc(x.zhi_wx)}</i></td>`);
  h += row('藏干', 'hide', x => '<td>' + (x.hide || []).map((y: any) =>
    `<span style="color:${WX_COLOR[y.wx]}">${esc(y.gan)}</span><i class="god">${esc(y.god)}</i>`).join('<br>') + '</td>');
  h += row('纳音', 'ny', x => `<td>${esc(x.nayin)}</td>`);
  return h + '</tbody></table>';
}

export function baziCardsHtml(r: any): string {
  const { day_master: d, strength: st, geju: gj, xiji: xj } = r;
  const items: [string, string, string][] = [
    ['日主', `${d.gan}（${d.yy}${d.wx}）`, ''],
    ['旺衰', st.label, `${xj.lean} · 帮身 ${Math.round(st.ratio * 100)}%`],
    ['格局', gj.name, gj.reason || ''],
    ['喜', (xj.xi || []).join('、'), ''],
    ['忌', (xj.ji || []).join('、'), ''],
  ];
  return '<div class="bcardwrap">' + items.map(([n, v, note]) =>
    `<div class="bcard"><span class="bn">${n}</span><span class="bv">${esc(v)}</span>` +
    (note ? `<span class="bs">${esc(note)}</span>` : '') + '</div>').join('') + '</div>';
}

export function baziWuxingHtml(r: any): string {
  const [c, total] = wuxingCounts(r.pillars);
  const peak = Math.max(...Object.values(c)) || 1;
  return '<div class="wxchart">' + WX_ORDER.map(w => {
    const v = c[w] || 0;
    return `<div class="wxrow"><span class="wxname" style="color:${WX_COLOR[w]}">${w}</span>` +
      `<span class="wxbar"><i style="width:${(v / peak * 100).toFixed(1)}%;background:${WX_COLOR[w]}"></i></span>` +
      `<span class="wxval">${v.toFixed(2)}（${Math.round(v / total * 100)}%）</span></div>`;
  }).join('') + '</div>';
}

export function dayunHtml(r: any, age: number | null): string {
  return `<div class="dayuntrack" role="group" aria-label="大运，共 ${r.dayun.length} 步，可左右滚动" tabindex="0">` +
    r.dayun.map((d: any) => {
      const on = age !== null && d.start_age <= age && age <= d.end_age;
      return `<div class="dchip${on ? ' on' : ''}"><b>${esc(d.ganzhi)}</b><span>${d.start_age}–${d.end_age}岁</span><span>${esc(d.gan_god)}</span></div>`;
    }).join('') + '</div>';
}

export function baziSections(r: any, year: number, age: number): { title: string; body: string }[] {
  const secs: { title: string; body: string }[] = [];
  const st = r.strength, xj = r.xiji, gj = r.geju;
  const month = r.pillars[1].zhi.charAt(0), day = r.pillars[2].gan.charAt(0), dayZhi = r.pillars[2].zhi.charAt(0);
  secs.push({ title: '四柱概览', body: r.pillars.map((p: any) => `**${p.name}柱 ${p.ganzhi}**（${p.nayin}）`).join('　') +
    `\n\n日主 **${r.day_master.gan}${r.day_master.yy}${r.day_master.wx}**，生在 **${month}月**。十神：${r.pillars.map((p: any) => p.shi_shen).join('、')}。` });
  secs.push({ title: '日主强弱', body: `帮身 ${st.help.toFixed(2)} 分，耗身 ${st.drain.toFixed(2)} 分，帮身占 **${Math.round(st.ratio * 100)}%**，判为 **${st.label}**（${xj.lean}）。` +
    `\n\n月令${st.de_ling ? '帮身' : '不帮身'}，${st.de_di ? '地支有根' : '地支根浅'}，${st.de_shi ? '天干有助' : '天干少助'}。强弱只是方向，还要看通关与调候。` });
  const cheng = (notes('geju').cheng_bai || {})[gj.name];
  secs.push({ title: '格局', body: `**${gj.name}** —— ${gj.reason || ''}\n\n月令 ${month}，本气 ${gj.ben_qi}（${gj.ben_qi_god}）。` +
    (cheng ? `\n\n**成败要点**：${cheng}` : '') });
  const hj = (notes('houjue').months || {})[month];
  if (hj && hj.length) secs.push({ title: `月令诗诀 · ${month}月`, body: hj.slice(0, 3).map((x: any) => `**${x.ju}**\n\n${x.hua}`).join('\n\n') });
  const th = r.tiaohou;
  if (th) secs.push({ title: '调候', body: `日主 **${th.gan || day}** 生在 **${th.season}**，调候取 **${(th.items || []).join('、')}**。\n\n${th.why || ''}\n\n调候只管寒暖燥湿，与格局用神不一致时以格局为准。` });
  const xq = notes('xingqing');
  const gx = (xq.gan || {})[day], zx = (xq.zhi || {})[dayZhi];
  const xqBits: string[] = [];
  if (gx) xqBits.push(`**日干 ${day} · ${gx.xiang}**：${gx.xing}\n\n顺：${gx.xi}\n\n不顺：${gx.ji}`);
  if (zx) xqBits.push(`**月支 ${month} · ${zx.xiang}**：${zx.xing}`);
  if (xqBits.length) secs.push({ title: '性格', body: xqBits.join('\n\n') });
  const jk = notes('jiankang');
  secs.push({ title: '身体', body: `日主 **${day}${r.day_master.wx}**，${jk.gan_neifu?.[day] ? `内腑看 ${jk.gan_neifu[day]}、外在看 ${jk.gan_waizhi?.[day] || ''}。` : ''}${dayZhi ? `日支 ${dayZhi} 主 ${jk.zhi_buwei?.[dayZhi] || '相应部位'}。` : ''}\n\n${jk.yao || ''}` });
  if (r.shensha && r.shensha.length) secs.push({ title: '神煞', body: r.shensha.map((s: any) => `**${s.name}**（${s.where}）：${s.note || ''}`).join('\n\n') });
  if (r.pillars.map((p: any) => p.nayin).some(Boolean)) {
    const ny = notes('nayin').items || {};
    secs.push({ title: '纳音', body: r.pillars.map((p: any) => `**${p.name}柱 ${p.ganzhi} · ${p.nayin}**：${ny[p.nayin] || ''}`).join('\n\n') });
  }
  const yun = notes('yun_notes');
  const cur = r.dayun.find((d: any) => d.start_age <= age && age <= d.end_age);
  secs.push({ title: '行运', body: `起运 ${r.qi_yun.year} 年 ${r.qi_yun.month} 个月，${r.qi_yun.forward ? '顺' : '逆'}行，共 ${r.dayun.length} 步。` +
    (cur ? `\n\n眼下走 **${cur.ganzhi}** 运（${cur.start_age}–${cur.end_age} 岁），运干是 **${cur.gan_god}**。` : '') +
    `\n\n${yun.dayun?.judge || ''}` });
  if (typeof (window as any).__CURRENT_LIUNIAN__ === 'string') {
    secs.push({ title: `流年 ${year}`, body: (window as any).__CURRENT_LIUNIAN__ });
  }
  secs.push({ title: '说明', body: '四柱、藏干、十神、纳音与大运按节气历排定；旺衰与喜忌由规则推出，属于参考，不是断语。神煞只作倾向，不单独定吉凶。' });
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
  return `<div class="dailybar"><div class="db-top"><span class="db-tag">今日一句</span><span>${esc(dateStr)}</span>
    <span class="db-src">十神 · 喜忌</span></div>
    <p class="db-main">${esc(sentence)}</p><p class="db-evidence">${esc(evidence)}</p></div>`;
}

// ── 奇门解读 ─────────────────────────────────────────────────
const DOOR_LV: Record<string, number> = { '开门': 1, '休门': 1, '生门': 2, '景门': 0, '伤门': -1, '杜门': -1, '死门': -2, '惊门': -1 };
const REL: Record<string, string> = {
  '比和': '门和宫是一家人，顺', '门生': '门生着宫，事情有人往上托', '宫生门': '宫养着门，环境帮衬',
  '门迫': '门克着宫，硬顶着走，费力', '门制': '宫克着门，手脚被环境拴着',
};
const QLIB = () => ({
  doors: L['reading_qimen/doors'] || {}, stars: L['reading_qimen/stars'] || {}, shens: L['reading_qimen/shens'] || {},
});

export function qimenCellHtml(c: any, r: any, gejuMap: Record<string, any[]>): string {
  const { doors, stars, shens } = QLIB();
  const lv = DOOR_LV[c.door] ?? 0;
  let cls = 'qpal' + (lv >= 1 ? ' good' : lv <= -1 ? ' bad' : '') + (c.shen === '值符' ? ' zf' : '') + (c.kong ? ' kong' : '');
  if (r.shi_gan_palace === Number(Object.keys(r.palaces).find(k => r.palaces[k] === c))) cls += ' yongshen';
  const badges = (c.is_ma ? '<span class="qbadge ma">马</span>' : '') + (c.kong ? '<span class="qbadge kong">空</span>' : '');
  const tian = c.tian_yi + (c.qin_yi ? `<i class="qqin">/${esc(c.qin_yi)}</i>` : '');
  const star = c.star === '天芮' ? '天芮禽' : c.star;
  const parts = [`${c.name}（${c.dir}）。`];
  if (doors[c.door]) parts.push(`${c.door}：${doors[c.door].gist}`, `宜：${doors[c.door].yong} 忌：${doors[c.door].ji}`);
  if (stars[c.star]) parts.push(`${c.star}：${stars[c.star].gist}`);
  if (shens[c.shen]) parts.push(`${c.shen}：${shens[c.shen].gist}`);
  if (c.kong) parts.push('此宫落空：事悬着，约好的容易变。');
  if (c.is_ma) parts.push('驿马到宫：主动、出行、消息。');
  for (const g of (gejuMap[c.name] || [])) if (c.di_yi) parts.push(`克应·${g.name}（${g.level}）：${g.text}`);
  return `<div class="${cls}" data-qnote="${esc(parts.join(' '))}" role="button" tabindex="0"
    aria-label="${esc(c.name + '，' + c.door + ' ' + c.star + ' ' + c.shen + '，点开看这一格在说什么')}">
    <div class="qtop"><span class="qgong">${esc(c.name)}</span>${badges}</div>
    <div class="qtian"><b>${tian}</b><span class="qstar">${esc(star)}</span></div>
    <div class="qdoor">${esc(c.door)}</div>
    <div class="qbottom"><span class="qshen">${esc(c.shen || '—')}</span><span class="qdi">地 ${esc(c.di_yi)}</span></div></div>`;
}

export function qimenGridHtml(r: any): string {
  const gejuMap: Record<string, any[]> = {};
  for (const g of r.geju || []) (gejuMap[r.palaces[g.palace].name] ||= []).push(g);
  const pos = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
  const gz = r.ganzhi, ju = r.ju;
  let h = '<div class="qgrid" role="group" aria-label="奇门九宫盘">';
  for (const row of pos) {
    h += '<div class="qrow">';
    for (const p of row) {
      if (p === 5) {
        h += `<div class="qpal qcenter"><div class="qjuname">${esc(ju.name)}</div>
          <div class="qline">${esc(gz.year)}年${esc(gz.month)}月${esc(gz.day)}日 · ${esc(gz.hour)}时</div>
          <div class="qline">${esc(ju.jieqi)} ${esc(ju.yuan)}</div>
          <div class="qline">值符${esc(r.zhifu.star)}落${esc(r.palaces[r.zhifu.land].name)} · 值使${esc(r.zhishi.door)}落${esc(r.palaces[r.zhishi.land].name)}</div></div>`;
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
  secs.push({ title: '一、这张局', body: `**${ju.name}**（${ju.yuan}，${ju.method}）。${gz.year}年${gz.month}月${gz.day}日${gz.hour}时起局；当日属 **${ju.jieqi}**，日符头 **${ju.futou}**。\n\n起局用拆补法：节气管局、符头管元。另有置闰法（《金函玉镜》卷五「超神接气法」），只在节气交界几天可能差一元，这是流派分野，不是排错。`
    + (r.fu_yin ? '\n\n**伏吟**：星门各回本宫，宜守不宜动。' : '')
    + (r.fan_yin ? '\n\n**反吟**：星门坐对宫，事快而反复。' : '') });
  const zf = r.zhifu, zs = r.zhishi;
  const zc = r.palaces[zf.land], sc = r.palaces[zs.land];
  const st = stars[zf.star] || {}, dr = doors[zs.door] || {};
  secs.push({ title: '二、值符与值使', body: `值符是本旬领班的星——**${zf.star}**携${zf.yi}落在${zc.name}；值使是当值的门——**${zs.door}**落在${sc.name}。\n\n**${zf.star}**：${st.gist || ''}${r.star_state?.[zf.star] ? '它此刻' + r.star_state[zf.star] + '。' : ''}\n\n**${zs.door}**：${dr.gist || ''}眼下落在${sc.name}，${REL[sc.door_rel] || ''}。` });
  const g: string[] = [];
  if (r.dunfa?.length) g.push(`这一局成了 **${r.dunfa.map((x: any) => x.name).join('、')}**。` + r.dunfa.map((x: any) => `- **${x.name}**：${x.text}`).join('\n'));
  if (r.wubuyu) g.push(`**五不遇时**：时干${r.wubuyu.hour}克日干${r.wubuyu.day}，旧书视为择吉大忌。`);
  if (r.liuyi_jixing) g.push(`**六仪击刑**：旬首${r.liuyi_jixing.yi}落在${r.liuyi_jixing.name}，此宫之事宜缓办。`);
  const shown = new Set<string>();
  for (const pal of [r.shi_gan_palace, zf.land]) {
    if (!pal) continue;
    for (const x of (r.geju || []).filter((x: any) => x.palace === pal)) {
      if (shown.has(x.name + pal)) continue;
      shown.add(x.name + pal);
      g.push(`**${x.name}**（${r.palaces[pal].name}）：${x.text}`);
    }
  }
  if (!shown.size) g.push('这一局无成名吉凶格，属平常之局——平常局最宜平常事。');
  secs.push({ title: '三、格局', body: g.join('\n\n') + '\n\n克应按天盘干加地盘干取自《金函玉镜》卷二「十干克应诀」，是旧书的话，说得重，降一档听就好。' });
  if (r.shi_gan_palace) {
    const c = r.palaces[r.shi_gan_palace];
    const s = stars[c.star] || {}, d = doors[c.door] || {};
    secs.push({ title: '四、问事的人（时干落宫）', body: `时干${gz.hour.charAt(0)}落在${c.name}（${c.dir}方），这一格上坐着 **${c.star}** 和 **${c.door}**${c.shen ? '，还有' + c.shen : ''}。\n\n- ${c.star}：${s.gist || ''}\n- 宜：${d.yong || ''}\n- 忌：${d.ji || ''}` +
      (c.door_rel === '门迫' || c.door_rel === '门制' ? `\n\n这一格 **${c.door_rel}**——${REL[c.door_rel]}。时间、预算、耐心各留两成。` : '') +
      (c.kong ? '\n\n**落空**：事情悬着、约定易变，改期或等出旬填实，别急着下注。' : '') });
  }
  const rows = [9, 2, 7, 6, 1, 8, 3, 4].map(p => {
    const c = r.palaces[p], lv = DOOR_LV[c.door] ?? 0;
    const tag = [lv >= 1 ? '吉方' : lv <= -1 ? '缓行' : '', c.kong ? '落空' : '', c.is_ma ? '驿马' : '', c.shen === '值符' ? '值符' : ''].filter(Boolean);
    return `- **${c.dir}（${c.name}）**：${c.door} / ${c.star}${tag.length ? '（' + tag.join('、') + '）' : ''}`;
  });
  const four = ['九天', '九地', '太阴', '六合'].map(s => {
    const p = Number(Object.keys(r.palaces).find(k => r.palaces[k].shen === s));
    if (!p) return '';
    const c = r.palaces[p];
    return `**${s}**在${c.name}（${c.dir}方）`;
  }).filter(Boolean);
  if (four.length) rows.push('', '四吉方位：' + four.join('、') + '。');
  secs.push({ title: '五、方位速查', body: rows.join('\n') });
  secs.push({ title: '六、丑话说在前面', body: '奇门旧籍几乎全是为行军打仗写的。今天用它挑方位、辅助决策，取的是「天时地利」的框架，不是占断祸福的铁口。吉格当成顺风的窗口，凶格当成多留余量的提醒——决定还是你的。' });
  return secs;
}

export function qimenNotesHtml(raw: string): string { return mdBlock(raw); }
