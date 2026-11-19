#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
星垣 · 四象星图 SVG 生成器（传统法相白描版 v3）
=================================================================
产出（assets/symbols/）：
  - dragon.svg / tiger.svg / bird.svg / tortoise.svg   四兽白描单稿（可编辑源）
  - four-creatures.svg    四兽 + 北斗拱极合成水印（body 背景用）
  - mansions.svg          二十八宿星图（引导背景用：四象七宿 + 天球轨道 + 四时）

四张参考图的转译依据：design-specs/four-symbols-sky.md
  · 参考1（四神兽拓片）：形制——青龙昂首右向 S 躯四足上卷涡尾、白虎左行
    卷云虎纹高卷尾、朱雀三冠双翼卷草长尾、玄武龟蛇缠绕六边龟甲；
    共同语言为 S 形卷云涡卷、图案化纹样神兽、实块内填线纹。
    → 用 <pattern> 密斜线填出「拓片实块」+ 亮泥金卷云纹压在块内。
  · 参考2（唯美白描）：极细线 + 密集排线成块 + 月轮圆构图 + 点状墨点 +
    花叶藤蔓环绕 + 极密与大片留白强对比。
  · 参考3（海中遨游）：明暗关系用于引导背景，见 css/onboarding.css。
  · 参考4（二十八宿星图）：每兽携所属七宿；mansions 为整体天球；
    四兽合成水印中央加北斗七星 + 北极帝星（众星拱极）。

