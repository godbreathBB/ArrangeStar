# 核实清单 · 四象星图视觉（合并 main 前）

> 分支：`design/four-symbols-sky`。本分支**尚未合并 main**，核实通过后再合并。
> 设计依据：`design-specs/four-symbols-sky.md`；图像源：`assets/symbols/`。

## 本次改动

1. **四兽白描线稿**（青龙/白虎/朱雀/玄武）：`tools/gen_symbols.py` 参数化生成，四兽单稿 + 合成水印 `assets/symbols/four-creatures.svg`。技法取自参考图1（长曲线勾形 + 鳞羽排线 + 散点云气 + 留白）。
2. **二十八宿星图** `assets/symbols/mansions.svg`：四象七宿星点连线 + 三层椭圆天球轨道 + 四时字 + 中心日月。取自参考图3。
3. **版面背景** `css/style.css`：新增 `body::before` 固定水印层，8.5% 泥金透明度的四兽分居四方，置于渐变星空之上、内容之下；`prefers-reduced-motion` 下呼吸动画停止。
4. **引导背景** `css/onboarding.css` + `index.html`：`.ob-root` 改为图2水体纵深（顶部冷青紫透光 → 底部深靛蓝沉入），新增 `.ob-mansions` 缓慢旋转星图层与 `.ob-lightbeam` 斜射光束；无障碍降级已覆盖新动画。
5. **缓存** `sw.js`：v11 → v12，两个运行时 SVG 加入预缓存。

## 已在分支上完成的确定性验证

| 项 | 方法 | 结果 |
|---|---|---|
| 引导第1页 | Chrome 无头截图（430×920） | 水体明暗成立、星图/光束可见、标题按钮在受光区可读 |
| 主界面 | Chrome 无头截图（430×920） | 四兽水印隐约可见不干扰、正文九宫格可读、无横向溢出 |
| 四兽辨识 | 大图检视 | 龙/虎/雀/龟蛇均可辨识，线条流畅无断裂 |
| CSS 语法 | 花括号配平 | 385/385、106/106 通过 |
| 无障碍 | 选择器检查 | reduced-motion / focus-visible 保留，星图与光束动画纳入降级 |
| 资源 | 本地服务 HTTP | 全部 200；CSS 引用的两个 SVG 存在；缓存版本 v12 |

## 合并 main 前需人工核实（真机物理环境，agent 无法自取）

1. **OLED 深色观感**：四兽水印 8.5% 透明度在真机 OLED 屏（纯黑发光特性）上是否过淡或恰好；引导顶部冷青紫透光在真机的色温表现。影响组件：`body::before`、`.ob-root`。
2. **固定背景滚动**：`background-attachment:fixed` 在 iOS Safari 上的水印层滚动表现（部分 iOS 版本对 fixed 背景处理不同），确认四兽水印不随内容异常位移。影响组件：`body::before`。
3. **星图旋转性能**：`.ob-mansions` 90s 旋转 + `.ob-lightbeam` 光束浮动在低端机型的帧率与发热；如卡顿可在系统"减少动效"下验证已静止。影响组件：引导背景层。
4. **双语与长文案**：切换 EN 后，引导文案变长时星图/光束是否仍不压字；真机不同字号（系统大字模式）下标题对比度。本次未改 DOM/文案，风险低但需确认。
5. **已安装用户的缓存更新**：SW 版本 v12 升级后，已安装 PWA 是否能拉到新 SVG；首次启动引导只显示一次，老用户看不到引导页新背景（属预期，仅新用户可见）。

## 合并命令（核实通过后）

```bash
cd /Users/zkj/WorkBuddy/2026-11-19-10-07-25/ArrangeStar
git checkout main
git merge --no-ff design/four-symbols-sky -m "merge: 合入四象星图视觉（核实后并入主线）"
git push origin main
```
