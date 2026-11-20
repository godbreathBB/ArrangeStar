// composer.ts — 紫微解读装配（对应 yunxian.py + reading_composer.py）
import { Solar } from 'lunar-typescript';
import { BRANCHES, PALACES, STEMS, yearGanzhi, sihuaOf, _YIN_STEM } from './ziwei.ts';
import { assertDateOnly, assertDateStr, finiteInt } from './validate.ts';

const mod = (n: number, m: number): number => ((n % m) + m) % m;
export const MAJOR = new Set(['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']);
const JU_NAME: Record<number, string> = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
const JU_NAME_EN: Record<number, string> = { 2: 'Water Two', 3: 'Wood Three', 4: 'Metal Four', 5: 'Earth Five', 6: 'Fire Six' };
const TAG_ROLE: Record<string, string> = { '禄': '常有点顺手的机会靠过来', '权': '多半要你拿个主意、担一点事', '科': '细节容易被看见，也容易得到一句好话', '忌': '容易来回磨，放轻松一点就好' };
const TAG_ROLE_EN: Record<string, string> = {
  '禄': 'convenient opportunities tend to come your way', '权': 'you are the one expected to decide and take charge',
  '科': 'details get noticed, and kind words come easily', '忌': 'things may go back and forth, so take it easy',
};
const LEVEL_NOTE: Record<string, string> = { '庙': '在这里它的状态挺足，长处容易发挥。', '旺': '状态不错，长处用得上。', '平': '不特别强也不特别弱，和整张盘一起看更清楚。', '陷': '状态偏弱，长处要多花点力气才显出来，慢慢来就好。' };
const LEVEL_NOTE_EN: Record<string, string> = {
  '庙': 'It is strong here, so its strengths come through easily.', '旺': 'In good shape, its strengths are usable.',
  '平': 'Neither strong nor weak; read it together with the whole chart.', '陷': 'A little subdued, its strengths take more effort to show; take your time.',
};
const DIMS: [string, string, string][] = [['性格', '命宫', '性格'], ['事业', '官禄', '事业'], ['财运', '财帛', '财运'], ['健康', '疾厄', '健康'], ['感情', '夫妻', '感情']];
const MONTH_GAN_BASE = 2;

export type ComposeLang = 'zh' | 'en';
/** 按语言取结构文案；正文取自对应语言的文案库。 */
const L = (lang: ComposeLang, zh: string, en: string): string => lang === 'en' ? en : zh;

