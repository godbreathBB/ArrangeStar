// qimen.ts — 奇门遁甲（时家转盘）排盘引擎（TypeScript 版）
// 对应 Python 端 qimen_core.py。节气/干支接 lunar-typescript。
import { Solar } from 'lunar-typescript';
import { assertDateOnly, assertDateTime } from './validate.ts';

export const GAN = '甲乙丙丁戊己庚辛壬癸';
export const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const mod = (n: number, m: number): number => {
  if (!Number.isFinite(n) || !Number.isFinite(m) || m <= 0) {
    throw new Error(`模运算参数非法（n=${String(n)}, m=${String(m)}）`);
  }
  return ((n % m) + m) % m;
};

// ── 九宫基本盘 ──
const CIRCLE = [1, 8, 3, 4, 9, 2, 7, 6];          // 九宫顺时针一圈（北起）
const GONG_NAME: Record<number, string> = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };
const GONG_TRIGRAM: Record<number, string> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
const GONG_DIR: Record<number, string> = { 1: '正北', 8: '东北', 3: '正东', 4: '东南', 9: '正南', 2: '西南', 7: '正西', 6: '西北', 5: '中' };
const GONG_WX: Record<number, string> = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };

const STAR_HOME: Record<number, string> = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
const DOOR_HOME: Record<number, string> = { 1: '休门', 8: '生门', 3: '伤门', 4: '杜门', 9: '景门', 2: '死门', 7: '惊门', 6: '开门' };
const SHENS = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

const YI_SEQ = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
const XUN_YI = ['戊', '己', '庚', '辛', '壬', '癸'];
const XUN_NAME = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];

const JU_TABLE: Record<string, [number, number, number]> = {
  '冬至': [1, 7, 4], '小寒': [2, 8, 5], '大寒': [3, 9, 6],
  '立春': [8, 5, 2], '雨水': [9, 6, 3], '惊蛰': [1, 7, 4],
  '春分': [3, 9, 6], '清明': [4, 1, 7], '谷雨': [5, 2, 8],
  '立夏': [4, 1, 7], '小满': [5, 2, 8], '芒种': [6, 3, 9],
  '夏至': [9, 3, 6], '小暑': [8, 2, 5], '大暑': [7, 1, 4],
  '立秋': [2, 5, 8], '处暑': [1, 4, 7], '白露': [9, 3, 6],
  '秋分': [7, 1, 4], '寒露': [6, 9, 3], '霜降': [5, 8, 2],
  '立冬': [6, 9, 3], '小雪': [5, 8, 2], '大雪': [4, 7, 1],
};
const YANG_JIEQI = new Set(['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种']);

const SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const KE: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
const STAR_WX: Record<string, string> = { '天蓬': '水', '天芮': '土', '天冲': '木', '天辅': '木', '天禽': '土', '天心': '金', '天柱': '金', '天任': '土', '天英': '火' };
const DOOR_WX: Record<string, string> = { '休门': '水', '生门': '土', '伤门': '木', '杜门': '木', '景门': '火', '死门': '土', '惊门': '金', '开门': '金' };
const GAN_WX: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };

const LIUYI_JIXING: Record<string, number> = { '戊': 3, '己': 2, '庚': 8, '辛': 9, '壬': 4, '癸': 4 };

const BRANCH_GONG: Record<string, number> = { '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 9, '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6 };
const MA: Record<string, string> = { '申': '寅', '子': '寅', '辰': '寅', '寅': '申', '午': '申', '戌': '申', '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳' };
const XUN_KONG: Record<string, string> = { '甲子': '戌亥', '甲戌': '申酉', '甲申': '午未', '甲午': '辰巳', '甲辰': '寅卯', '甲寅': '子丑' };