用法：python3 tools/gen_symbols.py
无第三方依赖。可用 swift tools/svg2png.swift <svg> <png> <size> 预览。
"""
import math, os, random

OUT = "assets/symbols"
os.makedirs(OUT, exist_ok=True)

GOLD = "#b8a26b"       # 泥金·暗（--gold-dim）
GOLD_L = "#d9b542"     # 泥金·亮（卷云纹 / 星官）
CINNABAR = "#c8503c"   # 朱砂（点睛，极少量）
WATER = "#a8b4dc"      # 冷青紫（白虎 / 玄武 / 星图微光）

# 白描用笔：三级线宽（参考2 的粗细层级）
W_CONTOUR = 2.0        # 轮廓线
W_MID = 1.2            # 结构线（四肢 / 羽轴 / 角须）
W_FINE = 0.6           # 排线 / 细节
W_CURL = 2.3           # 卷云纹（压在实块上的亮线纹样）


# ───────────────────────────── 基础几何 ─────────────────────────────
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
    """沿中心线生成带状闭合 path。width_fn(t) 返回半宽。"""
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
    seg = lambda a: " L ".join(f"{x:.1f},{y:.1f}" for x, y in a)
    return f"M {seg(left)} L {seg(right[::-1])} Z"


def poly(pts, close=False):
    d = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return d + (" Z" if close else "")


def path(d, stroke=GOLD, w=W_MID, op=1.0):
    return (f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{w}" '
            f'stroke-linecap="round" stroke-linejoin="round" opacity="{op:.2f}"/>')


def wrap(body, w=400, h=400, bg=None, cls=""):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" class="{cls}">{b}{body}</svg>')


# ───────────────── 参考1：拓片实块 + 卷云纹（图案化神兽） ─────────────────
def hatch_def(name, angle=45, gap=3.4, stroke=GOLD, w=1.15):
    """密斜线 pattern：把兽身填成『实块内全是线』的拓片质感。
    gap=3.4 / 线宽 1.15 → 覆盖率约 34%，足以在深底上形成实块感，
    同时近看仍是白描线而非色块。每兽独立 id，避免合成水印时 defs 冲突。"""
    return (f'<defs><pattern id="hatch-{name}" width="{gap}" height="{gap}" '
            f'patternUnits="userSpaceOnUse" patternTransform="rotate({angle})">'
            f'<line x1="0" y1="0" x2="0" y2="{gap}" stroke="{stroke}" '
            f'stroke-width="{w}"/></pattern></defs>')


def solid(name, d, alpha, stroke=GOLD):
    """一块图案化实块：密斜线填充 + 轮廓描边。"""
    return (f'<path d="{d}" fill="url(#hatch-{name})" opacity="{alpha:.2f}"/>'
            + path(d, stroke, W_CONTOUR, alpha))


def curl(x, y, s=1.0, rot=0.0, stroke=GOLD_L, w=W_CURL, op=1.0):
    """S 形卷云涡卷（如意云头 / 卷草）：四神兽共有的核心纹样。
    参考1 中龙尾、虎纹、雀冠雀尾、蛇身皆由此生成。"""
    d = (f"M {x-19*s:.1f},{y+7*s:.1f} "
         f"C {x-13*s:.1f},{y-7*s:.1f} {x+3*s:.1f},{y-13*s:.1f} {x+11*s:.1f},{y-4*s:.1f} "
         f"C {x+18*s:.1f},{y+3*s:.1f} {x+8*s:.1f},{y+11*s:.1f} {x+2*s:.1f},{y+6*s:.1f} "
         f"C {x-2*s:.1f},{y+3*s:.1f} {x+1*s:.1f},{y-2*s:.1f} {x+5*s:.1f},{y:.1f}")
    return f'<g transform="rotate({rot:.1f} {x:.1f} {y:.1f})">{path(d, stroke, w, op)}</g>'


def curl_band(specs, stroke=GOLD_L, w=W_MID, op=.9):
    """连续卷云纹样带：沿躯干/翼面排布大小渐变的内卷涡，
    还原参考1『实块内满布流动卷云白线』，而非孤立几个大卷。
    specs: [(x, y, scale, rot), ...]"""
    return "".join(curl(x, y, s, rot, stroke, w, op) for x, y, s, rot in specs)


def spiral_tail(x, y, r, turns=1.15, stroke=GOLD, w=W_MID, op=1.0):
    """上卷涡尾的内卷线：阿基米德螺线，四兽卷尾通用。"""
    pts = []
    for k in range(46):
        t = k / 45
        a = -math.pi * 2 * turns * t + math.pi * .15
        rr = r * (1 - .78 * t)
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    return path(poly(pts), stroke, w, op)


def claw(x, y, s=1.0, stroke=GOLD, op=1.0, flip=1):
    """三爪（龙 / 虎 / 雀足端）。"""
    return (f'M {x:.1f},{y:.1f} l {-9*s*flip:.1f},{5*s:.1f} '
            f'M {x:.1f},{y:.1f} l {1*s*flip:.1f},{9*s:.1f} '
            f'M {x:.1f},{y:.1f} l {9*s*flip:.1f},{3*s:.1f} '
            f'M {x-4*s*flip:.1f},{y-2*s:.1f} l {-6*s*flip:.1f},{-4*s:.1f}')


# ───────────────── 参考2：白描装饰（月轮 / 点墨 / 花叶 / 排线） ─────────────────
def moon_ring(cx, cy, r, stroke=GOLD, op=.4):
    """月轮构图 + 沿弧点状墨点（大小渐变）。"""
    P = [f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{stroke}" '
         f'stroke-width="{W_FINE}" opacity="{op}"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r-7}" fill="none" stroke="{stroke}" '
         f'stroke-width="{W_FINE}" opacity="{op*.5:.2f}"/>']
    for k in range(26):
        a = math.radians(200 + k*7)
        rr = r + 12 + 6*math.sin(k*.5)
        px, py = cx+rr*math.cos(a), cy+rr*math.sin(a)
        rad = 1.1 + (k % 5)*.45
        P.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{rad:.1f}" fill="{stroke}" '
                 f'opacity="{op*1.2:.2f}"/>')
    return "".join(P)


def hatch(center, spacing, length, angle_offset=0.0, stroke=GOLD, op=.55, w=W_FINE):
    """沿中心线生成密集平行排线（白描表体积的核心技法）。"""
    P = []
    for i in range(0, len(center), spacing):
        p = center[i]
        prev, nxt = center[max(i-1, 0)], center[min(i+1, len(center)-1)]
        dx, dy = nxt[0]-prev[0], nxt[1]-prev[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy/L, dx/L
        taper = .55 + .45*abs(math.sin(i*0.7))
        ln = length * taper
        a = nx*math.cos(angle_offset) - ny*math.sin(angle_offset)
        b = nx*math.sin(angle_offset) + ny*math.cos(angle_offset)
        P.append(path(f"M {p[0]-a*ln/2:.1f},{p[1]-b*ln/2:.1f} "
                      f"L {p[0]+a*ln/2:.1f},{p[1]+b*ln/2:.1f}", stroke, w, op))
    return "".join(P)


def feather(x1, y1, x2, y2, barbs=12, stroke=GOLD, op=.6):
    """一根羽毛：中轴 + 两侧密集斜羽枝。"""
    P = [path(f"M {x1:.1f},{y1:.1f} L {x2:.1f},{y2:.1f}", stroke, W_MID, op)]
    dx, dy = x2-x1, y2-y1
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy/L, dx/L
    for k in range(1, barbs+1):
        t = k/(barbs+1)
        px, py = x1+dx*t, y1+dy*t
        bl = (1-t)*13 + 3
        for s in (-1, 1):
            P.append(path(f"M {px:.1f},{py:.1f} L {px+nx*bl*s+dx*.06:.1f},{py+ny*bl*s+dy*.06:.1f}",
                          stroke, W_FINE, op*.8))
    return "".join(P)


def cloud(x, y, s=1.0, stroke=GOLD, op=.6):
    """外围卷云纹（如意云头）。"""
    return (f'<path d="M {x-16*s:.1f},{y:.1f} C {x-16*s:.1f},{y-10*s:.1f} '
            f'{x+2*s:.1f},{y-12*s:.1f} {x+2*s:.1f},{y-2*s:.1f} '
            f'C {x+2*s:.1f},{y+5*s:.1f} {x-8*s:.1f},{y+5*s:.1f} {x-6*s:.1f},{y-2*s:.1f} '
            f'M {x-16*s:.1f},{y:.1f} q {-8*s:.1f},{2*s:.1f} {-12*s:.1f},{8*s:.1f}" '
            f'fill="none" stroke="{stroke}" stroke-width="{W_FINE*1.6:.1f}" '
            f'stroke-linecap="round" opacity="{op}"/>')


def vine(x, y, s=1.0, stroke=GOLD, op=.55):
    """藤蔓小枝 + 叶：参考2 环绕主体的植物装饰。"""
    P = [path(f"M {x:.1f},{y:.1f} C {x+10*s:.1f},{y-8*s:.1f} "
              f"{x+22*s:.1f},{y-4*s:.1f} {x+30*s:.1f},{y-16*s:.1f}", stroke, W_FINE, op)]
    for ox, oy in [(9,-5),(18,-6),(26,-12)]:
        lx, ly = x+ox*s, y+oy*s
        P.append(path(f"M {lx:.1f},{ly:.1f} q {6*s:.1f},{-7*s:.1f} {11*s:.1f},{-3*s:.1f} "
                      f"q {-5*s:.1f},{6*s:.1f} {-11*s:.1f},{3*s:.1f}", stroke, W_FINE, op))
    return "".join(P)


# ───────────────── 参考4：星术（七宿星官 / 方位题名） ─────────────────
def constellation(name, pts, stroke=GOLD_L, op=.75):
    """七宿星官：星点 + 连线 + 宿名逐字对应各星。"""
    P = [path(poly(pts), stroke, W_FINE, op*.6)]
    for i, (x, y) in enumerate(pts):
        P.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.9" fill="{stroke}" opacity="{op}"/>')
        P.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.2" fill="none" '
                 f'stroke="{stroke}" stroke-width="{W_FINE}" opacity="{op*.35:.2f}"/>')
        if i < len(name):
            P.append(f'<text x="{x:.1f}" y="{y-11:.1f}" fill="{stroke}" font-size="11" '
                     f'font-family="Songti SC,STSong,serif" text-anchor="middle" '
                     f'opacity="{op}">{name[i]}</text>')
    return "".join(P)


def title_seal(chars, x, y, stroke=GOLD_L, op=.85):
    """竖排方位题名，置于月轮右侧留白区。"""
    return "".join(
        f'<text x="{x}" y="{y+i*19}" fill="{stroke}" font-size="13" '
        f'font-family="Songti SC,STSong,serif" text-anchor="middle" opacity="{op}">{c}</text>'
        for i, c in enumerate(chars))


def beast_frame(parts, name, alpha, moons=((200, 200, 176),), clouds=(), vines=(),
                mansions=None, title=None, tint=GOLD):
    """四兽单稿的公共画框：月轮 + 外围云气藤蔓 + 七宿 + 方位题名。"""
    P = list(parts)
    for cx, cy, r in moons:
        P.append(moon_ring(cx, cy, r, GOLD, .34*alpha))
    for cx, cy, s in clouds:
        P.append(cloud(cx, cy, s, GOLD, .5*alpha))
    for x, y, s in vines:
        P.append(vine(x, y, s, GOLD, .45*alpha))
    if mansions:
        chars, pts, col = mansions
        P.append(constellation(chars, pts, col, .8*alpha))
    if title:
        P.append(title_seal(title, 372, 168, GOLD_L if tint == GOLD else WATER, .8*alpha))
    return wrap("".join(P), cls=f"creature {name}")


# ═══════════════════════ 青龙 · 東方蒼龍（角亢氐房心尾箕） ═══════════════════════
def dragon(stroke=GOLD, alpha=1.0):
    """参考1 法相：昂首右向、S 形躯干、四足带爪、长尾上卷成涡；
    躯干为图案化密线实块，内压卷云纹，背有脊鳍。"""
    P = [hatch_def("dragon", angle=42, stroke=stroke)]
    # S 形躯干：颈细 → 胸宽 → 腹收 → 臀隆，去除上一版平直长条感
    body = ("M 292,138 C 274,146 258,160 236,158 C 214,156 200,142 178,146 "
            "C 156,150 138,168 122,178 C 110,186 104,198 106,210 "
            "C 122,220 142,216 160,208 C 182,198 198,206 220,202 "
            "C 244,198 266,186 282,170 C 290,162 294,150 292,138 Z")
    neck_head = ("M 292,140 C 296,124 306,110 320,102 C 330,96 342,100 346,110 "
                 "C 350,120 344,128 336,128 C 344,134 342,144 334,148 "
                 "C 326,152 316,148 312,142 C 304,148 296,148 292,140 Z")
    tail = ("M 146,164 C 126,152 106,148 90,134 C 74,120 72,100 86,92 "
            "C 100,84 114,94 112,108 C 110,118 100,122 94,116 "
            "C 98,128 114,136 130,144 C 140,150 146,164 146,164 Z")
    P += [solid("dragon", body, alpha, stroke),
          solid("dragon", neck_head, alpha, stroke),
          solid("dragon", tail, alpha, stroke)]
    # 卷云纹带：沿 S 形躯干连续流动的纹样（参考1 实块内满布白线卷云）
    P.append(curl_band([(262,160,.60,-14),(238,164,.68,8),(212,158,.64,-10),
                        (186,162,.70,14),(160,174,.66,-18),(138,188,.56,22),
                        (176,192,.58,-12),(206,190,.56,16),(240,182,.52,-8),
                        (270,170,.46,20)], GOLD_L, 1.7, .88*alpha))
    P.append(spiral_tail(96, 110, 20, 1.05, GOLD_L, W_MID, .8*alpha))
    # 背脊鳍（沿 S 形上缘的锯齿，随躯干起伏）
    for k in range(10):
        x = 128 + k*17
        y = 176 + 10*math.sin(k*.5) - k*1.4
        P.append(path(f"M {x},{y:.1f} l 4,-11 l 6,10", stroke, W_FINE, .7*alpha))
    # 龙首：分叉长角、眼、张口利齿、飘须、后掠鬃（参考1 的威猛龙相）
    P.append(path("M 320,102 C 312,86 314,70 326,60 M 326,60 l 10,-8 M 326,60 l -6,-10 "
                  "M 334,104 C 340,88 350,78 362,74 M 362,74 l 9,-4 M 362,74 l -2,-11",
                  stroke, W_MID, alpha))
    P.append(f'<circle cx="328" cy="116" r="2.8" fill="{GOLD_L}" opacity="{alpha}"/>')
    P.append(path("M 342,126 C 358,128 368,140 366,154 M 334,146 C 348,156 354,170 350,184",
                  stroke, W_MID, alpha))
    P.append(path("M 336,128 l 14,-5 M 338,134 l 14,-1 M 336,140 l 13,3 "
                  "M 334,144 l -3,7 M 342,143 l -3,7", stroke, W_MID, alpha))
    for k in range(14):
        a = math.radians(148 + k*8)
        P.append(path(f"M 300,132 L {300+28*math.cos(a):.1f},{132+28*math.sin(a):.1f}",
                      stroke, W_FINE, .5*alpha))
    # 四足（线勾 + 三爪）：前后各二，错开呈行进姿态
    legs = [(250,194,254,214,250,232,242,242,1),
            (226,200,230,216,226,234,218,244,1),
            (152,206,146,222,148,238,140,248,-1),
            (130,202,122,216,122,232,114,242,-1)]
    for x0,y0,c1x,c1y,c2x,c2y,ex,ey,fl in legs:
        P.append(path(f"M {x0},{y0} C {c1x},{c1y} {c2x},{c2y} {ex},{ey}", stroke, W_MID, alpha))
        P.append(path(claw(ex, ey, 1.0, stroke, alpha, fl), stroke, W_MID, alpha))
    return beast_frame(
        P, "dragon", alpha,
        clouds=((88,116,1.2),(326,252,1.0),(112,336,1.0),(300,62,.85)),
        vines=((70,250,1.1),(300,300,.9)),
        mansions=("角亢氐房心尾箕",
                  [(70,96),(92,74),(120,62),(150,58),(180,64),(208,78),(232,96)], GOLD_L),
        title="東方蒼龍")


# ═══════════════════════ 白虎 · 西方白虎（奎婁胃昴畢觜參） ═══════════════════════
def tiger(stroke=GOLD, alpha=1.0):
    """参考1 法相：朝左行走、虎首张口、卷云状虎纹、尾高卷成 S 涡。"""
    P = [hatch_def("tiger", angle=-48, stroke=stroke)]
    # 背部弓起、腹部收紧，行走中的力感
    body = ("M 112,196 C 132,178 160,170 192,176 C 224,182 254,172 282,186 "
            "C 300,194 310,210 302,224 C 280,236 246,232 212,228 "
            "C 176,224 140,228 114,218 Z")
    head = ("M 112,198 C 98,186 80,188 72,200 C 66,210 70,224 82,228 "
            "C 94,232 106,224 114,218 Z")
    tail = ("M 294,192 C 316,178 336,160 340,140 C 344,122 334,110 320,114 "
            "C 308,118 306,132 314,140 C 320,146 330,144 332,136 "
            "C 330,154 316,168 300,182 Z")
    P += [solid("tiger", body, alpha, stroke),
          solid("tiger", head, alpha, stroke),
          solid("tiger", tail, alpha, stroke)]
    # 卷云虎纹：参考1 的标志——躯干内连续双排流动的火焰 / 卷云涡纹
    P.append(curl_band([(132,196,.60,-18),(160,192,.66,10),(190,196,.64,-12),
                        (220,198,.68,16),(250,196,.62,-10),(278,202,.56,20),
                        (152,212,.52,26),(196,214,.54,-16),(238,214,.52,12),
                        (288,214,.44,-22)], GOLD_L, 1.7, .9*alpha))
    P.append(spiral_tail(322, 128, 17, 1.0, GOLD_L, W_MID, .8*alpha))
    # 虎首：耳、额王纹、眼、张口露齿、须
    P.append(path("M 78,190 l -5,-16 l 15,10 M 104,190 l 6,-16 l 9,14", stroke, W_MID, alpha))
    P.append(path("M 82,200 l 12,1 M 81,206 l 14,1 M 82,212 l 12,1", stroke, W_FINE, .85*alpha))
    P.append(f'<circle cx="86" cy="204" r="2.6" fill="{GOLD_L}" opacity="{alpha}"/>')
    P.append(path("M 72,218 q 10,8 22,0 M 72,222 l 4,9 M 78,224 l 2,9 M 86,224 l 4,8",
                  stroke, W_MID, alpha))
    for k in range(9):
        P.append(path(f"M 84,{212+k*2} l {-14-k:.1f},{4+k*.6:.1f}", stroke, W_FINE, .42*alpha))
    # 四腿：前腿前伸、后腿后蹬（行走）
    P.append(path("M 138,222 C 130,240 124,252 116,262 M 116,262 l -10,6 M 116,262 l 2,9 M 116,262 l 10,3",
                  stroke, W_MID, alpha))
    P.append(path("M 166,226 C 164,244 166,254 160,264 M 160,264 l -9,6 M 160,264 l 2,9 M 160,264 l 10,3",
                  stroke, W_MID, alpha))
    P.append(path("M 246,228 C 250,246 254,254 262,262 M 262,262 l -10,5 M 262,262 l 1,9 M 262,262 l 10,2",
                  stroke, W_MID, alpha))
    P.append(path("M 280,226 C 288,242 294,250 302,256 M 302,256 l -9,6 M 302,256 l 2,9 M 302,256 l 10,2",
                  stroke, W_MID, alpha))
    return beast_frame(
        P, "tiger", alpha,
        clouds=((214,116,1.1),(304,306,1.0),(120,126,.85)),
        vines=((62,300,1.0),),
        mansions=("奎婁胃昴畢觜參",
                  [(70,108),(96,86),(126,72),(158,66),(190,70),(220,84),(246,104)], WATER),
        title="西方白虎", tint=WATER)


# ═══════════════════════ 朱雀 · 南方朱雀（井鬼柳星張翼軫） ═══════════════════════
def bird(stroke=GOLD, alpha=1.0):
    """参考1 法相：三支卷曲凤冠、双翼上扬、尾羽为长卷草蔓纹、双足立。"""
    P = [hatch_def("bird", angle=58, stroke=stroke)]
    body = ("M 166,198 C 156,178 162,156 180,148 C 198,140 216,148 224,164 "
            "C 232,180 230,202 218,218 C 202,232 178,226 166,198 Z")
    head = ("M 180,148 C 172,136 172,122 180,114 C 190,106 200,112 200,122 "
            "C 200,132 194,142 186,148 Z")
    # 双翼为有面积的宽扇面（上一版两条曲线过近，成了 V 字尖刺）
    wing_l = ("M 174,170 C 146,152 118,128 90,96 C 84,124 100,156 128,172 "
              "C 146,182 164,182 174,170 Z")
    wing_r = ("M 212,166 C 238,142 266,116 296,92 C 300,120 286,152 258,170 "
              "C 240,182 222,180 212,166 Z")
    P += [solid("bird", body, alpha, stroke), solid("bird", head, alpha, stroke),
          solid("bird", wing_l, alpha, stroke), solid("bird", wing_r, alpha, stroke)]
    # 层叠羽片：从肩部向上后方扇形展开，密而不成尖刺
    for k in range(10):
        t = k/9
        a_l = math.radians(-158 + t*56)
        P.append(feather(176-6*t, 166-2*t,
                         176+102*math.cos(a_l), 166+102*math.sin(a_l),
                         barbs=15, stroke=stroke, op=.6*alpha))
        a_r = math.radians(-22 - t*56)
        P.append(feather(210+6*t, 164-2*t,
                         210+102*math.cos(a_r), 164+102*math.sin(a_r),
                         barbs=15, stroke=stroke, op=.6*alpha))
    # 凤冠：三支卷曲长冠羽
    P.append(path("M 180,114 C 170,100 160,88 150,72 C 146,84 152,96 162,108",
                  stroke, W_MID, alpha))
    P.append(path("M 186,112 C 180,94 178,78 180,62 C 188,76 192,92 192,108",
                  stroke, W_MID, alpha))
    P.append(path("M 194,114 C 196,98 204,86 216,76 C 212,92 206,104 198,114",
                  stroke, W_MID, alpha))
    P.append(curl(150, 76, .6, -30, GOLD_L, W_MID, .8*alpha))
    # 眼、喙
    P.append(f'<circle cx="188" cy="126" r="2.5" fill="{GOLD_L}" opacity="{alpha}"/>')
    P.append(path("M 178,134 l -16,4 l 16,5 M 178,138 l -14,0", stroke, W_MID, alpha))
    # 胸前卷云纹
    for cx, cy, s, rot in [(190,178,.85,10),(202,196,.72,-14),(182,204,.6,24)]:
        P.append(curl(cx, cy, s, rot, GOLD_L, W_CURL, .88*alpha))
    # 尾羽：四条长卷草向右后方飘展上扬、末端内卷（参考1 的蔓草尾，非下垂触手）
    for idx, (ex, ey) in enumerate([(296,220),(320,202),(342,180),(358,156)]):
        d = (f"M 212,214 C 246,236 274,238 {ex-20:.1f},{ey+16:.1f} "
             f"C {ex+6:.1f},{ey+14:.1f} {ex+12:.1f},{ey-4:.1f} {ex},{ey} "
             f"C {ex-7:.1f},{ey-7:.1f} {ex-13:.1f},{ey-3:.1f} {ex-11:.1f},{ey+3:.1f}")
        P.append(path(d, stroke, W_MID, alpha))
        # 沿尾轴的细密羽枝
        for k in range(10):
            t = (k+1)/11
            bx = 212 + (ex-212)*t
            by = 214 + (ey-214)*t + 16*math.sin(t*math.pi)
            P.append(path(f"M {bx:.1f},{by:.1f} l 5,7 M {bx:.1f},{by:.1f} l -5,6",
                          stroke, W_FINE, .42*alpha))
        P.append(spiral_tail(ex-9, ey-2, 9, .85, GOLD_L, W_FINE, .7*alpha))
    # 双足
    for x0, ex in [(188,178),(208,220)]:
        P.append(path(f"M {x0},222 C {x0-2},240 {ex-6},252 {ex-8},264", stroke, W_MID, alpha))
        P.append(path(claw(ex-8, 264, .9, stroke, alpha, 1), stroke, W_MID, alpha))
    return beast_frame(
        P, "bird", alpha,
        clouds=((80,104,1.0),(320,104,1.0),(80,300,.9),(320,300,.9)),
        vines=((60,200,.95),),
        mansions=("井鬼柳星張翼軫",
                  [(66,96),(92,74),(120,62),(150,58),(180,64),(210,78),(234,96)], GOLD_L),
        title="南方朱雀")


# ═══════════════════════ 玄武 · 北方玄武（斗牛女虛危室壁） ═══════════════════════
def tortoise(stroke=GOLD, alpha=1.0):
    """参考1 法相：龟蛇缠绕、六边龟甲纹、蛇首昂起与龟首相对。"""
    P = [hatch_def("tortoise", angle=-38, stroke=stroke)]
    shell = ("M 126,230 C 126,194 158,174 200,174 C 242,174 274,194 274,230 "
             "C 274,258 246,274 200,274 C 154,274 126,258 126,230 Z")
    t_head = ("M 126,230 C 112,222 100,226 96,238 C 92,250 102,258 114,254 "
              "C 122,250 126,240 126,230 Z")
    P += [solid("tortoise", shell, alpha, stroke),
          solid("tortoise", t_head, alpha, stroke)]
    # 六边龟甲纹（内甲椭圆范围内的六边形网格 + 甲内细线）
    inner = ("M 142,228 C 142,200 166,186 200,186 C 234,186 258,200 258,228 "
             "C 258,250 234,262 200,262 C 166,262 142,250 142,228 Z")
    P.append(path(inner, GOLD_L, W_MID, .85*alpha))
    for row in range(4):
        for col in range(6):
            hx = 152 + col*19 + (9.5 if row % 2 else 0)
            hy = 202 + row*17
            if ((hx-200)/66)**2 + ((hy-224)/43)**2 > 1.0:
                continue
            pts = [(hx+10*math.cos(k*math.pi/3), hy+10*math.sin(k*math.pi/3))
                   for k in range(6)]
            P.append(path(poly(pts, True), GOLD_L, W_MID*.9, .85*alpha))
            P.append(path(f"M {hx-5:.1f},{hy:.1f} L {hx+5:.1f},{hy:.1f}",
                          stroke, W_FINE, .5*alpha))
    # 龟首：眼、口、颈纹
    P.append(f'<circle cx="104" cy="238" r="2.5" fill="{GOLD_L}" opacity="{alpha}"/>')
    P.append(path("M 96,246 q 9,5 17,0 M 100,230 l -3,-8 M 110,230 l 4,-8",
                  stroke, W_MID, alpha))
    # 四足 + 短尾
    for x0, y0, ex, ey in [(148,266,136,292),(172,272,166,296),
                           (234,272,242,296),(258,264,270,288)]:
        P.append(path(f"M {x0},{y0} C {x0-4},{y0+14} {ex},{ey-8} {ex},{ey}",
                      stroke, W_MID, alpha))
        P.append(path(claw(ex, ey, .8, stroke, alpha, 1), stroke, W_MID, alpha))
    P.append(path("M 274,236 l 22,-4 l -18,12", stroke, W_MID, alpha))
    # 蛇：自右下盘绕龟背而上，蛇首昂起回首（参考1 龟蛇缠绕）
    snake = catmull([(304,252),(276,244),(248,252),(220,242),(190,216),
                     (178,182),(200,152),(238,132)], 14)
    snake_d = ribbon(snake, lambda t: 7.5*(1-.45*t))
    P.append(solid("tortoise", snake_d, alpha, stroke))
    for i in range(6, len(snake)-5, 9):
        x, y = snake[i]
        P.append(path(f"M {x-4:.1f},{y:.1f} l 8,0", GOLD_L, W_FINE, .6*alpha))
    # 蛇首小幅回首探向龟背（上一版过大似鸟头，此处收小）
    P.append(path("M 238,132 C 232,124 234,114 242,112 C 250,110 254,118 248,124 "
                  "C 245,127 241,126 240,123", stroke, W_MID, alpha))
    P.append(f'<circle cx="244" cy="117" r="1.8" fill="{CINNABAR}" opacity="{alpha}"/>')
    P.append(path("M 248,124 l 9,2 M 248,124 l 6,7", stroke, W_MID, alpha))
    # 下方水波纹（玄武属水）
    for k in range(4):
        yy = 302+k*11
        P.append(path(f"M {92+k*6},{yy} q 20,-6 40,0 t 40,0 t 40,0 t 40,0",
                      stroke, W_FINE, .3*alpha))
    return beast_frame(
        P, "tortoise", alpha,
        clouds=((300,288,1.0),(88,130,.9),(266,104,.85)),
        vines=((60,250,.9),),
        mansions=("斗牛女虛危室壁",
                  [(66,98),(92,76),(120,64),(150,60),(180,66),(210,80),(234,98)], WATER),
        title="北方玄武", tint=WATER)


# ═══════════════════════ 北斗拱极（参考4 星术进入版面背景） ═══════════════════════
def big_dipper(cx, cy, s=1.0, alpha=.22):
    """北斗七星 + 北极帝星：四兽拱卫之中，呼应『众星拱北辰』与参考4 中心日月。"""
    P = []
    # 斗魁四星 + 斗柄三星（相对坐标，经典北斗形）
    raw = [(0,0),(21,-6),(29,12),(9,19),(45,25),(64,30),(83,21)]
    pts = [(cx+x*s, cy+y*s) for x, y in raw]
    P.append(path(poly(pts), GOLD_L, W_FINE, .6*alpha))
    for i, (x, y) in enumerate(pts):
        r = (2.6 + (i % 3)*.7) * s
        P.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{GOLD_L}" '
                 f'opacity="{.85*alpha:.2f}"/>')
        P.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r*2.3:.1f}" fill="none" '
                 f'stroke="{GOLD_L}" stroke-width="{W_FINE}" opacity="{.3*alpha:.2f}"/>')
    # 北极帝星：天枢→天璇 延长约 5 倍；三重光晕 + 四芒，令其成为明确焦点
    px, py = cx + 105*s, cy - 30*s
    for rr, op in [(8, .55), (17, .34), (29, .18)]:
        P.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{rr*s:.1f}" fill="none" '
                 f'stroke="{GOLD_L}" stroke-width="{W_FINE}" opacity="{op*alpha/0.30:.2f}"/>')
    P.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{4.6*s:.1f}" fill="{GOLD_L}" '
             f'opacity="{.98*alpha:.2f}"/>')
    m = 17*s
    P.append(path(f"M {px:.1f},{py-m:.1f} Q {px:.1f},{py:.1f} {px+m:.1f},{py:.1f} "
                  f"Q {px:.1f},{py:.1f} {px:.1f},{py+m:.1f} "
                  f"Q {px:.1f},{py:.1f} {px-m:.1f},{py:.1f} "
                  f"Q {px:.1f},{py:.1f} {px:.1f},{py-m:.1f} Z",
                  GOLD_L, W_FINE, .85*alpha))
    # 天球弧：帝星为中心的拱极轨道
    for rr, op in [(150, .26), (196, .18)]:
        P.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{rr*s:.1f}" fill="none" '
                 f'stroke="{GOLD}" stroke-width="{W_FINE}" opacity="{op*alpha/0.30:.2f}"/>')
    return "".join(P)


# ═══════════════════════ 四兽合成水印 ═══════════════════════
def four_creatures(alpha=.30):
    """四兽分居四方（朱雀上/玄武下/青龙左/白虎右），中央北斗拱极。
    alpha=0.30：以真实主界面（半透明卡片会压低水印）三档对比 0.18/0.24/0.30
    实测确定 —— 0.18/0.24 在卡片下几乎不可见，0.30 才让四兽背景成立，
    且水印层在内容之下，正文/九宫格可读性不受影响。
    见 design-specs/four-symbols-sky.md。"""
    # 画布取移动端竖屏比例 720×1560（≈430×920），使 contain 铺法真正占满版面；
    # 上一版正方形 1200×1200 在竖屏下只占中部一小块，四兽几乎被卡片盖没。
    W, H = 720, 1560
    parts = []

    def place(svg, x, y, scale, rot=0):
        inner = svg.split('>', 1)[1].rsplit('</svg>', 1)[0]
        parts.append(f'<g transform="translate({x},{y}) rotate({rot}) scale({scale})">{inner}</g>')

    # 四象方位：朱雀上 / 玄武下 / 青龙左 / 白虎右，中央留白拱北斗
    place(bird(alpha=alpha), 196, 60, 0.82, 0)
    place(tortoise(alpha=alpha), 196, 1090, 0.82, 0)
    place(dragon(alpha=alpha), 4, 470, 0.82, -6)
    place(tiger(alpha=alpha), 388, 470, 0.82, 6)
    parts.append(big_dipper(300, 950, 1.7, alpha))
    return wrap("".join(parts), W, H, cls="four-creatures-watermark")


# ═══════════════════════ 二十八宿星图（引导页，参考4） ═══════════════════════
def mansions():
    W = H = 800
    cx, cy = 400, 400
    P = []
    for rx, ry, op in [(330, 220, .45), (250, 165, .35), (150, 96, .3)]:
        P.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" '
                 f'stroke="{WATER}" stroke-width="1" opacity="{op}" '
                 f'transform="rotate(-18 {cx} {cy})"/>')
    P.append(f'<ellipse cx="{cx}" cy="{cy}" rx="120" ry="330" fill="none" '
             f'stroke="{WATER}" stroke-width="1" opacity=".28"/>')
    constell = [
        ("青龙", "东", 200, 30,   GOLD_L),
        ("朱雀", "南", 600, 40,   WATER),
        ("白虎", "西", 190, 700,  WATER),
        ("玄武", "北", 610, 700,  CINNABAR),
    ]
    random.seed(19)
    for name, direction, ax, ay, col in constell:
        ang0 = math.atan2(ay-cy, ax-cx)
        for k in range(7):
            a = ang0 + (k-3) * 0.085
            rr = 250 + random.uniform(-24, 24)
            base_x = cx + rr * math.cos(a) * 1.05
            base_y = cy + rr * math.sin(a) * 0.72
            n = random.randint(2, 4)
            st = []
            for j in range(n):
                st.append((base_x + (j-n/2)*random.uniform(7,13) + random.uniform(-4,4),
                           base_y + random.uniform(-16,16)))
            P.append(f'<path d="{poly(st)}" fill="none" stroke="{col}" stroke-width="1" opacity=".5"/>')
            for sx, sy in st:
                P.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{random.uniform(1.6,2.8):.1f}" '
                         f'fill="{col}" opacity=".85"/>')
    P.append(f'<circle cx="{cx}" cy="{cy}" r="20" fill="{GOLD_L}" opacity=".9"/>')
    P.append(f'<circle cx="{cx+120}" cy="{cy+70}" r="11" fill="{WATER}" opacity=".8"/>')
    for txt, tx, ty in [("春", 400, 96), ("夏", 704, 400), ("秋", 400, 716), ("冬", 92, 400)]:
        P.append(f'<text x="{tx}" y="{ty}" fill="{GOLD_L}" font-size="26" '
                 f'font-family="Songti SC,STSong,serif" text-anchor="middle" '
                 f'dominant-baseline="middle" opacity=".55">{txt}</text>')
    for name, tx, ty in [("青龙", 150, 150), ("朱雀", 650, 150), ("白虎", 150, 660), ("玄武", 650, 660)]:
        P.append(f'<text x="{tx}" y="{ty}" fill="{WATER}" font-size="18" '
                 f'font-family="Songti SC,serif" text-anchor="middle" opacity=".5">{name}</text>')
    return wrap("".join(P), W, H, cls="mansions-star-map")


def save(name, content):
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)
    print("  ", p, len(content), "bytes")


if __name__ == "__main__":
    print("生成四兽传统法相白描单稿（v3 拓片实块 + 卷云纹）...")
    save("dragon.svg", dragon())
    save("tiger.svg", tiger())
    save("bird.svg", bird())
    save("tortoise.svg", tortoise())
    print("生成四兽 + 北斗拱极合成水印...")
    save("four-creatures.svg", four_creatures())
    print("生成二十八宿星图...")
    save("mansions.svg", mansions())
    print("完成。")
