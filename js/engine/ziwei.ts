// ziwei.ts — 紫微斗数排盘引擎（TypeScript 版）
// 对应 Python 端 chart.py（公历→农历→真太阳时）+ chart_core.py（安星纯算法）。
// 依赖：lunar-typescript（公历/农历/干支，与 lunar_python 同源同 API）。
import { Solar } from 'lunar-typescript';

export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export const PALACES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '官禄', '田宅', '福德', '父母'];

// Python % 语义（结果恒非负）
const mod = (n: number, m: number): number => ((n % m) + m) % m;

// ── 常量表 ──────────────────────────────────────────────
// 六十甲子纳音 → 五行局（水二/木三/金四/土五/火六）
const _JU = [
  4, 4, 6, 6, 3, 3, 5, 5, 4, 4, 6, 6, 2, 2, 5, 5, 4, 4, 3, 3,
  2, 2, 5, 5, 6, 6, 3, 3, 2, 2, 4, 4, 6, 6, 3, 3, 5, 5, 4, 4,
  6, 6, 2, 2, 5, 5, 4, 4, 3, 3, 2, 2, 5, 5, 6, 6, 3, 3, 2, 2,
];

// 五虎遁：年干 → 寅宫天干
export const _YIN_STEM: Record<number, number> = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 };

// 四化：年干 →（禄, 权, 科, 忌）
const SIHUA: Record<string, [string, string, string, string]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼'],
};
const SIHUA_GENG: Record<string, [string, string, string, string]> = {
  'taiyin': ['太阳', '武曲', '太阴', '天同'],
  'tianfu': ['太阳', '武曲', '天府', '天同'],
  'tongke': ['太阳', '武曲', '天同', '太阴'],
};

// 禄存：年干 → 宫位（不入辰戌丑未）
const LUCUN: Record<string, number> = { '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5, '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0 };
// 天魁 / 天钺：年干 → 宫位
const KUYUE: Record<string, [number, number]> = {
  '甲': [1, 7], '戊': [1, 7], '庚': [1, 7], '乙': [0, 8], '己': [0, 8],
  '丙': [11, 9], '丁': [11, 9], '辛': [2, 6], '壬': [3, 5], '癸': [3, 5],
};
// 火星 / 铃星：年支三合局 → 起始宫
const HUOLING_START: Record<string, [number, number]> = {
  '寅': [1, 3], '午': [1, 3], '戌': [1, 3], '申': [2, 10], '子': [2, 10], '辰': [2, 10],
  '巳': [3, 10], '酉': [3, 10], '丑': [3, 10], '亥': [9, 10], '卯': [9, 10], '未': [9, 10],
};

const ZIWEI_OFF: [string, number][] = [['天机', -1], ['太阳', -3], ['武曲', -4], ['天同', -5], ['廉贞', -8]];
const TIANFU_OFF: [string, number][] = [['太阴', 1], ['贪狼', 2], ['巨门', 3], ['天相', 4],
  ['天梁', 5], ['七杀', 6], ['破军', 10]];

const YANG_STEMS = new Set([0, 2, 4, 6, 8]);   // 甲丙戊庚壬

const CHANGSHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CHANGSHENG_START: Record<number, number> = { 2: 8, 3: 11, 4: 5, 5: 8, 6: 2 };  // 水二申、木三亥、金四巳、土五申、火六寅
const BOSHI = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '蜚廉', '喜神', '病符', '大耗', '伏兵', '官府'];