// ── 十干克应（81 组）+ 九遁三诈五假 ──
const KEKYING: Record<string, { name: string; level: string; text: string }> = {
  "戊戊": {"name": "伏吟", "level": "平", "text": "天盘戊加地盘戊，谓之伏吟，凡事闭塞，宜静守不宜动。"},
  "戊乙": {"name": "青龙合灵", "level": "平", "text": "戊加乙为青龙合灵，门吉则事吉，门凶则事凶，吉凶以门为准。"},
  "戊丙": {"name": "青龙返首", "level": "吉", "text": "戊加丙为青龙返首，动作大利，但若逢墓迫击刑，则吉事变凶。"},
  "戊丁": {"name": "青龙耀明", "level": "吉", "text": "戊加丁为青龙耀明，谒贵求名吉利；若值墓迫，反招是非。"},
  "戊己": {"name": "贵人入狱", "level": "凶", "text": "戊加己为贵人入狱，公私皆不利，宜守不宜求。"},
  "戊庚": {"name": "值符飞宫", "level": "凶", "text": "戊加庚为值符飞宫，吉事不吉，凶事更凶。"},
  "戊辛": {"name": "青龙折足", "level": "凶", "text": "戊加辛为青龙折足，吉门生助尚可谋为；逢凶门招灾失财，防足疾。"},
  "戊壬": {"name": "青龙入天牢", "level": "凶", "text": "戊加壬为青龙入天牢，阴事阳事都不利，宜避锋芒。"},
  "戊癸": {"name": "青龙华盖", "level": "吉", "text": "戊加癸为青龙华盖，吉格者招福，若门凶则多乖舛。"},
  "乙戊": {"name": "利阴害阳", "level": "凶", "text": "乙加戊为利阴害阳，门逢凶迫则财破人伤。"},
  "乙乙": {"name": "日奇伏吟", "level": "平", "text": "乙加乙为日奇伏吟，不宜谒贵求名，只可安分守身。"},
  "乙丙": {"name": "奇仪顺遂", "level": "吉", "text": "乙加丙为奇仪顺遂，遇吉星可迁官进职；遇凶星则夫妻离别。"},
  "乙丁": {"name": "奇仪相佐", "level": "吉", "text": "乙加丁为奇仪相佐，传送文书吉利，百事可为。"},
  "乙己": {"name": "日奇入雾", "level": "平", "text": "乙加己为日奇入雾，前程不明；得凶门必凶，得二吉门为地遁。"},
  "乙庚": {"name": "日奇被刑", "level": "凶", "text": "乙加庚为日奇被刑，争讼败产，夫妻各怀私心。"},
  "乙辛": {"name": "青龙逃走", "level": "凶", "text": "乙加辛为青龙逃走，奴仆拐带，六畜皆伤，防破财。"},
  "乙壬": {"name": "日奇入地", "level": "凶", "text": "乙加壬为日奇入地，尊卑悖乱，官讼是非。"},
  "乙癸": {"name": "华盖逢星官", "level": "吉", "text": "乙加癸为华盖逢星官，宜遁迹修道、隐匿藏形，躲灾避难为吉。"},
  "丙戊": {"name": "飞鸟跌穴", "level": "吉", "text": "丙加戊为飞鸟跌穴，谋为百事洞明，进财进喜。"},
  "丙乙": {"name": "日月并明", "level": "吉", "text": "丙加乙为日月并行，公谋私为皆吉。"},
  "丙丙": {"name": "月奇悖师", "level": "凶", "text": "丙加丙为月奇悖师，文书逼迫，破耗遗失。"},
  "丙丁": {"name": "月奇朱雀", "level": "吉", "text": "丙加丁为月奇朱雀，贵人文书吉利，常人平静；得三奇门为天遁。"},
  "丙己": {"name": "大悖入刑", "level": "凶", "text": "丙加己为大悖入刑，囚人刑杖，文书不行；得吉门吉，凶门转凶。"},
  "丙庚": {"name": "荧入太白", "level": "凶", "text": "丙加庚为荧入太白，门户破败，盗贼耗失，宜守不宜攻。"},
  "丙辛": {"name": "谋事就成", "level": "吉", "text": "丙加辛为谋事就成，病人遇之不凶，事可谋成。"},
  "丙壬": {"name": "火入天罗", "level": "凶", "text": "丙加壬为火入天罗，为客不利，是非颇多。"},
  "丙癸": {"name": "华盖悖师", "level": "凶", "text": "丙加癸为华盖悖师，阴人害事，灾祸颇生。"},
  "丁戊": {"name": "青龙转光", "level": "吉", "text": "丁加戊为青龙转光，官人升迁，常人威昌。"},
  "丁乙": {"name": "人遁吉格", "level": "吉", "text": "丁加乙为人遁吉格，贵人加官进爵，常人婚姻财喜。"},
  "丁丙": {"name": "星随月转", "level": "吉", "text": "丁加丙为星随月转，贵人越级高升，常人乐中生悲。"},
  "丁丁": {"name": "奇入太阴", "level": "吉", "text": "丁加丁为奇入太阴，文书即至，喜事遂心。"},
  "丁己": {"name": "火入勾陈", "level": "凶", "text": "丁加己为火入勾陈，奸私仇冤，事因女人而起。"},
  "丁庚": {"name": "年月日时格", "level": "平", "text": "丁加庚为年月日时格，文书阻隔，行人必归。"},
  "丁辛": {"name": "朱雀入狱", "level": "平", "text": "丁加辛为朱雀入狱，罪人释囚，官人失位。"},
  "丁壬": {"name": "五神互合", "level": "吉", "text": "丁加壬为五神互合，贵人恩诏，讼狱公平。"},
  "丁癸": {"name": "朱雀投江", "level": "凶", "text": "丁加癸为朱雀投江，文书口舌，音信沉溺。"},
  "己戊": {"name": "犬遇青龙", "level": "平", "text": "己加戊为犬遇青龙，门吉谋望遂意，门凶枉费心机。"},
  "己乙": {"name": "墓神不明", "level": "平", "text": "己加乙为墓神不明，宜遁迹隐形，逃走为利。"},
  "己丙": {"name": "火悖地户", "level": "凶", "text": "己加丙为火悖地户，阳人冤冤相害，阴人淫污。"},
  "己丁": {"name": "朱雀入墓", "level": "平", "text": "己加丁为朱雀入墓，文状词讼，先曲后直。"},
  "己己": {"name": "地户逢鬼", "level": "凶", "text": "己加己为地户逢鬼，病者必死，百事不遂。"},
  "己庚": {"name": "刑格返名", "level": "凶", "text": "己加庚为刑格返名，词讼先动者不利，阴星有谋害之情。"},
  "己辛": {"name": "游魂入墓", "level": "凶", "text": "己加辛为游魂入墓，大人鬼魅，小人作祟。"},
  "己壬": {"name": "地网高张", "level": "凶", "text": "己加壬为地网高张，狡童佚女，奸情伤杀。"},
  "己癸": {"name": "地刑玄武", "level": "凶", "text": "己加癸为地刑玄武，男女疾病垂危，词讼有牢狱之灾。"},
  "庚戊": {"name": "太白天乙伏宫", "level": "凶", "text": "庚加戊为太白天乙伏宫，百事不可谋，为凶。"},
  "庚乙": {"name": "太白蓬星", "level": "平", "text": "庚加乙为太白蓬星，退吉进凶，宜守不宜攻。"},
  "庚丙": {"name": "太白入荧", "level": "凶", "text": "庚加丙为太白入荧，贼必来，为客进利，为主破财。"},
  "庚丁": {"name": "亭亭之格", "level": "平", "text": "庚加丁为亭亭之格，因私情起官司，门吉有救。"},
  "庚己": {"name": "刑格", "level": "凶", "text": "庚加己为刑格，官司受重刑，最不宜行。"},
  "庚庚": {"name": "太白同宫", "level": "凶", "text": "庚加庚为太白同宫，官灾横祸，兄弟雷攻。"},
  "庚辛": {"name": "白虎干格", "level": "凶", "text": "庚加辛为白虎干格，远行车折马死，出行防意外。"},
  "庚壬": {"name": "上格", "level": "凶", "text": "庚加壬为上格，远行迷失道路，音信难通。"},
  "庚癸": {"name": "大格", "level": "凶", "text": "庚加癸为大格，行人至官司止，生产母子俱伤，大凶。"},
  "辛戊": {"name": "困龙被伤", "level": "凶", "text": "辛加戊为困龙被伤，官司破败，宜屈抑守分，妄动有祸殃。"},
  "辛乙": {"name": "白虎猖狂", "level": "凶", "text": "辛加乙为白虎猖狂，人亡家败，远行多殃，车船俱伤。"},
  "辛丙": {"name": "干合悖师", "level": "凶", "text": "辛加丙为干合悖师，荧惑出现，占事必因财致讼。"},
  "辛丁": {"name": "狱神得奇", "level": "吉", "text": "辛加丁为狱神得奇，经商获倍利，囚人逢赦。"},
  "辛己": {"name": "入狱自刑", "level": "凶", "text": "辛加己为入狱自刑，奴仆背主，讼诉难伸。"},
  "辛庚": {"name": "白虎出力", "level": "凶", "text": "辛加庚为白虎出力，刀刃相接，主客相残，逊让稍可。"},
  "辛辛": {"name": "伏吟天庭", "level": "凶", "text": "辛加辛为伏吟天庭，公废私就，讼狱自罹罪名。"},
  "辛壬": {"name": "凶蛇入狱", "level": "凶", "text": "辛加壬为凶蛇入狱，两男争女，先动失理。"},
  "辛癸": {"name": "天牢华盖", "level": "凶", "text": "辛加癸为天牢华盖，日月失明，误入天网，诸事乖张。"},
  "壬戊": {"name": "小蛇化龙", "level": "吉", "text": "壬加戊为小蛇化龙，男人发达，女产婴童。"},
  "壬乙": {"name": "小蛇日奇", "level": "吉", "text": "壬加乙为小蛇日奇，女子柔顺，男子嗟叹，占孕生男。"},
  "壬丙": {"name": "水蛇入火", "level": "凶", "text": "壬加丙为水蛇入火，官灾刑禁，络绎不绝。"},
  "壬丁": {"name": "干合蛇刑", "level": "平", "text": "壬加丁为干合蛇刑，文书牵连，男吉女凶。"},
  "壬己": {"name": "凶蛇入墓", "level": "凶", "text": "壬加己为凶蛇入墓，大祸将至，顺守斯吉，词讼理曲。"},
  "壬庚": {"name": "太白擒蛇", "level": "吉", "text": "壬加庚为太白擒蛇，刑狱公平，立剖邪正。"},
  "壬辛": {"name": "螣蛇相缠", "level": "凶", "text": "壬加辛为螣蛇相缠，纵得吉门亦不能安，谋望被人欺瞒。"},
  "壬壬": {"name": "蛇入地罗", "level": "平", "text": "壬加壬为蛇入地罗，外入缠绕，内事烦琐，吉门吉星可免蹉跎。"},
  "壬癸": {"name": "幼女奸淫", "level": "凶", "text": "壬加癸为幼女奸淫，家有丑声，门吉星凶反祸。"},
  "癸戊": {"name": "天乙会合", "level": "吉", "text": "癸加戊为天乙会合，财喜婚姻，吉人相助；门凶迫制反祸官非。"},
  "癸乙": {"name": "华盖逢星", "level": "吉", "text": "癸加乙为华盖逢星，贵人禄位，常人平安。"},
  "癸丙": {"name": "华盖悖师", "level": "平", "text": "癸加丙为华盖悖师，贵贱逢之，命好者喜事临门。"},
  "癸丁": {"name": "螣蛇夭矫", "level": "凶", "text": "癸加丁为螣蛇夭矫，文书官司，火焚莫逃。"},
  "癸己": {"name": "华盖地户", "level": "平", "text": "癸加己为华盖地户，音信皆阻，躲灾避难为吉。"},
  "癸庚": {"name": "太白入网", "level": "平", "text": "癸加庚为太白入网，以暴争讼，力平方平。"},
  "癸辛": {"name": "网盖天牢", "level": "凶", "text": "癸加辛为网盖天牢，占讼占病，死罪难逃。"},
  "癸壬": {"name": "复见螣蛇", "level": "凶", "text": "癸加壬为复见螣蛇，嫁娶重婚，无子不保年华。"},
  "癸癸": {"name": "天网四张", "level": "凶", "text": "癸加癸为天网四张，行人失伴，病讼皆伤。"},
};

