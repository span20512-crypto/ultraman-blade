# HANDOFF — 拳魂 SOUL FIST · 音效全面重制 + 起始页 + 改名 + 判定实验室逐招调参

- **任务**: 用 Lyria 换真·日式武士 BGM、升级 SFX、加 Press Any Key 起始页、互换两角色名、修一批 UI 细节;**当前主线 = 用「判定实验室」逐招标注命中范围(box/reach)/冲刺距离,逐个读出来实装进游戏**
- **as-of**: 2026-07-09

## TL;DR 当前状态
BGM、SFX、起始页、改名、UI 细节都已实装完毕(见下)。现在的活是**判定手感**:Eric 在 `hitbox-lab.html` 里逐招拖 box,告诉我"好了",我从他那个浏览器标签把值读出来写进 `js/data.js`。**剣二(mack)全套已实装;隼人(kenji)标了一部分正在进行**。刚修完一个**致命崩溃**(隼人跳K崩)+ kenji cheavy 刀光过大 + 实验室里 kenji dive 不显示月牙 —— 这三处**已改好但还没验证**(我正要截图验证时被 /handoff 打断)。所有改动**未提交**。

## 已完成(本 session,均已实装)
- **BGM**: 芯片乐 → 4 段 Lyria mp3 循环(经 bgmBus、静音键有效、0.9s crossfade、每帧跟画面切、AudioContext 挂起已 resume)。定稿:菜单/选人=`select-3`(共用一曲)、战斗=`battle-1`、结算=`result-1`(余韵)。素材在 `assets/audio/bgm/`。
- **SFX**: 真实采样路线被否(太写实)→ **升级现网合成音**(层叠+起音渐入去糊)。轻/重击有 A/B/C 三组(默认 A);格挡有 1/2/3 三备选(**定 1 刃鸣**);块声大幅加响。真实采样素材还堆在 `assets/audio/sfx/candidates/`(已作废,可删)。
- **Press Any Key 起始页**: 未按键=Logo 居中+「PRESS ANY KEY / 何かキーを押して」(无中文)、无菜单、无 BGM;首次任意键/点击 → Logo 上升 + 菜单淡入 + BGM 起。
- **改名(重要)**: 红角色(内部 id `mack`)显示 **剣二 KENJI**(POWER);蓝角色(内部 id `kenji`)显示 **隼人 HAYATO**(SPEED)。内部 id 没改,只改 `DATA.*.name/cn` + ui.js 两句玩法文案;代码注释里"剑二/隼人"仍按旧义(纯注释,不影响)。
- **UI 细节**: 选人姓名 EN/CN 居中不贴边;VS 头像↔徽章左右间距对称;对战 HUD 头像提亮(brightness 1.2);首页上升灰尘粒子加显眼(22 颗/α0.42)。
- **判定实验室 hitbox-lab.html**: 新建的核心工具(真引擎冻结在命中帧、拖 box 实时改 DATA 活引用)。已含:box 四滑块+数值输入+回归原值、刀尖参考线、木桩距离、**dive 用方向性 box**、**必杀/大招/heavy2 冲刺距离滑块+"冲到此"标记**、强制摆招(连招/超杀/独立刀光都能显示)。
- **剣二(mack)判定全套已实装**: 9 招 box x2≈208、air/dive/special/cheavy 各自 box、冲刺 vx(必杀 6.25、大招 8)。

## 进行中(精确停点)
1. **最后三处修复已写入 `js/data.js`+`hitbox-lab.html`(语法通过)但未验证**(截图时被打断):
   - `js/data.js`: kenji `cheavy` smear `scale: 1.28 → 1.18`(比 heavy2 的 1.14 大一丢丢);kenji `cheavy` box x2→200;kenji `dive` box → `{-25,202,-95,10}`;mack `special` dash vx→6.25、`super` dash vx→8。
   - `hitbox-lab.html` arm(): dive 强制摆到"有月牙的帧"(`A.anim.frame = def.smear.phases[0].f`)—— 让 kenji dive(月牙在帧1)也显示刀光。
2. **隼人(kenji)判定标注未完**: 已标 light/light2 x2=192、heavy/heavy2 x2=200、clight/clight2 `{10,192,-88,-5}`、air `{8,145,-140,10}`、cheavy box `{5,200,-190,-20}`、dive box `{-25,202,-95,10}`。dashslash/super 等**可能还在原值/未标**。Eric 会继续标。

## Next steps
1. **验证最后三处修复**(冷启动可直接做): 开 `http://localhost:8787/hitbox-lab.html?char=kenji&move=dive` —— kenji dive 应能看到紫色月牙(之前空);切 `move=cheavy` —— cheavy 刀光应明显变小(≈heavy2)。再开 `?fight=1&p1=kenji&training=1` 按跳K,确认**不再崩**。
2. **接住 Eric 的隼人标注**: 他标好说"好了" → 找到活的实验室标签(`cmux browser --surface <s> get-url | grep hitbox`)→ eval 读 `DATA.kenji.moves` vs `ORIG.kenji` 的 diff(box + dash.vx)→ 写进 `js/data.js`。定位平衡:**隼人近战判定比剣二小一点**(已和 Eric 定过)。
3. 全部标完后: 建议跑一遍 9 连招回归(scratch 里 run_regress4.sh,伤害逐位一致);然后问 Eric 是否提交(见 Gotchas)。

