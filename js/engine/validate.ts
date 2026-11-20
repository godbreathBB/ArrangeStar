// validate.ts — 排盘引擎输入校验（纯函数，无副作用）
// 职责边界：只判断数值是否合法，不参与任何排盘口径（换日、换年、节气、闰月）的判定。
// 所有导出的断言在失败时抛出带字段名的 Error，避免 NaN / 越界值静默传播到干支索引。

export function finiteInt(v: any, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw new Error(`输入无效：${field} 必须是有限整数（收到 ${String(v)}）`);
  }
  return v;
}

export function finiteNum(v: any, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`输入无效：${field} 必须是有限数（收到 ${String(v)}）`);
  }
  return v;
}

/** 公历月份实际天数；用 UTC 构造，避免宿主时区与夏令时影响。 */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function assertYear(y: any, min = 1900, max = 2100): number {
  const n = finiteInt(y, '年');
  if (n < min || n > max) throw new Error(`输入无效：年必须在 ${min}–${max} 之间（收到 ${n}）`);
  return n;
}

/** 只校验年月日，用于不携带时刻的历法查询。 */
export function assertDateOnly(y: any, m: any, d: any): [number, number, number] {
  const Y = assertYear(y), M = finiteInt(m, '月'), D = finiteInt(d, '日');
  if (M < 1 || M > 12) throw new Error(`输入无效：月必须在 1–12 之间（收到 ${M}）`);
  const maxD = daysInMonth(Y, M);
  if (D < 1 || D > maxD) throw new Error(`输入无效：${Y}-${M} 的日必须在 1–${maxD} 之间（收到 ${D}）`);
  return [Y, M, D];
}

/** 校验完整出生时刻：年 / 月 / 日 / 时 / 分。 */
export function assertDateTime(y: any, m: any, d: any, hh: any, mm: any): [number, number, number, number, number] {
  const [Y, M, D] = assertDateOnly(y, m, d);
  const H = finiteInt(hh, '时'), Mi = finiteInt(mm, '分');
  if (H < 0 || H > 23) throw new Error(`输入无效：时必须在 0–23 之间（收到 ${H}）`);
  if (Mi < 0 || Mi > 59) throw new Error(`输入无效：分必须在 0–59 之间（收到 ${Mi}）`);
  return [Y, M, D, H, Mi];
}

/** 经度：与界面输入范围保持一致。 */
export function assertLon(lon: any): number {
  const v = finiteNum(lon, '经度');
  if (v < 60 || v > 150) throw new Error(`输入无效：经度必须在 60–150 之间（收到 ${v}）`);
  return v;
}

/** YYYY-MM-DD 字符串：格式 + 实际日历日双重校验。 */
export function assertDateStr(s: any, field = '参考日期'): string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`输入无效：${field} 必须是 YYYY-MM-DD（收到 ${String(s)}）`);
  }
  const [y, m, d] = s.split('-').map(Number);
  assertDateOnly(y, m, d);
  return s;
}