// 星曜亮度（庙/旺/平/陷），列序：子丑寅卯辰巳午未申酉戌亥
const _BRIGHT_RAW: Record<string, (string | null)[]> = {
  '紫微': ['平', '庙', '旺', '旺', '得地', '旺', '庙', '庙', '旺', '旺', '得地', '旺'],
  '天机': ['庙', '陷', '得地', '旺', '利益', '和平', '庙', '陷', '得地', '旺', '利益', '和平'],
  '太阳': ['陷', '陷', '旺', '庙', '旺', '旺', '旺', '得地', '得地', '和平', '陷', '陷'],
  '武曲': ['旺', '庙', '得地', '利益', '庙', '和平', '旺', '庙', '得地', '利益', '庙', '和平'],
  '天同': ['旺', '不得地', '利', '和平', '和平', '庙', '陷', '不得地', '旺', '和平', '和平', '庙'],
  '廉贞': ['和平', '利益', '庙', '和平', '利益', '陷', '和平', '利益', '庙', '和平', '利益', '陷'],
  '天府': ['庙', '庙', '庙', '平', '庙', '得地', '旺', '庙', '得地', '旺', '庙', '得地'],
  '太阴': ['庙', '庙', '旺', '陷', '陷', '陷', '陷', '陷', '利益', '旺', '旺', '庙'],
  '贪狼': ['旺', '庙', '和平', '利益', '庙', '陷', '旺', '庙', '和平', '利益', '庙', '陷'],
  '巨门': ['旺', '不得地', '庙', '庙', '陷', '旺', '旺', '不得地', '庙', '庙', '陷', '旺'],
  '天相': ['庙', '庙', '庙', '陷', '得地', '得地', '庙', '得地', '庙', '陷', '得地', '得地'],
  '天梁': ['庙', '旺', '庙', '庙', '庙', '陷', '庙', '旺', '陷', '得地', '庙', '陷'],
  '七杀': ['旺', '庙', '庙', '旺', '庙', '和平', '旺', '庙', '庙', '旺', '庙', '和平'],
  '破军': ['庙', '旺', '得地', '陷', '旺', '平', '庙', '旺', '得地', '陷', '旺', '平'],
  '禄存': ['庙', null, '庙', '庙', null, '庙', '庙', null, '庙', '庙', null, '庙'],
  '文昌': ['平', '庙', '陷', '平', '平', '庙', '陷', '平', '平', '庙', '陷', '平'],
  '文曲': ['平', '庙', '平', '旺', '平', '庙', '陷', '旺', '平', '庙', '陷', '旺'],
  '擎羊': ['陷', '庙', null, null, '庙', null, '陷', '庙', null, null, '庙', null],
  '陀罗': [null, '庙', '陷', null, '庙', '陷', null, '庙', '陷', null, '庙', '陷'],
  '火星': ['陷', '平', '庙', '平', '陷', '平', '庙', '平', '陷', '平', null, '平'],
  '铃星': ['陷', '平', '庙', '平', '陷', '平', '庙', '平', '陷', '平', null, '平'],
};
const _LEVEL: Record<string, string> = { '庙': '庙', '旺': '旺', '平': '平', '得地': '平', '利益': '平', '利': '平', '和平': '平', '不得地': '陷', '陷': '陷' };
const BRIGHTNESS: Record<string, (string | null)[]> = {};
for (const [star, row] of Object.entries(_BRIGHT_RAW)) {
  BRIGHTNESS[star] = row.map(v => (v ? _LEVEL[v] : null));
}

// ── 纯算法函数 ────────────────────────────────────────────
function ganzhiIndex(stemI: number, branchI: number): number {
  for (let k = 0; k < 60; k++) {
    if (k % 10 === stemI && k % 12 === branchI) return k;
  }
  throw new Error('非法干支');
}

export function sihuaOf(stemI: number, gengVariant = 'taiyin'): [string, string, string, string] {
  const stem = STEMS[stemI];
  if (stem === '庚') return SIHUA_GENG[gengVariant];
  return SIHUA[stem];
}

export function yearGanzhi(year: number): [number, number] {
  const n = mod(year - 4, 60);
  return [n % 10, n % 12];
}

function changshengOf(ju: number, gender: string): Record<number, string> {
  const start = CHANGSHENG_START[ju];
  const step = gender === '男' ? 1 : -1;
  const out: Record<number, string> = {};
  for (let i = 0; i < 12; i++) out[mod(start + step * i, 12)] = CHANGSHENG[i];
  return out;
}

function boshiOf(lucunPos: number, forward: boolean): Record<number, string> {
  const step = forward ? 1 : -1;
  const out: Record<number, string> = {};
  for (let i = 0; i < 12; i++) out[mod(lucunPos + step * i, 12)] = BOSHI[i];
  return out;
}

function xiaoxianBranch(yearBranchI: number, gender: string, age: number): number {
  const groups: [number[], number][] = [[[2, 6, 10], 4], [[8, 0, 4], 10], [[5, 9, 1], 7], [[11, 3, 7], 1]];
  let start = 4;
  for (const [k, v] of groups) if (k.includes(yearBranchI)) { start = v; break; }
  const step = gender === '男' ? 1 : -1;
  return mod(start + (age - 1) * step, 12);
}

function limitPalaces(life: number, ju: number, yearStemI: number, gender: string) {
  const forward = YANG_STEMS.has(yearStemI) === (gender === '男');
  const step = forward ? 1 : -1;
  const limits = [] as { start: number, end: number, palace: number, stem?: string, branch?: string, hua?: [string, string, string, string] }[];
  for (let k = 0; k < 10; k++) {
    limits.push({ start: ju + 10 * k, end: ju + 10 * k + 9, palace: mod(life + step * k, 12) });
  }
  return { limits, forward };
}