const DUNFA: Record<string, { level: string; text: string }> = {
  "天遁": {"level": "吉", "text": "开、休、生三吉门，天盘丙奇加地盘丁奇，或临九地、太阴，为天遁。可以遁迹隐形，乘天德月德等吉神，百事皆吉。"},
  "地遁": {"level": "吉", "text": "开、休、生三吉门合乙奇，临地盘六合、九地、太阴，为地遁。得日精所护，宜筑造起造、葬埋藏匿，百事皆吉。"},
  "人遁": {"level": "吉", "text": "开、休、生三吉门合三奇临六合，或生门三奇临太阴、生门乙奇临九地，为人遁。宜和合人事，求财喜、谋望遂心。"},
  "风遁": {"level": "吉", "text": "开、休、生合乙奇，临六辛落巽宫，为风遁。此方宜祭风，行兵利火攻。"},
  "云遁": {"level": "吉", "text": "开、休、生合乙奇临六辛宫，或生门天芮临坤、三吉门合辛临乙，为云遁。冬宜祈雪，夏宜求雨。"},
  "龙遁": {"level": "吉", "text": "开、休、生合天心星、六壬于坎宫，为龙遁。此方祈雨必应，水战必胜。"},
  "虎遁": {"level": "吉", "text": "开门合庚临兑宫，或休门乙奇加辛于艮、生门辛加乙于艮，为虎遁。宜祭风、镇邪、安宅，利为客。"},
  "神遁": {"level": "吉", "text": "开门乙奇合天心、天禽星临九天于乾宫，为神遁。此方宜祭祀祈祷，神必暗助。"},
  "鬼遁": {"level": "吉", "text": "休门天辅辛临丁奇，或生门太阴、九地临丁奇，为鬼遁。宜探路侦贼、用间谋，宅中有异宜书符镇之。"},
  "真诈": {"level": "吉", "text": "开、休、生三吉门合三奇，临地盘太阴宫，为真诈。宜施恩隐遁、祈祷求位，吉。"},
  "重诈": {"level": "吉", "text": "开、休、生三吉门合三奇，临地盘六合宫，为重诈。宜收降添兵、纳财袭爵、拜印绶，吉。"},
  "休诈": {"level": "吉", "text": "开、休、生三吉门合三奇，临地盘九地宫，为休诈。宜合药祈福、禳灾祭祀、施恩隐遁，大吉。"},
  "天假": {"level": "吉", "text": "景门合乙丙丁三奇，临地盘九天宫，为天假。宜陈述事务、谒贵求官，大吉。"},
  "地假": {"level": "吉", "text": "杜门合丁己癸，临九地、太阴或六合宫，为地假。宜潜藏埋伏、躲避灾难。"},
  "人假": {"level": "吉", "text": "惊门合六合或六壬，临地盘九天宫，为人假。宜捕捉逃亡，若太白荧惑入己必获。"},
  "神假": {"level": "吉", "text": "伤门合丁己癸，临地盘九地宫，为神假。宜埋葬伏藏，人不能知。"},
  "鬼假": {"level": "吉", "text": "死门合丁己癸，临地盘九地宫，为鬼假。宜超亡荐度。"},
};

