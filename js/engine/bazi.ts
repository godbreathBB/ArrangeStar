// bazi.ts — 八字（子平）排盘引擎（TypeScript 版）
// 对应 Python 端 bazi_core.py。四柱/纳音/十神/大运接 lunar-typescript（与 lunar_python 同源）。
import { Solar } from 'lunar-typescript';

export const GAN = '甲乙丙丁戊己庚辛壬癸';
export const ZHI = '子丑寅卯辰巳午未申酉戌亥';

const GAN_WX: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
const ZHI_WX: Record<string, string> = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' };
const GAN_YINYANG: Record<string, string> = { '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴' };

// 地支藏干：本气、中气、余气
const HIDE: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'],
  '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'], '酉': ['辛'],
  '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
};
const HIDE_W = [1.0, 0.5, 0.3];

const SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const KE: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
const SHENG_INV: Record<string, string> = { '火': '木', '土': '火', '金': '土', '水': '金', '木': '水' };
const KE_INV: Record<string, string> = { '土': '木', '水': '土', '火': '水', '金': '火', '木': '金' };

const TEN_GODS = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];

const GOD_GROUP: Record<string, string> = {
  '比肩': '比劫', '劫财': '比劫', '食神': '食伤', '伤官': '食伤',
  '偏财': '财', '正财': '财', '七杀': '官杀', '正官': '官杀', '偏印': '印', '正印': '印',
};
const GROUP_WX: Record<string, (day: string) => string> = {
  '比劫': day => day, '食伤': day => SHENG[day], '财': day => KE[day],
  '官杀': day => KE_INV[day], '印': day => SHENG_INV[day],
};

const ZHI_HIDE_W: Record<string, number[]> = {
  'year': [1.0, 0.5, 0.3], 'month': [3.0, 1.5, 0.8], 'day': [1.5, 0.8, 0.5], 'hour': [1.0, 0.5, 0.3],
};
const GAN_W: Record<string, number> = { 'year': 1.0, 'month': 1.2, 'day': 1.0, 'hour': 1.0 };
const HELP_FACTOR: Record<string, number> = { '比劫': 1.0, '印': 0.8, '其他': 1.0 };
const LU_BONUS: Record<string, number> = { 'month': 1.25, 'day': 1.15, 'other': 1.0 };
const YIN_DECAY = { trigger: 1.5, factor: 0.25 };

export interface Pillar { name: string; ganzhi: string; gan: string; zhi: string; gan_wx: string; zhi_wx: string; gan_yy: string; shi_shen: string; hide: { gan: string; wx: string; god: string }[]; nayin: string; }

export function ten_god(day_gan: string, other_gan: string): string {
  const d_wx = GAN_WX[day_gan], o_wx = GAN_WX[other_gan];
  const same = GAN_YINYANG[day_gan] === GAN_YINYANG[other_gan];
  if (o_wx === d_wx) return same ? '比肩' : '劫财';
  if (SHENG[d_wx] === o_wx) return same ? '食神' : '伤官';
  if (KE[d_wx] === o_wx) return same ? '偏财' : '正财';
  if (KE[o_wx] === d_wx) return same ? '七杀' : '正官';
  return same ? '偏印' : '正印';
}

function is_lu(day_gan: string, zhi: string): boolean {
  const LU: Record<string, string> = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
  return LU[day_gan] === zhi;
}
function is_yang_ren(day_gan: string, zhi: string): boolean {
  const YR: Record<string, string> = { '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午', '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥' };
  return YR[day_gan] === zhi;
}

function strength(pillars: Pillar[]): any {
  const day_gan = pillars[2].gan;
  const d_wx = GAN_WX[day_gan];
  let help_bj = 0.0, help_yin = 0.0, drain_w = 0.0;
  const detail: [string, string, number | string][] = [];
  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    const pos = (['year', 'month', 'day', 'hour'] as const)[i];
    if (i !== 2) {
      const wx = GAN_WX[p.gan];
      const w = GAN_W[pos];
      if (wx === d_wx) { help_bj += w; detail.push([`${pos}干${p.gan}`, '帮(比劫)', w]); }
      else if (SHENG[wx] === d_wx) { help_yin += w * HELP_FACTOR['印']; detail.push([`${pos}干${p.gan}`, '帮(印)', Math.round(w * HELP_FACTOR['印'] * 100) / 100]); }
      else { drain_w += w; detail.push([`${pos}干${p.gan}`, '耗', w]); }
    }
    let bonus = 1.0;
    const bonusKey = pos === 'month' ? 'month' : pos === 'day' ? 'day' : 'other';
    if (is_lu(day_gan, p.zhi)) bonus = LU_BONUS[bonusKey];
    else if (is_yang_ren(day_gan, p.zhi)) bonus = LU_BONUS[bonusKey];

    const hids = HIDE[p.zhi];
    for (let j = 0; j < hids.length; j++) {
      const hg = hids[j];
      const wx = GAN_WX[hg];
      const ws = ZHI_HIDE_W[pos];
      const w = ws[j] !== undefined ? ws[j] : ws[ws.length - 1];
      if (wx === d_wx) { const w2 = w * (j === 0 ? bonus : 1.0); help_bj += w2; detail.push([`${pos}支${p.zhi}藏${hg}`, '帮', Math.round(w2 * 100) / 100]); }
      else if (SHENG[wx] === d_wx) { help_yin += w * HELP_FACTOR['印']; detail.push([`${pos}支${p.zhi}藏${hg}`, '帮(印)', Math.round(w * HELP_FACTOR['印'] * 100) / 100]); }
      else { drain_w += w; detail.push([`${pos}支${p.zhi}藏${hg}`, '耗', w]); }
    }
  }
  const yin_raw = help_yin;
  if (help_yin > help_bj * YIN_DECAY.trigger) {
    const cap = help_bj * YIN_DECAY.trigger;
    help_yin = cap + (help_yin - cap) * YIN_DECAY.factor;
    detail.push(['印重折损', '折', Math.round((help_yin - yin_raw) * 100) / 100]);
  }
  const help_w = help_bj + help_yin;
  const total = help_w + drain_w;
  let ratio = total ? help_w / total : 0.5;

  const month_zhi = pillars[1].zhi;
  const opp: Record<string, string> = { '子': '午', '午': '子', '卯': '酉', '酉': '卯', '寅': '申', '申': '寅', '巳': '亥', '亥': '巳', '辰': '戌', '戌': '辰', '丑': '未', '未': '丑' };
  const charged = pillars.some(p => p.zhi === opp[month_zhi]);
  if (is_lu(day_gan, month_zhi) && ratio < 0.52) { ratio = 0.52; detail.push(['建禄得令保底', '调', '0.52']); }
  else if (is_yang_ren(day_gan, month_zhi) && !charged && ratio < 0.50) { ratio = 0.50; detail.push(['月刃得令保底', '调', '0.50']); }
  const label = ratio >= 0.58 ? '身强' : ratio >= 0.46 ? '中和' : '身弱';

  const month_wx = ZHI_WX[pillars[1].zhi];
  const de_ling = month_wx === d_wx || SHENG[month_wx] === d_wx;
  const day_hide = HIDE[pillars[2].zhi].map(h => GAN_WX[h]);
  const de_di = day_hide.some(wx => wx === d_wx || SHENG[wx] === d_wx);
  const gan_help = pillars.filter((p, i) => i !== 2 && (GAN_WX[p.gan] === d_wx || SHENG[GAN_WX[p.gan]] === d_wx)).length;
  const de_shi = gan_help >= 2;
  return { help: Math.round(help_w * 100) / 100, drain: Math.round(drain_w * 100) / 100,
    help_bijie: Math.round(help_bj * 100) / 100, help_yin: Math.round(help_yin * 100) / 100,
    ratio: Math.round(ratio * 1000) / 1000, label, de_ling, de_di, de_shi, detail };
}

