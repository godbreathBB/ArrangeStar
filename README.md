# 星垣 ArrangeStar

紫微斗数 / 八字 / 奇门遁甲的纯前端排盘与解读应用。所有计算在浏览器本地完成，档案只保存在本机，不上传任何数据。可作为网页使用，也可「添加到主屏幕」当离线应用（PWA）。

## 功能特性

- **紫微斗数**：本命盘、大限 / 流年 / 流月 / 流日切换，三方四正连线、四化跳宫、宫位与星曜解读弹层。
- **八字**：四柱排盘、十神与藏干、强弱喜忌、格局、大运流年，以及按日干十神与喜忌生成的「今日一句」。
- **奇门遁甲**：时家转盘九宫盘（阳遁 / 阴遁、值符值使、九星八门八神、空亡驿马、十干克应、格局），并附「奇门讲堂」——十讲原理课、跟盘八步带读、按事查用神速查。
- **中英双语**：顶部 `EN / 中文` 按钮即时切换；界面、盘面术语、章节标题与全部解读正文均为中英两套（紫微五维解读有独立英文文案库，规则包显示为英文名与版本号），中文文案库原文可展开对照。语言选择写入本机 localStorage，刷新后保持；也可用 `?lang=en` 直接打开英文版（链接参数会覆盖已保存的语言偏好，用户主动切换语言后该参数会被移除，避免刷新时反复压过偏好）。
- **首次引导**：首次打开显示 4 页奇门主题引导动画（八卦旋转 / 九宫亮起 / 竹简浮现 / 卷轴展开），可跳过；设置里可随时"重看引导"。看过一次后不再自动弹出。引导与主程序共用同一语言状态，九宫卦名与按钮文案随中英切换更新；竹简 12 字为装饰性字形，不作为可读文案。
- **本机档案**：排盘结果可保存到浏览器 localStorage，随时调取。
- **离线可用**：Service Worker 缓存应用外壳，断网后仍可打开已访问页面。
- **专属图标**：PWA 图标为「星垣 · 众星拱极」定制设计——泥金「星」字居中，双层罗盘环 + 七方位星点 + 北极帝星，深空石青底；提供 `any` 与 `maskable`（中心 80% 安全区）两套，设计规范与 SVG 源见 `design-specs/icons/`。

## 本地运行

```bash
# 方式一：直接用仓库自带产物查看
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080

# 方式二：完整构建（克隆仓库后首次运行）
npm ci             # 按 package-lock.json 复现 lunar-typescript 与 esbuild
npm run build      # 生成 bundle.js、js/data.js，并自动同步 sw.js 缓存版本
npm run typecheck  # TypeScript 静态类型检查（noEmit，不产出文件）
npm run verify     # 确定性自检：双语键、PWA 资源、引擎回归与输入边界
npm run serve      # 启动本地服务
```

> `bundle.js` 与 `js/data.js` 是构建产物，已随仓库提交，克隆后可直接用方式一启动，也可启用 GitHub Pages 直接部署。修改源码后执行 `npm ci && npm run typecheck && npm run build && npm run verify` 重新生成产物并提交；该命令同时会按外壳文件内容重算 `sw.js` 的 `CACHE` 名，所以发布时不需要手工改缓存版本号。

## 目录结构

```
ArrangeStar/
├── index.html              应用入口（相对路径引用资源）
├── bundle.js               [构建产物] esbuild 打包的前端脚本
├── manifest.webmanifest    PWA 配置（any 180/192/512 + maskable 192/512 图标）
├── sw.js                   Service Worker（缓存版本由构建自动生成，含离线回退）
├── icon-180/192/512.png    PWA 图标（any，满幅构图，iOS / 常规场景）
├── icon-maskable-192/512.png  PWA 图标（maskable，主体收进中心 80% 安全区）
├── assets/symbols/         四象视觉 SVG：四兽白描单稿 / 合成水印 / 二十八宿星图
├── design-specs/
│   ├── book-driven-refine.md      视觉修饰依据（两本设计经典）
│   ├── visual-system.md           全盘视觉令牌单一事实来源
│   ├── four-symbols-sky.md        四象星图设计依据（四张参考图转译规则）
│   ├── REVIEW-BEFORE-MERGE.md     全盘视觉合并核实清单
│   ├── REVIEW-FOUR-SYMBOLS.md     四象星图 v3 合并核实清单
│   └── icons/                     图标 SVG 设计源（any / maskable）
├── css/style.css           样式
├── css/onboarding.css      首次启动引导样式（4 页 · 奇门主题 · 原生 CSS 动画）
├── js/
│   ├── onboarding.js       首次启动引导逻辑（原生 ES6，滑动/按钮/双语/首次检测）
│   ├── i18n.ts             中英双语层（界面文案、术语表、语言状态）
│   ├── app.ts              入口与交互（排盘表单、页签、档案、设置）
│   ├── reading.ts          解读文案装配与弹层
│   ├── data.js             [构建产物] 解读文案库（由 data/ 合并生成）
│   └── engine/             纯函数排盘引擎（TypeScript）
│       ├── ziwei.ts        紫微斗数
│       ├── bazi.ts         八字
│       ├── qimen.ts        奇门遁甲
│       ├── composer.ts     大限/流年/流月/流日与解读装配
│       └── validate.ts     输入校验（只判数值合法性，不参与换日/换年口径）
├── data/                   解读文案 JSON（44 个，按主题分目录）
│   ├── reading/            紫微解读（中文）
│   ├── reading_en/         紫微解读英文库（五维模板、格局、双星等）
│   ├── reading_bazi/       八字解读
│   └── reading_qimen/      奇门解读
├── tools/build_data.py     把 data/ 的 JSON 合并为 js/data.js
├── tools/sync_sw.py        按外壳内容生成 sw.js 缓存版本（--check 只校验）
├── tools/verify.mjs        确定性自检脚本（npm run verify）
├── tools/gen_icons.py      图标 SVG 生成器（改配色/构图后重跑）
├── tools/gen_symbols.py    四象 SVG 生成器（四兽法相 / 二十八宿 / 北斗拱极，改参数后重跑）
├── tools/svg2png.swift     SVG → PNG 渲染器（macOS 原生，无第三方依赖）
├── package.json            依赖与构建脚本
├── package-lock.json       依赖版本锁定（npm ci 用）
├── tsconfig.json           TypeScript 类型检查配置（noEmit、宽松模式）
├── tools/verify.yml.example  CI 工作流模板（需 workflow 权限激活，见部署章节）
├── .env.example            环境变量模板（本应用无需密钥）
├── LICENSE                 CC BY-NC 4.0 非商业许可
└── README.md               本文档
```

