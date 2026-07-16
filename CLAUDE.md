# 刀魂 SOUL BLADE — 项目交接 (CLAUDE.md)

KOF 式和风像素格斗游戏。纯 vanilla JS + Canvas,零依赖,零构建。人机对战,完整格斗机制 + 练习场。
**8 英雄(2026-07-15 扩编;内部 id 永不变,只改 DATA.name/cn)**:基底二人 —— `mack` = 「**ULTRAMAN 初代奥特曼**」力量型(红/POWER),`kenji` = 「**ZERO 赛罗奥特曼**」速度型(紫/SPEED);克隆六人(`data.js HERO_CLONES`,帧数据/判定/伤害与基底逐位相同,smear/fx 色相重映射换装)—— `seven` 赛文(kenji 系/翠绿,**poses:false**:素材库只有正脸基础形象,无出招姿态图集,stillDef 回退基础身;补 02 动作图集后可移除)、`taro` 泰罗(mack 系/橙)、`gaia` 盖亚(mack 系/绯红)、`tiga` 迪迦(kenji 系/魅紫)、`dyna` 戴拿(kenji 系/青)、`zett` 泽塔(kenji 系/蓝)。名册常量 `ROSTER`(data.js),选人/图鉴/CPU 轮换共用;**AI/特效的角色分支一律看 `c.base`**('mack'|'kenji'),不 key id。对手侧(rival/CPU)显示名 = `STILLS[cid].rival`「KAIJU 1 怪兽一号 / KAIJU 2 怪兽二号」(art 字段选 kaiju 立绘,`UI.sideName(cid, rival)` 统一取)。注意代码注释里"剑二/隼人"仍按旧武士义(纯注释)。逻辑一律用 id,不 key 显示名。
**新英雄素材管线(2026-07-15)**:源 = `assets/img/ultraman-icons/hero-moves/`(codex 分支 03-08 图集,320 透明 PNG);战斗立绘/选人立绘由 scratchpad bake 脚本烘焙 —— stance = light 姿去能量爆(fx 色相带种子→大连通域→有界生长→最大连通域清渣),方格脚底线 y=304、身高对齐 250,portrait 320x344 身高 328;HUD 取景值在 `ui.js stillCrop`(u:/k: 新 id 已录)。字体:新增汉字/假名已重子集化(pyftsubset 不可用时可用 npm subset-font,原始全量字体在 git 44ccaf4)。

## 奥特曼换皮(2026-07-12)

外观层换皮:**玩家侧 = 奥特曼英雄,对手/CPU 侧 = 怪兽**;帧数据/判定框/招式时序/AI 全部不动,武士帧表仍加载(刀光 smear 提取仍靠它)。素材源 `/Users/nana/Desktop/游戏制作/素材/{英雄,怪兽}/基础形象`(白底渲染图),scratchpad 脚本 prep-stills.js / prep-portraits.js 抠底烘焙。

- **战斗本体** = 静态立绘单帧"表"(`assets/img/still/{ultra,kaiju}-{mack,kenji}.png`,320 方格,脚底线 y=304,1:1 绘制)。`data.js STILLS` 注册;`Fighter.side` 由出生朝向定(facing=1 hero / -1 rival,所有创建点一致);`spriteParams()` 走 still 分支;姿态 = `fighter._stillPose()` 程序化倾/压/弹(单帧的逐帧动画平替)。帧同步月牙基底在 still 模式不可用 → attackLogic 把 smear 自动转 standalone;cloneRun 分身也走 still 单帧
- **UI 立绘/头像** = `assets/ui-lab/portrait-{ultra,kaiju}-{mack,kenji}-sel.{png,webp}`(320x344,同旧 bust 格式);`ui.js bustArt(cid, rival)` 按侧选图,选人页/VS/HUD/结算/图鉴 tab 全接入;HUD 取景表 `UI.stillCrop`,小头像 hudmack/hudkenji 加载后用英雄脸烘焙顶替
- 英雄映射:mack=01-初代,kenji=03-赛罗;怪兽:mack=怪兽1(独角兽型),kenji=怪兽2(鸟型)
- **出招姿态立绘(2026-07-13, 源自 codex 分支 `assets/img/ultraman-icons/` 图集)**:英雄侧攻击时本体换姿态图 —— kind light/heavy→light 打击姿(能量手刀)、special→光线技(初代=十字光线朝左 native:-1 / 赛罗=能量拳朝左 native:-1…逐姿态标)、super→必杀演出;`STILLS[cid].hero.moves` 注册,`stillDef()` 按 move.def.kind/superSeq 选键 `still:hero:cid:pose`。烘焙脚本 prep-pose-stills.js(scratchpad,身高对齐 idle 250)
- **图鉴/招式图标(codex 分支)**:howto 招式行 24px 怪兽招式图标(`icon:monster:cid:move`,monster-moves/ 16 张成套);英雄图标 `icon:cid:{portrait,light,special,super}` = crops/ 透明抠图,也是姿态立绘的源

