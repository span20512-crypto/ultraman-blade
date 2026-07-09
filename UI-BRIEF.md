# UI 打磨工作简报 (ericf-0705--ui-polish 分支专用)

你在 SOUL BLADE 的 **UI worktree**（`~/Desktop/soul-fist-ui`，分支 `ericf-0705--ui-polish`）。
主 worktree（`~/Desktop/soul-fist`，main 分支）正在并行打磨战斗表现，**由另一个 session 负责，与你无关**。

先通读仓库根目录 `CLAUDE.md`（全局交接文档：架构、工具链、Eric 的验收标准），再回来读本文件。

## 使命

游戏 UI 目前约 70 分，目标提升到 85 分左右。范围包括：
1. **UI 资产 library 的系统性建立**：现有 11 张 Gemini 生成资产（见 `ui-lab.html` 及 `assets/ui-lab/`），盘点缺口、补齐、统一风格。
2. **游戏内 UI 打磨**：标题/选人/操作说明/战斗 HUD（血条/护条/气槽/计时/连击）/暂停/结算，逐屏提升。

## 硬边界（防止与主线冲突，务必遵守）

- **只允许改**：`js/ui.js`、`ui-lab.html`、`assets/`、`index.html`、`css/`、`serve.py`(如需)。
- **禁止改**：`js/data.js`、`js/fighter.js`、`js/sprites.js`、`js/main.js`、`js/ai.js`、`js/input.js`、`js/audio.js`、`anim-lab.html` —— 这些是主线正在动的文件，改了必然合并冲突。若发现必须动它们才能实现某效果，停下来向 Eric 说明，不要自行改。
- **git**：只用个人账户 ericfu-tianchi（本 worktree 已 config 锁定）；只在本分支 commit；**严禁 push、严禁 merge 到 main**——合并时机由 Eric 决定。

## 运行与验证

```bash
cd ~/Desktop/soul-fist-ui && python3 serve.py 8788   # 注意端口 8788, 别抢主线的 8787
```

- 逐屏 URL：`?screen=select`、`?screen=controls`、`?screen=select&vs=30`、`?fight=1&p1=mack&p2=kenji&ai=easy`、`?fight=1&demo=1`(双AI看HUD)、`?ff=N&freeze=1`(定格)。
- 无头截图自查（CLAUDE.md 有完整参数）：virtual-time 不驱动 performance.now，必须配 `ff=N&freeze=1`；每张 ~35-40s；**复用 user-data-dir 会挂死**，每张用独立 fresh profile + 看门狗。
- cmux 截 canvas 是黑屏，验证用 eval/toDataURL。

## 资产生成管线（已验证可用）

- Gemini 直连：`GEMINI_API_KEY` 环境变量 + `assets/ui-lab/gen-kit.py`，**风格前缀用文件里的 STYLE 常量保持同调**。
- 运行时接入：`ui.js` 的 `UI.loadAssets`（运行时抠底/内窗检测）。新资产走同一管线。
- 不要用 Opus Flyer API（cloudflared 登录经常过期）；**不要 AI 生成角色动作帧**（像素密度断裂，历史翻车）。
- 语言规范：无中文。日文汉字做关键元素（超必殺/気/勝利/敗北 等），菜单/说明全英文。字体栈 PressStart → FusionPixelJA → FusionPixel。

## Eric 的验收标准

- **maximum design effort，杜绝 AI slop**。他会逐屏亲自看。
- 交付节奏：**敏捷打样**——先做 1-2 屏给他看方向，确认口味后再铺开，不要闷头全做完。
- 交付前逐屏截图自查（他不在场时）；他在线盯着看时小改动可直接交。
- 反馈格式他惯用「屏幕/元素」定位问题。

## 建议的第一步（供参考，Eric 可调整）

1. 起服务器，逐屏截图现状，给出 70 分的具体扣分点清单（哪屏哪个元素差在哪）。
2. 提出提升方案（资产缺口清单 + 每屏改造点），按性价比排序给 Eric 拍板。
3. 拍板后先打样 1 屏（建议战斗 HUD 或标题屏），验收通过再铺开。