/** 规则包 ID 转成可读英文名 + 版本号，如 zywx.classic.cn@2026.1 → ArrangeStars V1.0 */
export function rulesetLabel(id: string): string {
  if (id === 'zywx.classic.cn@2026.1') return 'ArrangeStars V1.0';
  const m = String(id || '').match(/^(.+?)@(.+)$/);
  if (!m) return id;
  const name = m[1].replace(/\.cn$/, '').split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  return `${name} v${m[2]}`;
}

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
  assertDateOnly(solar_y, solar_m, solar_d);
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
  // 统一把星曜数组收敛为 string[]，避免 any 推断成 Set<unknown>
  const starsAt = (b: number): string[] => (r.stars?.[b] || []) as string[];
  const tri = [life, mod(life + 4, 12), mod(life + 8, 12), mod(life + 6, 12)];
  const at = (b: number): Set<string> => new Set(starsAt(b).filter(s => MAJOR.has(s)));
  const mine = new Set<string>([...at(life), ...at(mod(life + 6, 12))]);
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
  const all_mine = new Set<string>(starsAt(life));
  const all_tri = new Set<string>();
  for (const b of tri) starsAt(b).forEach(s => all_tri.add(s));
  if ([2, 8].includes(life) && has(mine, new Set(['太阳', '巨门']))) out.push('巨日同宫');
  if (has(tri_stars, new Set(['天机', '天梁']))) out.push('机梁加会');
  if (has(all_tri, new Set(['文昌', '天梁']))) out.push('文梁振纪');
  if (has(all_tri, new Set(['太阳', '天梁', '文昌', '禄存']))) out.push('阳梁昌禄');
  const hua3 = new Set<string>(Object.entries(r.hua).filter(([, v]: any) => ['禄', '权', '科'].includes(v.tag)).map(([s]) => s));
  if (hua3.size === 3 && [...hua3].every(s => all_tri.has(s))) out.push('三奇加会');
  if (has(all_mine, new Set(['左辅', '右弼']))) out.push('左右同宫');
  if (has(all_mine, new Set(['文昌', '文曲']))) out.push('文桂文华');
  const bri: Record<string, string> = (r.brightness || {})[life] || {};
  if (mine.has('武曲') && ['庙', '旺'].includes(bri['武曲'])) out.push('将星得地');
  if (life === 0 && mine.has('太阴')) out.push('月生沧海');
  if (life === 6 && mine.has('天梁')) out.push('寿星入庙');
  if ([0, 6].includes(life) && mine.has('破军')) out.push('英星入庙');
  if (life === 6 && all_mine.has('擎羊')) out.push('马头带箭');

  const left = mod(life - 1, 12), right = mod(life + 1, 12);
  const nb = new Set<string>([...starsAt(left), ...starsAt(right)]);
  const star_at: Record<string, number> = {};
  for (let b = 0; b < 12; b++) for (const st of starsAt(b)) star_at[st] ??= b;
  const lu = new Set<string>(Object.entries(r.hua).filter(([, v]: any) => v.tag === '禄').map(([s]) => s));
  const quan = new Set<string>(Object.entries(r.hua).filter(([, v]: any) => v.tag === '权').map(([s]) => s));
  const ke = new Set<string>(Object.entries(r.hua).filter(([, v]: any) => v.tag === '科').map(([s]) => s));
  const he = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2][life];
  if ((mine.has('紫微') && ['庙', '旺'].includes(bri['紫微'])) || (mine.has('天府') && ['庙', '旺'].includes(bri['天府']))) out.push('紫府朝垣');
  if (mine.has('天府') && [4, 10].includes(life)) out.push('天府朝垣');
  if (mine.has('太阳') && life === 6) out.push('金灿光辉');
  if (life === 7 && mine.size === 0 && has(new Set<string>(starsAt(3)), new Set(['太阳', '天梁'])) && starsAt(11).includes('太阴')) out.push('明珠出海');
  if (nb.has('天魁') && nb.has('天钺')) out.push('天乙拱命');
  if ([...all_mine].some(s => lu.has(s)) && [...all_mine].some(s => quan.has(s))) out.push('权禄巡逢');
  if ([...nb].filter(st => lu.has(st) || quan.has(st) || ke.has(st)).length >= 2) out.push('科权禄夹');
  if (nb.has('禄存') && [...nb].some(s => lu.has(s))) out.push('双禄夹命');
  for (const b of tri) if (has(new Set<string>(starsAt(b)), new Set(['火星', '贪狼']))) { out.push('三合火贪'); break; }
  for (const b of tri) if (has(new Set<string>(starsAt(b)), new Set(['铃星', '贪狼']))) { out.push('贪铃朝垣'); break; }
  if (has(nb, new Set(['紫微', '天府'])) || has(nb, new Set(['太阳', '太阴']))) out.push('贵星夹命');
  if (mine.has('廉贞') && [2, 8].includes(life) && [...all_tri].some(s => ['文昌', '文曲'].includes(s))) out.push('廉贞文武');
  if (all_mine.has('文昌') && all_tri.has('左辅')) out.push('辅拱文星');
  if (all_mine.has('禄存') && has(all_tri, new Set(['文昌', '文曲']))) out.push('禄文拱命');
  if (all_mine.has('禄存') && [...all_mine].some(s => lu.has(s))) out.push('禄合鸳鸯');
  if (all_tri.has('禄存') && [...all_tri].some(s => lu.has(s))) out.push('双禄朝垣');
  if ((all_tri.has('禄存') || [...all_tri].some(s => lu.has(s))) && all_tri.has('天马')) out.push('禄马交驰');
  if ((life === 1 && has(new Set<string>(starsAt(7)), new Set(['太阳', '太阴']))) || (life === 7 && has(new Set<string>(starsAt(1)), new Set(['太阳', '太阴'])))) out.push('二曜同临');
  if ((mine.has('太阳') && [4, 5].includes(life)) || (mine.has('太阴') && [9, 10].includes(life))) out.push('丹桂');
  if ([...all_mine].some(s => ke.has(s)) && [...all_tri].some(s => quan.has(s))) out.push('甲第登庸');
  if ([...all_mine].some(s => ke.has(s)) && [...all_tri].some(s => lu.has(s))) out.push('科名会禄');
  const mine_lu = all_mine.has('禄存') || [...all_mine].some(s => lu.has(s));
  const he_stars = new Set<string>(starsAt(he));
  const he_lu = he_stars.has('禄存') || [...he_stars].some(s => lu.has(s));
  if (mine_lu && he_lu) out.push('明禄暗禄');
  if (Object.values(r.hua).some((v: any) => v.tag === '权') && [...all_mine].some(s => quan.has(s))) out.push('权星朝垣');
  if ((all_mine.has('禄存') || [...all_mine].some(s => lu.has(s))) && all_mine.has('天马') && all_mine.has('天相')) out.push('禄马佩印');
  if (all_mine.has('天马') && nb.has('武曲') && [...nb].some(s => lu.has(s))) out.push('财禄夹马');
  if (mine.has('破军') && [4, 10].includes(life)) {
    const opp = mod(life + 6, 12);
    if (has(new Set<string>(starsAt(opp)), new Set(['太阳', '太阴']))) out.push('日月照壁');
  }
  if ((r.stem === '丁' && mine.has('天同') && life === 10) || (r.stem === '辛' && mine.has('巨门') && life === 4)) out.push('化星返贵');
  if ([...all_mine].some(s => ke.has(s)) && he_lu) out.push('科明禄暗');

  const sha = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);
  const by_b: Record<number, Set<string>> = {};
  for (let b = 0; b < 12; b++) by_b[b] = new Set<string>(starsAt(b));
  const ji = new Set<string>(Object.entries(r.hua).filter(([, v]: any) => v.tag === '忌').map(([s]) => s));
  let lim: any = null;
  if (age !== undefined) {
    lim = (r.limits || []).find((x: any) => x.start <= age && age <= x.end) || null;
    if (lim) ji.add(lim.hua[3]);
  }
  if (year !== undefined) ji.add(annual_chart(r, year).hua[3]);
  for (let b = 0; b < 12; b++) {
    if (![...by_b[b]].some(s => sha.has(s))) continue;
    const l = by_b[mod(b - 1, 12)] || new Set<string>(), rr = by_b[mod(b + 1, 12)] || new Set<string>();
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
  let dedup: string[] = [...new Set(out)];
  const sha_mine = [...all_mine].filter(s => ['擎羊', '陀罗', '火星', '铃星'].includes(s));
  if (sha_mine.length && sha_mine.some(st => bri[st] === '庙') && [...all_tri].some(s => lu.has(s) || quan.has(s))) dedup.push('权杀化禄');
  return [...new Set(dedup)];
}