function _gz_idx(gz: string): number {
  const g = GAN.indexOf(gz[0]), z = ZHI.indexOf(gz[1]);
  for (let k = 0; k < 60; k++) if (k % 10 === g && k % 12 === z) return k;
  throw new Error('bad ganzhi: ' + gz);
}
function _idx_gz(k: number): string {
  return GAN[k % 10] + ZHI[k % 12];
}
function yuan_of_day(day_gz: string): [string, string] {
  const k = _gz_idx(day_gz);
  const head = k - (k % 5);
  const head_gz = _idx_gz(head);
  const z = head_gz[1];
  if ('子午卯酉'.includes(z)) return ['上元', head_gz];
  if ('寅申巳亥'.includes(z)) return ['中元', head_gz];
  return ['下元', head_gz];
}
function jieqi_for_day(solar: any): any {
  const l = solar.getLunar();
  let jq = l.getPrevJieQi();
  let jd = jq.getSolar();
  if (jd.getYear() === solar.getYear() && jd.getMonth() === solar.getMonth() && jd.getDay() === solar.getDay()) {
    // 用库的日期回退，避免月初 day-1 / day-2 直接减出 0 而抛错
    const p1 = solar.next(-1);
    const s_yest = Solar.fromYmdHms(p1.getYear(), p1.getMonth(), p1.getDay(), 12, 0, 0);
    let jq2 = s_yest.getLunar().getPrevJieQi();
    const jd2 = jq2.getSolar();
    if (jd2.getYear() === s_yest.getYear() && jd2.getMonth() === s_yest.getMonth() && jd2.getDay() === s_yest.getDay()) {
      const p2 = solar.next(-2);
      const s2 = Solar.fromYmdHms(p2.getYear(), p2.getMonth(), p2.getDay(), 12, 0, 0);
      jq2 = s2.getLunar().getPrevJieQi();
    }
    jq = jq2;
  }
  return jq;
}
function _walk_palaces(start: number, dun: string): number[] {
  const seq: number[] = [];
  let p = start;
  for (let i = 0; i < 9; i++) {
    seq.push(p);
    p = dun === '阳' ? p + 1 : p - 1;
    if (p > 9) p = 1;
    if (p < 1) p = 9;
  }
  return seq;
}
function _pos(p: number): number {
  return CIRCLE.indexOf(p);
}