## 资源索引
**文件**
- `~/Desktop/soul-fist/hitbox-lab.html` — **判定实验室**,当前主战场;真引擎逐招调 box/reach/冲刺,导出粘回 data.js
- `~/Desktop/soul-fist/js/data.js` — 全部招式 box/dash/smear + 角色 name/cn。判定值都写这里
- `~/Desktop/soul-fist/js/fighter.js` — `activeBox()`(判定框来源,dive 分支有 box/slamRange 兜底,**永不因缺 box 崩**);draw 里帧同步月牙重染
- `~/Desktop/soul-fist/js/audio.js` — BGM(mp3循环/crossfade)+ SFX(升级合成 + HIT_VARIANTS A/B/C + BLOCK_VARIANTS 1/2/3)
- `~/Desktop/soul-fist/js/ui.js` — 起始页/选人/VS/HUD 绘制(改名文案、粒子、姓名对齐都在此)
- `~/Desktop/soul-fist/CLAUDE.md` — 项目 SSOT(架构/机制/坑),动手前必读
- `~/Desktop/soul-fist/{bgm,sfx,result}-lab.html` — 音效试听页(已定稿,基本不用再动)
**链接**(右侧 cmux 浏览器)
- `http://localhost:8787/hitbox-lab.html?char=kenji&move=<招>` — 判定实验室(char=mack/kenji)
- `http://localhost:8787/?fight=1&p1=kenji&p2=mack&training=1` — 修行(复测隼人跳K崩溃)
**命令·进程**
- `python3 serve.py`(在 ~/Desktop/soul-fist)—— 起服务器(必用,带 no-store)。**8787 已在跑**(本 session,curl 返回 200)
- 无头截 canvas: `"/Applications/Google Chrome.app/..." --headless=new --window-size=W,H --virtual-time-budget=6000 --screenshot=out.png <url>`,后台跑 + `sleep 44; kill`(会卡不退,必须看门狗)

## Gotchas
- **读实验室调值**: 值在**浏览器标签内存**(拖动直接改 `DATA` 活引用)。用 `cmux browser --surface <S> eval` 比对 `DATA[cid].moves` vs `ORIG[cid]`(ORIG 是载入时快照)。标签得是**活的**(`get-url | grep hitbox`;关掉的会报 not a browser)。`DATA/ORIG/tipMap/bladeTipX` 是词法全局、eval 可读(偶尔 flaky);`window.G` 要短路。
- **reload 会清空实验室里的在标进度**(box 编辑在内存,刷新即回 data.js)。所以**改实验室代码或让 Eric 换页前,先把他当前进度读出来写进 data.js**。(考虑过 localStorage 持久化但没做。)
- **无头 Chrome 能截 canvas,cmux 截 canvas 是黑屏** —— 视觉验证一律用无头 Chrome(带看门狗)。
- **刀光/smear 不能随便缩短**: 白月牙是**烘焙进 sprite 攻击帧**的,缩短彩色重染层会露出底下的白月牙尖(裁尖方案试过、被否)。**独立刀光(standalone,如 kenji cheavy 的 fx:ka2)可以改 scale 干净缩放**;帧同步的(light/heavy 等)不能。所以定的是**方案 A:只改 box/reach,刀光保持原长**。
- **dive 现在用 box(非对称 slamRange)**: mack/kenji 的 dive 都已给 box;`activeBox` 有兜底(有 box 用 box、没 box 退 slamRange)—— 别把兜底删了。
- **回归红线**: 9 连招伤害必须逐位一致。本轮所有判定调参**只动 reach/box/dash、没动伤害** → 回归安全。
- **git 账户**: 只用个人 `ericfu-tianchi`,**push 需 Eric 明确同意**,不直连 master(公司规范:squash merge)。本 session 一堆改动**未提交**。建议 commit message: `feat: 音效全换(Lyria BGM+升级SFX)+ Press Any Key 起始页 + 角色改名(红=剣二/蓝=隼人)+ 判定实验室与逐招 box 调参`。
- Eric 标准: maximum design effort、反感 AI slop;MVP→他验收→再铺开;反馈格式「角色/招式/tick」。

## 自检
1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/` 回 `200`(没跑就 `cd ~/Desktop/soul-fist && python3 serve.py &`)
2. `node --check js/data.js && node --check js/fighter.js && node --check js/audio.js` 全 OK
3. 开 `hitbox-lab.html?char=kenji&move=dive` 无报错、能看到紫月牙 + 红判定框;`?fight=1&p1=kenji&training=1` 按跳K不崩(fighter.js activeBox 已兜底)