const SAN_HE: Record<string, string> = { '水': '申子辰', '木': '亥卯未', '火': '寅午戌', '金': '巳酉丑' };
const SAN_HUI: Record<string, string> = { '木': '寅卯辰', '火': '巳午未', '金': '申酉戌', '水': '亥子丑' };

function bonds(pillars: Pillar[]): any[] {
  const zhis = pillars.map(p => p.zhi);
  const out: any[] = [];
  for (const [wx, combo] of Object.entries(SAN_HE)) {
    const hit = [...combo].filter(z => zhis.includes(z));
    if (hit.length === 3) out.push({ type: '三合', wx, branches: combo, note: `${combo}合${wx}局` });
    else if (hit.length === 2) {
      const mid = combo[1];
      if (hit.includes(mid)) out.push({ type: '半合', wx, branches: hit.join(''), note: `${hit.join('')}半合${wx}局` });
    }
  }
  for (const [wx, combo] of Object.entries(SAN_HUI)) {
    const hit = [...combo].filter(z => zhis.includes(z));
    if (hit.length === 3) out.push({ type: '三会', wx, branches: combo, note: `${combo}会${wx}方` });
  }
  return out;
}

const HUA_PARTNER: Record<string, string> = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' };
const HUA_WX: Record<string, string> = { '甲': '土', '己': '土', '乙': '金', '庚': '金', '丙': '水', '辛': '水', '丁': '木', '壬': '木', '戊': '火', '癸': '火' };

function special_geju(pillars: Pillar[], st: any, bond_list: any[]): any {
  const day_gan = pillars[2].gan;
  const d_wx = GAN_WX[day_gan];
  const zhis = pillars.map(p => p.zhi);
  const has_root = zhis.some(z => HIDE[z].some(h => GAN_WX[h] === d_wx));
  for (const i of [1, 3]) {
    if (!has_root && st.ratio < 0.45 && pillars[i].gan === HUA_PARTNER[day_gan]) {
      const w = HUA_WX[day_gan];
      const month_wx = ZHI_WX[pillars[1].zhi];
      if (month_wx === w || GAN_WX[HIDE[pillars[1].zhi][0]] === w) {
        return { kind: 'hua', name: `化${w}格`,
          reason: `日主${day_gan}和${i === 1 ? '月' : '时'}干${pillars[i].gan}合化成${w}，${w}又正好当月令，日主本身没根` };
      }
    }
  }
  for (const b of bond_list) {
    if ((b.type === '三合' || b.type === '三会') && b.wx === d_wx && st.ratio >= 0.70) {
      return { kind: 'zhuanwang', name: `${d_wx}专旺格`,
        reason: `${b.note}，日主${d_wx}的气聚成一局，帮身占 ${Math.round(st.ratio * 100)}%` };
    }
  }
  const has_yin = pillars.some((p, i) => i !== 2 && SHENG[GAN_WX[p.gan]] === d_wx) ||
    pillars.some(p => HIDE[p.zhi].some(h => SHENG[GAN_WX[h]] === d_wx));
  if (!has_root && !has_yin && st.ratio <= 0.20) {
    const groups: Record<string, number> = { '官杀': 0.0, '财': 0.0, '食伤': 0.0 };
    for (const p of pillars) {
      const wx = GAN_WX[p.gan];
      if (KE[wx] === d_wx) groups['官杀'] += 1.0;
      else if (KE[d_wx] === wx) groups['财'] += 1.0;
      else if (SHENG[d_wx] === wx) groups['食伤'] += 1.0;
      for (const h of HIDE[p.zhi]) {
        const hw = GAN_WX[h];
        if (KE[hw] === d_wx) groups['官杀'] += 0.8;
        else if (KE[d_wx] === hw) groups['财'] += 0.8;
        else if (SHENG[d_wx] === hw) groups['食伤'] += 0.8;
      }
    }
    const top = (Object.entries(groups).sort((a, b) => b[1] - a[1])[0] as [string, number])[0];
    if (groups[top] >= 3.0) {
      const name = { '官杀': '从杀格', '财': '从财格', '食伤': '从儿格' }[top]!;
      return { kind: 'cong', name,
        reason: `日主${d_wx}没根也没人帮（帮身只占 ${Math.round(st.ratio * 100)}%），局里${top}最旺，只能顺着它走` };
    }
  }
  return null;
}