export function qimen_fushi(dun: string, ju: number, hour_gz: string): [string, number, string, number] {
  const walk = _walk_palaces(ju, dun);
  const di: Record<number, string> = {};
  walk.forEach((p, i) => { di[p] = YI_SEQ[i]; });
  const yi_pal: Record<string, number> = {};
  for (const [p, y] of Object.entries(di)) yi_pal[y] = Number(p);
  const t = _gz_idx(hour_gz);
  const xun = XUN_NAME[Math.floor(t / 10)];
  const xun_yi = XUN_YI[Math.floor(t / 10)];
  const zf_pal = yi_pal[xun_yi];
  const zf_star = STAR_HOME[zf_pal];
  const zs_door = DOOR_HOME[zf_pal === 5 ? 2 : zf_pal];
  const hour_gan = hour_gz[0];
  const target_gan = hour_gan === '甲' ? xun_yi : hour_gan;
  const target_pal = yi_pal[target_gan];
  const zf_land = target_pal === 5 ? 2 : target_pal;
  const steps = mod(ZHI.indexOf(hour_gz[1]) - ZHI.indexOf(xun[1]), 12);
  let p = zf_pal;
  for (let i = 0; i < steps; i++) {
    p = dun === '阳' ? p + 1 : p - 1;
    if (p > 9) p = 1;
    if (p < 1) p = 9;
  }
  const zs_land = p === 5 ? 2 : p;
  return [zf_star, zf_land, zs_door, zs_land];
}