## 部署方式

任意静态托管均可，例如 GitHub Pages、Netlify、Vercel 或自有 Nginx：

1. 仓库已自带构建产物，可直接发布为静态站点根目录；修改源码后执行 `npm ci && npm run typecheck && npm run build && npm run verify` 并提交新产物（`sw.js` 也在提交范围内）；
2. 将整个目录（含构建产物）发布为静态站点根目录；
3. 确保以 HTTPS 访问（Service Worker 注册要求安全上下文，`localhost` 除外）。

GitHub Pages：仓库 Settings → Pages → Source 选择 `main` 分支根目录即可。CI 工作流模板存放于 `tools/verify.yml.example`：在具备 `workflow` 权限范围的凭证下复制为 `.github/workflows/verify.yml` 并提交后，push / PR 到 `main` 时会执行 `npm ci && npm run typecheck && npm run build && npm run verify` 并校验构建产物与提交内容一致；该工作流只做验证，不负责部署。当前推送凭证为 OAuth App 且缺少 `workflow` 权限范围，故模板尚未激活。激活命令：`cp tools/verify.yml.example .github/workflows/verify.yml`，由具备该权限的凭证提交。

> 缓存更新：`sw.js` 采用 cache-first，只有 SW 脚本字节变化才会触发 `install`。`npm run build` 会用外壳文件内容的哈希生成 `CACHE` 名，内容一变版本就变；已安装客户端仍可能需要刷新一次页面才能看到新版。

> 子路径部署：`manifest` 的 `id` / `start_url` / `scope` 与 `sw.js` 的 `SHELL` 全部使用相对路径；若部署到 CDN 或带 `og:image` 的分享卡片，需把 `index.html` 中的 `og:image` 改成部署域名的绝对 URL。

## 确定性自检

`npm run verify` 不依赖浏览器，检查以下项目：

- 中英文案表键对称、`index.html` 与源码 `t()` 引用的键均有定义；
- manifest 图标文件存在且 PNG 实际尺寸与 `sizes` 声明一致；
- `sw.js` 的 `SHELL` 清单文件齐备、缓存版本与外壳内容一致；
- 主界面 `hidden` 有引导脚本加载失败的兜底、真太阳时不依赖宿主本地时区；
- 排盘引擎回归基线（紫微时辰/命宫、八字四柱、奇门节气）与非法输入显式报错。

另由 `npm run typecheck` 单独执行 `tsc --noEmit`，检查 `js/**/*.ts` 的类型一致性。

引擎新增的校验只判断数值是否合法，**不改变**换日、换年、交节、闰月、真太阳时跨日等口径；这些口径的设定属于术数规则决策，需由项目所有者另行拍板。

CI 模板 `tools/verify.yml.example` 跑的是同一套命令（含类型检查），另加一道「产物一致性」闸：源码改了却未同步提交 `bundle.js` / `js/data.js` / `sw.js` 时直接失败，避免静态站点继续跑旧代码。模板当前未激活，原因与激活方式见上文部署章节。

类型检查为宽松模式（`strict: false`，只拦截类型不匹配与未定义引用，不强制全量类型标注）。接入时实测 24 处类型错误，已全部修正；其中 `js/app.ts` 点击事件里局部变量 `t`（事件目标）遮蔽了导入的翻译函数 `t()`，会让「清空档案」按钮抛 `TypeError`，属真实运行时缺陷，已改名为 `target` 并保留 `t()` 调用。

本次未处理、需明确知悉的一项：

- **真机复核项**：两份合并核实清单列出的 OLED 观感、iOS 固定背景滚动、星图旋转帧率等，依赖物理设备，自动化脚本无法自取。

## 说明

本项目为传统文化与历法计算的学习工具，排盘结果仅供研究与参考，不构成任何决策、医疗、法律或财务建议。

## 许可证

CC BY-NC 4.0（署名-非商业性使用 4.0 国际），版权归 godbreathBB 所有，见 [LICENSE](LICENSE)。

- 允许：非商业目的下复制、分享、修改，须保留署名与许可声明并标明改动。
- 禁止：商业使用（以商业优势或金钱报酬为主要目的的使用）。
- 商用授权：需另行取得著作权人书面许可。

此前版本曾以 MIT 发布，本变更不追溯适用于变更日前已取得的副本。
