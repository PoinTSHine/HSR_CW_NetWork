# 角色网络星图 & 阵容摆放 & 图鉴

基于 D3.js 的《崩坏：星穹铁道》货币战争的模拟工具，含角色星图、阵容摆放、图鉴一览三种模式。

由于技术问题，尚未对移动端进行适配或优化，请务必使用 pc 端浏览器查看，避免在移动端使用。

- **首页**：`index.html` — 欢迎页，提供三种模式的入口。新增**星空吊灯**主题切换，拉动灯绳可切换深色/浅色模式
- **主应用**：`app.html` — 角色星图 & 阵容摆放 & 图鉴一览。顶栏新增**主题切换按钮**🌙，与首页共享主题状态
- **更新日志**：`update.html` — 版本更新、赛季扩充、问题修复记录

可通过 `https://pointshine.github.io/HSR_CW_NetWork/` 浏览。

## 功能介绍

[角色星图](docs/graph.md) [图鉴一览](docs/compendium.md) [阵容摆放](docs/team-builder.md)

## 设计风格

全站统一星空粒子背景（Canvas）+ 毛玻璃面板（backdrop-filter: blur）。新拟物化风格用于按钮、卡片等交互元素。
引入 `Noto Serif SC`（衬线标题）与 `Outfit`（无衬线正文）字体组合，提升文字质感。

## 导航

- **首页**（`index.html`）：星空粒子背景、流光标题、新拟物视差卡片。三张卡片分别进入「角色星图」（`?mode=graph`）、「阵容摆放」（`?mode=team`）、「图鉴一览」（`?mode=others`）。右上角星空吊灯（梯形玻璃灯罩 + 发光球体）拉动灯绳切换深色/浅色模式，Verlet 绳索物理模拟，下拉足够距离后释放触发切换
- **主应用**（`app.html`）：顶栏标签在三种模式间切换，切换时地址栏同步更新，刷新页面保持当前模式不变。顶栏右侧有 🌙/☀️ 主题切换按钮
- **返回首页**：顶栏最右侧 ⌂ 按钮，阵容模式弹出确认框，其余模式直接返回首页

## 模式切换

顶栏标签（胶囊药丸）在三种模式间切换：

- **角色星图** → [`docs/graph.md`](docs/graph.md)
- **阵容摆放** → [`docs/team-builder.md`](docs/team-builder.md)
- **图鉴一览** → [`docs/compendium.md`](docs/compendium.md)

### 界面特色

- **星空背景**：全屏 Canvas 粒子动画，星点呼吸闪烁
- **毛玻璃面板**：侧边栏、阵容面板统一半透明白底 + 高斯模糊
- **胶囊顶栏**：圆角 Tab 按钮，激活态浮起
- **新拟物图例**：左下角图例胶囊容器
- **深浅色模式**：深空色与浅色双主题，支持 localStorage 持久化

---

## 文件结构

```bash
├── index.html              # 首页（欢迎页，含星空吊灯主题切换）
├── app.html                # 主应用页面（含主题切换按钮）
├── update.html             # 更新日志页面
├── README.md               # 说明文档（总览）
├── docs/                   # 详细说明文档
│   ├── graph.md            # 角色星图
│   ├── compendium.md       # 图鉴一览
│   └── team-builder.md     # 阵容摆放
├── data/                   # 数据文件
│   ├── camp_data.js        # 羁绊数据（分类、成员、层级、颜色、内容）
│   ├── chr_data.js         # 角色数据（专家、费用、站位、介绍）
│   ├── equipments_data.js  # 装备数据（分类列表、激活条件、合成配方）
│   ├── environment_data.js # 环境祝福数据（名称 → 描述）
│   ├── strategy_data.js    # 投资策略数据（名称 → {介绍, 稀有度}）
│   ├── enemy_data.js       # 敌人/词缀数据
│   └── update_data.js      # 更新日志数据
├── script/                 # 脚本文件
│   ├── landing.js          # 星空吊灯物理 + 星空背景 + 首页卡片视差（全站共用）
│   ├── graph.js            # 关系图逻辑（含模式切换）
│   ├── team_builder.js     # 阵容摆放主逻辑（槽位渲染、拖放、视图切换、初始化）
│   ├── enemy.js            # 敌方图鉴（分组定义 + HTML 构建）
│   ├── environment.js      # 环境图鉴（分组定义 + HTML 构建）
│   ├── strategy.js         # 策略图鉴（分组定义 + HTML 构建）
│   ├── bond.js             # 羁绊图鉴（分组定义 + HTML 构建 + 详情弹窗）
│   ├── character.js        # 角色图鉴（HTML 构建，含费用/站位/羁绊标签）
│   ├── others.js           # 图鉴一览侧边栏控制器
│   ├── update.js           # 更新日志渲染
│   ├── search.js           # 模糊搜索组件（阵容模式）
│   ├── game_state.js       # 共享工具（escHtml、buildGroupedHTML、游戏状态）
│   ├── weapon_ui.js        # 武器信息弹窗、合成弹窗
│   ├── aha_mechanics.js    # 阿哈卡牌逻辑
│   ├── buli_mechanics.js   # 步离人卡牌逻辑
│   ├── yese_mechanics.js   # 月色精华卡牌逻辑
│   ├── mmg_mechanics.js    # 猫猫糕卡牌逻辑
│   ├── starhunter_mechanics.js # 猎星人卡牌逻辑
│   └── d3.v7.min.js        # D3.js 库
└── style/                  # 样式文件
    ├── landing.css         # 首页专用样式（含星空吊灯主题切换）
    ├── common.css          # 共享样式（含图鉴公共样式 gallery-*、深浅色变量）
    ├── graph.css           # 星图模式专用（节点、连线、详情弹窗、侧边栏）
    ├── team.css            # 阵容模式专用（新拟物化 + 浮动右侧栏）
    ├── others.css          # 图鉴一览侧边栏 + 筛选面板样式
    ├── enemy.css           # 敌方势力编队卡片样式
    ├── environment.css     # 环境卡片样式
    ├── strategy.css        # 策略卡片样式 + 稀有度动画
    ├── bond.css            # 羁绊卡片样式 + 详情弹窗
    ├── character.css       # 角色卡片样式（含标签样式）
    └── update.css          # 更新日志样式
```
