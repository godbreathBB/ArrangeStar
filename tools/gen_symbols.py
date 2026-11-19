#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
星垣 · 四象星图 SVG 生成器
=================================================================
产出（assets/symbols/）：
  - dragon.svg / tiger.svg / bird.svg / tortoise.svg   四兽白描单稿（高对比，可编辑源/预览）
  - four-creatures.svg    四兽合成水印（低透明，body 背景用）
  - mansions.svg          二十八宿星图（引导背景用：四象七宿 + 天球轨道 + 四时）

技法依据：design-specs/four-symbols-sky.md
  · 图1 白描：样条带状勾形 + 规律排线（鳞/羽/甲）+ 散点云气
  · 图3 星术：星点连线 + 椭圆天球轨道 + 四时字

用法：python3 tools/gen_symbols.py
无第三方依赖。可用 swift tools/svg2png.swift <svg> <png> <size> 预览。
"""
import math, os

OUT = "assets/symbols"
os.makedirs(OUT, exist_ok=True)

GOLD = "#b8a26b"       # 泥金·暗（--gold-dim）
GOLD_L = "#d9b542"     # 泥金·亮
CINNABAR = "#c8503c"   # 朱砂（星图点睛，极少量）
WATER = "#a8b4dc"      # 冷青紫（引导星图微光）


# ───────────────────────────── 几何工具 ─────────────────────────────
def catmull(pts, per_seg=10):
    """通过控制点的 Catmull-Rom 样条采样，返回平滑点列。"""
    out, n = [], len(pts)
    for i in range(n - 1):
        p0, p1 = pts[max(i - 1, 0)], pts[i]
        p2, p3 = pts[i + 1], pts[min(i + 2, n - 1)]
        for j in range(per_seg):
            t = j / per_seg
            t2, t3 = t * t, t * t * t
            x = .5 * (2 * p1[0] + (-p0[0] + p2[0]) * t +
                      (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0]) * t2 +
                      (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0]) * t3)
            y = .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t +
                      (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1]) * t2 +
                      (-p0[1] + 3*p1[1] - 3*p2[1] + p3[1]) * t3)
            out.append((x, y))
    out.append(pts[-1])
    return out


def ribbon(center, width_fn):
    """沿中心线生成带状闭合 path。width_fn(t) 返回半宽，t∈[0,1]。"""
    left, right = [], []
    m = len(center)
    for i, p in enumerate(center):
        prev, nxt = center[max(i-1, 0)], center[min(i+1, m-1)]
        dx, dy = nxt[0]-prev[0], nxt[1]-prev[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy/L, dx/L
        w = width_fn(i/(m-1))
        left.append((p[0]+nx*w, p[1]+ny*w))
        right.append((p[0]-nx*w, p[1]-ny*w))
    seg = lambda arr: " L ".join(f"{x:.1f},{y:.1f}" for x, y in arr)
    return f"M {seg(left)} L {seg(right[::-1])} Z"


def poly(pts, close=False):
    d = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return d + (" Z" if close else "")


def qpath(d):
    return f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'


def wrap(body, w=400, h=400, bg=None, cls=""):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" class="{cls}">{b}{body}</svg>')


# ───────────────────────────── 云气 / 散点 ─────────────────────────────
def cloud(x, y, s=1.0, stroke=GOLD, op=.55):
    """卷云纹：一条内卷螺旋 + 一小段尾。"""
    return (f'<path d="M {x-14*s:.1f},{y:.1f} C {x-14*s:.1f},{y-9*s:.1f} '
            f'{x+2*s:.1f},{y-11*s:.1f} {x+2*s:.1f},{y-2*s:.1f} '
            f'C {x+2*s:.1f},{y+4*s:.1f} {x-7*s:.1f},{y+4*s:.1f} {x-6*s:.1f},{y-2*s:.1f}" '
            f'fill="none" stroke="{stroke}" stroke-width="{1.6*s:.1f}" '
            f'stroke-linecap="round" opacity="{op}"/>')


def dots(pts, r=1.8, stroke=GOLD_L, op=.7):
    return "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{stroke}" opacity="{op}"/>' for x, y in pts)


# ───────────────────────────── 青龙 ─────────────────────────────
def dragon(stroke=GOLD, alpha=1.0):
    P = []
    center = catmull([(300,108),(322,150),(298,192),(246,202),(196,180),
                      (154,214),(170,266),(222,286),(238,334),(186,358)], 12)
    P.append(f'<path d="{ribbon(center, lambda t: 17*(1-t)+3)}" fill="none" '
             f'stroke="{stroke}" stroke-width="2.2" opacity="{alpha}"/>')
    # 龙首：角、吻、眼、须
    P.append(qpath(f'M 300,110 C 312,92 326,86 336,74 M 306,102 C 318,88 322,72 320,60'))
    P.append(qpath(f'M 300,110 C 316,112 330,120 340,116 C 348,113 350,104 344,100'))
    P.append(f'<circle cx="313" cy="104" r="2.6" fill="{stroke}" opacity="{alpha}"/>')
    P.append(qpath(f'M 340,116 C 352,128 348,146 334,152 M 300,112 C 288,128 288,148 300,158'))
    # 四爪（三趾）
    for cx, cy, rot in [(268,204,-1), (196,184,1), (176,268,1), (232,318,-1)]:
        P.append(qpath(f'M {cx},{cy} l {14*rot},{12} l {8*rot},{2} '
                       f'M {cx+14*rot:.0f},{cy+12} l {6*rot},{9} '
                       f'M {cx+14*rot:.0f},{cy+12} l {10*rot},{4}'))
    # 鳞：沿中心线法线方向短弧
    for i in range(6, len(center)-6, 7):
        p = center[i]; prev, nxt = center[i-1], center[i+1]
        dx, dy = nxt[0]-prev[0], nxt[1]-prev[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy/L, dx/L
        w = 17*(1-i/(len(center)-1))+3
        ax, ay = p[0]+nx*w*.6, p[1]+ny*w*.6
        bx, by = p[0]-nx*w*.6, p[1]-ny*w*.6
        P.append(f'<path d="M {ax:.1f},{ay:.1f} Q {p[0]:.1f},{p[1]:.1f} {bx:.1f},{by:.1f}" '
                 f'fill="none" stroke="{stroke}" stroke-width="1" opacity="{.45*alpha:.2f}"/>')
    # 云气 + 散点
    for cx, cy, s in [(96,120,1.1),(330,250,.9),(120,330,1.0),(300,60,.7)]:
        P.append(cloud(cx, cy, s, stroke, .5*alpha))
    P.append(dots([(84,150),(108,196),(300,300),(262,64),(150,96),(210,350),(344,210)], 1.8, GOLD_L, .6*alpha))
    return wrap("".join(P), cls="creature dragon")


# ───────────────────────────── 白虎 ─────────────────────────────
def tiger(stroke=GOLD, alpha=1.0):
    P = []
    center = catmull([(92,236),(132,208),(186,202),(244,208),(296,196),(334,222)], 12)
    P.append(f'<path d="{ribbon(center, lambda t: 15+9*math.sin(math.pi*t)-11*t)}" fill="none" '
             f'stroke="{stroke}" stroke-width="2.2" opacity="{alpha}"/>')
    # 虎首（左侧）：耳、眼、鼻、口、须
    P.append(qpath(f'M 92,236 C 74,224 66,232 64,246 C 62,262 76,272 92,266'))
    P.append(qpath(f'M 74,228 l -4,-16 l 14,10 M 100,230 l 6,-16 l 8,14'))
    P.append(f'<circle cx="80" cy="242" r="2.4" fill="{stroke}" opacity="{alpha}"/>')
    P.append(qpath(f'M 66,256 q 10,6 20,0 M 66,256 l -14,2 M 66,258 l -12,8'))
    # 四肢
    for lx, ly in [(126,232),(168,226),(254,224),(300,214)]:
        P.append(qpath(f'M {lx},{ly} q -2,26 6,40 l -4,10 M {lx+6:.0f},{ly+40} l 10,8'))
    # 虎尾（右侧上卷）
    tail = catmull([(330,214),(352,196),(360,166),(344,146),(322,158)], 10)
    P.append(f'<path d="{poly(tail)}" fill="none" stroke="{stroke}" stroke-width="3" '
             f'stroke-linecap="round" opacity="{alpha}"/>')
    # 虎纹：沿身体的斜向短条
    for i in range(8, len(center)-4, 9):
        p = center[i]; prev, nxt = center[i-1], center[i+1]
        dx, dy = nxt[0]-prev[0], nxt[1]-prev[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy/L, dx/L
        P.append(f'<path d="M {p[0]+nx*16:.1f},{p[1]+ny*16:.1f} '
                 f'L {p[0]-nx*16+dx/L*6:.1f},{p[1]-ny*16+dy/L*6:.1f}" '
                 f'fill="none" stroke="{stroke}" stroke-width="2.4" opacity="{.6*alpha:.2f}"/>')
    for cx, cy, s in [(210,120,1.0),(300,300,.9),(120,130,.8)]:
        P.append(cloud(cx, cy, s, stroke, .45*alpha))
    P.append(dots([(180,150),(250,140),(320,110),(150,320),(280,330),(80,180)], 1.8, GOLD_L, .6*alpha))
    return wrap("".join(P), cls="creature tiger")


# ───────────────────────────── 朱雀 ─────────────────────────────
def bird(stroke=GOLD, alpha=1.0):
    P = []
    # 头 + 冠羽
    P.append(qpath(f'M 200,118 C 214,120 220,134 214,150 C 208,166 192,166 186,150 C 180,134 186,120 200,118 Z'))
    P.append(qpath(f'M 200,118 C 196,104 206,92 214,84 M 200,118 l -2,-30'))
    P.append(f'<circle cx="207" cy="138" r="2.3" fill="{stroke}" opacity="{alpha}"/>')
    P.append(qpath(f'M 214,150 l 18,4 l -18,4'))  # 喙
    # 双翼（展开的上扬曲线）+ 羽排线
    for sign in (-1, 1):
        wing = catmull([(196+sign*8,160),(196+sign*60,140),(196+sign*118,150),
                        (196+sign*160,196),(196+sign*172,232)], 10)
        P.append(f'<path d="{poly(wing)}" fill="none" stroke="{stroke}" stroke-width="2.2" opacity="{alpha}"/>')
        for k in range(4, len(wing)-2, 5):
            p = wing[k]
            tipx = 196 + sign * (170 + (k % 3) * 6)
            P.append(f'<path d="M {p[0]:.1f},{p[1]:.1f} Q {p[0]+sign*10:.1f},{p[1]+18:.1f} '
                     f'{tipx:.1f},{p[1]+34:.1f}" fill="none" stroke="{stroke}" '
                     f'stroke-width="1.2" opacity="{.5*alpha:.2f}"/>')
    # 尾羽（飘逸长羽：末端外卷，避免机械平行）
    for idx, (off, ln) in enumerate([(-28, 296), (-11, 330), (9, 338), (27, 314)]):
        sway = -18 if idx < 2 else 18
        P.append(qpath(f'M 200,166 C {200+off:.0f},218 {200+off*1.5:.0f},266 '
                       f'{200+off+sway}.0,{ln-10} q {sway}.0,10 {sway*0.5:.0f},10 '
                       f'M 200,166 C 200,220 {200+off*0.6:.0f},270 {200+off*0.8:.0f},{ln-6}'))
    # 足
    P.append(qpath(f'M 194,168 l -6,26 l -8,6 M 194,168 l 2,26 l 8,6 M 206,168 l 6,26 l 8,6'))
    for cx, cy, s in [(90,110,1.0),(310,110,1.0),(200,300,.8)]:
        P.append(cloud(cx, cy, s, stroke, .45*alpha))
    P.append(dots([(120,200),(280,200),(150,90),(250,90),(200,360),(70,250),(330,250)], 1.8, GOLD_L, .6*alpha))
    return wrap("".join(P), cls="creature bird")


# ───────────────────────────── 玄武（龟蛇） ─────────────────────────────
def tortoise(stroke=GOLD, alpha=1.0):
    P = []
    # 龟壳：椭圆 + 六边甲纹
    P.append(f'<ellipse cx="196" cy="224" rx="76" ry="54" fill="none" stroke="{stroke}" '
             f'stroke-width="2.4" opacity="{alpha}"/>')
    P.append(f'<ellipse cx="196" cy="224" rx="60" ry="40" fill="none" stroke="{stroke}" '
             f'stroke-width="1" opacity="{.6*alpha:.2f}"/>')
    hexc = [(196,224),(196,190),(196,258),(166,207),(226,207),(166,241),(226,241)]
    for hx, hy in hexc:
        r = 13
        pts = [(hx+r*math.cos(k*math.pi/3), hy+r*math.sin(k*math.pi/3)) for k in range(6)]
        P.append(f'<path d="{poly(pts, True)}" fill="none" stroke="{stroke}" '
                 f'stroke-width="1.1" opacity="{.55*alpha:.2f}"/>')
    # 龟首、尾、四肢
    P.append(qpath(f'M 120,224 C 100,216 88,224 86,238 C 84,252 96,258 112,252'))
    P.append(f'<circle cx="98" cy="236" r="2.3" fill="{stroke}" opacity="{alpha}"/>')
    P.append(qpath(f'M 272,224 l 24,-4 l -20,12 M 150,180 l -10,-24 M 242,180 l 12,-24 '
                   f'M 150,268 l -12,22 M 242,268 l 14,22'))
    # 蛇缠绕：S形带状 + 鳞纹 + 蛇首
    snake = catmull([(300,150),(258,178),(228,220),(196,258),(160,236),(150,196),(178,166)], 12)
    P.append(f'<path d="{ribbon(snake, lambda t: 8*(1-.5*t))}" fill="none" '
             f'stroke="{stroke}" stroke-width="2" opacity="{alpha}"/>')
    for i in range(4, len(snake)-4, 8):
        p = snake[i]; prev, nxt = snake[i-1], snake[i+1]
        dx, dy = nxt[0]-prev[0], nxt[1]-prev[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy/L, dx/L
        P.append(f'<path d="M {p[0]+nx*6:.1f},{p[1]+ny*6:.1f} L {p[0]-nx*6:.1f},{p[1]-ny*6:.1f}" '
                 f'fill="none" stroke="{stroke}" stroke-width="1" opacity="{.5*alpha:.2f}"/>')
    P.append(qpath(f'M 178,166 C 166,152 172,138 186,138 C 196,138 198,150 190,156'))
    P.append(f'<circle cx="182" cy="148" r="2" fill="{CINNABAR}" opacity="{alpha}"/>')
    P.append(qpath(f'M 190,156 l 12,4'))
    for cx, cy, s in [(300,290,1.0),(90,130,.9),(260,100,.8)]:
        P.append(cloud(cx, cy, s, stroke, .45*alpha))
    P.append(dots([(110,150),(280,200),(150,320),(240,320),(320,200),(200,110)], 1.8, GOLD_L, .6*alpha))
    return wrap("".join(P), cls="creature tortoise")


# ───────────────────────────── 四兽合成水印 ─────────────────────────────
def four_creatures(alpha=.085):
    """四兽分居四方（青龙左/白虎右/朱雀上/玄武下），合成一张低透明水印。"""
    W = H = 1200
    parts = []
    def place(svg, x, y, scale, rot=0):
        inner = svg.split('>', 1)[1].rsplit('</svg>', 1)[0]
        parts.append(f'<g transform="translate({x},{y}) rotate({rot}) scale({scale})">{inner}</g>')
    # 单兽 viewBox 400；四兽置四边中点、朝向中心，完整落在画布内不裁切
    place(dragon(alpha=alpha), 30, 400, 1.05, -8)        # 左（东）
    place(tiger(alpha=alpha), 770, 400, 1.05, 8)         # 右（西）
    place(bird(alpha=alpha), 410, 40, 1.0, 0)            # 上（南）
    place(tortoise(alpha=alpha), 410, 760, 1.0, 0)       # 下（北）
    return wrap("".join(parts), W, H, cls="four-creatures-watermark")


# ───────────────────────────── 二十八宿星图 ─────────────────────────────
def mansions():
    W = H = 800
    cx, cy = 400, 400
    P = []
    # 天球椭圆轨道（三层，倾斜）
    for rx, ry, op in [(330, 220, .45), (250, 165, .35), (150, 96, .3)]:
        P.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" '
                 f'stroke="{WATER}" stroke-width="1" opacity="{op}" '
                 f'transform="rotate(-18 {cx} {cy})"/>')
    # 赤道圈（竖椭圆）
    P.append(f'<ellipse cx="{cx}" cy="{cy}" rx="120" ry="330" fill="none" '
             f'stroke="{WATER}" stroke-width="1" opacity=".28"/>')
    # 四象七宿：每象沿一个象限分布 7 组星点，组内连线
    constell = [
        ("青龙", "东", 200, 30,   GOLD_L),   # 上左弧
        ("朱雀", "南", 600, 40,   WATER),    # 上右弧
        ("白虎", "西", 190, 700,  WATER),    # 下左弧
        ("玄武", "北", 610, 700,  CINNABAR), # 下右弧（朱砂极少量点睛）
    ]
    import random
    random.seed(19)
    for name, direction, ax, ay, col in constell:
        # 该象的 7 宿沿朝中心的一段弧排布
        ang0 = math.atan2(ay-cy, ax-cx)
        for k in range(7):
            a = ang0 + (k-3) * 0.085
            rr = 250 + random.uniform(-24, 24)
            base_x = cx + rr * math.cos(a) * 1.05
            base_y = cy + rr * math.sin(a) * 0.72
            # 每宿 2-4 颗星，折线相连
            n = random.randint(2, 4)
            st = []
            for j in range(n):
                st.append((base_x + (j-n/2)*random.uniform(7,13) + random.uniform(-4,4),
                           base_y + random.uniform(-16,16)))
            P.append(f'<path d="{poly(st)}" fill="none" stroke="{col}" '
                     f'stroke-width="1" opacity=".5"/>')
            for sx, sy in st:
                P.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{random.uniform(1.6,2.8):.1f}" '
                         f'fill="{col}" opacity=".85"/>')
    # 中心天体：日（泥金）+ 月（银灰）
    P.append(f'<circle cx="{cx}" cy="{cy}" r="20" fill="{GOLD_L}" opacity=".9"/>')
    P.append(f'<circle cx="{cx+120}" cy="{cy+70}" r="11" fill="{WATER}" opacity=".8"/>')
    # 四时字（古风）
    for txt, tx, ty in [("春", 400, 96), ("夏", 704, 400), ("秋", 400, 716), ("冬", 92, 400)]:
        P.append(f'<text x="{tx}" y="{ty}" fill="{GOLD_L}" font-size="26" '
                 f'font-family="Songti SC,STSong,serif" text-anchor="middle" '
                 f'dominant-baseline="middle" opacity=".55">{txt}</text>')
    # 四象名（小字）
    for name, tx, ty in [("青龙", 150, 150), ("朱雀", 650, 150), ("白虎", 150, 660), ("玄武", 650, 660)]:
        P.append(f'<text x="{tx}" y="{ty}" fill="{WATER}" font-size="18" '
                 f'font-family="Songti SC,serif" text-anchor="middle" opacity=".5">{name}</text>')
    return wrap("".join(P), W, H, cls="mansions-star-map")


# ───────────────────────────── 输出 ─────────────────────────────
def save(name, content):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("  ", path, len(content), "bytes")


if __name__ == "__main__":
    print("生成四兽白描单稿（预览源）...")
    save("dragon.svg", dragon())
    save("tiger.svg", tiger())
    save("bird.svg", bird())
    save("tortoise.svg", tortoise())
    print("生成四兽合成水印（body 背景）...")
    save("four-creatures.svg", four_creatures())
    print("生成二十八宿星图（引导背景）...")
    save("mansions.svg", mansions())
    print("完成。")
