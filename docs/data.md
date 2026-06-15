## 数据说明

### camp_data.js

- **__CAMP_CLASS**：羁绊分类（阵营羁绊 / 流派羁绊 / 独立羁绊）
- **__CAMP_MEM**：各羁绊的成员列表
- **__CAMP_NUM**：各羁绊每层激活所需角色数量
- **__CAMP_COLORS**：各羁绊每层激活后的高亮颜色（铜/银/金/幻彩）
- **__CAMP_STATS**：羁绊内容（名称、介绍、层级加成、补充说明）

### chr_data.js

- **__CHR_EXPERTS**：专家顾问角色列表
- **__CHR_SPEND**：角色费用分组（1-5 费、特殊）
- **__CHR_POSITION**：角色站位分组（前台 / 后台 / 前后台）
- **__CHR_INTRO**：角色介绍文本

### equipments_data.js

- **__EQUIPMENTS**：装备分组（简易装备、钻石、垃圾、宝钻、进阶装备、特权装备、羁绊装备、流派星徽、阵营星徽、骇客改件）
- **__LIMITS**：装备激活条件，格式为 `装备名: [["羁绊名", 所需人数], ...]`，场上对应羁绊人数达标时条件满足；该类武器激活后装备不可重复，显示"已装备"标签
- **__MERGE**：装备合成配方，格式为 `结果装备: [["原料A", "原料B"], ...]`
- **__STATS**：装备基础属性，格式为 `装备名: [基础属性:["属性1",...], "描述":"描述"]`

### environment_data.js

- **window.__ENVIRONMENT_DATA**：环境祝福数据，`名称 → 描述` 的键值对，约 90 条环境

### strategy_data.js

- **window.__STRATEGY_DATA**：投资策略数据，`名称 → {介绍, 稀有度}`，稀有度分为棱彩、金色、银色

### enemy_data.js

- **window.__ENEMY_LABEL**：敌方词缀数据，`名称 → 描述`
- **window.__ENEMY_GROUP**：敌方势力编队数据，`势力名 → {首领, 精英敌人[], 普通敌人[]}`

### update_data.js

- **window.__UPDATE_DATA**：版本更新数据
- **window.__UPGRADE_DATA**：赛季扩充数据，含 info 和 herf
- **window.__FIX_DATA**：问题修复数据，版本 → 修复条目列表