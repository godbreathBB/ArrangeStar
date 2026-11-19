#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
星垣 ArrangeStar · PWA 图标生成器
=================================
设计概念「星垣 · 众星拱极」：
  - 保留品牌资产「星」字（宋体/明朝体，泥金渐变）。
  - 叠加星垣专属符号系统：
      · 双层罗盘圆环（外环刻度 = 周天，内环 = 垣墙）
      · 八方位「卦点」：乾坎艮震巽离坤兑对应八个圆点，呼应引导页八卦环
      · 北极帝星：顶部四芒星，取「众星拱北辰」之意
      · 四周散星：低频星点，延续深空金主题
  - 中国传统色：石青/黛蓝底、泥金线、朱砂微点。
  - 严格区分 any（满幅构图）与 maskable（主体收进中心 80% 安全区）。

用法：
  python3 tools/gen_icons.py            # 生成 design-specs/icons/*.svg
  swift tools/svg2png.swift <svg> <png> <size>   # 渲染（见文件内说明）
"""
import math
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "design-specs", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

S = 512
C = S / 2  # 256

# —— 中国传统色板 ——
SKY_0 = "#24305a"   # 石青偏亮（中心）
SKY_1 = "#161d38"   # 黛蓝（中）
SKY_2 = "#0c1024"   # 玄青（边）
GOLD_HI = "#f2d98a"  # 泥金·亮
GOLD = "#c9a227"     # 泥金·主（与 APP --accent 一致）
GOLD_LO = "#9c7a1e"  # 泥金·暗
CINNABAR = "#c8503c"  # 朱砂（帝星微点）
INK = "#f4ecd6"      # 米白（星点）

DEFS = f"""
  <radialGradient id="sky" cx="50%" cy="34%" r="78%">
    <stop offset="0" stop-color="{SKY_0}"/>
    <stop offset=".55" stop-color="{SKY_1}"/>
    <stop offset="1" stop-color="{SKY_2}"/>
  </radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{GOLD_HI}"/>
    <stop offset=".48" stop-color="{GOLD}"/>
    <stop offset="1" stop-color="{GOLD_LO}"/>
  </linearGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="{GOLD_HI}" stop-opacity=".55"/>
    <stop offset="1" stop-color="{GOLD_HI}" stop-opacity="0"/>
  </radialGradient>
"""

# 背景散星：(x%, y%, r, color, opacity)  —— 固定种子，构图稳定
STARS = [
    (0.13, 0.16, 2.6, INK, .55), (0.24, 0.72, 1.8, INK, .38),
    (0.38, 0.11, 2.2, GOLD_HI, .50), (0.62, 0.08, 1.6, INK, .34),
    (0.78, 0.26, 2.9, INK, .50), (0.88, 0.57, 1.9, GOLD_HI, .44),
    (0.70, 0.84, 2.4, INK, .44), (0.46, 0.90, 1.7, INK, .34),
    (0.16, 0.50, 2.1, INK, .40), (0.86, 0.14, 1.5, INK, .30),
]


def star(cx, cy, r, fill, op):
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{fill}" opacity="{op}"/>'


def four_point_star(cx, cy, r, fill, inner=0.22):
    """四芒星（北极帝星）：上下左右四尖，凹入比 inner。"""
    pts = []
    for k in range(8):
        ang = -math.pi / 2 + k * math.pi / 4
        rad = r if k % 2 == 0 else r * inner
        pts.append(f"{cx + rad*math.cos(ang):.1f},{cy + rad*math.sin(ang):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"/>'


def build(maskable: bool) -> str:
    """maskable 版：主体（环/卦点/帝星/字）缩到中心 80% 安全区内；背景铺满。"""
    scale = 0.80 if maskable else 1.0
    # 构图中半径（any 基准）；maskable 时整体 ×0.8，主体收进中心 80% 安全区
    r_outer = 214 * scale   # 周天外环（帝星与七星皆落此环）
    r_inner = 168 * scale   # 垣墙内环
    font_size = 190 * scale
    star_r = 20 * scale     # 北极帝星
    halo_r = 38 * scale

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" '
             f'width="{S}" height="{S}">', f'<defs>{DEFS}</defs>']
    # 背景（始终铺满，maskable 裁切任意形状都不露白）
    parts.append(f'<rect width="{S}" height="{S}" fill="url(#sky)"/>')
    # 散星：maskable 时略向中心收拢，避免全被切掉后又过于稀疏
    for px, py, rr, col, op in STARS:
        x, y = px * S, py * S
        if maskable:
            x = C + (x - C) * 0.9
            y = C + (y - C) * 0.9
        parts.append(star(x, y, rr, col, op))

    parts.append('<g>')  # 主体组

    # 周天外环（细）+ 内环（粗，泥金渐变）——双层垣墙
    parts.append(f'<circle cx="{C}" cy="{C}" r="{r_outer:.1f}" fill="none" '
                 f'stroke="{GOLD}" stroke-width="{2.2*scale:.1f}" opacity=".38"/>')
    parts.append(f'<circle cx="{C}" cy="{C}" r="{r_outer-10*scale:.1f}" fill="none" '
                 f'stroke="{GOLD_HI}" stroke-width="{1*scale:.1f}" opacity=".22"/>')
    parts.append(f'<circle cx="{C}" cy="{C}" r="{r_inner:.1f}" fill="none" '
                 f'stroke="url(#gold)" stroke-width="{5*scale:.1f}" opacity=".92"/>')

    # 七方位星点：帝星已居正上位，其余七方位沿周天环等距分布（众星拱极）
    # 对应乾(上,帝星位) 兑 离 震 坤 艮 坎 巽 中的后七位
    for i in range(1, 8):
        ang = -math.pi / 2 + i * math.pi / 4
        x = C + r_outer * math.cos(ang)
        y = C + r_outer * math.sin(ang)
        parts.append(star(x, y, 3.6 * scale, GOLD_HI, .92))

    # 北极帝星（正上方，四芒）+ 柔光晕
    px, py = C, C - r_outer
    parts.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{halo_r:.1f}" fill="url(#halo)"/>')
    parts.append(four_point_star(px, py, star_r, GOLD_HI))
    parts.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{star_r*0.18:.1f}" fill="{INK}"/>')

    # 中央「星」字（明朝/宋体），视觉重心略高于几何中心 → y 下移补偿基线
    parts.append(
        f'<text x="{C}" y="{C + 8*scale:.1f}" fill="url(#gold)" '
        f'font-family="Songti SC, STSong, Noto Serif SC, serif" '
        f'font-size="{font_size:.1f}" font-weight="700" '
        f'text-anchor="middle" dominant-baseline="central">星</text>'
    )
    parts.append('</g></svg>')
    return "\n".join(parts)


if __name__ == "__main__":
    for name, mk in [("icon-any.svg", False), ("icon-maskable.svg", True)]:
        path = os.path.join(OUT_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(build(mk))
        print("wrote", path)