// ── 五维解读（compose 核心） ──
export interface Library {
  templates: Map<string, { text: string }>;
  pairs: Map<string, string>;
  patterns: Record<string, { note: string; nameEn?: string }>;
  downNotes: Record<string, string>;
  wealthNotes: Record<string, string>;
  healthNotes: Record<string, string>;
  careerNotes: Record<string, string>;
  careerAux: { groups: any[]; hua: Record<string, string> };
  pan144: Record<string, Record<string, { names: string[]; namesEn?: string[] }>>;
}

export function compose(r: any, lib: Library, age?: number, year = 2026, date_str?: string, lang: ComposeLang = 'zh'): string {
  finiteInt(year, '参考年');
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

  const dt = date_str ? new Date(assertDateStr(date_str) + 'T12:00:00') : new Date();
  if (!Number.isFinite(dt.getTime())) throw new Error('输入无效：参考日期无法解析');
  const lunar = r.lunar;
  const cur_age = age ?? (year - lunar[0] + 1);
  const lim = (r.limits || []).find((x: any) => x.start <= cur_age && cur_age <= x.end) || null;

  const out: string[] = [];
  const seen_star_texts: Record<string, string> = {};
  const role = (tag: string) => L(lang, TAG_ROLE[tag], TAG_ROLE_EN[tag] || TAG_ROLE[tag]);
  const lvlNote = (lvl: string) => L(lang, LEVEL_NOTE[lvl], LEVEL_NOTE_EN[lvl] || LEVEL_NOTE[lvl]);
  const huaName = (tag: string) => lang === 'en'
    ? ({ '禄': 'Prosperity', '权': 'Authority', '科': 'Fame', '忌': 'Affliction' } as any)[tag] || tag
    : `化${tag}`;
  const palaceLabel = (name: string) => lang === 'en' ? (PALACE_EN[name] || name) : name;
  const starName = (s: string) => lang === 'en' ? (STAR_EN[s] || s) : s;
  const branchName = (s: string) => lang === 'en' ? (BRANCH_EN[s] || s) : s;
  const emit_star = (palace: string, star: string, title: string, tag: string) => {
    const t = lib.templates.get(star + '|大限');
    if (!t) return;
    const key = palace + '|' + star;
    if (seen_star_texts[key] === t.text) return;
    seen_star_texts[key] = t.text;
    out.push(`**${title}（${starName(star)}·${tag}）**：${t.text.trimEnd()}\n`);
  };

  const solarStamp = `${r.solar[0]}-${String(r.solar[1]).padStart(2, '0')}-${String(r.solar[2]).padStart(2, '0')} ${String(r.solar_time[0]).padStart(2, '0')}:${String(r.solar_time[1]).padStart(2, '0')}`;
  out.push(`# ${L(lang, '命盘解读', 'Chart reading')} (${lang === 'en' ? (r.gender === '男' ? 'Male' : 'Female') : r.gender}, ${solarStamp})\n`);
  out.push(L(lang,
    `真太阳时 ${String(r.tst[0]).padStart(2, '0')}:${String(r.tst[1]).padStart(2, '0')}，${BRANCHES[r.hour_branch_i]}时｜农历 ${lunar[0]}年${lunar[3] ? '闰' : ''}${lunar[1]}月${lunar[2]}日｜规则包 ${rulesetLabel(r.ruleSetId)}\n`,
    `True solar time ${String(r.tst[0]).padStart(2, '0')}:${String(r.tst[1]).padStart(2, '0')} (${branchName(BRANCHES[r.hour_branch_i])} hour) | Lunar ${lunar[0]}/${lunar[1]}/${lunar[2]}${lunar[3] ? ' (leap)' : ''} | ${rulesetLabel(r.ruleSetId)}\n`));
  out.push(L(lang,
    `命宫 **${STEMS[r.life_stem]}${BRANCHES[r.life]}**｜身宫 **${BRANCHES[r.body]}**｜五行局 **${JU_NAME[r.ju]}**｜紫微在 ${BRANCHES[r.ziwei]}\n`,
    `Life Palace **${gzEn(STEMS[r.life_stem] + BRANCHES[r.life])}** | Body Palace **${branchName(BRANCHES[r.body])}** | Five Elements chart **${JU_NAME_EN[r.ju] || ''}** | Ziwei in ${branchName(BRANCHES[r.ziwei])}\n`));
  const hits = detect_patterns(r, cur_age, year);
  if (hits.length) {
    const bits = hits.filter(h => lib.patterns[h]).map(h => {
      const p = lib.patterns[h];
      const nm = lang === 'en' ? (p.nameEn || h) : h;
      return `**${nm}**——${p.note.replace(/[。.]$/, '')}`;
    }).join(lang === 'en' ? '; ' : '；');
    out.push(`**${L(lang, '这张盘的格局', 'Patterns in this chart')}**：${bits}${L(lang, '。', '.')}\n`);
  } else {
    out.push(`**${L(lang, '这张盘的格局', 'Patterns in this chart')}**：${L(lang, '暂时没落进我们收录的常见格局里，一样有它自己的样子。', 'No common pattern from our library applies here; the chart still has its own shape.')}\n`);
  }
  const pan = (lib.pan144[BRANCHES[r.ziwei]] || {})[BRANCHES[r.life]];
  if (pan) out.push(`**${L(lang, '盘面小结', 'Chart at a glance')}**：${L(lang,
    `紫微在${BRANCHES[r.ziwei]}、命宫在${BRANCHES[r.life]}，属于 **${pan.names.join('、')}**。`,
    `Ziwei in ${branchName(BRANCHES[r.ziwei])}, Life Palace in ${branchName(BRANCHES[r.life])}, classified as **${(pan.namesEn || pan.names).join('; ')}**.`)}\n`);

  out.push(`## ${L(lang, '一、十二宫', 'I. The Twelve Palaces')}\n| ${L(lang, '宫位', 'Palace')} | ${L(lang, '地支', 'Branch')} | ${L(lang, '主星', 'Major stars')} |\n|---|---|---|`);
  for (let k = 0; k < PALACES.length; k++) {
    const name = PALACES[k];
    const [br, majors, borrowed] = palace_stars(name);
    const mark = k === 0 ? L(lang, '（命）', ' (Life)') : br === r.body ? L(lang, '（身）', ' (Body)') : '';
    let star = majors.length ? majors.map(starName).join('/') : L(lang, '空宫', 'Empty');
    if (borrowed) star += L(lang, `（借${borrowed}）`, ` (borrowed from ${branchName(borrowed)})`);
    out.push(`| ${palaceLabel(name)}${mark} | ${branchName(BRANCHES[br])} | ${star} |`);
  }
  out.push('');

  out.push(`## ${L(lang, '二、四化', 'II. Four Transformations')}\n` +
    Object.entries(r.hua).map(([s, v]: any) => lang === 'en'
      ? `${starName(s)} ${huaName(v.tag)} in ${branchName(BRANCHES[v.palace])}`
      : `${s}化${v.tag}在${BRANCHES[v.palace]}`).join(lang === 'en' ? '; ' : '；') + '\n');

  out.push(`## ${L(lang, '三、这十年', 'III. The Coming Decade')}`);
  if (lim) {
    const hua = lim.hua.map((s: string, i: number) => lang === 'en'
      ? `${starName(s)} ${huaName(['禄', '权', '科', '忌'][i])}`
      : s + ['禄', '权', '科', '忌'][i]).join(lang === 'en' ? '; ' : '、');
    out.push(L(lang,
      `${r.ju_start} 岁起运，${r.forward ? '顺' : '逆'}着走；虚岁 ${cur_age}，正走到 **${lim.start}–${lim.end} ${lim.stem}${lim.branch}** 这一程。这十年的四化：${hua}。`,
      `Fortune begins at ${r.ju_start}, running ${r.forward ? 'forward' : 'backward'}. At nominal age ${cur_age} you are in the **${lim.start}–${lim.end} ${gzEn(lim.stem + lim.branch)}** stretch. Its transformations: ${hua}.`));
    const place = palace_of[BRANCHES.indexOf(lim.branch)] || '';
    const bits: string[] = [];
    for (let i = 0; i < 4; i++) {
      const tag = ['禄', '权', '科', '忌'][i];
      const star = lim.hua[i];
      const br = star_branch[star];
      if (br !== undefined) bits.push(lang === 'en'
        ? `${huaName(tag)} in ${palaceLabel(palace_of[br] || '')} (${starName(star)}): ${role(tag)}`
        : `${tag}落在${palace_of[br] || ''}（${star}），${TAG_ROLE[tag]}`);
    }
    const [, yb] = yearGanzhi(lunar[0]);
    const xb = xiaoxianBranch(yb, r.gender, cur_age);
    const xp = PALACES[mod(r.life - xb, 12)];
    out.push(`**${L(lang, '小限', 'Minor limit')}**：${L(lang,
      `虚岁 ${cur_age} 走到 ${BRANCHES[xb]} 宫（本命${xp}）。`,
      `Nominal age ${cur_age} moves to the ${branchName(BRANCHES[xb])} palace (natal ${palaceLabel(xp)}).`)}\n`);
    out.push(`**${L(lang, '这十年怎么看', 'How to read this decade')}**：${L(lang,
      '可以把它当成一张新盘——以这一格为起点重新排十二宫，用这一格的宫干起四化，再照本命盘的方式看三方四正；命宫、身宫帮它圈出范围。',
      'Treat it as a fresh chart: start from this palace, lay out the twelve palaces again, raise the transformations from its stem, then read the trine and opposite as you would the natal chart. The Life and Body palaces set its frame.')}\n`);
    if (place) {
      const [, _majors, _borrowed] = palace_stars(place);
      for (const star of _majors) emit_star(place, star, L(lang, '这十年主星', 'Major star of the decade'), _borrowed ? L(lang, `借${_borrowed}宫`, `borrowed from ${_borrowed}`) : L(lang, '大限', 'Major limit'));
    }
  } else {
    out.push(L(lang,
      `${r.ju_start} 岁起运，${r.forward ? '顺' : '逆'}着走；虚岁 ${cur_age} 还没走进这版排出的大限区间。\n`,
      `Fortune begins at ${r.ju_start}, running ${r.forward ? 'forward' : 'backward'}. At nominal age ${cur_age} you have not yet entered a major-limit span in this version.\n`));
  }

  const ann = annual_chart(r, year);
  out.push(`## ${L(lang, '四、今年', 'IV. This Year')} (${year} ${lang === 'en' ? gzEn(ann.stem + ann.branch) : ann.stem + ann.branch})`);
  const yp = palace_of[ann.life] || '';
  out.push(L(lang, `今年的重心落在${yp}这一格。`, `This year's focus falls on ${palaceLabel(yp)}.`));
  const ybits: string[] = [];
  for (let i = 0; i < 4; i++) {
    const tag = ['禄', '权', '科', '忌'][i];
    const star = ann.hua[i];
    const br = star_branch[star];
    if (br !== undefined) ybits.push(lang === 'en'
      ? `${huaName(tag)} in ${palaceLabel(palace_of[br] || '')} (${starName(star)}): ${role(tag)}`
      : `${tag}落在${palace_of[br] || ''}（${star}），${TAG_ROLE[tag]}`);
  }
  out.push(`${L(lang, '今年的四个变化', 'Four changes this year')}：${ybits.join(lang === 'en' ? '; ' : '；')}${L(lang, '。', '.')}\n`);
  const td = mod(9 + ann.branch_i, 12), yd = mod(ann.branch_i, 12);
  out.push(L(lang,
    `今年天德落在${BRANCHES[td]}宫、月德落在${BRANCHES[yd]}宫，是传统里两颗温和的贵人星（《全书》卷三：酉/子起子，顺数至流年太岁）。\n`,
    `This year Tiande falls in ${branchName(BRANCHES[td])} and Yuede in ${branchName(BRANCHES[yd])}, two gentle noble stars in the tradition.\n`));
  if (yp) {
    const [, _majors, _borrowed] = palace_stars(yp);
    for (const star of _majors) emit_star(yp, star, L(lang, '今年主星', 'Major star of the year'), _borrowed ? L(lang, `借${_borrowed}宫`, `borrowed from ${_borrowed}`) : L(lang, '流年', 'Annual'));
  }

  const lm = Math.abs(Solar.fromYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()).getLunar().getMonth());
  const months = flow_months(r, year, lunar[1], r.hour_branch_i);
  const mon = months[lm - 1];
  const mp = palace_of[mon.palace] || '';
  out.push(`## ${L(lang, '五、这个月', 'V. This Month')} (${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}, ${L(lang, '农历', 'lunar')} ${lm})`);
  out.push(L(lang,
    `这个月的重心在${mp}这一格；月干支 ${mon.stem}${mon.branch}。`,
    `This month's focus is ${palaceLabel(mp)}; the month pillar is ${gzEn(mon.stem + mon.branch)}.`));
  out.push(`${L(lang, '这个月的四个变化', 'Four changes this month')}：${_hua_bits(mon.hua, star_branch, palace_of, lang, huaName, starName, palaceLabel, role)}。\n`);
  if (mp) {
    const [, _majors, _borrowed] = palace_stars(mp);
    for (const star of _majors) emit_star(mp, star, L(lang, '这个月的主星', 'Major star of the month'), _borrowed ? L(lang, `借自${_borrowed}宫`, `borrowed from ${_borrowed}`) : `${palaceLabel(mp)}`);
  }

  const fd = flow_day(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), mon.palace);
  const dp = palace_of[fd.palace] || '';
  out.push(`## ${L(lang, '六、今天', 'VI. Today')} (${dt.toISOString().slice(0, 10)})`);
  out.push(L(lang,
    `今天的重心在${dp}这一格；日干支 ${fd.stem}${fd.branch}。`,
    `Today's focus is ${palaceLabel(dp)}; the day pillar is ${gzEn(fd.stem + fd.branch)}.`));
  out.push(`${L(lang, '今天的四个变化', 'Four changes today')}：${_hua_bits(fd.hua, star_branch, palace_of, lang, huaName, starName, palaceLabel, role)}。\n`);
  if (dp) {
    const [, _majors, _borrowed] = palace_stars(dp);
    for (const star of _majors) emit_star(dp, star, L(lang, '今天主星', 'Major star of the day'), _borrowed ? L(lang, `借自${_borrowed}宫`, `borrowed from ${_borrowed}`) : `${palaceLabel(dp)}`);
  }

  const sections: [string, string, string][] = [
    [L(lang, '七、你是怎样的人', 'VII. What You Are Like'), '命宫', '性格'],
    [L(lang, '八、后天做事的方式', 'VIII. How You Work'), '身宫', '性格'],
    [L(lang, '九、工作与事业', 'IX. Work and Career'), '官禄', '事业'],
    [L(lang, '十、钱与财运', 'X. Money and Wealth'), '财帛', '财运'],
    [L(lang, '十一、身体健康', 'XI. Body and Health'), '疾厄', '健康'],
    [L(lang, '十二、感情与婚姻', 'XII. Love and Marriage'), '夫妻', '感情'],
  ];
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
      label = borrowed ? L(lang, `借自${borrowed}宫`, `borrowed from ${branchName(borrowed)}`) : palaceLabel('身宫');
    } else {
      [br, majors, borrowed] = palace_stars(palace);
      label = borrowed ? L(lang, `借自${borrowed}宫`, `borrowed from ${branchName(borrowed)}`) : palaceLabel(palace);
    }
    if (!majors.length) { out.push(L(lang, '这一格和对面都暂时没有主星，先留个白，看看相邻几格吧。', 'Neither this palace nor its opposite holds a major star; leave it open and look at the neighboring palaces.') + '\n'); continue; }
    src = br;
    if (borrowed) src = BRANCHES.indexOf(borrowed);
    const lvl_written = new Set<string>();
    for (const star of majors) {
      const t = lib.templates.get(star + '|' + dim);
      if (t) {
        const lvl = ((r.brightness || {})[src] || {})[star];
        const lvltxt = lvl ? `·${(lang === 'en' ? BRIGHT_EN[lvl] || lvl : lvl)}` : '';
        let note = '';
        if (lvl && !lvl_written.has(lvl)) { lvl_written.add(lvl); note = ` ${lvlNote(lvl)}`; }
        emit_para(star + '|' + dim + '|' + t.text, `**${starName(star)} (${label}${lvltxt})**：${t.text.trimEnd()}${note}\n`);
      }
    }
    if (majors.length === 2) {
      const pair = lib.pairs.get([...majors].sort().join('|'));
      if (pair) emit_para(pair, `**${L(lang, '一起看这两颗星', 'Reading the two stars together')}**：${pair}\n`);
    }
    if (dim === '性格' && majors.length && lib.downNotes[majors[0]]) emit_para(lib.downNotes[majors[0]], `**${L(lang, `再补一句关于${majors[0]}`, `One more note on ${starName(majors[0])}`)}**：${lib.downNotes[majors[0]]}\n`);
    if (dim === '财运' && majors.length && lib.wealthNotes[majors[0]]) emit_para(lib.wealthNotes[majors[0]], `**${L(lang, '钱上再补一句', 'A further word on money')}**：${lib.wealthNotes[majors[0]]}\n`);
    if (dim === '健康' && majors.length && lib.healthNotes[majors[0]]) emit_para(lib.healthNotes[majors[0]], `**${L(lang, '身体上多留意', 'Watch for this physically')}**：${lib.healthNotes[majors[0]]}\n`);
    if (dim === '事业') {
      if (majors.length && lib.careerNotes[majors[0]]) emit_para(lib.careerNotes[majors[0]], `**${L(lang, '工作上再补一句', 'A further word on work')}**：${lib.careerNotes[majors[0]]}\n`);
      const here = new Set(r.stars[br] || []);
      const hit = (lib.careerAux.groups || []).filter((g: any) => g.stars.some((s: string) => here.has(s)));
      if (hit.length) emit_para('groups', `**${L(lang, '工作上还有这些帮手', 'Other helpers at work')}**：` + hit.map((g: any) => `${g.name}——${g.note}`).join(lang === 'en' ? '; ' : '；') + '\n');
      const hua_here = ['禄', '权', '科', '忌'].filter(tag => Object.entries(r.hua).some(([st, v]: any) => here.has(st) && v.tag === tag));
      if (hua_here.length) emit_para('hua', `**${L(lang, '工作上的四化', 'Transformations at work')}**：` + hua_here.map((t: string) => `${huaName(t)}——${lib.careerAux.hua[t]}`).join(lang === 'en' ? '; ' : '；') + '\n');
    }
    if (out.length === body_start) out.push(L(lang, '这一组星刚才已经聊过啦，身宫和命宫看的是同一处，就不重复说一遍了。', 'We have already covered this group of stars; the Body and Life palaces point to the same place, so there is no need to repeat.') + '\n');
  }

  out.push(L(lang,
    '> 以上是按固定规则拼出来的参考：14 主星 × 5 个维度按宫位主星匹配，空宫借对宫，双星一起看；大限、流年按本命宫位落点解释。仅供参考，你的经历和选择更算数。',
    '> This is a reference assembled by fixed rules: 14 major stars across 5 dimensions matched by palace, empty palaces borrowing from the opposite, double stars read together; major limits and annual charts interpreted from their landing palaces. For reference only; your own experience and choices matter more.'));
  return out.join('\n');
}

