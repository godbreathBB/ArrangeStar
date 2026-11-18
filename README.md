# 星垣 ArrangeStars

紫微斗数 / 八字 / 奇门遁甲的纯前端排盘与解读应用。所有计算在浏览器本地完成，档案只保存在本机，不上传任何数据。可作为网页使用，也可「添加到主屏幕」当离线应用（PWA）。

## 功能特性

- **紫微斗数**：本命盘、大限 / 流年 / 流月 / 流日切换，三方四正连线、四化跳宫、宫位与星曜解读弹层。
- **八字**：四柱排盘、十神与藏干、强弱喜忌、格局、大运流年，以及按日干十神与喜忌生成的「今日一句」。
- **奇门遁甲**：时家转盘九宫盘（阳遁 / 阴遁、值符值使、九星八门八神、空亡驿马、十干克应、格局），并附「奇门讲堂」——十讲原理课、跟盘八步带读、按事查用神速查。
- **本机档案**：排盘结果可保存到浏览器 localStorage，随时调取。
- **离线可用**：Service Worker 缓存应用外壳，断网后仍可打开已访问页面。

## 本地运行

```bash
# 方式一：仅查看（需先用构建命令生成产物，见下）
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080

# 方式二：完整构建（克隆仓库后首次运行）
npm install        # 安装 lunar-typescript 与 esbuild
npm run build      # 生成 bundle.js 与 js/data.js
npm run serve      # 启动本地服务
```

> `bundle.js` 与 `js/data.js` 是构建产物，已加入 `.gitignore`，不随仓库提交。克隆后需先执行 `npm install && npm run build`。

## 目录结构

```
ArrangeStars/
├── index.html              应用入口（相对路径引用资源）
├── bundle.js               [构建产物] esbuild 打包的前端脚本
├── manifest.webmanifest    PWA 配置（含 180/192/512 图标）
├── sw.js                   Service Worker（缓存版本 xingyuan-v2，含离线回退）
├── icon-180/192/512.png    PWA 图标
├── css/style.css           样式
├── js/
│   ├── app.ts              入口与交互（排盘表单、页签、档案、设置）
│   ├── reading.ts          解读文案装配与弹层
│   ├── data.js             [构建产物] 解读文案库（由 data/ 合并生成）
│   └── engine/             纯函数排盘引擎（TypeScript）
│       ├── ziwei.ts        紫微斗数
│       ├── bazi.ts         八字
│       ├── qimen.ts        奇门遁甲
│       └── composer.ts     大限/流年/流月/流日与解读装配
├── data/                   解读文案 JSON（35 个，按主题分目录）
│   ├── reading/            紫微解读
│   ├── reading_bazi/       八字解读
│   └── reading_qimen/      奇门解读
├── tools/build_data.py     把 data/ 的 JSON 合并为 js/data.js
├── package.json            依赖与构建脚本
├── .env.example            环境变量模板（本应用无需密钥）
├── LICENSE                 MIT 许可证
└── README.md               本文档
```

## 部署方式

任意静态托管均可，例如 GitHub Pages、Netlify、Vercel 或自有 Nginx：

1. 克隆仓库后执行 `npm install && npm run build` 生成产物；
2. 将整个目录（含构建产物）发布为静态站点根目录；
3. 确保以 HTTPS 访问（Service Worker 注册要求安全上下文，`localhost` 除外）。

GitHub Pages：仓库 Settings → Pages → Source 选择 `main` 分支根目录即可。若使用 Actions 自动构建，可在工作流中执行 `npm ci && npm run build` 后发布产物目录。

## 说明

本项目为传统文化与历法计算的学习工具，排盘结果仅供研究与参考，不构成任何决策、医疗、法律或财务建议。

## 许可证

MIT，见 [LICENSE](LICENSE)。