function geju(pillars: Pillar[], day_gan: string, st?: any, bond_list?: any[]): any {
  if (st !== undefined && bond_list !== undefined) {
    const sp = special_geju(pillars, st, bond_list);
    if (sp) {
      return { special: true, kind: sp.kind, name: sp.name, reason: sp.reason,
        month_zhi: pillars[1].zhi, ben_qi: HIDE[pillars[1].zhi][0],
        ben_qi_god: ten_god(day_gan, HIDE[pillars[1].zhi][0]),
        take_gan: null, take_god: null, exposed: [], ben_qi_tou: false };
    }
  }
  const month_zhi = pillars[1].zhi;
  const hidden = HIDE[month_zhi];
  const ben_qi = hidden[0];
  const ben_god = ten_god(day_gan, ben_qi);
  const gans = [pillars[0].gan, pillars[1].gan, pillars[3].gan];

  const exposed: string[] = [];
  let used: string | null = null, used_god: string | null = null;
  for (const hg of hidden) {
    if (gans.includes(hg)) {
      exposed.push(hg);
      if (used === null) { used = hg; used_god = ten_god(day_gan, hg); }
    }
  }
  let god = used_god || ben_god;
  let zhi_gan = used || ben_qi;

  let name: string, why: string;
  if (is_lu(day_gan, month_zhi)) { name = '建禄格'; why = '月支正好是日主的禄'; }
  else if (is_yang_ren(day_gan, month_zhi)) { name = '月劫格'; why = '月支正好是日主的羊刃'; }
  else if (god === '比肩' || god === '劫财') {
    if (ben_god !== '比肩' && ben_god !== '劫财') {
      name = `${ben_god}格`;
      why = `月支里藏的${zhi_gan}透到天干，是${god}；但月支既不是禄也不是刃，还是按本气的${ben_qi}（${ben_god}）取格`;
      god = ben_god; zhi_gan = ben_qi;
    } else { name = '比劫格'; why = `月支里藏的${zhi_gan}透到天干，是${god}`; }
  } else {
    name = `${god}格`;
    why = used ? `月支里藏的${zhi_gan}透到天干，按${god}取格` : `月令本气${ben_qi}（${ben_god}）没透到天干，就按本气取格`;
  }
  return { month_zhi, ben_qi, ben_qi_god: ben_god, take_gan: zhi_gan, take_god: god,
    name, exposed, ben_qi_tou: gans.includes(ben_qi), reason: why };
}

function xiji(day_gan: string, ratio: number, counts?: Record<string, number>): any {
  const strong = ratio >= 0.5;
  const lean = ratio >= 0.58 ? '偏强' : strong ? '中和偏强' : ratio >= 0.44 ? '中和偏弱' : '偏弱';
  const groups = strong ? ['官杀', '财', '食伤'] : ['印', '比劫'];
  const ji_groups = strong ? ['印', '比劫'] : ['官杀', '财', '食伤'];
  const d_wx = GAN_WX[day_gan];
  const xi = groups.map(g => `${g}（${GROUP_WX[g](d_wx)}）`);
  const ji = ji_groups.map(g => `${g}（${GROUP_WX[g](d_wx)}）`);
  if (!strong && counts) {
    const guan = (counts['七杀'] || 0) + (counts['正官'] || 0);
    const shi = (counts['食神'] || 0) + (counts['伤官'] || 0);
    if (guan >= 2.5 && shi >= 0.8 && !xi.some(x => x.includes('食伤'))) xi.push(`食伤（${GROUP_WX['食伤'](d_wx)}）制杀`);
  }
  return { strong, lean, xi, ji };
}

function wuxing_counts(pillars: Pillar[]): [Record<string, number>, number] {
  const counts: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    const pos = (['year', 'month', 'day', 'hour'] as const)[i];
    counts[GAN_WX[p.gan]] += GAN_W[pos];
    const hids = HIDE[p.zhi];
    for (let j = 0; j < hids.length; j++) {
      const ws = ZHI_HIDE_W[pos];
      counts[GAN_WX[hids[j]]] += ws[j] !== undefined ? ws[j] : ws[ws.length - 1];
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1.0;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) out[k] = Math.round(v * 100) / 100;
  return [out, Math.round(total * 100) / 100];
}

function degree(pillars: Pillar[], mode?: string): any {
  const m = mode || 'weighted';
  if (m === 'liu') return degree_liu(pillars);
  return degree_weighted(pillars);
}

function degree_weighted(pillars: Pillar[]): any {
  const day_gan = pillars[2].gan;
  const d_wx = GAN_WX[day_gan];
  const same = (wx: string) => wx === d_wx;
  const is_yin = (wx: string) => SHENG[wx] === d_wx;
  const month_ben = GAN_WX[HIDE[pillars[1].zhi][0]];
  let ling = 0.0;
  if (same(month_ben)) ling = 2.0;
  else if (is_yin(month_ben)) ling = 1.0;

  let di = 0;
  for (const p of pillars) if (HIDE[p.zhi].some(h => same(GAN_WX[h]))) di += 1;
  di = Math.min(di, 2);

  let shi = 0.0;
  for (let i = 0; i < pillars.length; i++) {
    if (i === 2) continue;
    const wx = GAN_WX[pillars[i].gan];
    if (same(wx)) shi += 1.0;
    else if (is_yin(wx)) shi += 0.5;
  }
  shi = Math.min(shi, 2.0);
  const score = ling + di + shi;
  const label = score >= 3.5 ? '身旺' : score >= 2.5 ? '中和偏旺' : score >= 1.5 ? '中和' : '身弱';
  return { ling, di, shi: Math.round(shi * 10) / 10, score: Math.round(score * 10) / 10, label, de_ling: ling > 0, de_di: di > 0, de_shi: shi > 0 };
}