const PALACE_EN: Record<string, string> = {
  '命宫': 'Life Palace', '兄弟': 'Siblings', '夫妻': 'Spouse', '子女': 'Children',
  '财帛': 'Wealth', '疾厄': 'Health', '迁移': 'Travel', '交友': 'Friends',
  '官禄': 'Career', '田宅': 'Property', '福德': 'Blessings', '父母': 'Parents', '身宫': 'Body Palace',
};
const STAR_EN: Record<string, string> = {
  '紫微': 'Ziwei', '天机': 'Tianji', '太阳': 'Sun', '武曲': 'Wuqu', '天同': 'Tiantong',
  '廉贞': 'Lianzhen', '天府': 'Tianfu', '太阴': 'Moon', '贪狼': 'Tanlang', '巨门': 'Jumen',
  '天相': 'Tianxiang', '天梁': 'Tianliang', '七杀': 'Qisha', '破军': 'Pojun',
  '文昌': 'Wenchang', '文曲': 'Wenqu', '左辅': 'Zuofu', '右弼': 'Youbi',
  '天魁': 'Tiankui', '天钺': 'Tianyue', '禄存': 'Lucun', '火星': 'Mars', '铃星': 'Rahu',
  '擎羊': 'Qingyang', '陀罗': 'Tuoluo', '天马': 'Sky Horse',
};
const BRANCH_EN: Record<string, string> = {
  '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si',
  '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai',
};
const STEM_EN: Record<string, string> = {
  '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu',
  '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui',
};
const BRIGHT_EN: Record<string, string> = { '庙': 'Enthroned', '旺': 'Prosperous', '平': 'Even', '陷': 'Subdued' };
/** 干支串整体音译：庚辰 → Geng-Chen；非干支的中文（如格局名）原样保留。 */
function gzEn(s: string): string {
  return s.split('').map(c => STEM_EN[c] || BRANCH_EN[c] || c).join('-');
}

