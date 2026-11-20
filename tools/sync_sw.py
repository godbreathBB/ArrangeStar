#!/usr/bin/env python3
"""按 PWA 外壳内容生成 sw.js 的缓存版本名。

背景：Service Worker 采用 cache-first。若只更新 index.html / bundle.js 而 sw.js
字节未变，浏览器不会触发 install/activate，已安装客户端会一直命中旧缓存。
本脚本把外壳文件的 SHA-256 前 12 位写进 CACHE 名，使版本随内容自动变化。

用法：
    python3 tools/sync_sw.py            # 生成 / 更新 sw.js
    python3 tools/sync_sw.py --check   # 只校验，不写文件；不一致时退出码 1
"""
import hashlib
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sw = root / "sw.js"
text = sw.read_text(encoding="utf-8")

m = re.search(r"const SHELL = \[(.*?)\];", text, re.S)
if not m:
    raise SystemExit("sw.js 中未找到 SHELL 清单")
paths = sorted(set(re.findall(r"'([^']+)'", m.group(1))))

h = hashlib.sha256()
for p in paths:
    if p == "./":  # 目录别名，其内容已由 ./index.html 计入
        continue
    f = (root / p).resolve()
    if not f.is_file():
        raise SystemExit(f"外壳文件缺失: {p}")
    h.update(p.encode("utf-8"))
    h.update(f.read_bytes())
digest = h.hexdigest()[:12]

mb = re.search(r"const BASE_VERSION = '([^']+)';", text)
if not mb:
    raise SystemExit("sw.js 中未找到 BASE_VERSION")
cache = f"xingyuan-{mb.group(1)}-{digest}"

new_text = re.sub(r"const CACHE = '[^']*';", f"const CACHE = '{cache}';", text)
new_text = re.sub(r"// build-hash: [^\n]*", f"// build-hash: {digest}", new_text)

if "--check" in sys.argv:
    if new_text != text:
        print(f"FAIL: sw.js 缓存版本与外壳内容不一致，应为 {cache}")
        sys.exit(1)
    print(f"PASS: sw.js 缓存版本 {cache} 与外壳内容一致")
    sys.exit(0)

if new_text != text:
    sw.write_text(new_text, encoding="utf-8")
    print(f"updated sw.js CACHE = {cache}")
else:
    print(f"unchanged sw.js CACHE = {cache}")