function degree_liu(pillars: Pillar[]): any {
  const day_gan = pillars[2].gan;
  const d_wx = GAN_WX[day_gan];
  const same_wx = d_wx;
  const yin_wx = SHENG_INV[d_wx];
  let help_score = 1.0, same_self = 0.0, yin_score = 0.0, drain_score = 0.0;
  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    const wx = GAN_WX[p.gan];
    if (i !== 2) {
      if (wx === same_wx) { help_score += 1; same_self += 1; }
      else if (wx === yin_wx) { help_score += 1; yin_score += 1; }
      else drain_score += 1;
    }
    const hids = HIDE[p.zhi];
    for (let j = 0; j < hids.length; j++) {
      const w = [1.0, 0.6, 0.3][j] !== undefined ? [1.0, 0.6, 0.3][j] : 0.3;
      const hw = GAN_WX[hids[j]];
      if (hw === same_wx) { help_score += w; same_self += w; }
      else if (hw === yin_wx) { help_score += w; yin_score += w; }
      else drain_score += w;
    }
  }
  const month_ben_wx = GAN_WX[HIDE[pillars[1].zhi][0]];
  const ling = month_ben_wx === same_wx || month_ben_wx === yin_wx;
  const root = pillars.some((p, i) => i !== 1 && HIDE[p.zhi].some(h => GAN_WX[h] === same_wx || GAN_WX[h] === yin_wx));
  const mu_piao = same_self < 1.0 && yin_score > 2 * Math.max(same_self, 0.5);

  let level: string;
  if (mu_piao && ling) level = '次弱';
  else if (mu_piao) level = '中弱';
  else if (ling && help_score >= drain_score) level = '最强';
  else if (!ling && help_score >= drain_score) level = '中强';
  else if (!ling && root && help_score >= drain_score * 0.6) level = '次强';
  else if (ling && !root) level = '次弱';
  else if (ling && drain_score >= help_score * 1.5) level = '中弱';
  else level = '最弱';
  const label = (level === '最强' || level === '中强') ? '身强' : level === '次强' ? '中和偏强' : level === '次弱' ? '中和偏弱' : '身弱';
  return { level, label, help: Math.round(help_score * 100) / 100, drain: Math.round(drain_score * 100) / 100,
    same_self: Math.round(same_self * 100) / 100, yin: Math.round(yin_score * 100) / 100, mu_piao, ling, root,
    ling_bonus: ling ? 2 : 0, di_bonus: root ? 1 : 0, de_ling: ling, de_di: root, score: Math.round((help_score - drain_score) * 100) / 100 };
}

const GEJU_USE: Record<string, [string[], string[], string]> = {
  '正官格': [['印', '财'], ['食伤', '官杀'], '官星喜身旺印绶、财生官；忌伤官损贵、官杀混杂'],
  '七杀格': [['食伤', '印', '比劫'], ['财'], '七杀喜制伏、喜印化、喜身旺；忌财生杀、忌无制'],
  '正财格': [['比劫', '食伤', '官杀'], ['印', '比劫'], '财格喜身旺任财、食伤生财、官星护财；忌比劫夺财、身弱不任'],
  '偏财格': [['比劫', '食伤', '官杀'], ['印'], '偏财喜身强、官星护财；忌比劫分夺、身弱'],
  '正印格': [['官杀', '比劫'], ['财'], '印绶喜官杀生印；忌财旺破印'],
  '偏印格': [['官杀', '比劫'], ['财'], '偏印喜官杀相生；忌财破印、忌枭夺食'],
  '食神格': [['比劫', '财'], ['印'], '食神喜身旺、喜财；忌印绶夺食'],
  '伤官格': [['财', '印', '比劫'], ['官杀'], '伤官喜伤尽、喜财、喜印（佩印）；忌见官星'],
  '建禄格': [['财', '官杀', '食伤'], ['比劫', '印'], '建禄身旺，喜财官食伤泄用；忌再见比劫印绶助旺'],
  '月劫格': [['官杀', '财'], ['比劫'], '月刃喜七杀制刃、喜偏财；忌伤官与再见比劫'],
};

function geju_yongshen(pillars: Pillar[], gj: any, deg: any): any {
  const name = gj.name || '';
  const kind = gj.kind;
  if (kind === 'cong') return { school: '格局法', primary: ['从神'], avoid: ['身旺'], note: '从格顺势：从神愈旺愈吉，忌日元得根不从' };
  if (kind === 'zhuanwang') return { school: '格局法', primary: ['生扶本气'], avoid: ['克破'], note: '专旺顺势：喜生喜助，忌克破破局' };
  if (kind === 'hua') return { school: '格局法', primary: ['化神'], avoid: ['克化神', '争合'], note: '化气格：化神喜旺忌衰，忌争合妒合' };
  const key = name.replace('（羊刃）', '');
  const [use, avoid, note] = GEJU_USE[key] || [[], [], ''];
  const primary = [...use];
  if (deg.label === '身弱' && !primary.includes('比劫')) primary.unshift('比劫');
  if (deg.label === '身旺' && primary.includes('比劫')) return { school: '格局法', primary: primary.filter(x => x !== '比劫'), avoid, note };
  return { school: '格局法', primary, avoid, note };
}

const SEASON: Record<string, string> = { '寅': '春', '卯': '春', '辰': '春', '巳': '夏', '午': '夏', '未': '夏', '申': '秋', '酉': '秋', '戌': '秋', '亥': '冬', '子': '冬', '丑': '冬' };
const SAN_HUI_FULL: Record<string, string> = { '木': '寅卯辰', '火': '巳午未', '金': '申酉戌', '水': '亥子丑' };
const SAN_HE_FULL: Record<string, string> = { '水': '申子辰', '木': '亥卯未', '火': '寅午戌', '金': '巳酉丑' };
const SEASON_WX: Record<string, string> = { '春': '木', '夏': '火', '秋': '金', '冬': '水' };