function xiaoxianBranch(yearBranchI: number, gender: string, age: number): number {
  const groups: [number[], number][] = [[[2, 6, 10], 4], [[8, 0, 4], 10], [[5, 9, 1], 7], [[11, 3, 7], 1]];
  let start = 4;
  for (const [k, v] of groups) if (k.includes(yearBranchI)) { start = v; break; }
  const step = gender === '男' ? 1 : -1;
  return mod(start + (age - 1) * step, 12);
}

function _hua_bits(
  hua: string[],
  star_branch: Record<string, number>,
  palace_of: Record<number, string>,
  lang: ComposeLang,
  huaName: (t: string) => string,
  starName: (s: string) => string,
  palaceLabel: (s: string) => string,
  role: (t: string) => string,
): string {
  const bits: string[] = [];
  for (let i = 0; i < 4; i++) {
    const tag = ['禄', '权', '科', '忌'][i];
    const star = hua[i];
    const br = star_branch[star];
    if (br !== undefined) bits.push(lang === 'en'
      ? `${huaName(tag)} in ${palaceLabel(palace_of[br] || '')} (${starName(star)}): ${role(tag)}`
      : `${tag}落在${palace_of[br] || ''}（${star}），${TAG_ROLE[tag]}`);
  }
  return bits.join(lang === 'en' ? '; ' : '；');
}
