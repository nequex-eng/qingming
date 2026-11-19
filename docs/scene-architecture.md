# 清明南宋场景架构

更新：2026-11-19

## 1. 当前已运行结构

- 渲染引擎：Three.js 0.179.1，浏览器原生 ES modules。
- 场景入口：`index.html` → `scene.js`。
- 首屏资产清单：`public/assets/manifest.json`。
- 资产库存：`public/assets/3d/asset-catalog-batch2.json`。
- 六个首屏模型由 `https://qingming-assets.pages.dev` 提供；其余 16 个模型暂存在游戏仓库，按需加载，不进入首屏。
- GLB 解码：GLTFLoader + DRACOLoader；酒楼 v2 仍使用 CDN 上原有 gzip URL，并在浏览器端解压。
- 场景部署：Cloudflare Pages 项目 `qingming-riverside`，GitHub `main` 分支自动部署。

## 2. 坐标与首屏资产约定

世界坐标为 Y-up。河流沿 X 轴延伸，两岸沿 Z 轴分布。资产采用 Y-up。实例化时先应用该模型独立的 scale，再按世界包围盒下沿贴地；水平包围盒中心对准 position 的 X/Z。

| 资产 | position | rotationY | targetFootprint |
|---|---:|---:|---:|
| 虹桥 | [0, 0, 0] | 0 | 14 |
| 石拱桥 | [-19, 0, 0] | 0 | 12.5 |
| 码头 | [7, 0, 5.25] | π/2 | 7 |
| 茶馆 | [-23, 0, 11] | 0 | 7.5 |
| 酒楼 | [-8, 0, 11] | 0 | 8 |
| 江边大商楼 | [19, 0, -11] | π | 9 |

`scale` 字段是运行时倍率。首批 6 个模型的缩放已经烘焙进 GLB 几何，因此 manifest 六项必须为 1；禁止再用 targetFootprint 自动缩放，也禁止二次应用烘焙倍率。首批位置与 rotationY 保持原值。

## 3. 资产分层

### 首屏静态场景

桥梁、临河码头、茶馆、酒楼、商楼。只加载这六项，当前 CDN 文件合计约 21.9 MB（按实际响应字节计算）。

### 延迟加载资产

- characters：工匠、船夫、文人、商贩、店主、店员、茶馆伙计、搬运工
- boats：货船、篷船、渡船、乌篷小船、客船
- transport：货车、手推车、轿子

这些模型已进入资产库存，但尚未放置到场景，也没有假定它们已经具备骨骼或动画。22 个 GLB 全部采用 Draco 压缩，所有加载入口必须共用已配置 DRACOLoader 的 GLTFLoader。新增 16 个模型必须逐个填写实测包围盒与独立 scale；严禁按类别统一缩放。当前仓库中的 batch2 catalog 只有文件路径和字节数，尚未包含这 16 个模型的 bbox/scale 数据，因此 AssetManager 会拒绝加载缺少 scale 的新增资产，而不是猜值。

## 4. 运行时系统边界

后续代码按职责拆分，不把所有逻辑继续堆在 scene.js：

1. **World**：河道、地面、河岸、道路、植被、光照和天气。
2. **AssetRegistry**：按 manifest/catalog 查找资产，处理 CDN、Draco、gzip、缓存和加载状态。
3. **Actor**：玩家、NPC、动物；移动、朝向、动画和状态机。
4. **Transport**：船、车、轿子；路线、速度、上下客和碰撞。
5. **Interaction**：店铺、摊位、船只、物品、对话和交易触发器。
6. **Collision**：独立简化碰撞体，不直接拿高面数渲染网格做物理碰撞。
7. **Network**：房间状态、玩家同步、实体状态和断线恢复。

## 5. 多人在线建议

多人状态放在 Cloudflare Worker + Durable Objects，而不是让浏览器互相直连：

- 每个地图实例/房间对应一个 Durable Object，避免一个全局对象承载所有玩家。
- WebSocket 负责玩家位置、朝向、动作和交互事件。
- 服务端校验移动边界、碰撞和关键交互；客户端负责插值显示。
- D1 保存持久化的玩家资料、库存和交易记录；静态 GLB 继续由 CDN 提供。
- 先实现小房间和稳定同步，再扩展分区、兴趣管理和人群密度。

当前尚未接入多人服务器；这部分是后续架构，不应误报为已完成。

## 6. 下一阶段实施顺序

1. 把 scene.js 拆成 World、AssetRegistry、Actor、Interaction 模块，先保持当前画面和六个模型完全不变。
2. 建立玩家控制器、地面约束和独立碰撞代理。
3. 检查人物 GLB 是否有骨骼；无骨骼的模型先绑定，再做走路、站立、搬运等动作。
4. 把船和车辆接入独立路线系统，避免与行人共享同一移动逻辑。
5. 加入店铺与摊位交互，再接入 Durable Objects 房间同步。

## 7. 验收规则

- 任何模型先通过 GLB 2.0 结构校验。
- 浏览器必须实际完成 Draco 解码和场景挂载，HTTP 200 不等于模型加载成功。
- 加载后检查尺寸为有限正数、地面最低点为 Y=0、水平包围盒中心与 manifest position 一致。
- 首批 6 个模型的 scale 固定为 1，不得再次做 targetFootprint 自动归一；模型替换不得静默改变位置、朝向或酒楼 v2 的自带几何。
- 新增 16 个模型必须逐项记录实测 bbox、scale、最终尺寸；模型原点即使在中心，也必须按 bbox.min.y 落地。
- 新增人物/船/车辆默认延迟加载，不得无意增加首屏下载量。