function xiang_forms(pillars: Pillar[], gj?: any): any[] {
  const zhis = pillars.map(p => p.zhi);
  const gans = pillars.map(p => p.gan);
  const day_gan = gans[2];
  const d_wx = GAN_WX[day_gan];
  const season = SEASON[pillars[1].zhi];
  const forms: any[] = [];

  const huiOrder = ['', '东', '南', '西', '北'];
  let hi = 1;
  for (const [wx, combo] of Object.entries(SAN_HUI_FULL)) {
    if ([...combo].every(z => zhis.includes(z)) && season === wx) {
      const n_same = gans.filter(g => GAN_WX[g] === wx).length;
      if (n_same >= 2) {
        forms.push({ name: `${wx}类象`,
          text: `天干${gans.filter(g => GAN_WX[g] === wx).join('')}同气，地支${[...combo].join('、')}成方，${SEASON_WX[season] || ''}月当令，是${huiOrder[hi]}方一片秀气。这类格局愈纯愈好，怕被冲被破。` });
      }
    }
    hi++;
  }
  for (const [wx, combo] of Object.entries(SAN_HE_FULL)) {
    if ([...combo].every(z => zhis.includes(z))) {
      const n_same = gans.filter(g => GAN_WX[g] === wx).length;
      if (n_same >= 2) {
        forms.push({ name: `${wx}属象`, text: `天干同类，地支${[...combo].join('、')}三合${wx}局，气势集中，宜顺不宜逆。` });
      }
    }
  }

  if (gj) {
    const kind = gj.kind;
    if (kind === 'cong') {
      const name = gj.name || '从格';
      forms.push({ name, text: '日主无根也无印，只能顺着最旺的一方走；从得越纯越好，最怕日主突然有根、从不成反成祸。' });
      if (name.includes('杀')) forms.push({ name: '鬼象', text: '满局官杀、日主无依，弃命从杀，和从杀格是一个意思。' });
    } else if (kind === 'hua') {
      forms.push({ name: '化象', text: `${gj.reason || ''}。化气格最怕争合、妒合和克化神的东西，化神喜旺怕衰。` });
    } else if (kind === 'zhuanwang') {
      forms.push({ name: `${d_wx}专旺`, text: '一身之气聚成一局，愈旺愈美，喜生喜助，怕克破。' });
    }
  }

  const yin_wx = SHENG_INV[d_wx];
  for (const [wx, combo] of [...Object.entries(SAN_HE_FULL), ...Object.entries(SAN_HUI_FULL)]) {
    if ([...combo].every(z => zhis.includes(z))) {
      const has_yin = pillars.some(p => HIDE[p.zhi].some(h => GAN_WX[h] === yin_wx));
      if (has_yin && wx === d_wx) {
        forms.push({ name: '照象', text: '日主成局，局外又有一支带印来生，叫「相照」，是加分项：格局有后劲，喜生助、怕克破。' });
      }
    }
  }
  if (['寅', '午', '戌'].every(z => zhis.includes(z)) && pillars[1].zhi === '午' && day_gan === '壬' && !gans.includes('丁')) {
    forms.push({ name: '伏象', text: '寅午戌火局全、午月生、壬日无根又不见丁透，等于把火伏在午里，只好从火；走木火运吉，水旺运不利。' });
  }
  return forms;
}

const MONTH_NAME: Record<string, string> = { '寅': '正月', '卯': '二月', '辰': '三月', '巳': '四月', '午': '五月', '未': '六月', '申': '七月', '酉': '八月', '戌': '九月', '亥': '十月', '子': '十一月', '丑': '十二月' };

const JIAZI = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);
const XUN_KONG: Record<number, [string, string]> = { 0: ['戌', '亥'], 1: ['申', '酉'], 2: ['午', '未'], 3: ['辰', '巳'], 4: ['寅', '卯'], 5: ['子', '丑'] };
const SAN_HE_GROUP: Record<string, string> = { '寅': '寅午戌', '午': '寅午戌', '戌': '寅午戌', '申': '申子辰', '子': '申子辰', '辰': '申子辰', '巳': '巳酉丑', '酉': '巳酉丑', '丑': '巳酉丑', '亥': '亥卯未', '卯': '亥卯未', '未': '亥卯未' };
const YIMA: Record<string, string> = { '寅午戌': '申', '申子辰': '寅', '巳酉丑': '亥', '亥卯未': '巳' };
const HUAGAI: Record<string, string> = { '寅午戌': '戌', '申子辰': '辰', '巳酉丑': '丑', '亥卯未': '未' };
const TAOHUA: Record<string, string> = { '寅午戌': '卯', '申子辰': '酉', '巳酉丑': '午', '亥卯未': '子' };
const JIECHA: Record<string, string> = { '寅午戌': '亥', '申子辰': '巳', '巳酉丑': '寅', '亥卯未': '申' };
const WANGSHEN: Record<string, string> = { '寅午戌': '巳', '申子辰': '亥', '巳酉丑': '申', '亥卯未': '寅' };
const TIANYI: Record<string, [string, string]> = { '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'], '乙': ['子', '申'], '己': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'], '壬': ['卯', '巳'], '癸': ['卯', '巳'], '辛': ['午', '寅'] };
const YOU_REN: Record<string, string> = { '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午', '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥' };
const TIANDE: Record<string, string> = { '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲', '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚' };
const YUEDE: Record<string, string> = { '寅午戌': '丙', '申子辰': '壬', '巳酉丑': '庚', '亥卯未': '甲' };
const GU_CHEN: Record<string, [string, string]> = { '亥子丑': ['寅', '戌'], '寅卯辰': ['巳', '丑'], '巳午未': ['申', '辰'], '申酉戌': ['亥', '未'] };

