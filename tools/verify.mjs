// verify.mjs — 星垣确定性自检（无第三方依赖，除已安装的 esbuild）
// 运行：npm run verify
// 覆盖：双语键、静态引用、manifest 图标、SW 外壳清单、缓存版本、引擎回归与输入边界。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', `${name} — ${e.message}`]);
  }
}

// ── 1. 双语表 ────────────────────────────────────────────────
const i18nSrc = read('js/i18n.ts');
const zhStart = i18nSrc.indexOf('  zh: {');
const enStart = i18nSrc.indexOf('  en: {');
const uiEnd = i18nSrc.indexOf('\n};', enStart);
const keysOf = (s) => [...s.matchAll(/['"]([\w.]+)['"]\s*:/g)].map((m) => m[1]);
const zhKeys = new Set(keysOf(i18nSrc.slice(zhStart, enStart)));
const enKeys = new Set(keysOf(i18nSrc.slice(enStart, uiEnd)));

await check('中英键对称（zh/en 无单向缺失）', () => {
  const onlyZh = [...zhKeys].filter((k) => !enKeys.has(k));
  const onlyEn = [...enKeys].filter((k) => !zhKeys.has(k));
  assert.deepEqual({ onlyZh, onlyEn }, { onlyZh: [], onlyEn: [] });
  assert.ok(zhKeys.size > 100, `键数异常偏少：${zhKeys.size}`);
});

await check('index.html 静态引用键全部有定义', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/data-i18n(?:-title|-aria)?="([^"]+)"/g)].map((m) => m[1]);
  const missing = [...new Set(refs)].filter((k) => !zhKeys.has(k));
  assert.deepEqual(missing, [], `未定义键：${missing.join(', ')}`);
});

await check('源码 t() 调用键全部有定义', () => {
  const files = ['js/app.ts', 'js/reading.ts', 'js/i18n.ts'];
  const missing = new Set();
  for (const f of files) {
    for (const m of read(f).matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) {
      if (!zhKeys.has(m[1])) missing.add(`${f}:${m[1]}`);
    }
  }
  assert.deepEqual([...missing], [], `未定义键：${[...missing].join(', ')}`);
});

// ── 2. PWA 静态资源 ──────────────────────────────────────────
await check('manifest 合法且图标尺寸与声明一致', () => {
  const mf = JSON.parse(read('manifest.webmanifest'));
  assert.ok(mf.name && mf.start_url && mf.id, 'name / start_url / id 缺失');
  const pngSize = (f) => {
    const b = readFileSync(path.join(root, f));
    assert.equal(b.toString('ascii', 1, 4), 'PNG', `${f} 不是 PNG`);
    return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
  };
  for (const icon of mf.icons) {
    assert.ok(existsSync(path.join(root, icon.src)), `图标文件缺失：${icon.src}`);
    assert.equal(pngSize(icon.src), icon.sizes, `${icon.src} 尺寸与 sizes 不符`);
  }
});

await check('index.html 引用的脚本 / 样式 / manifest 均存在', () => {
  const html = read('index.html');
  const refs = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]),
  ].filter((p) => !/^https?:/.test(p));
  const missing = refs.filter((p) => !existsSync(path.join(root, p)));
  assert.deepEqual(missing, [], `缺失资源：${missing.join(', ')}`);
});

await check('sw.js SHELL 清单文件全部存在', () => {
  const sw = read('sw.js');
  const m = sw.match(/const SHELL = \[([\s\S]*?)\];/);
  assert.ok(m, '未找到 SHELL');
  const paths = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).filter((p) => p !== './');
  const missing = paths.filter((p) => !existsSync(path.join(root, p)));
  assert.deepEqual(missing, [], `缺失外壳资源：${missing.join(', ')}`);
});

await check('sw.js 缓存版本与外壳内容一致', () => {
  const out = execFileSync('python3', ['tools/sync_sw.py', '--check'], { cwd: root, encoding: 'utf8' });
  assert.match(out, /PASS/);
});

await check('sw.js 只缓存成功响应、离线回退区分导航', () => {
  const sw = read('sw.js');
  assert.match(sw, /req\.method !== 'GET'/);
  assert.match(sw, /resp\.status === 200/);
  assert.match(sw, /req\.mode === 'navigate'/);
  assert.doesNotMatch(sw, /\.catch\(\(\) => caches\.match\('\.\/index\.html'\)\)/);
});

await check('主界面 hidden 有加载失败兜底', () => {
  assert.match(read('index.html'), /__XY_REVEAL_TIMER__/);
  assert.match(read('js/onboarding.js'), /clearTimeout\(window\.__XY_REVEAL_TIMER__\)/);
});

