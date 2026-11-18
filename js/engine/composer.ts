// composer.ts — 紫微解读装配（对应 yunxian.py + reading_composer.py）
import { Solar } from 'lunar-typescript';
import { BRANCHES, PALACES, STEMS, yearGanzhi, sihuaOf, _YIN_STEM } from './ziwei.ts';

const mod = (n: number, m: number): number => ((n % m) + m) % m;
export const MAJOR = new Set(['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']);
const JU_NAME: Record<number, string> = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
const TAG_ROLE: Record<string, string> = { '禄': '常有点顺手的机会靠过来', '权': '多半要你拿个主意、担一点事', '科': '细节容易被看见，也容易得到一句好话', '忌': '容易来回磨，放轻松一点就好' };
const LEVEL_NOTE: Record<string, string> = { '庙': '在这里它的状态挺足，长处容易发挥。', '旺': '状态不错，长处用得上。', '平': '不特别强也不特别弱，和整张盘一起看更清楚。', '陷': '状态偏弱，长处要多花点力气才显出来，慢慢来就好。' };
const DIMS: [string, string, string][] = [['性格', '命宫', '性格'], ['事业', '官禄', '事业'], ['财运', '财帛', '财运'], ['健康', '疾厄', '健康'], ['感情', '夫妻', '感情']];
const MONTH_GAN_BASE = 2;

// ── 运限（yunxian） ──
export function palaces_from(life_idx: number): Record<string, number> {
  const out: Record<string, number> = {};
  PALACES.forEach((name, k) => { out[name] = mod(life_idx - k, 12); });
  return out;
}
export function limit_of_age(r: any, age: number): any {
  return r.limits.find((x: any) => x.start <= age && age <= x.end) || null;
}
export function limit_chart(r: any, age: number): any {
  const lim = limit_of_age(r, age);
  if (!lim) return null;
  return { age, range: [lim.start, lim.end], life: lim.palace, stem: lim.stem, branch: lim.branch, hua: lim.hua, palaces: palaces_from(lim.palace) };
}
export function annual_chart(r: any, year: number): any {
  const [si, bi] = yearGanzhi(year);
  return { year, stem: STEMS[si], branch: BRANCHES[bi], stem_i: si, branch_i: bi, life: bi, hua: sihuaOf(si), palaces: palaces_from(bi) };
}
export function doujun(year_branch_i: number, birth_month: number, birth_hour_i: number): number {
  return mod(year_branch_i - (birth_month - 1) + birth_hour_i, 12);
}
export function flow_months(r: any, year: number, birth_month: number, birth_hour_i: number): any[] {
  const [si, bi] = yearGanzhi(year);
  const dj = doujun(bi, birth_month, birth_hour_i);
  const out: any[] = [];
  for (let m = 1; m <= 12; m++) {
    const palace = mod(dj + m - 1, 12);
    const gan = mod(_YIN_STEM[si] + (m - 1), 10);
    out.push({ month: m, palace, stem: STEMS[gan], branch: BRANCHES[mod(MONTH_GAN_BASE + m - 1, 12)], palace_branch: BRANCHES[palace], hua: sihuaOf(gan) });
  }
  return out;
}
export function flow_day(solar_y: number, solar_m: number, solar_d: number, month_palace: number): any {
  const lunar = Solar.fromYmd(solar_y, solar_m, solar_d).getLunar();
  const gz = lunar.getDayInGanZhi();
  if (!STEMS.includes(gz[0])) throw new Error('日干异常: ' + gz);
  const si = STEMS.indexOf(gz[0]);
  const d = lunar.getDay();
  return { day: d, palace: mod(month_palace + d - 1, 12), stem: gz[0], branch: gz[1], stem_i: si, hua: sihuaOf(si) };
}