function shensha(pillars: Pillar[]): any[] {
  const zhis = pillars.map(p => p.zhi);
  const gans = pillars.map(p => p.gan);
  const day_gan = gans[2];
  const out: any[] = [];
  const add = (name: string, where: string, note: string) => out.push({ name, where, note });
  const cols = ['年柱', '月柱', '日柱', '时柱'];

  for (let i = 0; i < zhis.length; i++) {
    if (YOU_REN[day_gan] === zhis[i]) add('羊刃', cols[i], '日主的帝旺处，性急有冲劲；被冲或再走刃运要留意。');
  }
  const idx = JIAZI.indexOf(pillars[2].ganzhi);
  if (idx !== -1) {
    const kong = XUN_KONG[Math.floor(idx / 10)];
    const hits = cols.filter((_, i) => kong.includes(zhis[i]));
    if (hits.length) add('空亡', hits.join('、'), `日柱旬空为${kong}，落在这几柱，所主之事容易虚、不落实。`);
  }
  for (const [base_name, base] of [['年支', zhis[0]], ['日支', zhis[2]]] as [string, string][]) {
    const group = SAN_HE_GROUP[base];
    for (const [name, table, note] of [['驿马', YIMA, '主走动、迁移、在外发展。'], ['华盖', HUAGAI, '主偏静、有艺文或宗教缘，也易独处。'], ['桃花', TAOHUA, '主人缘、异性缘好，感情事也多。'], ['劫煞', JIECHA, '主突发之耗与竞争。'], ['亡神', WANGSHEN, '主思虑多、易有暗耗。']] as [string, Record<string, string>, string][]) {
      const target = table[group];
      if (zhis.includes(target)) {
        const where = cols.filter((_, i) => zhis[i] === target);
        add(`${name}（${base_name}起）`, where.join('、'), note);
      }
    }
  }
  const ty = TIANYI[day_gan] || [];
  if (zhis.some(z => ty.includes(z))) {
    const where = cols.filter((_, i) => ty.includes(zhis[i]));
    add('天乙贵人', where.join('、'), '主遇事有人帮、有贵人缘。');
  }
  for (const [grp, [gu, gua]] of Object.entries(GU_CHEN)) {
    if (grp.includes(zhis[0])) {
      if (zhis.slice(1).includes(gu)) add('孤辰', cols.filter((_, i) => zhis[i] === gu).join('、'), '主亲缘偏淡、喜独处。');
      if (zhis.slice(1).includes(gua)) add('寡宿', cols.filter((_, i) => zhis[i] === gua).join('、'), '主亲缘偏淡、喜独处。');
      break;
    }
  }
  const month_zhi = pillars[1].zhi;
  const td = TIANDE[month_zhi];
  if (td) {
    const where: string[] = [];
    for (let i = 0; i < pillars.length; i++) if (pillars[i].gan === td || pillars[i].zhi === td) where.push(cols[i]);
    if (where.length) add('天德', where.join('、'), '主逢凶有解、心性厚道。');
  }
  const yd = YUEDE[SAN_HE_GROUP[month_zhi] || ''];
  if (yd) {
    const where = cols.filter((_, i) => gans[i] === yd);
    if (where.length) add('月德', where.join('、'), '主温和、少灾，遇事有人转圜。');
  }
  if (['庚辰', '庚戌', '壬辰', '戊戌'].includes(pillars[2].ganzhi)) add('魁罡', '日柱', '性刚、决断强，最好有东西管着。');
  return out;
}

// 内联《穷通宝鉴》调候表（原 reading_bazi/tiaohou_table.json）
const TIAOHOU_TABLE: Record<string, Record<string, string[]>> = {
  "甲": { "正月": ["丙", "癸"], "二月": ["庚", "丙", "丁", "戊", "己"], "三月": ["庚", "丁", "壬"], "四月": ["癸", "丁", "庚"], "五月": ["癸", "丁", "庚"], "六月": ["癸", "丁", "庚"], "七月": ["庚", "丁", "丙"], "八月": ["庚", "丁", "丙"], "九月": ["庚", "甲", "丁", "壬", "癸"], "十月": ["庚", "丁", "丙", "戊"], "十一月": ["丁", "庚", "丙"], "十二月": ["丁", "庚", "丙"] },
  "乙": { "正月": ["丙", "癸"], "二月": ["丙", "癸"], "三月": ["癸", "丙", "戊"], "四月": ["癸"], "五月": ["癸", "丙"], "六月": ["癸", "丙"], "七月": ["丙", "癸", "己"], "八月": ["癸", "丙", "丁"], "九月": ["癸", "辛"], "十月": ["丙", "戊"], "十一月": ["丙"], "十二月": ["丙"] },
  "丙": { "正月": ["壬", "庚"], "二月": ["壬", "己"], "三月": ["壬", "甲"], "四月": ["壬", "庚", "癸"], "五月": ["壬", "庚"], "六月": ["壬", "庚"], "七月": ["壬", "戊"], "八月": ["壬", "癸"], "九月": ["甲", "壬"], "十月": ["甲", "戊", "庚", "壬"], "十一月": ["壬", "戊", "己"], "十二月": ["壬", "甲"] },
  "丁": { "正月": ["甲", "庚"], "二月": ["庚", "甲"], "三月": ["甲", "庚"], "四月": ["甲", "庚"], "五月": ["壬", "庚", "癸"], "六月": ["甲", "壬", "庚"], "七月": ["甲", "庚", "丙", "戊"], "八月": ["甲", "庚", "丙", "戊"], "九月": ["甲", "戊", "庚"], "十月": ["甲", "庚"], "十一月": ["甲", "庚"], "十二月": ["甲", "庚"] },
  "戊": { "正月": ["丙", "甲", "癸"], "二月": ["丙", "甲", "癸"], "三月": ["甲", "丙", "癸"], "四月": ["甲", "丙", "癸"], "五月": ["壬", "甲", "丙"], "六月": ["癸", "丙", "甲"], "七月": ["丙", "癸", "甲"], "八月": ["丙", "癸"], "九月": ["甲", "丙", "癸"], "十月": ["甲", "丙"], "十一月": ["丙", "甲"], "十二月": ["丙", "甲"] },
  "己": { "正月": ["丙", "庚", "甲"], "二月": ["甲", "癸", "丙"], "三月": ["丙", "癸", "甲"], "四月": ["癸", "丙"], "五月": ["癸", "丙"], "六月": ["癸", "丙"], "七月": ["丙", "癸"], "八月": ["丙", "癸"], "九月": ["甲", "丙", "癸"], "十月": ["丙", "甲", "戊"], "十一月": ["丙", "甲", "戊"], "十二月": ["丙", "甲", "戊"] },
  "庚": { "正月": ["戊", "甲", "壬", "丙", "丁"], "二月": ["丁", "甲", "庚", "丙"], "三月": ["甲", "丁", "壬", "癸"], "四月": ["壬", "戊", "丙", "丁"], "五月": ["壬", "癸"], "六月": ["丁", "甲"], "七月": ["丁", "甲"], "八月": ["丁", "甲", "丙"], "九月": ["甲", "壬"], "十月": ["丁", "丙"], "十一月": ["丁", "甲", "丙"], "十二月": ["丙", "甲", "丁"] },
  "辛": { "正月": ["己", "壬", "庚"], "二月": ["壬", "甲"], "三月": ["壬", "甲"], "四月": ["壬", "癸", "甲"], "五月": ["壬", "己", "癸"], "六月": ["壬", "庚", "甲"], "七月": ["壬", "甲", "戊"], "八月": ["壬", "甲"], "九月": ["壬", "甲"], "十月": ["壬", "丙"], "十一月": ["丙", "戊", "壬", "甲"], "十二月": ["丙", "壬", "戊", "己"] },
  "壬": { "正月": ["庚", "丙", "戊"], "二月": ["戊", "辛", "庚"], "三月": ["甲", "庚"], "四月": ["庚", "辛", "壬", "癸"], "五月": ["癸", "庚", "辛"], "六月": ["辛", "甲"], "七月": ["戊", "丁"], "八月": ["甲", "庚"], "九月": ["甲", "丙"], "十月": ["戊", "丙", "庚"], "十一月": ["戊", "丙"], "十二月": ["丙", "丁", "甲"] },
  "癸": { "正月": ["辛", "丙"], "二月": ["庚", "辛"], "三月": ["丙", "辛", "甲"], "四月": ["辛"], "五月": ["庚", "辛", "壬", "癸"], "六月": ["庚", "辛", "壬", "癸"], "七月": ["丁"], "八月": ["辛", "丙"], "九月": ["辛", "甲", "壬", "癸"], "十月": ["庚", "辛", "戊", "丁"], "十一月": ["丙", "辛"], "十二月": ["丙", "丁"] },
};

