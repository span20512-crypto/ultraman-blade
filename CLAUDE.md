# 刀魂 SOUL BLADE — 项目交接 (CLAUDE.md)

KOF 式和风像素格斗游戏。纯 vanilla JS + Canvas,零依赖,零构建。人机对战,完整格斗机制 + 练习场。
**2 角色(2026-07 改名:内部 id 不变,只改 DATA.name/cn)**:内部 id `mack` = 显示「**剣二 KENJI**」力量型武士(红/POWER);内部 id `kenji` = 显示「**隼人 HAYATO**」速度型忍者(蓝/SPEED)。注意代码注释里"剑二/隼人"仍按旧义(纯注释)。逻辑一律用 id,不 key 显示名。

## Git 账户(重要,勿违反)

本项目是 Eric 的**个人项目**,一切 git 操作只用个人账户 **ericfu-tianchi**(仓库已 `git config` 锁定 `ericfu-tianchi <ericfu-tianchi@users.noreply.github.com>`)。**严禁**使用公司账户(eric.fu@opus.pro / OpusFu 组织)commit 或 push。如需 push 到 GitHub,目标是 ericfu-tianchi 的个人仓库,且需 Eric 明确指示。

## 运行

```bash
python3 serve.py          # http://localhost:8787 (必须用它: 带 no-store 头)
```

不要用 `python3 -m http.server` —— 会缓存 JS,用户浏览器会拿到旧代码(踩过坑:三代混装缓存导致 `Input.expire is not a function`)。改代码后浏览器普通刷新即最新。index.html 的 `?v=N` 是历史双保险,不必每次 bump。

## 文件地图

| 文件 | 职责 |
|---|---|
| `js/data.js` | **所有数值**:角色/动画表/招式帧数据(startup/active/total)/判定框/伤害/削护/fx刀光/seq帧序。调手感只改这里 |
| `js/fighter.js` | 状态机、updateAnim(seq分段映射)、attackLogic(连锁/hop/fx触发)、receiveHit(方向格挡/护条/破防)、runSuperSeq(超杀演出)、draw(倾角/蹲姿) |
| `js/main.js` | 回合状态机、tryHit(战斗解算/对拼快照/终结加成/连锁重击击倒)、AI冻结修复、URL调试参数 |
| `js/ai.js` | 概率分层状态机(虚拟手柄输出);难度=AI_DIFFS参数表;角落逃脱/计划年龄90tick自愈 |
| `js/ui.js` | 全部界面绘制 + UI.loadAssets(运行时抠底/内窗检测,466ms) + 和风资产应用 |
| `js/sprites.js` | Assets/Effects(slash刀光/converge聚气/petals花瓣/ring)/Stage.build(程序化背景,备用)/Projectile |
| `js/input.js` | 180ms 时间戳按键缓冲(修 120Hz 吃键)、双击冲刺、emptyPad/humanPad |
| `js/audio.js` | **SFX**=WebAudio 合成(2026-07 升级:层叠+起音渐入;`HIT_VARIANTS`A/B/C 轻重击组合、`BLOCK_VARIANTS`1/2/3 格挡)。**BGM**=真 mp3 循环(`assets/audio/bgm/`,scene→mp3 映射,经 bgmBus,0.9s crossfade,首次手势 resume ctx)。**不再是芯片乐** |
| `anim-lab.html` | **动作实验室 v2**:跑真引擎(真Fighter+Effects+木桩),慢放/逐tick/判定框;miniResolve 是 main.js tryHit 的精简副本,**改 tryHit 要同步** |
| `hitbox-lab.html` | **判定实验室**(2026-07 新建):真引擎冻结命中帧,逐招拖 box/reach/冲刺距离/dive box,导出粘回 data.js。dive 用方向性 box;强制摆招可显示连招/超杀/独立刀光 |
| `assets/img/fxcres/` | 离线修复的干净月牙(kenji-a1/a2, mack-a2),补掉画师身体咬痕;standalone smear 招式专用,勿删 |
| `kk-lab.html`/`char-lab.html`/`asset-lab.html` | 调研/对比工具页(KK方案对比·已定F / 角色候选·Ayame已砍 / 素材账本) |
| `ui-lab.html` | UI 资产库(Gemini 生成的 11 张,含用途标注) |
| `serve.py` | no-store 开发服务器 |

## 核心机制设计(动过很多轮,别轻易推翻)

- **方向格挡**(KOF式):命中瞬间按住远离方向才防;出招/跳/冲刺/蹲中不防;绕背破防。无格挡键(S=下蹲)
- **护条 Guard Gauge**:格挡积累,满100破防55tick硬直;停止被打55tick后才缓慢回复(0.14/tick)
- **连锁**:J·J/K·K 变招交替(altL/altH,light2/heavy2),命中后 contact+18tick 取消窗;**只有 K·K 第二段(rekkaH)击倒**;3hit+ 连锁招 BONUS×1.3;**蹲K noChain(独立挑空技)**;蹲J 可连打
- **实测连招表**(回归基线,伤害必须逐位一致):mack JJKU=4hit/32、JJKI=9hit/46含cine、JJKK=4hit/32;kenji JJKK=4hit/29、JJKI=8hit/45含cine;蹲J mack5/kenji4、蹲K launch 9/9
  - 基线变更(2026-07-09, Eric 平衡):剑二伤害下调 heavy11→10/heavy2 12→11/cheavy10→9/dive11→10/special13→11 → mack 连招 35/47/35→**32/46/32**、蹲K 10→9;Hayato(kenji)全程未动