// ── 日家奇门 ──
const DOOR8 = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];
const DOOR_JI: Record<string, string> = { '休门': '吉', '生门': '吉', '开门': '吉', '景门': '平', '伤门': '凶', '杜门': '凶', '死门': '凶', '惊门': '凶' };
const STAR9 = ['太乙', '摄提', '轩辕', '招摇', '天符', '青龙', '咸池', '太阴', '天乙'];
const STAR9_JI: Record<string, string> = { '太乙': '吉', '青龙': '吉', '太阴': '吉', '天乙': '吉', '摄提': '凶', '轩辕': '凶', '招摇': '凶', '咸池': '凶', '天符': '平' };
const _XIU_SEQ = [1, 2, 3, 4, 6, 7, 8, 9];

export function daily_qimen_by_gz(day_gz: string, dun: string): any {
  const d = _gz_idx(day_gz);
  const xiu_gong = _XIU_SEQ[Math.floor(d / 3) % 8];
  const pos = CIRCLE.indexOf(xiu_gong);
  const doors: Record<string, number> = {};
  DOOR8.forEach((door, i) => { doors[door] = CIRCLE[mod(pos + i, 8)]; });
  const taiyi = dun === '阳' ? ((7 + d) % 9) + 1 : mod(1 - d, 9) + 1;
  const stars: Record<string, number> = {};
  STAR9.forEach((s, i) => {
    stars[s] = dun === '阳' ? ((taiyi - 1 + i) % 9) + 1 : mod(taiyi - 1 - i, 9) + 1;
  });
  return { xiu_gong, doors, stars, taiyi_gong: taiyi };
}