## Git 账户(重要,勿违反)

本项目是 Eric 的**个人项目**,一切 git 操作只用个人账户 **ericfu-tianchi**(仓库已 `git config` 锁定 `ericfu-tianchi <ericfu-tianchi@users.noreply.github.com>`)。**严禁**使用其他账户 commit 或 push;push 需 Eric 明确指示。

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
| `js/ai.js` | 概率分层状态机(虚拟手柄输出);难度=AI_DIFFS参数表;角落逃脱/计划年龄90tick自愈。**hard=鬼级(2026-07-11 Eric: "最离谱的难")**:`cheatRead` 明牌读指令(updateFight 先赋 f1.pad 再调 ai[1].update → 同帧读人类手柄: 按攻击键即防/按跳即完美反空/龟就上去磨破防) + 气槽自动回充 0.35/tick(SNK Boss 式) + 全参数 1.0(punishBlock 防后反打/okizeme 压起身/chase 追后撤/superJuggle 抓浮空接超必/pressureSuper 无敌超必拆招)。**架构铁律**: ①读入只作第一反应, 不得截断 punish/pressureSuper 反应链(截断→只会挡→破防螺旋); ②进攻只在安全窗口(对手硬直/挥空收招; **已 contact 的招是取消窗不是硬直**), 其余保持自由身(busy 时读入失效——offense/defense racing 是本轮最大教训); ③冷场阀门 calm>5 强制开火(双读指令镜像会互等僵持 3500tick)。normal/easy 未动。**隼人专属打法**(2026-07-11, 按 aggression/superUse 缩放, 各难度生效): 中距丢镖 zoning、镖命中确认→瞬身超必(hitstun26>前摇16)或 dashIn 补刀、空中浮空敌 dashIn 追打、跳入中远距空镖。**hard 隼人=游击手架构**(Eric): 镖冷却时 retreat 放风筝(走速4.3徒步拉开, 逼对手冲刺撞读冲刺反应)、近身无便宜 45% backdash 撤出重开、远距守株让对手走进镖程、只有确认命中/硬直才 dashIn 收割 —— 实测 close39%/mid48%/far13%, Eric代理bot交换比 1.71→1.18。**AI-vs-AI 胜率是糙代理**(角色差主导; 帧完美脚本 bot 比人类苛刻得多), 调 AI 用插桩死因解剖(hitFrom 前状态/格挡数/超必命中/气条采样) |
| `js/ui.js` | 全部界面绘制 + UI.loadAssets(运行时抠底/内窗检测,466ms) + 和风资产应用。**pixTextMixed(2026-07-11 规范)**: 凡一串里同时有英文和汉字的文本必须用它(PressStart 大写占满字号、FusionPixel 汉字同字号显小且基线沉 —— 它按 CJK 段拆开放大 2 号上提 2px 再整体对齐);已接入 気/超必殺/角色名/难度/howto 标题等 13 处 |
| `js/sprites.js` | Assets/Effects(slash刀光/converge聚气/petals花瓣/ring)/Stage.build(程序化背景,备用)/Projectile |
| `js/input.js` | 180ms 时间戳按键缓冲(修 120Hz 吃键)、双击冲刺、emptyPad/humanPad |
| `js/audio.js` | **SFX**=WebAudio 合成(2026-07 升级:层叠+起音渐入;`HIT_VARIANTS`A/B/C 轻重击组合、`BLOCK_VARIANTS`1/2/3 格挡)。**BGM**=真 mp3 循环(`assets/audio/bgm/`,scene→mp3 映射,经 bgmBus,0.9s crossfade,首次手势 resume ctx)。**不再是芯片乐** |
| `js/howto.js` | **How to Play 图鉴**(2026-07-11,Eric 拍板 V2 图鉴式,示意图存 howto-lab.html):左列招式分组表(由 DATA 生成,双角色各一份)+右侧**真引擎演示台**(沙盒移植自 anim-lab:stub world+脚本手柄+resolve)。W/S 选招·A/D 切角色·J 重播·K/ESC 返回;防御条目=木桩出招瞬间闪 ← 提示。调试 `?screen=controls&howsel=N&howchar=cid&ff=N`。**新增文案含新日文字后必须重新子集化字体**(pyftsubset --text-file,原始字体在 git HEAD) |
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
  - 基线变更(2026-07-09, Eric 平衡):剑二伤害下调 heavy11→10/heavy2 12→11/cheavy10→9/dive11→10/special13→11 → mack 连招 35/47/35→**32/46/32**、蹲K 10→9;Hayato(kenji)全程未动。**2026-07-11 终版补刀: mack heavy2 11→10 → mack JJKK 32→31**(Eric: 一波半血过强)
  - 基线变更(2026-07-11, Eric 拍板"隼人补强/剣二收机动"方案):kenji heavy2 dmg 10→11 → **kenji JJKK 29→30**、手裏剣 dmg 8→9(kenji U 基线 1hit/9);其余不变。**clones 超必重分配(2026-07-11 晚): 3×7+12→4×5+13(三回合交叉全结算, 爆炸13最高) → kenji JJKI 8hit/45→9hit/46(与 mack 对称)、裸超必基线 I=6hit/34**。同批:剣二 U 削护 46→38;隼人手裏剣冷却 130+hitstun 26(地面确认可接超必, 实测 43dmg)+knock 5→2+空中被点上浮 launch -10;**飞行道具不占浮空追击配额**(fighter.js info.proj, 三个解算器已同步 proj:true+launch)——空中点镖后可近身补 1 刀(实测 17dmg/2hit 封顶)
  - 终版打磨(2026-07-11 晚, 双镜像法定稿):剣二 light startup 7→**6**(拉平第一下竞速)、dashVx 终值 **7.6**;隼人手长终值 轻**194**/重**202**(198/206 使镜像反超38%, 回收一半)。**双镜像验收标准**:乱拳镜像(休闲代理)剣二 +15% / 策略镜像(技巧代理)隼人 +22% —— 力量赢乱斗、速度赢精操作, 两个身份各有兑现场。难度梯子(策略bot交换比):easy ~6.9 / normal ~3.1 / hard ~1.26(hard readP 0.92+全参数≈鬼级95%, Eric 定位"初见连死"; 隼人AI确认频率非hard打折 0.5-0.55x)
