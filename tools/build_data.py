#!/usr/bin/env python3
"""把 data/ 下的解读文案 JSON 合并为 js/data.js（window.__LIB__）。

构建产物 js/data.js 随仓库提交，供静态托管直接部署；修改 data/ 后运行 `npm run build` 重新生成。
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
data_dir = root / "data"
out = root / "js" / "data.js"

lib = {}
for f in sorted((root / "data").rglob("*.json")):
    rel = f.relative_to(root / "data")
    # 英文库放到 reading_en/ 前缀下，与中文库分开
    parts = rel.with_suffix("").parts
    key = "/".join(parts)
    lib[key] = json.loads(f.read_text(encoding="utf-8"))

out.write_text(
    "window.__LIB__=" + json.dumps(lib, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"built {out.relative_to(root)} from {len(lib)} JSON files")
