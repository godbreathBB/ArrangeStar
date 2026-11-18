#!/usr/bin/env python3
"""把 data/ 下的解读文案 JSON 合并为 js/data.js（window.__LIB__）。

构建产物 js/data.js 不入库；克隆仓库后运行 `npm run build` 重新生成。
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
data_dir = root / "data"
out = root / "js" / "data.js"

lib = {}
for f in sorted(data_dir.rglob("*.json")):
    key = "/".join(f.relative_to(data_dir).with_suffix("").parts)
    lib[key] = json.loads(f.read_text(encoding="utf-8"))

out.write_text(
    "window.__LIB__=" + json.dumps(lib, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"built {out.relative_to(root)} from {len(lib)} JSON files")