- **浮空连段(2026-07-11, Eric 定案, 全部实测校准)**:蹲K 挑空可接 raw 超必(容错 ~3tick):cheavy knock 5→1.5(垂直上打, 横飘追不上)、launch mack -15 / kenji -16.5(-16/-17 被 Eric 判太高回调)、kenji cheavy total 30→28;JJKK→I 取消窗对齐 ~7tick(kenji heavy2 launch -7.5→-10.5, 补偿其超必前摇 16 vs mack 8)。9 基线 dmg 逐位不变。测窗口用 pad 注入 + LATE 变量扫描
- **浮空追击上限 = 1(2026-07-11 Eric 定案)**:被挑空后空中只吃 1 次追击(轻/重/超必任一), 之后 `juggleImmune()` 免疫到落地 —— 杜绝 cK 起手空中多段连。实现: fighter.js `juggleN` 计数(receiveHit 空中受击+1, 落地/倒地清零) + **四个解算器的无敌门都挂 `|| x.juggleImmune()`**(main.js tryHit 近战+飞行道具 / anim-lab miniResolve ×2 / howto.js resolve ×2)——改 tryHit 无敌门必须四处同步
- **蹲姿**:素材无蹲帧 → 分段压缩烘焙(头不缩/躯干0.76-0.8/腿0.4-0.45+前倾)出 Crouch.png(带呼吸多帧)+CrouchIn.png(入蹲过渡5tick)。**别用整体压扁,也别用AI生成帧**(像素密度对不上,试过翻车)
- **刀光 = smear 重染系统**(2026-07 定稿, 取代旧椭圆拟合弧):画师把刀光月牙手绘进攻击帧(近纯白像素),引擎提取该月牙位图、按招式主题色重染当刀光。两种用法:①**帧同步原位重染**(fighter.draw, 本体挥刀时月牙盖在原帧上,物理天然一致);②**standalone**(Effects.smearFx, 独立 fx 层, 支持 dx/dy/scale/squashY/rot/flipY/mirror/atX/atY/dir 变换, 蹲攻/演出用)。data.js 每招 `smear:{...}` 字段定义。**月牙缺口坑**:画师身体画在月牙前→掩码有咬痕→原位被身体盖住,平移/翻转才露→用 `assets/img/fxcres/` 离线修复的干净月牙(FX_SHEETS 注册 ka1/ka2/ma2)。旧程序弧 Effects.slash 仅作无 smear 兜底
- **smear/演出两个必知坑**:①`updateAnim` 每 tick 按计时器重算帧,会覆盖脚本设的 `anim.frame` → 演出定帧必须写 `anim.t=帧*hold`;②翻转规则 = 显示朝向≠素材原生朝向, 剑二 `native=-1`(面朝左),"向左跑就翻"的通用逻辑对他颠倒
- **KK 变招语义**:回升斩(heavy2)只在「真连招 + 第一下 K 命中」出现(chained+rekkaH+_chainHit 三条件);单发/被防/隔久 = 永远下劈。同理各角色 heavy2 走命中门控, 不再是 altH 每按交替
- **语言**:无中文。日文汉字做关键元素(超必殺/気/勝利/敗北/選べ、己の剣/招式名用日字形:斬獄滅裏),菜单/说明全英文。字体栈 PressStart→FusionPixelJA→FusionPixel

