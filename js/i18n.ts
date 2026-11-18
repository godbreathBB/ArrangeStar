// i18n.ts — 星垣中英双语层
// 负责：语言状态持久化、界面文案、命理术语对照、长文案的中英呈现。
// 设计原则：不改动三套排盘引擎的任何算法，只翻译"呈现层"。

export type Lang = 'zh' | 'en';

const LANG_KEY = 'xingyuan.lang.v1';
const listeners = new Set<() => void>();

function initialLang(): Lang {
  // 链接参数优先，便于分享指定语言的页面（?lang=en / ?lang=zh）
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'zh') {
      try { localStorage.setItem(LANG_KEY, q); } catch { /* 忽略 */ }
      return q;
    }
  } catch { /* 忽略 */ }
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch { /* 隐私模式忽略 */ }
  return 'zh';
}

let lang: Lang = initialLang();

export function getLang(): Lang { return lang; }

export function setLang(v: Lang): void {
  if (v === lang) return;
  lang = v;
  try { localStorage.setItem(LANG_KEY, v); } catch { /* 忽略 */ }
  applyStatic();
  listeners.forEach(fn => fn());
}

export function toggleLang(): void { setLang(lang === 'zh' ? 'en' : 'zh'); }

export function onLangChange(fn: () => void): void { listeners.add(fn); }

/** 按当前语言取一句文案（静态文案在下方 UI 表）。 */
export function t(key: string): string {
  return (UI[lang] as any)[key] ?? (UI.zh as any)[key] ?? key;
}

/** 同一句同时给出中英：中文模式返回中文，英文模式返回英文。 */
export function bi(zh: string, en: string): string { return lang === 'en' ? en : zh; }

/** 术语翻译：先精确匹配，未收录时按词表替换组合词，仍无对应则原样返回。 */
export function term(s: any): string {
  const k = String(s ?? '');
  if (lang === 'zh') return k;
  if (TERMS[k]) return TERMS[k];
  return replaceKnown(k)
    .replace(/([阳阴])遁\s*(\d+)\s*局/g, (_m, d, n) => `${d === '阳' ? 'Yang' : 'Yin'} Dun ${n}`)
    .replace(/(\d+)\s*局/g, '$1 chart');
}

/** 英中对照，用于首次出现的术语：Ziwei (紫微)。 */
export function termBoth(s: any): string {
  const k = String(s ?? '');
  if (lang === 'zh') return k;
  const e = TERMS[k];
  return e ? `${e} (${k})` : k;
}

/** 干支串逐字翻译：甲子 → Jia-Zi。 */
export function ganzhi(s: any): string {
  const k = String(s ?? '');
  if (lang === 'zh') return k;
  return k.split('').map(c => TERMS[c] ?? c).join('-');
}

let termKeys: string[] | null = null;
function replaceKnown(s: string): string {
  if (!termKeys) termKeys = Object.keys(TERMS).sort((a, b) => b.length - a.length);
  let out = s;
  for (const k of termKeys) if (out.includes(k)) out = out.split(k).join(TERMS[k]);
  return out;
}

export function tx(s: any): string {
  const text = String(s ?? '');
  return lang === 'zh' ? text : replaceKnown(text);
}

/** 英文模式下把中文原文收进可展开对照区；中文模式直接原文呈现。 */
export function sourceBlock(zhText: string, label?: string): string {
  if (!zhText) return '';
  if (lang === 'zh') return zhText;
  const head = label ?? t('source.label');
  return `<details class="zh-source"><summary>${head}</summary><div class="zh-source-body">${zhText}</div></details>`;
}

/** 处理 HTML 中静态标注元素的文案。 */
export function applyStatic(root: ParentNode = document): void {
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const v = (UI[lang] as any)[el.dataset.i18n || ''];
    if (v !== undefined) el.textContent = v;
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => {
    const v = (UI[lang] as any)[el.dataset.i18nTitle || ''];
    if (v !== undefined) el.title = v;
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => {
    const v = (UI[lang] as any)[el.dataset.i18nAria || ''];
    if (v !== undefined) el.setAttribute('aria-label', v);
  });
}