- **蹲姿**:素材无蹲帧 → 分段压缩烘焙(头不缩/躯干0.76-0.8/腿0.4-0.45+前倾)出 Crouch.png(带呼吸多帧)+CrouchIn.png(入蹲过渡5tick)。**别用整体压扁,也别用AI生成帧**(像素密度对不上,试过翻车)
- **刀光 = smear 重染系统**(2026-07 定稿, 取代旧椭圆拟合弧):画师把刀光月牙手绘进攻击帧(近纯白像素),引擎提取该月牙位图、按招式主题色重染当刀光。两种用法:①**帧同步原位重染**(fighter.draw, 本体挥刀时月牙盖在原帧上,物理天然一致);②**standalone**(Effects.smearFx, 独立 fx 层, 支持 dx/dy/scale/squashY/rot/flipY/mirror/atX/atY/dir 变换, 蹲攻/演出用)。data.js 每招 `smear:{...}` 字段定义。**月牙缺口坑**:画师身体画在月牙前→掩码有咬痕→原位被身体盖住,平移/翻转才露→用 `assets/img/fxcres/` 离线修复的干净月牙(FX_SHEETS 注册 ka1/ka2/ma2)。旧程序弧 Effects.slash 仅作无 smear 兜底
- **smear/演出两个必知坑**:①`updateAnim` 每 tick 按计时器重算帧,会覆盖脚本设的 `anim.frame` → 演出定帧必须写 `anim.t=帧*hold`;②翻转规则 = 显示朝向≠素材原生朝向, 剑二 `native=-1`(面朝左),"向左跑就翻"的通用逻辑对他颠倒
- **KK 变招语义**:回升斩(heavy2)只在「真连招 + 第一下 K 命中」出现(chained+rekkaH+_chainHit 三条件);单发/被防/隔久 = 永远下劈。同理各角色 heavy2 走命中门控, 不再是 altH 每按交替
- **语言**:无中文。日文汉字做关键元素(超必殺/気/勝利/敗北/選べ、己の剣/招式名用日字形:斬獄滅裏),菜单/说明全英文。字体栈 PressStart→FusionPixelJA→FusionPixel

## 调试/验证工具链(重要!)

URL 参数:`?fight=1&p1=kenji&p2=mack&ai=hard&demo=1(双AI)&training=1&debug=1(判定框)&ff=N(同步快进N tick)&freeze=1(定格)&pose=<moveKey>(练习场每40tick自动放招)&pause=1&stage=proc&screen=select|controls` + `?screen=select&vs=30`。anim-lab 也支持 `?char=&seq=&ff=&freeze=1`。

- **无头截图**:`"/Applications/Google Chrome.app/.../Google Chrome" --headless=new --disable-gpu --user-data-dir=/tmp/chX --window-size=1024,576 --hide-scrollbars --virtual-time-budget=2500 --screenshot=out.png "<url>"`。**坑**:virtual-time 不驱动 performance.now → 定步长游戏看似冻结,必须用 ff+freeze;每次启动 ~35s(UI资产处理放大),并行开多个实例(不同 user-data-dir);macOS 无 `timeout` 命令
- **连招回归**:pad 注入法 —— cmux eval 里 `G.ai[0]={update:()=>scriptedPad}`,泵 update(),断言 hits/dmg(脚本模式见上方连招表)。cmux 打开页面后 eval;**cmux 截图对 canvas 是黑屏**,验证用 eval/toDataURL
- **AI 冻结猎手**:长时间 demo 互打,检测"150tick 无位移无动作"即抓 AI 计划快照。曾定位:blockstun 泄漏(格挡中被绕背打中不清零→busy()永真→AI手柄全空)、角落威胁反应循环、双 idle 对视
- **刀光校准**:/tmp cal.html 思路 —— 素材月牙帧+fx弧线叠画对照;月牙像素 Kasa 拟合脚本(cmux eval)

## 资产与生成管线

- 角色 sprite:LuizMelo Martial Hero 1&2(itch.io 免费可商用,经 chriscourses/fighting-game GitHub 镜像获取)。**kenji 每张攻击表只有 4 帧且共用大月牙 —— 素材上限**,fx 系统就是补偿
- UI 资产:Gemini 直连生成(`GEMINI_API_KEY` 环境变量,`assets/ui-lab/gen-kit.py`,风格前缀 STYLE 常量保持同调),运行时 ui.js 抠底应用;新增资产走同一管线,不要用 Opus Flyer API(cloudflared 登录经常过期)
- 参考图生成(nano-banana 特长):以角色帧为 inline 参考 + 品红底抠图,对 UI 可行,对**逐帧动作素材不可行**(画风/像素密度断裂)
- 字体:Press Start 2P + Fusion Pixel zh/ja(均 OFL)。背景 = Gemini stage-alt(默认)/Stage.build 程序化(备用)

## 已知事项/欠账

- anim-lab 的 miniResolve 与 main.js tryHit 存在复制漂移风险(改一处同步另一处)
- assets/img/background.png、shop.png 为旧素材,未使用
- workflow 子代理曾撞组织月度花费上限被中断 —— 大改动建议单线程+工具链自查
- 用户(Eric)标准:**maximum design effort**,反感 AI slop;交付前必须逐屏/逐招截图自查;他会亲自逐帧看动作实验室,反馈格式「角色/招式/tick」