function tiaohou(pillars: Pillar[]): any {
  const month_zhi = pillars[1].zhi;
  const season = SEASON[month_zhi];
  const [counts] = wuxing_counts(pillars);
  const fire = counts['火'] || 0, water = counts['水'] || 0;
  const dry = fire > water * 1.6;
  const wet = water > fire * 1.6;

  let need: string, items: string[], level: string, why: string;
  if (season === '冬') {
    need = '暖'; items = ['火'];
    level = (fire < 1.5 || wet) ? '急' : '缓';
    why = `生在冬天的${month_zhi}月，天寒，最需要火来暖局。局里火 ${fire}、水 ${water}，` + (level === '急' ? '火少水多，尤其要火。' : '火不算少，调候不那么吃紧。');
  } else if (season === '夏') {
    need = '润'; items = ['水'];
    level = (water < 1.5 || dry) ? '急' : '缓';
    why = `生在夏天的${month_zhi}月，天热，最需要水来润局。局里水 ${water}、火 ${fire}，` + (level === '急' ? '水少火旺，尤其要水。' : '水不算少，调候相对从容。');
  } else if (season === '春') {
    need = !wet ? '泄秀' : '暖'; items = !wet ? ['火', '金'] : ['火']; level = '缓';
    why = `生在春天的${month_zhi}月，木正当令，宜用火把秀气泄出来、用金修一修；局里木气 ${(counts['木'] || 0) > 2 ? '偏旺' : '不算过旺'}。`;
  } else {
    need = !dry ? '制炼' : '润'; items = !dry ? ['火', '水'] : ['水']; level = '缓';
    why = `生在秋天的${month_zhi}月，金正当令，宜用火炼金、用水泄金；局里火 ${fire}、水 ${water}。`;
  }
  const day_gan = pillars[2].gan;
  const mname = MONTH_NAME[month_zhi] || '';
  const table_use = (TIAOHOU_TABLE[day_gan] || {})[mname];
  if (table_use) {
    items = table_use;
    why = `按《穷通宝鉴》的调候表，${day_gan}日主生在${mname}（${month_zhi}月），调候用神取 ${table_use.join('、')}。（局里火 ${fire}、水 ${water}，可对照看这些用神在不在、有没有力。）`;
    need = '调候用神见右'; level = '按表取用';
  }
  return { season, need, items, level, why, fire, water, source: table_use ? '穷通宝鉴表' : '季节粗判' };
}

function xingxiang(pillars: Pillar[], countsIn?: Record<string, number>): any {
  let counts: Record<string, number>, total: number;
  if (countsIn === undefined) { [counts, total] = wuxing_counts(pillars); }
  else { counts = countsIn; total = Object.values(counts).reduce((a, b) => a + b, 0) || 1; }
  const c: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) c[k] = v / total;
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]);
  const [first, second] = [top[0], top[1]];
  const season = SEASON[pillars[1].zhi];
  const has = (a: string, b: string, t = 0.22) => (c[a] || 0) >= t && (c[b] || 0) >= t;
  if (has('木', '火') && c['木'] >= 0.25 && c['火'] >= 0.2) return { name: '木火通明', text: '木火成象，聪明外露、文采或表达上有长处；怕火太旺把木烧干，见水滋润更好。' };
  if (has('金', '水') && c['金'] >= 0.25 && c['水'] >= 0.2) return { name: '金白水清', text: '金水成象，思路清、讲道理，适合做需要条理和判断的事；怕土多把水搅浑。' };
  if (has('水', '木') && c['水'] >= 0.25 && c['木'] >= 0.2) return { name: '水木清华', text: '水木相生，性子偏静、爱学，适合长期积累；怕水多木漂，需要一点土或火来扎根。' };
  if (has('火', '土') && c['火'] >= 0.22 && c['土'] >= 0.22) return { name: '火土相生', text: '火土成象，稳、能扛事，适合做实打实的东西；怕燥，见水润一润更长久。' };
  if (has('土', '金') && c['土'] >= 0.22 && c['金'] >= 0.22) return { name: '土金毓秀', text: '土金成象，厚实有分量，做事讲规矩；怕土埋金，见木疏土、见水洗金更好。' };
  if (first[1] >= 0.45) return { name: '一气独旺', text: `${first[0]}气独旺（占 ${Math.round(first[1] * 100)}%），气象偏纯也偏枯，顺其势则成格，逆其势就容易别扭。` };
  if (season === '冬' && (c['水'] || 0) > 0.35 && (c['火'] || 0) < 0.1) return { name: '寒湿之象', text: '冬水当令、火气不足，气象偏寒湿，需要有火暖局，不然容易压抑、行动力弱。' };
  if (season === '夏' && (c['火'] || 0) > 0.35 && (c['水'] || 0) < 0.1) return { name: '燥烈之象', text: '夏火当令、水气不足，气象偏燥，需要水来润，不然急、耗，容易透支。' };
  return { name: '气象平常', text: `五行以${first[0]}、${second[0]}为主，未见明显的成象组合，按强弱与格局看即可。` };
}