// ── 界面文案 ────────────────────────────────────────────────
const UI: Record<Lang, Record<string, string>> = {
  zh: {
    'app.title': '星垣 · 紫微斗数 / 八字 / 奇门遁甲',
    'brand': '星 垣',
    'tab.chart': '紫微', 'tab.bazi': '八字', 'tab.qimen': '奇门',
    'btn.today': '今日', 'btn.archive': '档案', 'btn.settings': '设置',
    'title.today': '今日一句与参考日期', 'title.archive': '本机档案', 'title.settings': '设置',
    'lang.switch': 'EN', 'lang.title': 'Switch to English',
    'settings.title': '本机设置 · 档案只存在这台设备上',
    'label.refDate': '参考日期', 'label.dailyDate': '今日一句日期',
    'btn.clearArchive': '清空档案',
    'settings.ratio': '紫微的「大限 / 流年 / 流月 / 流日」按参考日期切换；「今日一句」按当前命盘八字的日干十神与喜忌生成。',
    'archive.title': '我的档案', 'btn.saveChart': '保存当前盘',
    'archive.empty': '还没有存档。排好盘后点「保存当前盘」，就留在这台设备上。',
    'archive.open': '打开', 'archive.delete': '删除',
    'confirm.clearArchive': '清空这台设备上的全部档案？',
    'layer.benming': '本命', 'layer.limit': '大限', 'layer.annual': '流年', 'layer.month': '流月', 'layer.day': '流日',
    'btn.hideLines': '隐藏连线', 'btn.showLines': '显示连线',
    'birth.year': '年', 'birth.month': '月', 'birth.day': '日', 'birth.hour': '时', 'birth.minute': '分',
    'birth.gender': '性别', 'birth.female': '女', 'birth.male': '男', 'birth.lon': '经度',
    'btn.chart': '排盘',
    'aria.palace': '宫位解读', 'aria.starsheet': '星曜说明',
    'palace.empty': '空宫', 'badge.life': '命', 'badge.body': '身',
    'hua.title': '落宫',
    'center.name': '星 垣',
    'center.gender': '命', 'center.solarTime': '真太阳时', 'center.lunar': '农历', 'center.leap': '闰',
    'center.lifePalace': '命宫', 'center.bodyPalace': '身宫',
    'readmore.ziwei': '命盘解读 · 五维白话',
    'err.reading': '解读暂时没能生成：',
    'err.year': '年份需在 1900–2100 之间', 'err.lon': '经度需在 60–150 之间',
    'section.pillars': '四柱', 'section.wuxing': '五行力量', 'section.pattern': '命局', 'section.dayun': '大运',
    'bazi.wuxingNote': '天干各 1 分；藏干按月令 ×3、日支 ×1.5、其余 ×1，并乘本气 1 / 中气 0.5 / 余气 0.3。',
    'bazi.qiyun': '起运', 'bazi.forward': '顺', 'bazi.backward': '逆', 'bazi.yearsOld': '岁',
    'qform.date': '用事日期', 'qform.time': '用事时刻', 'qform.go': '起局',
    'qimen.grid': '九宫盘',
    'qimen.gridNote': '用事时干所在宫带金边（问事的人）；「空」为时旬空亡，「马」为驿马。点任何一宫可看这一格的白话。转盘奇门（时家），拆补法定局。',
    'qimen.fuyin': '伏吟局', 'qimen.fuyinNote': '星门各回本宫，宜守不宜动。',
    'qimen.fanyin': '反吟局', 'qimen.fanyinNote': '星门坐对宫，事快而反复。',
    'drawer.close': '关闭', 'drawer.tapNote': '点一下看注解',
    'drawer.starEmpty': '这一格暂时空着',
    'drawer.borrow': '这一格空着，借对面的',
    'drawer.noHua': '今年这张盘里，暂时没有四化落进来。',
    'drawer.opp': '对面',
    'drawer.sec1': '这一格在说什么', 'drawer.sec2': '四化去了哪', 'drawer.sec3': '三方四正', 'drawer.sec4': '这一格管什么',
    'drawer.noText': '这一格暂时还没有可写下的解读，先看看别的吧。',
    'ss.kind': '星曜', 'ss.sec': '看看它在各维度的说法',
    'ss.cite': '以上依据本站文案库，是白话改写，不是宿命断语。',
    'daily.tag': '今日一句', 'daily.src': '十神 · 喜忌',
    'qcell.kong': '落空', 'qcell.ma': '驿马',
    'qcell.kongNote': '此宫落空：事悬着，约好的容易变。',
    'qcell.maNote': '驿马到宫：主动、出行、消息。',
    'qgrid.aria': '奇门九宫盘', 'qgrid.year': '年', 'qgrid.month': '月', 'qgrid.day': '日', 'qgrid.hour': '时',
    'qgrid.zhifu': '值符', 'qgrid.zhishi': '值使', 'qgrid.land': '落',
    'bcard.dayMaster': '日主', 'bcard.strength': '旺衰', 'bcard.pattern': '格局', 'bcard.xi': '喜', 'bcard.ji': '忌',
    'bcard.help': '帮身',
    'source.label': '查看中文原文',
    'source.body': '中文原文',
    'intro.1.title': '星垣', 'intro.1.sub': '紫微斗数 · 八字 · 奇门遁甲',
    'intro.1.desc': '把三式收进一方星盘，随时起盘，随时读盘。',
    'intro.2.title': '紫微斗数', 'intro.2.sub': '十二宫 · 四化 · 大限流年',
    'intro.2.desc': '本命为根，层层展开限运；点开宫位，星曜解读就在手边。',
    'intro.3.title': '八字', 'intro.3.sub': '四柱 · 十神 · 喜忌',
    'intro.3.desc': '从盘口八字读到今日一句，落到实处，不空谈。',
    'intro.4.title': '奇门遁甲', 'intro.4.sub': '九宫 · 八门 · 克应格局',
    'intro.4.desc': '时家转盘排九宫，另附十讲原理与八步带读，像老师在旁边讲。',
    'intro.5.title': '数据只在这台设备', 'intro.5.sub': '不联网 · 不上传 · 不收集',
    'intro.5.desc': '排盘与档案都保存在本机浏览器，随时可以清空。',
    'intro.skip': '跳过', 'intro.next': '下一步', 'intro.start': '进入星垣', 'intro.back': '上一步', 'intro.replay': '重看引导',
  },
  en: {
    'app.title': 'ArrangeStar · Zi Wei Dou Shu / Ba Zi / Qi Men Dun Jia',
    'brand': 'ARRANGESTAR',
    'tab.chart': 'Zi Wei', 'tab.bazi': 'Ba Zi', 'tab.qimen': 'Qi Men',
    'btn.today': 'Today', 'btn.archive': 'Archive', 'btn.settings': 'Settings',
    'title.today': 'Daily line & reference date', 'title.archive': 'Local archive', 'title.settings': 'Settings',
    'lang.switch': '中文', 'lang.title': '切换到中文',
    'settings.title': 'Local settings · archives stay on this device',
    'label.refDate': 'Reference date', 'label.dailyDate': 'Daily line date',
    'btn.clearArchive': 'Clear archive',
    'settings.ratio': 'Zi Wei layers (Major Limit / Annual / Monthly / Daily) follow the reference date. The daily line comes from this chart’s Ba Zi day-stem Ten God and favorable/unfavorable elements.',
    'archive.title': 'My archive', 'btn.saveChart': 'Save current chart',
    'archive.empty': 'No saved charts yet. Set up a chart, then tap “Save current chart” — it stays on this device.',
    'archive.open': 'Open', 'archive.delete': 'Delete',
    'confirm.clearArchive': 'Delete all archives stored on this device?',
    'layer.benming': 'Natal', 'layer.limit': 'Major Limit', 'layer.annual': 'Annual', 'layer.month': 'Monthly', 'layer.day': 'Daily',
    'btn.hideLines': 'Hide lines', 'btn.showLines': 'Show lines',
    'birth.year': 'Year', 'birth.month': 'Month', 'birth.day': 'Day', 'birth.hour': 'Hour', 'birth.minute': 'Minute',
    'birth.gender': 'Sex', 'birth.female': 'Female', 'birth.male': 'Male', 'birth.lon': 'Longitude',
    'btn.chart': 'Cast chart',
    'aria.palace': 'Palace reading', 'aria.starsheet': 'Star notes',
    'palace.empty': 'Empty palace', 'badge.life': 'Life', 'badge.body': 'Body',
    'hua.title': 'transforms into',
    'center.name': 'ARRANGESTAR',
    'center.gender': 'chart', 'center.solarTime': 'True solar time', 'center.lunar': 'Lunar', 'center.leap': 'leap',
    'center.lifePalace': 'Life palace', 'center.bodyPalace': 'Body palace',
    'readmore.ziwei': 'Chart reading · five dimensions',
    'err.reading': 'Reading could not be generated: ',
    'err.year': 'Year must be between 1900 and 2100', 'err.lon': 'Longitude must be between 60 and 150',
    'section.pillars': 'Four Pillars', 'section.wuxing': 'Five Elements balance', 'section.pattern': 'Chart structure', 'section.dayun': 'Major Fortune',
    'bazi.wuxingNote': 'Each heavenly stem scores 1. Hidden stems: month branch ×3, day branch ×1.5, others ×1, then ×1 / 0.5 / 0.3 for primary / secondary / residual qi.',
    'bazi.qiyun': 'Fortune begins after', 'bazi.forward': 'forward', 'bazi.backward': 'backward', 'bazi.yearsOld': 'yrs',
    'qform.date': 'Event date', 'qform.time': 'Event time', 'qform.go': 'Cast chart',
    'qimen.grid': 'Nine Palaces chart',
    'qimen.gridNote': 'The palace holding the hour stem has a gold border (the person asking). “Void” marks an empty xun; “Horse” marks the travelling horse. Tap any palace for a plain-language note. Rotating Qi Men (hour-based), determined by the拆补 (split-supplement) method.',
    'qimen.fuyin': 'Fu Yin chart', 'qimen.fuyinNote': 'Stars and doors return to their home palaces — hold, do not push.',
    'qimen.fanyin': 'Fan Yin chart', 'qimen.fanyinNote': 'Stars and doors sit opposite their home palaces — quick but repetitive.',
    'drawer.close': 'Close', 'drawer.tapNote': 'Tap for notes',
    'drawer.starEmpty': 'This palace is empty for now',
    'drawer.borrow': 'This palace is empty — read it together with the opposite',
    'drawer.noHua': 'No Four Transformations land in this chart this year.',
    'drawer.opp': 'Opposite',
    'drawer.sec1': 'What this palace says', 'drawer.sec2': 'Where the Four Transformations go', 'drawer.sec3': 'Three Directions & Four Palaces', 'drawer.sec4': 'What this palace covers',
    'drawer.noText': 'There is no reading written for this palace yet — look at another one.',
    'ss.kind': 'Star', 'ss.sec': 'See what it says by dimension',
    'ss.cite': 'Based on this site’s text library, rewritten in plain language — not a fixed fate verdict.',
    'daily.tag': 'Daily line', 'daily.src': 'Ten God · favorable / unfavorable',
    'qcell.kong': 'Void', 'qcell.ma': 'Horse',
    'qcell.kongNote': 'Void palace: matters hang in the air and plans may change.',
    'qcell.maNote': 'Travelling horse: action, travel, news.',
    'qgrid.aria': 'Qi Men Nine Palaces chart', 'qgrid.year': 'Y', 'qgrid.month': 'M', 'qgrid.day': 'D', 'qgrid.hour': 'H',
    'qgrid.zhifu': 'Value Officer', 'qgrid.zhishi': 'Value Envoy', 'qgrid.land': 'in',
    'bcard.dayMaster': 'Day Master', 'bcard.strength': 'Strength', 'bcard.pattern': 'Structure', 'bcard.xi': 'Favorable', 'bcard.ji': 'Unfavorable',
    'bcard.help': 'support',
    'source.label': 'Show Chinese source text',
    'source.body': 'Chinese source text',
    'intro.1.title': 'ArrangeStar', 'intro.1.sub': 'Zi Wei Dou Shu · Ba Zi · Qi Men Dun Jia',
    'intro.1.desc': 'Three arts in one star chart. Cast and read a chart anytime.',
    'intro.2.title': 'Zi Wei Dou Shu', 'intro.2.sub': 'Twelve palaces · Four Transformations · life stages',
    'intro.2.desc': 'Start from the natal chart, then unfold each life stage. Tap a palace to read its stars.',
    'intro.3.title': 'Ba Zi', 'intro.3.sub': 'Four Pillars · Ten Gods · favorable elements',
    'intro.3.desc': 'A daily line drawn from your own chart, grounded rather than vague.',
    'intro.4.title': 'Qi Men Dun Jia', 'intro.4.sub': 'Nine palaces · Eight Gates · categorical responses',
    'intro.4.desc': 'Cast a nine-palace chart, with ten lessons and an eight-step walkthrough alongside.',
    'intro.5.title': 'Stays on this device', 'intro.5.sub': 'No network · no upload · no collection',
    'intro.5.desc': 'Charts and archives are saved in this browser only, and can be cleared anytime.',
    'intro.skip': 'Skip', 'intro.next': 'Next', 'intro.start': 'Enter ArrangeStar', 'intro.back': 'Back', 'intro.replay': 'Replay intro',
  },
};