await check('真太阳时计算不依赖宿主本地时区', () => {
  const zwSrc = read('js/engine/ziwei.ts');
  assert.match(zwSrc, /Date\.UTC\(2000/);
  assert.doesNotMatch(zwSrc, /new Date\(2000/);
});

// ── 3. 引擎回归与输入边界 ────────────────────────────────────
const tmp = path.join(os.tmpdir(), `arrangestar-verify-${process.pid}.mjs`);
let engine = null;
await check('引擎可打包为可运行模块', async () => {
  await build({
    stdin: {
      contents: [
        "export * as zw from './js/engine/ziwei.ts';",
        "export * as bz from './js/engine/bazi.ts';",
        "export * as qm from './js/engine/qimen.ts';",
        "export * as cp from './js/engine/composer.ts';",
      ].join('\n'),
      resolveDir: root,
      sourcefile: 'verify-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: tmp,
    logLevel: 'silent',
  });
  engine = await import(pathToFileURL(tmp).href);
  assert.ok(engine.zw.chart && engine.bz.bazi && engine.qm.qimen && engine.cp.flow_day);
});

const { zw, bz, qm, cp } = engine || {};

await check('紫微回归：1990-05-15 03:20 / 东经 120 基线不变', () => {
  const r = zw.chart(1990, 5, 15, 3, 20, { lon: 120, gender: '女' });
  assert.equal(r.hour_branch_i, 1);
  assert.equal(r.life, 4);
  assert.equal(r.stem, '庚');
  assert.equal(r.forward, false);
});

await check('真太阳时分钟恒在 0–59（扫描 12 组边界）', () => {
  const cases = [
    [1990, 1, 2, 0, 4, 120], [1990, 5, 15, 3, 20, 120], [2024, 2, 29, 23, 59, 135],
    [1986, 6, 1, 12, 0, 60], [2000, 12, 31, 0, 0, 150], [1990, 1, 2, 0, 0, 120],
    [2026, 11, 19, 22, 21, 121.5], [1991, 9, 16, 7, 30, 113], [2001, 5, 23, 3, 20, 120],
    [2100, 1, 1, 0, 1, 120], [1900, 3, 1, 23, 58, 120], [1990, 4, 15, 1, 1, 120],
  ];
  for (const [y, m, d, hh, mi, lon] of cases) {
    const r = zw.chart(y, m, d, hh, mi, { lon });
    assert.ok(Number.isInteger(r.tst[0]) && r.tst[0] >= 0 && r.tst[0] <= 23, `非法小时 ${r.tst}`);
    assert.ok(Number.isInteger(r.tst[1]) && r.tst[1] >= 0 && r.tst[1] <= 59, `非法分钟 ${r.tst}`);
  }
});

await check('八字回归：四柱 庚午 辛巳 庚辰 戊寅', () => {
  const r = bz.bazi(1990, 5, 15, 3, 20, '女');
  assert.equal(r.pillars.map((p) => p.ganzhi).join(' '), '庚午 辛巳 庚辰 戊寅');
});

await check('奇门回归：节气定局口径未变', () => {
  assert.equal(qm.qimen(1990, 5, 15, 3, 20).ju.jieqi, '立夏');
  assert.equal(qm.qimen(1990, 1, 5, 3, 0).ju.jieqi, '冬至');
  assert.equal(qm.daily_qimen(1990, 1, 5).jieqi, '冬至');
});

await check('流日回归：flow_day(1990,5,15,0).day = 21', () => {
  assert.equal(cp.flow_day(1990, 5, 15, 0).day, 21);
});

await check('非法输入显式报错（日期 / NaN / 越界 / 枚举）', () => {
  assert.throws(() => zw.chart(2024, 2, 30, 3, 20), /输入无效/);
  assert.throws(() => zw.chart(1990, 5, 15, 3, 20, { lon: NaN }), /输入无效/);
  assert.throws(() => zw.chart(NaN, 5, 15, 3, 20), /输入无效/);
  assert.throws(() => zw.yearGanzhi(2026.5), /输入无效/);
  assert.throws(() => bz.bazi(2024, 4, 31, 3, 20), /输入无效/);
  assert.throws(() => qm.qimen(1990, 5, 15, 24, 0), /输入无效/);
  assert.throws(() => cp.flow_day(2024, 2, 30, 0), /输入无效/);
  assert.throws(() => zw.sihuaOf(6, 'bogus'), /四化参数非法/);
});

rmSync(tmp, { force: true });

for (const [status, name] of results) console.log(`${status}  ${name}`);
const failed = results.filter(([s]) => s === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} 项通过`);
if (failed.length) process.exit(1);