## 调试/验证工具链(重要!)

URL 参数:`?fight=1&p1=kenji&p2=mack&ai=hard&demo=1(双AI)&training=1&debug=1(判定框)&ff=N(同步快进N tick)&freeze=1(定格)&pose=<moveKey>(练习场每40tick自动放招)&pause=1&stage=proc&screen=select|controls` + `?screen=select&vs=30`。anim-lab 也支持 `?char=&seq=&ff=&freeze=1`。Loading 画面调试:`?loaddelay=N`(每资产延迟N ms,慢放)、`?loadhold=P`(资产载完后冻结在P%)。

- **无头截图**:`"/Applications/Google Chrome.app/.../Google Chrome" --headless=new --disable-gpu --user-data-dir=/tmp/chX --window-size=1024,576 --hide-scrollbars --virtual-time-budget=2500 --screenshot=out.png "<url>"`。**坑**:virtual-time 不驱动 performance.now → 定步长游戏看似冻结,必须用 ff+freeze;每次启动 ~35s(UI资产处理放大),并行开多个实例(不同 user-data-dir);macOS 无 `timeout` 命令
- **连招回归**:pad 注入法 —— cmux eval 里 `G.ai[0]={update:()=>scriptedPad}`,泵 update(),断言 hits/dmg(脚本模式见上方连招表)。cmux 打开页面后 eval;**cmux 截图对 canvas 是黑屏**,验证用 eval/toDataURL
- **AI 冻结猎手**:长时间 demo 互打,检测"150tick 无位移无动作"即抓 AI 计划快照。曾定位:blockstun 泄漏(格挡中被绕背打中不清零→busy()永真→AI手柄全空)、角落威胁反应循环、双 idle 对视
- **乱拳流基准(2026-07-11 新增, 调难度必用)**:脚本 masher 注入 `G.ai[0]`(每 4tick 乱按 J/K/蹲K + 贴脸走)对打 hard, 统计比赛胜负 + **死因解剖**(AI 每次进 hit 态时记录前一状态)。教训: AI-vs-AI 胜率是糙代理; 逐死因修才有效(dash 送头 60%→修 whiff-punish 饵 / jump 上升段挨刀→禁贴脸跳)。乱拳流对策链: oPace 出招频率画像(空挥不连锁, 光看 chained 检测不到)→ 闪避优先+反压制无敌超必+kite。脚本 masher 是每秒 15 键的超人版, 真人体感以 Eric 实测为准
- **刀光校准**:/tmp cal.html 思路 —— 素材月牙帧+fx弧线叠画对照;月牙像素 Kasa 拟合脚本(cmux eval)

## 资产与生成管线

- 角色 sprite:LuizMelo Martial Hero 1&2(itch.io 免费可商用,经 chriscourses/fighting-game GitHub 镜像获取)。**kenji 每张攻击表只有 4 帧且共用大月牙 —— 素材上限**,fx 系统就是补偿
- UI 资产:Gemini 直连生成(`GEMINI_API_KEY` 环境变量,`assets/ui-lab/gen-kit.py`,风格前缀 STYLE 常量保持同调),运行时 ui.js 抠底应用;新增资产走同一管线。**2026-07-11 技法补充**: ①16:9 用 `generationConfig.imageConfig.aspectRatio:"16:9"`(prompt 里写 16:9 没用,会出方图); ②**孪生/换皮用参考图重绘**(inline_data 喂原图+"keep exact layout, repaint mood"——结算胜败双生、横幅变体都靠它,保证结构级一致); ③离线抠底=PIL 四角 flood-fill(scratchpad keyout 模式),比运行时抠更稳
- 参考图生成(nano-banana 特长):以角色帧为 inline 参考 + 品红底抠图,对 UI 可行,对**逐帧动作素材不可行**(画风/像素密度断裂)
- 字体:Press Start 2P + Fusion Pixel zh/ja(均 OFL)。背景 = Gemini stage-alt(默认)/Stage.build 程序化(备用)

## 已知事项/欠账

- main.js tryHit 有**两份**精简副本:anim-lab.html miniResolve 与 js/howto.js resolve() —— 改 tryHit 必须三处同步
- assets/img/background.png、shop.png 为旧素材,未使用
- workflow 子代理曾撞组织月度花费上限被中断 —— 大改动建议单线程+工具链自查
- 用户(Eric)标准:**maximum design effort**,反感 AI slop;交付前必须逐屏/逐招截图自查;他会亲自逐帧看动作实验室,反馈格式「角色/招式/tick」