function juOf(ganzhiI: number): number {
  return _JU[ganzhiI];
}

function ziweiIndex(day: number, ju: number): number {
  const rem = day % ju;
  const add = rem === 0 ? 0 : ju - rem;
  const q = (day + add) / ju;
  const x = mod(2 + (q - 1), 12);          // 寅=2 起顺数
  if (add === 0) return x;
  return add % 2 === 1 ? mod(x - add, 12) : mod(x + add, 12);
}

function brightnessOf(star: string, branchI: number): string | null {
  const row = BRIGHTNESS[star];
  return row === undefined ? null : row[mod(branchI, 12)];
}

// ── 排盘 compute（对应 chart_core.compute） ────────────────
export interface ChartResult {
  ruleSetId: string; life: number; body: number; life_stem: number; ju: number;
  ziwei: number; tianfu: number; stars: Record<number, string[]>; hua: Record<string, { tag: string, palace: number }>;
  stem: string; limits: any[]; forward: boolean; ju_start: number;
  brightness: Record<number, Record<string, string>>; changsheng: Record<number, string>; boshi: Record<number, string>;
}

export function compute(yearStemI: number, yearBranchI: number, month: number, day: number, hourBranchI: number,
  opts: { rulesetId?: string, gengVariant?: string, gender?: string } = {}): ChartResult {
  const gender = opts.gender ?? '女';
  const gengVariant = opts.gengVariant ?? 'taiyin';
  const rs = opts.rulesetId ?? 'zywx.classic.cn@2026.1';

  const life = mod(2 + (month - 1) - hourBranchI, 12);
  const body = mod(2 + (month - 1) + hourBranchI, 12);
  const lifeStem = mod(_YIN_STEM[yearStemI] + mod(life - 2, 12), 10);
  const ju = juOf(ganzhiIndex(lifeStem, life));
  const zw = ziweiIndex(day, ju);
  const tf = mod(4 - zw, 12);

  const stars: Record<number, string[]> = {};
  for (let i = 0; i < 12; i++) stars[i] = [];
  stars[zw].push('紫微');
  for (const [name, off] of ZIWEI_OFF) stars[mod(zw + off, 12)].push(name);
  stars[tf].push('天府');
  for (const [name, off] of TIANFU_OFF) stars[mod(tf + off, 12)].push(name);

  const stem = STEMS[yearStemI];
  const lc = LUCUN[stem];
  const aux: Record<number, string[]> = {};
  const put = (p: number, name: string) => { (aux[p] ??= []).push(name); };
  put(lc, '禄存'); put(mod(lc + 1, 12), '擎羊'); put(mod(lc - 1, 12), '陀罗');
  const wc = mod(10 - hourBranchI, 12);       // 文昌：戌起子时逆数
  const wq = mod(4 + hourBranchI, 12);        // 文曲：辰起子时顺数
  put(wc, '文昌'); put(wq, '文曲');
  const fuPos = mod(4 + (month - 1), 12);     // 左辅：辰起正月顺数
  const biPos = mod(10 - (month - 1), 12);    // 右弼：戌起正月逆数
  put(fuPos, '左辅'); put(biPos, '右弼');
  const [k, y] = KUYUE[stem]; put(k, '天魁'); put(y, '天钺');
  put(mod(11 - hourBranchI, 12), '地空'); put(mod(11 + hourBranchI, 12), '地劫');
  const [hs, ls] = HUOLING_START[BRANCHES[yearBranchI]];
  put(mod(hs + hourBranchI, 12), '火星'); put(mod(ls + hourBranchI, 12), '铃星');
  // 天马
  put({ '寅': 8, '午': 8, '戌': 8, '申': 2, '子': 2, '辰': 2, '巳': 11, '酉': 11, '丑': 11, '亥': 5, '卯': 5, '未': 5 }[BRANCHES[yearBranchI]]!, '天马');
  // 红鸾（卯起子年逆）/ 天喜（对宫）
  const hong = mod(4 - yearBranchI, 12);
  put(hong, '红鸾'); put(mod(hong + 6, 12), '天喜');
  // 天姚（丑起正月顺）/ 天刑（酉起正月顺）
  put(mod(1 + (month - 1), 12), '天姚'); put(mod(9 + (month - 1), 12), '天刑');
  // 华盖 / 咸池
  const [hh, xx] = { '寅': [10, 3], '午': [10, 3], '戌': [10, 3], '申': [4, 9], '子': [4, 9], '辰': [4, 9], '巳': [1, 6], '酉': [1, 6], '丑': [1, 6], '亥': [7, 0], '卯': [7, 0], '未': [7, 0] }[BRANCHES[yearBranchI]]!;
  put(hh, '华盖'); put(xx, '咸池');
  // 孤辰 / 寡宿
  const [gg, gg2] = { '亥': [2, 10], '子': [2, 10], '丑': [2, 10], '寅': [5, 1], '卯': [5, 1], '辰': [5, 1], '巳': [8, 4], '午': [8, 4], '未': [8, 4], '申': [11, 7], '酉': [11, 7], '戌': [11, 7] }[BRANCHES[yearBranchI]]!;
  put(gg, '孤辰'); put(gg2, '寡宿');
  // 破碎
  const pp = yearBranchI % 3 === 0 ? 5 : yearBranchI % 3 === 1 ? 9 : 1;
  put(pp, '破碎');
  // 龙池 / 凤阁
  put(mod(4 + yearBranchI, 12), '龙池'); put(mod(10 - yearBranchI, 12), '凤阁');
  // 三台 / 八座
  put(mod(fuPos + day - 1, 12), '三台'); put(mod(biPos - (day - 1), 12), '八座');
  // 台辅 / 封诰
  put(mod(6 + hourBranchI, 12), '台辅'); put(mod(2 + hourBranchI, 12), '封诰');
  // 天哭 / 天虚
  put(mod(6 - yearBranchI, 12), '天哭'); put(mod(6 + yearBranchI, 12), '天虚');
  // 解神
  put(mod(8 + 2 * Math.floor((month - 1) / 2), 12), '解神');
  // 天官 / 天福
  put([7, 4, 5, 2, 3, 9, 11, 9, 10, 6][yearStemI], '天官');
  put([9, 8, 0, 11, 3, 2, 6, 5, 6, 5][yearStemI], '天福');
  // 恩光 / 天贵
  put(mod(wc + day - 2, 12), '恩光'); put(mod(wq + day - 2, 12), '天贵');
  // 天巫
  const mb = mod(month + 1, 12);
  const wu = { 2: 5, 6: 5, 10: 5, 8: 2, 0: 2, 4: 2, 5: 11, 9: 11, 1: 11, 11: 8, 3: 8, 7: 8 }[mb]!;
  put(wu, '天巫');
  // 阴煞
  put(mod(2 - 2 * ((month - 1) % 6), 12), '阴煞');
  // 月马
  const ym = { 2: 8, 6: 8, 10: 8, 8: 2, 0: 2, 4: 2, 5: 11, 9: 11, 1: 11, 11: 5, 3: 5, 7: 5 }[mb]!;
  put(ym, '月马');
  // 蜚廉
  put(mod([8, 5, 2, 11][Math.floor(yearBranchI / 3)] + yearBranchI % 3, 12), '蜚廉');
  // 天空
  put(mod(yearBranchI + 1, 12), '天空');
  // 天才 / 天寿
  put(mod(life + yearBranchI, 12), '天才'); put(mod(body + yearBranchI, 12), '天寿');

  for (const [pal, names] of Object.entries(aux)) stars[Number(pal)].push(...names);

  // 四化
  let [lu, quan, ke, ji] = SIHUA[stem];
  if (stem === '庚') [lu, quan, ke, ji] = SIHUA_GENG[gengVariant];
  const hua: Record<string, { tag: string, palace: number }> = {};
  for (const [tag, star] of [['禄', lu], ['权', quan], ['科', ke], ['忌', ji]] as [string, string][]) {
    for (const [pal, names] of Object.entries(stars)) {
      if (names.includes(star)) hua[star] ??= { tag, palace: Number(pal) };
    }
  }

  const { limits, forward } = limitPalaces(life, ju, yearStemI, gender);
  for (const lim of limits) {
    const ls = mod(_YIN_STEM[yearStemI] + mod(lim.palace - 2, 12), 10);
    lim.stem = STEMS[ls];
    lim.branch = BRANCHES[lim.palace];
    lim.hua = sihuaOf(ls, gengVariant);
  }

  const bright: Record<number, Record<string, string>> = {};
  for (const [pi, names] of Object.entries(stars)) {
    const row: Record<string, string> = {};
    for (const s of names) {
      const b = brightnessOf(s, Number(pi));
      if (s in BRIGHTNESS && b) row[s] = b;
    }
    bright[Number(pi)] = row;
  }
  const cs = changshengOf(ju, gender);
  const bs = boshiOf(lc, forward);

  return {
    ruleSetId: rs, life, body, life_stem: lifeStem, ju, ziwei: zw, tianfu: tf,
    stars, hua, stem, limits, forward, ju_start: ju, brightness: bright, changsheng: cs, boshi: bs,
  };
}

