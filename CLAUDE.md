# 拳魂 SOUL FIST — 项目交接 (CLAUDE.md)

KOF 式和风像素格斗游戏。纯 vanilla JS + Canvas,零依赖,零构建。人机对战,2 角色(HAYATO 隼人/力量型武士、KENJI 剣二/速度型忍者),完整格斗机制 + 练习场。

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
| `js/audio.js` | WebAudio 全合成(SFX+芯片BGM),零音频素材 |
| `anim-lab.html` | **动作实验室 v2**:跑真引擎(真Fighter+Effects+木桩),慢放/逐tick/判定框;miniResolve 是 main.js tryHit 的精简副本,**改 tryHit 要同步** |
| `ui-lab.html` | UI 资产库(Gemini 生成的 11 张,含用途标注) |
| `serve.py` | no-store 开发服务器 |

## 核心机制设计(动过很多轮,别轻易推翻)

- **方向格挡**(KOF式):命中瞬间按住远离方向才防;出招/跳/冲刺/蹲中不防;绕背破防。无格挡键(S=下蹲)
- **护条 Guard Gauge**:格挡积累,满100破防55tick硬直;停止被打55tick后才缓慢回复(0.14/tick)
- **连锁**:J·J/K·K 变招交替(altL/altH,light2/heavy2),命中后 contact+18tick 取消窗;**只有 K·K 第二段(rekkaH)击倒**;3hit+ 连锁招 BONUS×1.3;**蹲K noChain(独立挑空技)**;蹲J 可连打
- **实测连招表**(回归基线,伤害必须逐位一致):mack JJKU=4hit/35、JJKI=9hit/47含cine、JJKK=4hit/35;kenji JJKK=4hit/29、JJKI=8hit/45含cine;蹲J mack5/kenji4、蹲K launch 10/9
- **蹲姿**:素材无蹲帧 → 分段压缩烘焙(头不缩/躯干0.76-0.8/腿0.4-0.45+前倾)出 Crouch.png(带呼吸多帧)+CrouchIn.png(入蹲过渡5tick)。**别用整体压扁,也别用AI生成帧**(像素密度对不上,试过翻车)
- **刀光 fx**:几何参数是**从素材月牙帧 Kasa 圆拟合**得来(圆心/半径/椭圆度/端点),严格沿画师笔迹;方向真值:mack attack1=撩斩↑ attack2=低位前扫;kenji attack1=下切↓ attack2=撩斩↑(注意有的招**倒放**帧序,方向要反)
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
