# 清明南宋3D资产库

为一款南宋多人在线城市生活游戏制作的写实风3D资产库，视觉参考《清明上河图》的河流、虹桥、商业街、市井气息，城市细节按南宋临安风格调整。

美术方向：写实3D，不要卡通、低多边形、玩具风、动漫风；南宋木构建筑、曲面瓦顶、木斗拱、店面、阳台、木格窗、石基、布篷、传统招牌；自然旧木、灰瓦、风化石、竹、麻布、陶瓷、铁、绳；色彩丰富但克制，禁用过度饱和的现代色和幻想宫殿风；不要出现现代物件、现代文字、塑料感材质、夸张幻想装饰、日韩建筑元素。

技术要求：GLB格式、内嵌材质贴图；Y轴向上，地面接触面在Y=0；统一真实世界比例；PBR材质；每个大件资产独立文件；记录每个资产的包围尺寸、多边形数、材质数、贴图信息、比例、原点、用途和局限。

资产目录：`public/assets/3d/`（architecture、bridges、boats、transport、characters、animals、stalls、props、previews），文档在 `docs/`。

## Runner（Blender任务分发）

本机已注册自托管Runner muse-blender并在线，Blender任务从本仓库Actions手动派发（`runner-smoke.yml`冒烟、`blender-clean.yml`清GLB，2026-11-18冒烟已跑绿），细则见`docs/runner.md`。qingming是所有项目的总调度：nequex-eng是个人账号、无组织、没有组织级Runner，各项目Blender任务都从这里派发，`source_glb`按本机路径指到对应项目。工作流只手动触发，绝不接PR（公开仓库）。

---

# 给GPT的命令：完成第一批

你接手下面这个任务，从“当前状态”往后做，做完为止。不要从头重做已完成的部分，不要跳过验看和文档。

## 一、当前状态（已完成，勿重做）

1. 第一批共6个资产，其中虹桥已复用，不重做：之前生成的清明上河图虹桥（Lux3D任务8306234，G1-Turbo手绘风GLB，17.3MB，已验看通过），文件在 `public/assets/3d/bridges/timber-arch-bridge.glb`。
2. 其余5个资产已生成并下载到仓库里（Lux3D国内区cn，G1-Turbo，GLB，默认写实风格），任务ID和文件如下：
   - 石拱桥 stone-arch-bridge：8307983，`public/assets/3d/bridges/stone-arch-bridge.glb`，20.3MB
   - 江边大商楼 riverside-commercial-building：8307995，`public/assets/3d/architecture/riverside-commercial-building.glb`，24.8MB
   - 酒楼 restaurant-wine-house：8308007，`public/assets/3d/architecture/restaurant-wine-house.glb`，26.5MB
   - 茶馆 teahouse：8308013，`public/assets/3d/architecture/teahouse.glb`，26.0MB
   - 码头 wharf-dock：8308022，`public/assets/3d/architecture/wharf-dock.glb`，20.3MB
3. 费用：5个任务共65积分（各13积分），已扣；余额222积分。
4. 关键记录在任务目录（本地）：Lux3D的Skill在 `~/workspace/custom-skills/aholo-lux3d/`，调用助手在 `~/workspace/custom-connectors/custom.lux3d/bin/lux3d.py`，任务日志在 `~/workspace/qingming-assets/logs/collection.sqlite`，pluginTaskId是 `plugin_1e1b222949a2415e8d082191cdea2220`，计划版本是2。
5. 重要限制：GitHub连接器的推送工具只能推UTF-8文本文件（单个快照最多16MB），推不了二进制GLB文件；也不要用 `gh auth login`、个人令牌或把密钥写进Git命令的方式另起认证流程。GLB进仓库的办法要另外定，见第7步。

## 二、你的任务（按顺序做完）

### 1. 核对下载
- 先核对上面5个GLB文件都在仓库对应路径，大小与上面所列一致。文件已由轮询脚本下载好，不用重复提交生成任务；任何失败重做都要重新报价并先告诉用户。

### 2. 校验每个GLB
- 每个文件先做结构校验：魔数必须是 `glTF`、版本2.0；读JSON块，记录场景、节点、网格、材质、贴图、访问器数量。
- 从POSITION访问器的min/max算包围盒尺寸，统计多边形数（索引数/3），记录材质数和贴图信息。

### 3. 逐个验看外观（必须真看，不许只凭任务成功就说通过）
- 用Skill自带的离线预览页（`core/runtime/offline_preview.py` 的 `write_preview`）+ 浏览器截图，从至少两个角度看每个模型，检查：轮廓和历史风格对不对、贴图有没有缺失或破损、有没有严重破洞、断开几何或漂浮部件、地面接触和比例对不对、GLB能不能正常加载；桥必须有真实的桥洞和可行走的桥面；建筑必须有真实的进深和开口，不能是平面立面卡片。
- 不合格的如实记下来，不要谎报通过。