// ── 真太阳时 + 公历→农历（对应 chart.py） ──────────────────
const DST: Record<number, [number, number, number, number]> = {
  1986: [5, 4, 9, 14], 1987: [4, 12, 9, 13], 1988: [4, 10, 9, 11],
  1989: [4, 16, 9, 17], 1990: [4, 15, 9, 16], 1991: [4, 14, 9, 15],
};

function isDst(y: number, m: number, d: number): boolean {
  if (!(y in DST)) return false;
  const [m1, d1, m2, d2] = DST[y];
  return ((m > m1 || (m === m1 && d >= d1)) && (m < m2 || (m === m2 && d <= d2)));
}

function eot(month: number, day: number): number {
  const date = new Date(2000, month - 1, day);   // 2000 闰年
  const n = Math.floor((date.getTime() - new Date(2000, 0, 1).getTime()) / 86400000) + 1;
  const b = 2 * Math.PI * (n - 81) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function trueSolar(hh: number, mm: number, year: number, month: number, day: number, lon: number): [number, number, boolean] {
  const dst = isDst(year, month, day);
  let t = hh * 60 + mm - (dst ? 60 : 0);
  t += (lon - 120) * 4 + eot(month, day);
  t = mod(t, 1440);
  return [Math.floor(t / 60), Math.round(t % 60), dst];
}

function branchOf(hh: number): number {
  return Math.floor((hh + 1) / 2) % 12;
}

export interface FullChart extends ChartResult {
  solar: [number, number, number]; solar_time: [number, number];
  lunar: [number, number, number, boolean]; tst: [number, number]; dst: boolean;
  gender: string; lon: number; hour_branch_i: number;
}

export function chart(y: number, m: number, d: number, hh: number, mm: number,
  opts: { lon?: number, gender?: string, rulesetId?: string, gengVariant?: string } = {}): FullChart {
  const lon = opts.lon ?? 120.0;
  const gender = opts.gender ?? '女';
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  const tzYear = lunar.getYear();
  let lm = lunar.getMonth();
  const ld = lunar.getDay();
  const leap = lm < 0;
  lm = Math.abs(lm);
  const [th, tm, dst] = trueSolar(hh, mm, y, m, d, lon);
  const hb = branchOf(th);
  const gz = lunar.getYearInGanZhi();
  const stemI = STEMS.indexOf(gz[0]);
  const branchI = BRANCHES.indexOf(gz[1]);
  const r = compute(stemI, branchI, lm, ld, hb, {
    rulesetId: opts.rulesetId ?? 'zywx.classic.cn@2026.1',
    gengVariant: opts.gengVariant ?? 'taiyin',
    gender,
  });
  return Object.assign(r, {
    solar: [y, m, d] as [number, number, number], solar_time: [hh, mm] as [number, number],
    lunar: [tzYear, lm, ld, leap] as [number, number, number, boolean],
    tst: [th, tm] as [number, number], dst, gender, lon, hour_branch_i: hb,
  });
}

// ── 渲染（供调试，对应 chart_core.render / stars_sort） ────
export function starsSort(lst: string[]): string[] {
  const order = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
  return [...lst].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export function summary(r: FullChart): string {
  const [y, m, d] = r.solar;
  const [ly, lm, ld, leap] = r.lunar;
  const ju = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' }[r.ju];
  const t = r.tst;
  return `公历 ${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(r.solar_time[0]).padStart(2, '0')}:${String(r.solar_time[1]).padStart(2, '0')}` +
    `（${r.dst ? '夏令时' : '标准时'}） → 真太阳时 ${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')} ${BRANCHES[branchOf(t[0])]}时\n` +
    `农历 ${ly}年${leap ? '闰' : ''}${lm}月${ld}日 · ${r.gender}命 · ${ju}\n` +
    `命宫 ${BRANCHES[r.life]}（${STEMS[r.life_stem]}${BRANCHES[r.life]}）` +
    ` · 身宫 ${BRANCHES[r.body]} · 紫微 ${BRANCHES[r.ziwei]} · 天府 ${BRANCHES[r.tianfu]}`;
}