function god_counts(pillars: Pillar[]): Record<string, number> {
  const day_gan = pillars[2].gan;
  const counts: Record<string, number> = {};
  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    if (i !== 2) {
      const g = ten_god(day_gan, p.gan);
      counts[g] = (counts[g] || 0) + 1.0;
    }
    const hids = HIDE[p.zhi];
    for (let j = 0; j < hids.length; j++) {
      const g = ten_god(day_gan, hids[j]);
      counts[g] = (counts[g] || 0) + HIDE_W[j] * (i === 1 ? 2.0 : 1.0);
    }
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) out[k] = Math.round(v * 100) / 100;
  return out;
}

export interface BaziResult { solar: [number, number, number, number, number]; gender: string; lunar: [number, number, number]; lunar_text: string; pillars: Pillar[]; day_master: { gan: string; wx: string; yy: string }; strength: any; geju: any; xiji: any; degree: any; yongshen: any; tiaohou: any; xiang_forms: any[]; shensha: any[]; xingxiang: any; bonds: any[]; god_counts: Record<string, number>; kong_wang: { day: string; year: string }; dayun: any[]; qi_yun: any; }

export function bazi(y: number, mo: number, d: number, hh: number, mi: number, gender = '女'): BaziResult {
  const solar = Solar.fromYmdHms(y, mo, d, hh, mi, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const gz = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
  const nayin = [ec.getYearNaYin(), ec.getMonthNaYin(), ec.getDayNaYin(), ec.getTimeNaYin()];
  const shishen_gan = [ec.getYearShiShenGan(), ec.getMonthShiShenGan(), ec.getDayShiShenGan(), ec.getTimeShiShenGan()];
  const day_gan = gz[2][0];

  const pillars: Pillar[] = [];
  for (let i = 0; i < 4; i++) {
    const gan = gz[i][0], zhi = gz[i][1];
    pillars.push({
      name: ['年', '月', '日', '时'][i], ganzhi: gz[i], gan, zhi,
      gan_wx: GAN_WX[gan], zhi_wx: ZHI_WX[zhi], gan_yy: GAN_YINYANG[gan],
      shi_shen: shishen_gan[i],
      hide: HIDE[zhi].map(h => ({ gan: h, wx: GAN_WX[h], god: ten_god(day_gan, h) })),
      nayin: nayin[i],
    });
  }

  const st = strength(pillars);
  const bond_list = bonds(pillars);
  const gj = geju(pillars, day_gan, st, bond_list);
  const counts = god_counts(pillars);
  const xj = xiji(day_gan, st.ratio, counts);

  const yun = ec.getYun(gender === '男' ? 1 : 0);
  const dayun: any[] = [];
  for (const dy of yun.getDaYun()) {
    if (dy.getIndex() === 0) continue;
    const gzdy = dy.getGanZhi();
    if (!gzdy) continue;
    dayun.push({
      index: dy.getIndex(), ganzhi: gzdy, gan: gzdy[0], zhi: gzdy[1],
      gan_god: ten_god(day_gan, gzdy[0]), zhi_wx: ZHI_WX[gzdy[1]],
      start_age: dy.getStartAge(), end_age: dy.getEndAge(),
      start_year: dy.getStartYear(), end_year: dy.getEndYear(),
    });
  }

  return {
    solar: [y, mo, d, hh, mi], gender,
    lunar: [lunar.getYear(), lunar.getMonth(), lunar.getDay()],
    lunar_text: lunar.toString(),
    pillars,
    day_master: { gan: day_gan, wx: GAN_WX[day_gan], yy: GAN_YINYANG[day_gan] },
    strength: st, geju: gj, xiji: xj,
    degree: degree(pillars),
    yongshen: geju_yongshen(pillars, gj, degree(pillars)),
    tiaohou: tiaohou(pillars),
    xiang_forms: xiang_forms(pillars, gj),
    shensha: shensha(pillars),
    xingxiang: xingxiang(pillars, wuxing_counts(pillars)[0]),
    bonds: bond_list, god_counts: counts,
    kong_wang: { day: ec.getDayXunKong(), year: ec.getYearXunKong() },
    dayun, qi_yun: { year: yun.getStartYear(), month: yun.getStartMonth(), day: yun.getStartDay(), forward: yun.isForward() },
  };
}

export function liunian(r: BaziResult, year: number): any {
  const gz = Solar.fromYmd(year, 7, 1).getLunar().getYearInGanZhi();
  return { year, ganzhi: gz, gan_god: ten_god(r.day_master.gan, gz[0]), zhi_wx: ZHI_WX[gz[1]] };
}

export function current_dayun(r: BaziResult, age: number): any {
  for (const dy of r.dayun) if (dy.start_age <= age && age <= dy.end_age) return dy;
  return null;
}