export function daily_qimen(y0: number, mo0: number, d0: number): any {
  const [y, mo, d] = assertDateOnly(y0, mo0, d0);
  const solar = Solar.fromYmdHms(y, mo, d, 12, 0, 0);
  const jq = jieqi_for_day(solar);
  const jq_name = jq.getName();
  const dun = YANG_JIEQI.has(jq_name) ? '阳' : '阴';
  const day_gz = solar.getLunar().getEightChar().getDay();
  const r = daily_qimen_by_gz(day_gz, dun);
  return Object.assign(r, { dun, day_gz, jieqi: jq_name, date: `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
}

export function qimen(y0: number, mo0: number, d0: number, hh0: number, mi0: number): any {
  const [y, mo, d, hh, mi] = assertDateTime(y0, mo0, d0, hh0, mi0);
  const solar = Solar.fromYmdHms(y, mo, d, hh, mi, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const gz_year = ec.getYear(), gz_month = ec.getMonth(), gz_day = ec.getDay(), gz_hour = ec.getTime();

  const jq = jieqi_for_day(solar);
  const jq_name = jq.getName();
  const [yuan, futou] = yuan_of_day(gz_day);
  if (!(jq_name in JU_TABLE)) throw new Error('未知节气: ' + jq_name);
  const dun = YANG_JIEQI.has(jq_name) ? '阳' : '阴';
  const ju = JU_TABLE[jq_name][['上元', '中元', '下元'].indexOf(yuan)];

  const walk = _walk_palaces(ju, dun);
  const di: Record<number, string> = {};
  walk.forEach((p, i) => { di[p] = YI_SEQ[i]; });
  const yi_pal: Record<string, number> = {};
  for (const [p, y] of Object.entries(di)) yi_pal[y] = Number(p);

  const t = _gz_idx(gz_hour);
  const group = Math.floor(t / 10);
  const xun = XUN_NAME[group];
  const xun_yi = XUN_YI[group];
  const zf_pal = yi_pal[xun_yi];
  const zf_star = STAR_HOME[zf_pal];
  const zs_door = DOOR_HOME[zf_pal === 5 ? 2 : zf_pal];
  const zs_start = zf_pal;

  const hour_gan = gz_hour[0];
  const target_gan = hour_gan === '甲' ? xun_yi : hour_gan;
  const target_pal = yi_pal[target_gan];

  const home_of: Record<string, number> = {};
  for (const [p, s] of Object.entries(STAR_HOME)) home_of[s] = Number(p);
  const carrier_star = zf_star === '天禽' ? '天芮' : zf_star;
  const zf_home = home_of[carrier_star];
  const tgt_adj = target_pal === 5 ? 2 : target_pal;
  const shift = mod(_pos(tgt_adj) - _pos(zf_home), 8);
  const tian: Record<number, string[]> = {};
  for (const [star, home] of Object.entries(home_of)) {
    if (star === '天禽') continue;
    const new_p = CIRCLE[mod(_pos(home) + shift, 8)];
    tian[new_p] = [star, di[home]];
  }
  const rui_pal = Number(Object.entries(tian).find(([, v]) => v[0] === '天芮')![0]);
  tian[rui_pal] = ['天芮', tian[rui_pal][1], '天禽', di[5]];
  const zf_land = zf_star !== '天禽' ? tgt_adj : rui_pal;

  const steps = mod(ZHI.indexOf(gz_hour[1]) - ZHI.indexOf(xun[1]), 12);
  let p = zs_start;
  for (let i = 0; i < steps; i++) {
    p = dun === '阳' ? p + 1 : p - 1;
    if (p > 9) p = 1;
    if (p < 1) p = 9;
  }
  const zs_land = p === 5 ? 2 : p;
  const home_of_door: Record<string, number> = {};
  for (const [k, v] of Object.entries(DOOR_HOME)) home_of_door[v] = Number(k);
  const door_pos_shift = mod(_pos(zs_land) - _pos(home_of_door[zs_door]), 8);
  const ren: Record<number, string> = {};
  for (const [door, home] of Object.entries(home_of_door)) {
    ren[CIRCLE[mod(_pos(home) + door_pos_shift, 8)]] = door;
  }

  const shen: Record<number, string> = {};
  const base = _pos(zf_land);
  SHENS.forEach((s, i) => {
    const step = dun === '阳' ? i : -i;
    shen[CIRCLE[mod(base + step, 8)]] = s;
  });

  const kong_branches = XUN_KONG[xun];
  const kong_palaces = [...new Set([...kong_branches].map(b => BRANCH_GONG[b]))].sort((a, b) => a - b);
  const ma_branch = MA[gz_hour[1]];
  const ma_palace = BRANCH_GONG[ma_branch];

  const geju: any[] = [];
  for (let pal = 1; pal <= 9; pal++) {
    const tv = tian[pal];
    if (!tv) continue;
    const tians = [tv[1]];
    if (tv.length > 3) tians.push(tv[3]);
    for (const ty of tians) {
      const key = ty + di[pal];
      if (key in KEKYING) {
        const g = KEKYING[key];
        geju.push({ name: g.name, level: g.level, text: g.text, palace: pal, pair: ty + '加' + di[pal] });
      }
    }
  }
  const fu_yin = shift === 0;
  const fan_yin = shift === 4;
  let wubuyu: any = null;
  if (KE[GAN_WX[gz_hour[0]]] === GAN_WX[gz_day[0]]) wubuyu = { hour: gz_hour[0], day: gz_day[0] };
  let liuyi_jixing: any = null;
  if (LIUYI_JIXING[xun_yi] === zf_pal) liuyi_jixing = { yi: xun_yi, palace: zf_pal, name: GONG_NAME[zf_pal] };
  const door_rel = (door: string, pal: number): string => {
    const dw = DOOR_WX[door], pw = GONG_WX[pal];
    if (dw === pw) return '比和';
    if (KE[dw] === pw) return '门迫';
    if (KE[pw] === dw) return '门制';
    if (SHENG[dw] === pw) return '门生';
    return '宫生门';
  };
  const month_zhi = gz_month[1];
  const MW: Record<string, string> = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' };
  const mwx = MW[month_zhi];
  const star_state: Record<string, string> = {};
  for (const [star, swx] of Object.entries(STAR_WX)) {
    if (SHENG[swx] === mwx) star_state[star] = '旺';
    else if (swx === mwx) star_state[star] = '相';
    else if (SHENG[mwx] === swx) star_state[star] = '废';
    else if (KE[mwx] === swx) star_state[star] = '囚';
    else star_state[star] = '休';
  }

  const palaces: Record<number, any> = {};
  for (let pal = 1; pal <= 9; pal++) {
    const tv = tian[pal] || null;
    const star = tv ? tv[0] : '';
    const t_yi = tv ? tv[1] : '';
    const qin_yi = tv && tv.length > 3 ? tv[3] : '';
    const door = ren[pal] || '';
    const sh = shen[pal] || '';
    palaces[pal] = {
      name: GONG_NAME[pal], trigram: GONG_TRIGRAM[pal], dir: GONG_DIR[pal], wx: GONG_WX[pal], di_yi: di[pal],
      tian_yi: t_yi, qin_yi, star, door, shen: sh,
      door_rel: door ? door_rel(door, pal) : '',
      kong: kong_palaces.includes(pal), is_ma: pal === ma_palace,
    };
  }

  const JI_MEN = new Set(['开门', '休门', '生门']);
  const SAN_QI = new Set(['乙', '丙', '丁']);
  const dunfa: any[] = [];
  const _seen_dun = new Set<string>();
  for (let pal = 1; pal <= 9; pal++) {
    const c = palaces[pal];
    const door = c.door, tg = c.tian_yi, sh = c.shen;
    if (JI_MEN.has(door) && tg === '丙' && c.di_yi === '丁') _seen_dun.add('天遁');
    if (JI_MEN.has(door) && tg === '乙' && ['六合', '九地', '太阴'].includes(sh)) _seen_dun.add('地遁');
    if ((JI_MEN.has(door) && SAN_QI.has(tg) && sh === '六合') || (door === '生门' && SAN_QI.has(tg) && sh === '太阴') || (door === '生门' && tg === '乙' && sh === '九地')) _seen_dun.add('人遁');
    if (JI_MEN.has(door) && SAN_QI.has(tg)) {
      if (sh === '太阴') _seen_dun.add('真诈');
      else if (sh === '六合') _seen_dun.add('重诈');
      else if (sh === '九地') _seen_dun.add('休诈');
    }
  }
  for (const name of ['天遁', '地遁', '人遁', '真诈', '重诈', '休诈']) {
    if (_seen_dun.has(name)) dunfa.push({ name, level: DUNFA[name].level, text: DUNFA[name].text });
  }

  const find_tian_pal = (gan: string): number | null => {
    for (const [pal, tvx] of Object.entries(tian)) {
      if (tvx[1] === gan) return Number(pal);
      if (tvx.length > 3 && tvx[3] === gan) return Number(pal);
    }
    return null;
  };
  const ri_pal = find_tian_pal(gz_day[0]);
  const shi_pal = gz_hour[0] !== '甲' ? find_tian_pal(gz_hour[0]) : zf_land;

  return {
    time: { y, mo, d, hh, mi },
    ganzhi: { year: gz_year, month: gz_month, day: gz_day, hour: gz_hour },
    solar_str: `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`,
    lunar_str: `${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ju: { dun, num: ju, name: dun === '阳' ? `阳遁${ju}局` : `阴遁${ju}局`, jieqi: jq_name, yuan, futou, method: '拆补法' },
    xun: { name: xun, yi: xun_yi, kong: kong_branches },
    zhifu: { star: zf_star, yi: xun_yi, land: zf_land },
    zhishi: { door: zs_door, land: zs_land },
    palaces, geju, fu_yin, fan_yin, wubuyu, liuyi_jixing, dunfa,
    kong_palaces, ma: { branch: ma_branch, palace: ma_palace },
    star_state, ri_gan_palace: ri_pal, shi_gan_palace: shi_pal,
  };
}