// ── 格局检测（detect_patterns） ──
export function detect_patterns(r: any, age?: number, year?: number): string[] {
  const life = r.life;
  const tri = [life, mod(life + 4, 12), mod(life + 8, 12), mod(life + 6, 12)];
  const at = (b: number) => new Set((r.stars[b] || []).filter((s: string) => MAJOR.has(s)));
  const mine = new Set([...at(life), ...(at(mod(life + 6, 12)))]);
  const tri_stars = new Set<string>();
  for (const b of tri) at(b).forEach(s => tri_stars.add(s));
  const out: string[] = [];
  const has = (a: Set<string>, b: Set<string>) => [...b].every(x => a.has(x));

  if ([2, 8].includes(life) && has(mine, new Set(['紫微', '天府']))) out.push('紫府同宫');
  if (has(tri_stars, new Set(['天府', '天相']))) out.push('府相朝垣');
  if (has(tri_stars, new Set(['天机', '太阴', '天同', '天梁']))) out.push('机月同梁');
  if ([3, 9].includes(life) && has(mine, new Set(['天机', '巨门']))) out.push('巨机同临');
  if (life === 11 && mine.has('太阴')) out.push('月朗天门');
  if (life === 3 && mine.has('太阳')) out.push('日照雷门');
  if ([0, 6].includes(life) && mine.has('巨门')) out.push('石中隐玉');
  if ([2, 6, 8, 0].includes(life) && mine.has('七杀')) out.push('七杀朝斗');
  if (life === 6 && mine.has('紫微')) out.push('极向离明');
  if ([1, 7].includes(life) && has(mine, new Set(['武曲', '贪狼']))) out.push('贪武同行');
  if ([1, 7].includes(life) && has(mine, new Set(['太阳', '太阴']))) out.push('日月并明');
  if (mine.has('紫微') && [...tri_stars].some(s => ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺'].includes(s))) out.push('君臣庆会');
  const all_mine = new Set(r.stars[life] || []);
  const all_tri = new Set<string>();
  for (const b of tri) (r.stars[b] || []).forEach((s: string) => all_tri.add(s));
  if ([2, 8].includes(life) && has(mine, new Set(['太阳', '巨门']))) out.push('巨日同宫');
  if (has(tri_stars, new Set(['天机', '天梁']))) out.push('机梁加会');
  if (has(all_tri, new Set(['文昌', '天梁']))) out.push('文梁振纪');
  if (has(all_tri, new Set(['太阳', '天梁', '文昌', '禄存']))) out.push('阳梁昌禄');
  const hua3 = new Set(Object.entries(r.hua).filter(([, v]: any) => ['禄', '权', '科'].includes(v.tag)).map(([s]) => s));
  if (hua3.size === 3 && [...hua3].every(s => all_tri.has(s))) out.push('三奇加会');
  if (has(all_mine, new Set(['左辅', '右弼']))) out.push('左右同宫');
  if (has(all_mine, new Set(['文昌', '文曲']))) out.push('文桂文华');
  const bri = (r.brightness || {})[life] || {};
  if (mine.has('武曲') && ['庙', '旺'].includes(bri['武曲'])) out.push('将星得地');
  if (life === 0 && mine.has('太阴')) out.push('月生沧海');
  if (life === 6 && mine.has('天梁')) out.push('寿星入庙');
  if ([0, 6].includes(life) && mine.has('破军')) out.push('英星入庙');
  if (life === 6 && all_mine.has('擎羊')) out.push('马头带箭');

  const left = mod(life - 1, 12), right = mod(life + 1, 12);
  const nb = new Set([...(r.stars[left] || []), ...(r.stars[right] || [])]);
  const star_at: Record<string, number> = {};
  for (let b = 0; b < 12; b++) for (const st of (r.stars[b] || [])) star_at[st] ??= b;
  const lu = new Set(Object.entries(r.hua).filter(([, v]: any) => v.tag === '禄').map(([s]) => s));
  const quan = new Set(Object.entries(r.hua).filter(([, v]: any) => v.tag === '权').map(([s]) => s));
  const ke = new Set(Object.entries(r.hua).filter(([, v]: any) => v.tag === '科').map(([s]) => s));
  const he = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2][life];
  if ((mine.has('紫微') && ['庙', '旺'].includes(bri['紫微'])) || (mine.has('天府') && ['庙', '旺'].includes(bri['天府']))) out.push('紫府朝垣');
  if (mine.has('天府') && [4, 10].includes(life)) out.push('天府朝垣');
  if (mine.has('太阳') && life === 6) out.push('金灿光辉');
  if (life === 7 && mine.size === 0 && has(new Set(r.stars[3] || []), new Set(['太阳', '天梁'])) && new Set(r.stars[11] || []).has('太阴')) out.push('明珠出海');
  if (nb.has('天魁') && nb.has('天钺')) out.push('天乙拱命');
  if ([...all_mine].some(s => lu.has(s)) && [...all_mine].some(s => quan.has(s))) out.push('权禄巡逢');
  if ([...nb].filter(st => lu.has(st) || quan.has(st) || ke.has(st)).length >= 2) out.push('科权禄夹');
  if (nb.has('禄存') && [...nb].some(s => lu.has(s))) out.push('双禄夹命');
  for (const b of tri) if (has(new Set(r.stars[b] || []), new Set(['火星', '贪狼']))) { out.push('三合火贪'); break; }
  for (const b of tri) if (has(new Set(r.stars[b] || []), new Set(['铃星', '贪狼']))) { out.push('贪铃朝垣'); break; }
  if (has(nb, new Set(['紫微', '天府'])) || has(nb, new Set(['太阳', '太阴']))) out.push('贵星夹命');
  if (mine.has('廉贞') && [2, 8].includes(life) && [...all_tri].some(s => ['文昌', '文曲'].includes(s))) out.push('廉贞文武');
  if (all_mine.has('文昌') && all_tri.has('左辅')) out.push('辅拱文星');
  if (all_mine.has('禄存') && has(all_tri, new Set(['文昌', '文曲']))) out.push('禄文拱命');
  if (all_mine.has('禄存') && [...all_mine].some(s => lu.has(s))) out.push('禄合鸳鸯');
  if (all_tri.has('禄存') && [...all_tri].some(s => lu.has(s))) out.push('双禄朝垣');
  if ((all_tri.has('禄存') || [...all_tri].some(s => lu.has(s))) && all_tri.has('天马')) out.push('禄马交驰');
  if ((life === 1 && has(new Set(r.stars[7] || []), new Set(['太阳', '太阴']))) || (life === 7 && has(new Set(r.stars[1] || []), new Set(['太阳', '太阴'])))) out.push('二曜同临');
  if ((mine.has('太阳') && [4, 5].includes(life)) || (mine.has('太阴') && [9, 10].includes(life))) out.push('丹桂');
  if ([...all_mine].some(s => ke.has(s)) && [...all_tri].some(s => quan.has(s))) out.push('甲第登庸');
  if ([...all_mine].some(s => ke.has(s)) && [...all_tri].some(s => lu.has(s))) out.push('科名会禄');
  const mine_lu = all_mine.has('禄存') || [...all_mine].some(s => lu.has(s));
  const he_stars = new Set(r.stars[he] || []);
  const he_lu = he_stars.has('禄存') || [...he_stars].some(s => lu.has(s));
  if (mine_lu && he_lu) out.push('明禄暗禄');
  if (Object.values(r.hua).some((v: any) => v.tag === '权') && [...all_mine].some(s => quan.has(s))) out.push('权星朝垣');
  if ((all_mine.has('禄存') || [...all_mine].some(s => lu.has(s))) && all_mine.has('天马') && all_mine.has('天相')) out.push('禄马佩印');
  if (all_mine.has('天马') && nb.has('武曲') && [...nb].some(s => lu.has(s))) out.push('财禄夹马');
  if (mine.has('破军') && [4, 10].includes(life)) {
    const opp = mod(life + 6, 12);
    if (has(new Set(r.stars[opp] || []), new Set(['太阳', '太阴']))) out.push('日月照壁');
  }
  if ((r.stem === '丁' && mine.has('天同') && life === 10) || (r.stem === '辛' && mine.has('巨门') && life === 4)) out.push('化星返贵');
  if ([...all_mine].some(s => ke.has(s)) && he_lu) out.push('科明禄暗');

  const sha = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);
  const by_b: Record<number, Set<string>> = {};
  for (let b = 0; b < 12; b++) by_b[b] = new Set(r.stars[b] || []);
  const ji = new Set(Object.entries(r.hua).filter(([, v]: any) => v.tag === '忌').map(([s]) => s));
  let lim: any = null;
  if (age !== undefined) {
    lim = (r.limits || []).find((x: any) => x.start <= age && age <= x.end) || null;
    if (lim) ji.add(lim.hua[3]);
  }
  if (year !== undefined) ji.add(annual_chart(r, year).hua[3]);
  for (let b = 0; b < 12; b++) {
    if (![...by_b[b]].some(s => sha.has(s))) continue;
    const l = by_b[mod(b - 1, 12)] || new Set(), rr = by_b[mod(b + 1, 12)] || new Set();
    if ((l.has('擎羊') && rr.has('陀罗')) || (l.has('陀罗') && rr.has('擎羊'))) out.push('羊陀夹煞');
    if ((l.has('火星') && rr.has('铃星')) || (l.has('铃星') && rr.has('火星'))) out.push('火铃夹煞');
    if ((l.has('地空') && rr.has('地劫')) || (l.has('地劫') && rr.has('地空'))) out.push('空劫夹煞');
    if ([...new Set([...l, ...rr])].filter(s => ji.has(s)).length >= 2) out.push('双忌夹煞');
  }
  const caib = mod(life - 4, 12), guan = mod(life - 8, 12), qian = mod(life - 6, 12);
  if ([life, caib, guan, qian].every(x => [...(by_b[x] || [])].some(s => sha.has(s)))) out.push('三方皆煞');
  if (mine.has('七杀') && [...all_tri].some(s => ['擎羊', '陀罗'].includes(s))) out.push('七杀羊陀迭并');
  if (has(all_tri, new Set(['廉贞', '天相'])) && [...all_tri].some(s => ['擎羊', '陀罗'].includes(s))) out.push('刑囚夹印');
  if (has(all_tri, new Set(['廉贞', '七杀'])) && [...all_tri].some(s => ['擎羊', '陀罗'].includes(s))) out.push('路上埋尸');
  if (has(all_tri, new Set(['巨门', '火星', '擎羊']))) out.push('巨火羊');
  if (has(all_tri, new Set(['巨门', '铃星', '擎羊']))) out.push('巨铃羊');
  if (has(all_tri, new Set(['铃星', '文昌', '陀罗', '武曲']))) out.push('铃昌陀武');
  if (has(all_tri, new Set(['天机', '天梁', '擎羊']))) out.push('天机天梁擎羊会');
  let dedup = [...new Set(out)];
  const sha_mine = [...all_mine].filter(s => ['擎羊', '陀罗', '火星', '铃星'].includes(s));
  if (sha_mine.length && sha_mine.some(st => bri[st] === '庙') && [...all_tri].some(s => lu.has(s) || quan.has(s))) dedup.push('权杀化禄');
  return [...new Set(dedup)];
}