// ── 命理术语对照 ────────────────────────────────────────────
export const TERMS: Record<string, string> = {
  // 三式与总称
  '紫微斗数': 'Zi Wei Dou Shu', '八字': 'Ba Zi', '奇门遁甲': 'Qi Men Dun Jia', '星垣': 'ArrangeStar',
  '紫微': 'Ziwei', '天府': 'Tianfu', '命盘': 'chart', '盘': 'chart',
  // 十二宫
  '命宫': 'Life Palace', '兄弟': 'Siblings', '夫妻': 'Spouse', '子女': 'Children',
  '财帛': 'Wealth', '疾厄': 'Health', '迁移': 'Travel', '交友': 'Friends',
  '官禄': 'Career', '田宅': 'Property', '福德': 'Blessings', '父母': 'Parents',
  '身宫': 'Body Palace', '空宫': 'Empty palace',
  // 层数与四化
  '本命': 'Natal', '大限': 'Major Limit', '流年': 'Annual', '流月': 'Monthly', '流日': 'Daily',
  '禄': 'Prosperity', '权': 'Authority', '科': 'Fame', '忌': 'Affliction',
  '四化': 'Four Transformations', '化禄': 'Prosperity', '化权': 'Authority', '化科': 'Fame', '化忌': 'Affliction',
  // 十四主星
  '天机': 'Tianji', '太阳': 'Sun', '武曲': 'Wuqu', '天同': 'Tiantong', '廉贞': 'Lianzhen',
  '太阴': 'Moon', '贪狼': 'Tanlang', '巨门': 'Jumen', '天相': 'Tianxiang', '天梁': 'Tianliang',
  '破军': 'Pojun',
  // 辅佐杂曜
  '文昌': 'Wenchang', '文曲': 'Wenqu', '左辅': 'Zuofu', '右弼': 'Youbi',
  '天魁': 'Tiankui', '天钺': 'Tianyue', '禄存': 'Lucun', '火星': 'Mars', '铃星': 'Rahu',
  '擎羊': 'Qingyang', '陀罗': 'Tuoluo', '天马': 'Sky Horse', '解神': 'Relief',
  // 辅星杂曜
  '地劫': 'Earth Robbery', '地空': 'Earth Void', '天刑': 'Heavenly Punishment',
  '天哭': 'Heavenly Wail', '天虚': 'Heavenly Emptiness', '天贵': 'Heavenly Nobility',
  '天寿': 'Heavenly Longevity', '咸池': 'Salt Pool', '三台': 'Three Terraces',
  '封诰': 'Imperial Edict', '天喜': 'Heavenly Joy', '天姚': 'Heavenly Seduction',
  '寡宿': 'Solitary Star', '凤阁': 'Phoenix Pavilion', '恩光': 'Grace Light',
  '破碎': 'Fragmentation', '天福': 'Heavenly Fortune', '台辅': 'Minister Assistant',
  '天空': 'Sky Void', '孤辰': 'Solitary Hour', '阴煞': 'Yin Sha',
  '红鸾': 'Red Phoenix', '龙池': 'Dragon Pond', '天才': 'Heavenly Talent',
  '八座': 'Eight Seats', '天官': 'Heavenly Official', '天巫': 'Heavenly Shaman',
  '月马': 'Monthly Horse', '年马': 'Yearly Horse', '龙德': 'Dragon Virtue',
  '天德': 'Heavenly Virtue', '岁破': 'Year Breaker',
  // 亮度
  '庙': 'Exalted', '旺': 'Strong', '平': 'Even', '陷': 'Weak', '得地': 'Favorable',
  '利益': 'Beneficial', '和平': 'Neutral', '不得地': 'Unfavorable', '利': 'Favorable',
  // 长生十二神
  '长生': 'Birth', '沐浴': 'Bath', '冠带': 'Cap', '临官': 'Official', '帝旺': 'Peak',
  '衰': 'Decline', '病': 'Sickness', '死': 'Death', '墓': 'Grave', '绝': 'Extinction', '胎': 'Fetus', '养': 'Nurture',
  // 博士十二神
  '博士': 'Scholar', '力士': 'Strongman', '青龙': 'Azure Dragon', '小耗': 'Small Loss', '将军': 'General',
  '奏书': 'Recorder', '蜚廉': 'Slanderer', '喜神': 'Joy', '病符': 'Sickness Talisman',
  '大耗': 'Great Loss', '伏兵': 'Ambush', '官府': 'Officialdom',
  // 五行局
  '水二局': 'Water Two', '木三局': 'Wood Three', '金四局': 'Metal Four',
  '土五局': 'Earth Five', '火六局': 'Fire Six',
  // 天干
  '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu', '己': 'Ji',
  '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui',
  // 地支
  '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si',
  '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai',
  // 五行与阴阳
  '木': 'Wood', '火': 'Fire', '土': 'Earth', '金': 'Metal', '水': 'Water',
  '阳': 'Yang', '阴': 'Yin', '五行': 'Five Elements',
  '女': 'Female', '男': 'Male',
  // 十神
  '比肩': 'Friend', '劫财': 'Rob Wealth', '食神': 'Eating God', '伤官': 'Hurting Officer',
  '偏财': 'Indirect Wealth', '正财': 'Direct Wealth', '七杀': 'Seven Killings', '正官': 'Direct Officer',
  '偏印': 'Indirect Resource', '正印': 'Direct Resource',
  '比劫': 'Friend / Rob Wealth', '食伤': 'Output', '财': 'Wealth', '官杀': 'Officer / Killings', '印': 'Resource',
  // 八字结构
  '日主': 'Day Master', '四柱': 'Four Pillars', '年柱': 'Year Pillar', '月柱': 'Month Pillar',
  '日柱': 'Day Pillar', '时柱': 'Hour Pillar', '十神': 'Ten Gods', '藏干': 'Hidden stems',
  '纳音': 'Na Yin', '大运': 'Major Fortune', '起运': 'Fortune begins',
  '旺衰': 'Strength', '格局': 'Structure', '喜': 'Favorable',
  '身旺': 'Strong Day Master', '身弱': 'Weak Day Master', '偏旺': 'Slightly strong',
  '偏弱': 'Slightly weak', '中和': 'Balanced', '太旺': 'Very strong', '太弱': 'Very weak',
  '从旺': 'Follow-the-strong', '从弱': 'Follow-the-weak', '从格': 'Follow pattern',
  '正格': 'Regular pattern', '调候': 'Climate regulation', '通关': 'Mediation',
  '月令': 'Month command', '本气': 'Primary qi', '中气': 'Secondary qi', '余气': 'Residual qi',
  '帮身': 'support the Day Master', '耗身': 'drain the Day Master',
  '顺行': 'forward', '逆行': 'backward', '天干': 'Heavenly stem', '地支': 'Earthly branch',
  // 六十甲子纳音
  '海中金': 'Gold in the Sea', '炉中火': 'Fire in the Furnace', '大林木': 'Great Forest Wood',
  '路旁土': 'Roadside Earth', '剑锋金': 'Blade Gold', '山头火': 'Mountaintop Fire',
  '涧下水': 'Mountain Stream Water', '城头土': 'City Wall Earth', '白蜡金': 'White Wax Gold',
  '杨柳木': 'Willow Wood', '泉中水': 'Spring Water', '屋上土': 'Rooftop Earth',
  '霹雳火': 'Thunderbolt Fire', '松柏木': 'Pine and Cypress Wood', '长流水': 'Flowing Water',
  '沙中金': 'Gold in Sand', '山下火': 'Foot-of-Mountain Fire', '平地木': 'Level Ground Wood',
  '壁上土': 'Wall Earth', '金箔金': 'Gold Leaf', '覆灯火': 'Lamp Fire', '天河水': 'Milky Way Water',
  '大驿土': 'Great Highway Earth', '钗钏金': 'Jewellery Gold', '桑柘木': 'Mulberry Wood',
  '大溪水': 'Great Stream Water', '沙中土': 'Sand Earth', '天上火': 'Heavenly Fire',
  '石榴木': 'Pomegranate Wood', '大海水': 'Great Sea Water',
  // 神煞
  '神煞': 'Shen Sha', '天乙贵人': 'Tian Yi Noble', '文昌贵人': 'Wenchang Noble',
  '驿马': 'Travelling Horse', '桃花': 'Peach Blossom', '华盖': 'Canopy',
  '将星': 'General Star', '劫煞': 'Robbery Star', '亡神': 'Death Spirit',
  // 奇门九宫
  '坎一宫': 'Kan 1', '坤二宫': 'Kun 2', '震三宫': 'Zhen 3', '巽四宫': 'Xun 4', '中五宫': 'Central 5',
  '乾六宫': 'Qian 6', '兑七宫': 'Dui 7', '艮八宫': 'Gen 8', '离九宫': 'Li 9',
  '正北': 'North', '东北': 'Northeast', '正东': 'East', '东南': 'Southeast', '正南': 'South',
  '西南': 'Southwest', '正西': 'West', '西北': 'Northwest', '中': 'Center',
  '坎': 'Kan', '坤': 'Kun', '震': 'Zhen', '巽': 'Xun', '乾': 'Qian', '兑': 'Dui', '艮': 'Gen', '离': 'Li',
  // 九星
  '天蓬': 'Tianpeng', '天芮': 'Tianrui', '天冲': 'Tianchong', '天辅': 'Tianfu', '天禽': 'Tianqin',
  '天心': 'Tianxin', '天柱': 'Tianzhu', '天任': 'Tianren', '天英': 'Tianying', '天芮禽': 'Tianrui-Qin',
  // 八门
  '休门': 'Rest Door', '生门': 'Life Door', '伤门': 'Injury Door', '杜门': 'Blockage Door',
  '景门': 'Vision Door', '死门': 'Death Door', '惊门': 'Shock Door', '开门': 'Open Door',
  // 八神
  '值符': 'Value Officer', '腾蛇': 'Flying Serpent', '六合': 'Six Harmonies',
  '白虎': 'White Tiger', '玄武': 'Black Tortoise', '九地': 'Nine Earth', '九天': 'Nine Heaven',
  // 奇门判断
  '四吉方位': 'Four auspicious directions', '吉方': 'Auspicious direction', '缓行': 'Proceed slowly',
  '克应': 'Ke Ying (categorical response)', '时干': 'hour stem', '日干': 'day stem', '旬首': 'xun head',
  '伏吟': 'Fu Yin', '反吟': 'Fan Yin', '空亡': 'Void', '落空': 'Void',
  '吉': 'Auspicious', '凶': 'Inauspicious', '大吉': 'Highly auspicious', '大凶': 'Highly inauspicious',
  '比和': 'Harmonious', '门生': 'Door generates palace', '宫生门': 'Palace generates door',
  '门迫': 'Door constrained', '门制': 'Door controlled', '五不遇时': 'Five Non-Meetings hour',
  '六仪击刑': 'Six Yi punishment', '九遁': 'Nine Dun', '三诈': 'Three Deceptions', '五假': 'Five Guises',
  '上元': 'Upper Yuan', '中元': 'Middle Yuan', '下元': 'Lower Yuan',
  '拆补法': 'split-supplement method', '置闰法': 'intercalary method', '阳遁': 'Yang Dun', '阴遁': 'Yin Dun',
  // 二十四节气
  '冬至': 'Winter Solstice', '小寒': 'Lesser Cold', '大寒': 'Greater Cold', '立春': 'Start of Spring',
  '雨水': 'Rain Water', '惊蛰': 'Awakening of Insects', '春分': 'Spring Equinox', '清明': 'Pure Brightness',
  '谷雨': 'Grain Rain', '立夏': 'Start of Summer', '小满': 'Grain Budding', '芒种': 'Grain in Ear',
  '夏至': 'Summer Solstice', '小暑': 'Lesser Heat', '大暑': 'Greater Heat', '立秋': 'Start of Autumn',
  '处暑': 'End of Heat', '白露': 'White Dew', '秋分': 'Autumn Equinox', '寒露': 'Cold Dew',
  '霜降': 'Frost Descent', '立冬': 'Start of Winter', '小雪': 'Lesser Snow', '大雪': 'Greater Snow',
};