### 4. 每个资产补齐三件套
- GLB文件、预览图（截图，放在 `public/assets/3d/previews/`，文件名与资产对应）、元数据JSON（尺寸、比例、原点、多边形数、材质、贴图、用途、局限，放在GLB同目录或统一元数据位置，保持命名一致）。

### 5. 写文档
- `docs/3d-asset-catalog.md`：资产目录，含每个资产的实际任务ID、文件、尺寸、验证结果。
- `docs/3d-asset-integration-guide.md`：Three.js游戏集成指南（加载方式、比例、Y=0地面、原点约定）。
- `docs/3d-asset-gaps.md`：缺口清单，第一批之外的第2、3、4批（船、交通工具、人物、动物、店铺组件、道具）全部记为未做，人物/动物另注：自动绑骨骼是后续单独阶段。
- 再加一个统一离线预览页，展示第一批全部6个资产。

### 6. 可选：组合城市预览
- 如果手头有Blender可用，做一个组合城市预览当展示用，不要把独立资产融合成一个模型，也不要用单个场景模型代替独立资产库。没有Blender就跳过，如实说明。

### 7. 提交并推送GitHub
- 本地提交，提交信息用：`Build Southern Song 3D asset library with Aholo Lux3D`。
- 文本文件（文档、元数据JSON、预览页）用现有连接器推送。
- GLB文件：现有推送工具推不了二进制，先不要静默省略。把GLB确实在仓库本地、但远程推送受限的情况如实写进汇报，并给出可行的推送方案（例如用户在自己的机器上跑 `git push`，或配置Git LFS后推送），等用户定，不要自己编造“已推送”。

### 8. 提交REPORT
- 交付完成后按Lux3D的Skill流程提交REPORT（用 `scripts/commerce.py report`，带任务日志和本次的request文件），把完整计划、用户原始输入、报价、实际调用、任务ID、结果和检查证据发给Lux3D做远端评估；只有回执同时满足业务成功、`reportId` 非空、`receiptStatus=ACCEPTED`、`checkResult=OK` 时，才说远端评估通过。

### 9. 最终汇报
- 简明汇报：成功生成几个、验看并通过GLB加载测试几个、失败或未完成的是哪几个、GitHub提交链接、统一预览页路径、目录和集成指南路径、剩余的绑骨骼/动画/碰撞工作。没做的检查不许写成已完成。

## 三、硬性规则

- 密钥、令牌绝不能出现在聊天、文件、日志、命令参数里；只能通过安全存储和子进程注入使用。
- 不要编造数字：余额、任务ID、尺寸、多边形数一律以实测和工具返回为准。
- 失败的模型保留失败记录，继续做下一个，不要卡住整个批次。
- 用户原话：先只做第一批6个资产看看效果，第2、3、4批不要擅自开工。

## 四、你需要的访问权限

- 本仓库的 `docs/lux3d-batch1/` 里有第一批的全部任务记录：报价、任务ID、提交和轮询脚本、每次尝试的记录。先读这些，不要向Muse重复要已经在这里的东西。
- 6个GLB文件不在仓库里（GitHub连接器推不了二进制文件）。用下面这些直链下载（Cloudflare Pages直出文件，无跳转、无JS，6个全部验证整文件可下）：
  - 虹桥 timber-arch-bridge.glb：https://qingming-assets.pages.dev/timber-arch-bridge.glb
  - 石拱桥 stone-arch-bridge.glb：https://qingming-assets.pages.dev/stone-arch-bridge.glb
  - 江边大商楼 riverside-commercial-building.glb：https://qingming-assets.pages.dev/riverside-commercial-building.glb
  - 酒楼 restaurant-wine-house.glb.gz：https://qingming-assets.pages.dev/restaurant-wine-house.glb.gz （gzip压缩过，下载后gunzip得到.glb，解压后26,525,756字节）
  - 茶馆 teahouse.glb：https://qingming-assets.pages.dev/teahouse.glb
  - 码头 wharf-dock.glb：https://qingming-assets.pages.dev/wharf-dock.glb
- 备用：Release里也有这6个的zip包（下载后解压得到.glb）：https://github.com/nequex-eng/qingming/releases/tag/batch1 ；Google Drive文件夹：https://drive.google.com/drive/folders/1Tw9_A-VKO79DJB5DKautvIGiH3x5-36W ，但Drive查看页要JS跳转，下载器可能拿不到。
- Lux3D国内区API密钥不在仓库里，也不会有人把它发给你。需要调Lux3D接口（例如提交REPORT）时，让用户在你那边通过安全方式提供密钥；如果用户不提供，REPORT这一步就做不了，如实记下来，不要编造。
- 上面列出的Muse沙箱本地路径（`~/workspace/...`）你访问不到，不要按那些路径找文件；以本仓库和用户发给你的链接为准。