// ── 五维解读（compose 核心） ──
export interface Library {
  templates: Map<string, { text: string }>;
  pairs: Map<string, string>;
  patterns: Record<string, { note: string }>;
  downNotes: Record<string, string>;
  wealthNotes: Record<string, string>;
  healthNotes: Record<string, string>;
  careerNotes: Record<string, string>;
  careerAux: { groups: any[]; hua: Record<string, string> };
  pan144: Record<string, Record<string, { names: string[] }>>;
}

export function compose(r: any, lib: Library, age?: number, year = 2026, date_str?: string): string {
  const by_palace: Record<string, number> = {};
  PALACES.forEach((name, k) => { by_palace[name] = mod(r.life - k, 12); });
  const palace_of: Record<number, string> = {};
  for (const [name, br] of Object.entries(by_palace)) palace_of[br] = name;
  const star_branch: Record<string, number> = {};
  for (let i = 0; i < 12; i++) for (const s of (r.stars[i] || [])) star_branch[s] ??= i;

  const majors_at = (branch: number) => (r.stars[branch] || []).filter((s: string) => MAJOR.has(s));
  const palace_stars = (name: string): [number, string[], string | null] => {
    const br = by_palace[name];
    const majors = majors_at(br);
    if (majors.length) return [br, majors, null];
    const opp = mod(br + 6, 12);
    return [br, majors_at(opp), BRANCHES[opp]];
  };

  const dt = date_str ? new Date(date_str + 'T12:00:00') : new Date();
  const lunar = r.lunar;
  const cur_age = age ?? (year - lunar[0] + 1);
  const lim = (r.limits || []).find((x: any) => x.start <= cur_age && cur_age <= x.end) || null;

  const out: string[] = [];
  const seen_star_texts: Record<string, string> = {};
  const emit_star = (palace: string, star: string, title: string, tag: string) => {
    const t = lib.templates.get(star + '|大限');
    if (!t) return;
    const key = palace + '|' + star;
    if (seen_star_texts[key] === t.text) return;
    seen_star_texts[key] = t.text;
    out.push(`**${title}（${star}·${tag}）**：${t.text.trimEnd()}\n`);
  };

  out.push(`# 命盘解读（${r.gender}，${r.solar[0]}-${String(r.solar[1]).padStart(2, '0')}-${String(r.solar[2]).padStart(2, '0')} ${String(r.solar_time[0]).padStart(2, '0')}:${String(r.solar_time[1]).padStart(2, '0')}）\n`);
  out.push(`真太阳时 ${String(r.tst[0]).padStart(2, '0')}:${String(r.tst[1]).padStart(2, '0')}，${BRANCHES[r.hour_branch_i]}时｜农历 ${lunar[0]}年${lunar[3] ? '闰' : ''}${lunar[1]}月${lunar[2]}日｜规则包 ${r.ruleSetId}\n`);
  out.push(`命宫 **${STEMS[r.life_stem]}${BRANCHES[r.life]}**｜身宫 **${BRANCHES[r.body]}**｜五行局 **${JU_NAME[r.ju]}**｜紫微在 ${BRANCHES[r.ziwei]}\n`);
  const hits = detect_patterns(r, cur_age, year);
  if (hits.length) {
    const bits = hits.filter(h => lib.patterns[h]).map(h => `**${h}**——${lib.patterns[h].note.replace(/。$/, '')}`).join('；');
    out.push(`**这张盘的格局**：${bits}。\n`);
  } else {
    out.push('**这张盘的格局**：暂时没落进我们收录的常见格局里，一样有它自己的样子。\n');
  }
  const pan = (lib.pan144[BRANCHES[r.ziwei]] || {})[BRANCHES[r.life]];
  if (pan) out.push(`**盘面小结**：紫微在${BRANCHES[r.ziwei]}、命宫在${BRANCHES[r.life]}，属于 **${pan.names.join('、')}**。\n`);

  out.push('## 一、十二宫\n| 宫位 | 地支 | 主星 |\n|---|---|---|');
  for (let k = 0; k < PALACES.length; k++) {
    const name = PALACES[k];
    const [br, majors, borrowed] = palace_stars(name);
    const mark = k === 0 ? '（命）' : br === r.body ? '（身）' : '';
    let star = majors.length ? majors.join('/') : '空宫';
    if (borrowed) star += `（借${borrowed}）`;
    out.push(`| ${name}${mark} | ${BRANCHES[br]} | ${star} |`);
  }
  out.push('');

  out.push('## 二、四化\n' + Object.entries(r.hua).map(([s, v]: any) => `${s}化${v.tag}在${BRANCHES[v.palace]}`).join('；') + '\n');

  out.push('## 三、这十年');
  if (lim) {
    const hua = lim.hua.map((s: string, i: number) => s + ['禄', '权', '科', '忌'][i]).join('、');
    out.push(`${r.ju_start} 岁起运，${r.forward ? '顺' : '逆'}着走；虚岁 ${cur_age}，正走到 **${lim.start}–${lim.end} ${lim.stem}${lim.branch}** 这一程。这十年的四化：${hua}。`);
    const place = palace_of[BRANCHES.indexOf(lim.branch)] || '';
    const bits: string[] = [];
    for (let i = 0; i < 4; i++) {
      const tag = ['禄', '权', '科', '忌'][i];
      const star = lim.hua[i];
      const br = star_branch[star];
      if (br !== undefined) bits.push(`${tag}落在${palace_of[br] || ''}（${star}），${TAG_ROLE[tag]}`);
    }
    const [, yb] = yearGanzhi(lunar[0]);
    const xb = xiaoxianBranch(yb, r.gender, cur_age);
    const xp = PALACES[mod(r.life - xb, 12)];
    out.push(`**小限**：虚岁 ${cur_age} 走到 ${BRANCHES[xb]} 宫（本命${xp}）。\n`);
    out.push('**这十年怎么看**：可以把它当成一张新盘——以这一格为起点重新排十二宫，用这一格的宫干起四化，再照本命盘的方式看三方四正；命宫、身宫帮它圈出范围。\n');
    if (place) {
      const [, _majors, _borrowed] = palace_stars(place);
      for (const star of _majors) emit_star(place, star, '这十年主星', _borrowed ? `借${_borrowed}宫` : '大限');
    }
  } else {
    out.push(`${r.ju_start} 岁起运，${r.forward ? '顺' : '逆'}着走；虚岁 ${cur_age} 还没走进这版排出的大限区间。\n`);
  }

  const ann = annual_chart(r, year);
  out.push(`## 四、今年（${year} ${ann.stem}${ann.branch}）`);
  const yp = palace_of[ann.life] || '';
  out.push(`今年的重心落在${yp}这一格。`);
  const ybits: string[] = [];
  for (let i = 0; i < 4; i++) {
    const tag = ['禄', '权', '科', '忌'][i];
    const star = ann.hua[i];
    const br = star_branch[star];
    if (br !== undefined) ybits.push(`${tag}落在${palace_of[br] || ''}（${star}），${TAG_ROLE[tag]}`);
  }
  out.push(`今年的四个变化：${ybits.join('；')}。\n`);
  const td = mod(9 + ann.branch_i, 12), yd = mod(ann.branch_i, 12);
  out.push(`今年天德落在${BRANCHES[td]}宫、月德落在${BRANCHES[yd]}宫，是传统里两颗温和的贵人星（《全书》卷三：酉/子起子，顺数至流年太岁）。\n`);
  if (yp) {
    const [, _majors, _borrowed] = palace_stars(yp);
    for (const star of _majors) emit_star(yp, star, '今年主星', _borrowed ? `借${_borrowed}宫` : '流年');
  }

  const lm = Math.abs(Solar.fromYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()).getLunar().getMonth());
  const months = flow_months(r, year, lunar[1], r.hour_branch_i);
  const mon = months[lm - 1];
  const mp = palace_of[mon.palace] || '';
  out.push(`## 五、这个月（${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}，农历 ${lm} 月）`);
  out.push(`这个月的重心在${mp}这一格；月干支 ${mon.stem}${mon.branch}。`);
  out.push(`这个月的四个变化：${_hua_bits(mon.hua, star_branch, palace_of)}。\n`);
  if (mp) {
    const [, _majors, _borrowed] = palace_stars(mp);
    for (const star of _majors) emit_star(mp, star, '这个月的主星', _borrowed ? `借自${_borrowed}宫` : `${mp}宫`);
  }

  const fd = flow_day(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), mon.palace);
  const dp = palace_of[fd.palace] || '';
  out.push(`## 六、今天（${dt.toISOString().slice(0, 10)}）`);
  out.push(`今天的重心在${dp}这一格；日干支 ${fd.stem}${fd.branch}。`);
  out.push(`今天的四个变化：${_hua_bits(fd.hua, star_branch, palace_of)}。\n`);
  if (dp) {
    const [, _majors, _borrowed] = palace_stars(dp);
    for (const star of _majors) emit_star(dp, star, '今天主星', _borrowed ? `借自${_borrowed}宫` : `${dp}宫`);
  }

  const sections: [string, string, string][] = [['七、你是怎样的人', '命宫', '性格'], ['八、后天做事的方式', '身宫', '性格'], ['九、工作与事业', '官禄', '事业'], ['十、钱与财运', '财帛', '财运'], ['十一、身体健康', '疾厄', '健康'], ['十二、感情与婚姻', '夫妻', '感情']];
  const section_seen = new Set<string>();
  const emit_para = (key: string, line: string): boolean => {
    if (section_seen.has(key)) return false;
    section_seen.add(key);
    out.push(line);
    return true;
  };

  for (const [title, palace, dim] of sections) {
    out.push(`## ${title}`);
    const body_start = out.length;
    let br: number, majors: string[], borrowed: string | null, label: string, src: number;
    if (palace === '身宫') {
      br = r.body;
      majors = majors_at(br);
      borrowed = null;
      if (!majors.length) {
        const opp = mod(br + 6, 12);
        majors = majors_at(opp);
        borrowed = BRANCHES[opp];
      }
      label = borrowed ? `借自${borrowed}宫` : '身宫';
    } else {
      [br, majors, borrowed] = palace_stars(palace);
      label = borrowed ? `借自${borrowed}宫` : palace;
    }
    if (!majors.length) { out.push('这一格和对面都暂时没有主星，先留个白，看看相邻几格吧。\n'); continue; }
    src = br;
    if (borrowed) src = BRANCHES.indexOf(borrowed);
    const lvl_written = new Set<string>();
    for (const star of majors) {
      const t = lib.templates.get(star + '|' + dim);
      if (t) {
        const lvl = ((r.brightness || {})[src] || {})[star];
        const lvltxt = lvl ? `·${lvl}` : '';
        let note = '';
        if (lvl && !lvl_written.has(lvl)) { lvl_written.add(lvl); note = ` ${LEVEL_NOTE[lvl]}`; }
        emit_para(star + '|' + dim + '|' + t.text, `**${star}（${label}${lvltxt}）**：${t.text.trimEnd()}${note}\n`);
      }
    }
    if (majors.length === 2) {
      const pair = lib.pairs.get([...majors].sort().join('|'));
      if (pair) emit_para(pair, `**一起看这两颗星**：${pair}\n`);
    }
    if (dim === '性格' && majors.length && lib.downNotes[majors[0]]) emit_para(lib.downNotes[majors[0]], `**再补一句关于${majors[0]}**：${lib.downNotes[majors[0]]}\n`);
    if (dim === '财运' && majors.length && lib.wealthNotes[majors[0]]) emit_para(lib.wealthNotes[majors[0]], `**钱上再补一句**：${lib.wealthNotes[majors[0]]}\n`);
    if (dim === '健康' && majors.length && lib.healthNotes[majors[0]]) emit_para(lib.healthNotes[majors[0]], `**身体上多留意**：${lib.healthNotes[majors[0]]}\n`);
    if (dim === '事业') {
      if (majors.length && lib.careerNotes[majors[0]]) emit_para(lib.careerNotes[majors[0]], `**工作上再补一句**：${lib.careerNotes[majors[0]]}\n`);
      const here = new Set(r.stars[br] || []);
      const hit = (lib.careerAux.groups || []).filter((g: any) => g.stars.some((s: string) => here.has(s)));
      if (hit.length) emit_para('groups', '**工作上还有这些帮手**：' + hit.map((g: any) => `${g.name}——${g.note}`).join('；') + '\n');
      const hua_here = ['禄', '权', '科', '忌'].filter(tag => Object.entries(r.hua).some(([st, v]: any) => here.has(st) && v.tag === tag));
      if (hua_here.length) emit_para('hua', '**工作上的四化**：' + hua_here.map((t: string) => `化${t}——${lib.careerAux.hua[t]}`).join('；') + '\n');
    }
    if (out.length === body_start) out.push('这一组星刚才已经聊过啦，身宫和命宫看的是同一处，就不重复说一遍了。\n');
  }

  out.push('> 以上是按固定规则拼出来的参考：14 主星 × 5 个维度按宫位主星匹配，空宫借对宫，双星一起看；大限、流年按本命宫位落点解释。仅供参考，你的经历和选择更算数。');
  return out.join('\n');
}

function xiaoxianBranch(yearBranchI: number, gender: string, age: number): number {
  const groups: [number[], number][] = [[[2, 6, 10], 4], [[8, 0, 4], 10], [[5, 9, 1], 7], [[11, 3, 7], 1]];
  let start = 4;
  for (const [k, v] of groups) if (k.includes(yearBranchI)) { start = v; break; }
  const step = gender === '男' ? 1 : -1;
  return mod(start + (age - 1) * step, 12);
}

function _hua_bits(hua: string[], star_branch: Record<string, number>, palace_of: Record<number, string>): string {
  const bits: string[] = [];
  for (let i = 0; i < 4; i++) {
    const tag = ['禄', '权', '科', '忌'][i];
    const star = hua[i];
    const br = star_branch[star];
    if (br !== undefined) bits.push(`${tag}落在${palace_of[br] || ''}（${star}），${TAG_ROLE[tag]}`);
  }
  return bits.join('；');
}
