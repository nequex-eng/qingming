# 给GPT：游戏里模型颜色偏暗的问题说明

写于2026-11-19。用户反馈：游戏（https://qingming-riverside-2wq.pages.dev/）里的物件颜色比Blender渲染图深。

## 先说结论：不是文件用错了，不要换模型

2026-11-19已核实：游戏加载的22个模型全部是Blender清理版——线上manifest（/public/assets/manifest.json）6个条目的size_bytes和清理版逐个一致；batch-2目录（/public/assets/3d/asset-catalog-batch2.json）16个新模型2.6—4.3MB；还直接下载了CDN上的虹桥、茶馆两个文件核对字节数。没有一个是Aholo原版（16—26MB）。加载代码也配了DRACOLoader。所以颜色深和模型文件无关，不要换模型、不要换回原版。

## 原因：灯光不一样

Blender渲染图的灯光（按《清明上河图》原画调性）：淡绢底世界光（0.93, 0.88, 0.74）强度1.1 + 暖阳2.2 + 冷补光0.7 + 淡沙地面，高斜俯视，整体明亮、无死黑阴影。

游戏场景的灯光比这套暗，同一批材质在游戏里就显深。

## 请GPT做的事

1. 对照参考图调游戏灯光，不要动模型文件。参考图是22张Blender渲染预览：第一批6张的PNG已在CDN上，地址是 https://qingming-assets.pages.dev/<文件名>-preview.png，例如 timber-arch-bridge-preview.png、teahouse-preview.png；新16张的JPG用户会直接发给你（这次没传仓库）。
2. 方向：提高环境光/半球光强度、加暖色主光、检查tone mapping和曝光（renderer.toneMapping、toneMappingExposure、outputColorSpace），目标是游戏截图和参考图并排放一起时亮度、色温接近。
3. 验法：改完截游戏截图，和参考图并排对比，逐个模型过一遍；只看“改了灯光参数”不算验过，以截图对比为准。
4. 不要改模型文件、不要动manifest缩放（见同目录交接稿 HANDOVER-B2B3A-TO-GPT.md 第三节实测包围盒表）。
