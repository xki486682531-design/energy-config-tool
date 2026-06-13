# 储能柜配置工具

> 本地 Web 应用，辅助销售人员/工程师快速生成储能柜项目配置表，一键导出 Excel。
> 含拓扑方案编辑器，支持画布拖拽搭建电气拓扑图。

---

## 功能亮点

- **非标需求表** — 防逆流、抄表、汇流柜、STS 等字段联动，自动显示/隐藏对应配置区块
- **智能配置分支** — 单台/多台自动适配，设备型号按容量过滤
- **一键导出 Excel** — 双 Sheet（需求表 + 配置表），自动分节、样式区分
- **拓扑方案编辑器** — 画布拖拽搭建电气拓扑图，50+ 标准元件、可编辑线缆类型、连接点自动吸附、线缆叠放、CT叠加、BOM联动
- **管理员后台** — 用户管理、产品编码 CRUD、需求模块配置、大类管理、项目管理、拓扑方案管理、元件库管理、线缆类型管理
- **液态玻璃设计系统** — Glassmorphism 风格，暗/亮双主题，CSS 变量驱动
- **响应式设计** — 侧边栏可折叠，移动端自适应

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML/CSS/JS（无框架），ES6 模块化 IIFE |
| Excel | SheetJS (xlsx.full.min.js) |
| 加密 | 浏览器原生 `crypto.subtle` SHA-256 |
| 存储 | `js/storage.js` 统一存储层（localStorage + IndexedDB + data/ 文件） |
| 设计系统 | 液态玻璃（Glassmorphism），`liquid-glass.css` 统一管理 |

---

## 文件结构

```
energy-config-tool-main/
├── login.html                  # 登录页（密码校验 + 吐槽系统 + 主题切换）
├── index.html                  # 主页面（侧边栏 + 需求表 → 配置 → 导出）
├── admin.html                  # 管理员控制台（可折叠侧边栏 + 按 Tab 切换功能面板，含拓扑编辑器）
│
├── js/
│   ├── storage.js              # 统一存储层（localStorage / IndexedDB / data/）
│   ├── auth.js                 # 用户认证（登录/注册/Session/SHA-256）
│   ├── data.js                 # 全局产品数据 + 需求字段注册表 + 大类注册表
│   ├── ui.js                   # 界面渲染（需求表/步骤一/配置分支/区块联动）
│   ├── form.js                 # 表单数据收集与校验
│   ├── export.js               # Excel 导出（双 Sheet）
│   ├── topo-data.js            # 拓扑方案预设模板数据
│   ├── component-lib.js        # 50+ 标准元件定义 + 13 种线缆类型
│   ├── component-lib-admin.js  # 元件库管理模块（CRUD / 导入导出）
│   └── admin.js                # 管理员面板逻辑 + 拓扑编辑器（拖拽/连线/缩放/旋转/CT吸附/多选/自动保存）
│
├── css/
│   ├── liquid-glass.css        # 液态玻璃设计系统（全局样式基准）
│   ├── topo-editor.css         # 拓扑编辑器三栏布局样式
│   └── component-lib-admin.css # 元件库管理 UI 样式
│
├── img/
│   ├── monkey-hide.svg         # 密码框猴子图标（遮眼态）
│   ├── monkey-show.svg         # 密码框猴子图标（睁眼态）
│   └── avatars/                # 预置头像 (avatar1~9.jpg)
│
├── lib/
│   └── xlsx.full.min.js        # SheetJS 库
│
├── data/                       # 数据持久化文件夹（JSON 文件）
│    ├── custom-config.js        # 自定义配置
│    ├── cable-types.json        # 线缆类型持久化数据
│    └── README.md
```

---

## 核心流程

```
登录 (login.html)
  │  AUTH.login() → 写入 ess_session
  ▼
主页 (index.html)
  │
  ├─ 0 非标需求表 (UI.renderRequirements)
  │    └─ 联动：防逆流→二次电表 | 抄表→一次电表 | 汇流柜→汇流柜区块 | STS→STS柜区块
  │
  ├─ 1 项目基本信息 (UI.renderStep1)
  │    └─ 设置 AppState = { name, cap, count }
  │
  ├─ 2 配置分支
  │    ├─ 单台：储能柜 + 二次电表 (UI.renderSingleBranch)
  │    └─ 多台：全部设备区块 (UI.renderMultiBranch)
  │         └─ 区块可见性由 buildBlockVisibility() 动态控制
  │
  ├─ 拓扑方案管理
  │    └─ 查看预设拓扑方案，点击查看 SVG 拓扑图
  │
  └─ 导出 Excel (FORM.collectAndExport → EXPORT.toExcel)
       ├─ Sheet 1: 非标需求表 (A/B/C/D 四区域)
       └─ Sheet 2: 配置表 (序号/类别/编码/描述/数量/备注)
```

---

## 各模块详细说明

### 统一存储层 (`js/storage.js`)

- 统一管理 localStorage、IndexedDB 和 `data/` 文件夹 JSON 文件
- API: `STORAGE.init()` / `STORAGE.get(key)` / `STORAGE.set(key, value)` / `STORAGE.remove(key)`
- 支持同步状态 UI 指示器（右上角绿色/灰色圆点）
- 页面初始化: `STORAGE.init().then(function() { ADMIN.init(); })`

### 液态玻璃设计系统 (`css/liquid-glass.css`)

| 特性 | 说明 |
|------|------|
| Glassmorphism | `backdrop-filter: blur() saturate()` + 半透明背景 |
| 高光内嵌 | `inset 0 1px 0 rgba(255,255,255,0.1)` |
| RGB 色散阴影 | 多层 `box-shadow` 实现 |
| 暗/亮双主题 | CSS 变量驱动，`body.light` 切换 |
| 统一圆角 | 输入框 16px / 卡片 24px |

### 登录页 (`login.html`)

- **密码输入校验** — 实时拦截中文/全角/Emoji/空格，仅允许英文大小写+数字+英文符号
- **吐槽文案系统** — 登录失败按次数分级随机吐槽（共 5 级 25+ 条文案），配合卡片抖动+猴子动画
- **Apple Vision Pro 风格气泡** — 吐槽提示以液态玻璃气泡形式锚定于密码框右侧，带三角尾巴指向猴子
- **SVG 猴子图标** — 极简线稿 SVG（Apple SF Symbols 风格），遮眼/睁眼两种状态

### 拓扑方案编辑器 (`admin.html` → 拓扑方案管理 → 编辑)

三栏布局：**元件库面板（170px，可折叠） | 画布（可无限缩放，8000×8000 无限网格） | 属性面板（230px）**

#### 编辑功能

| 功能 | 说明 |
|------|------|
| 元件库 | 50+ 标准元件，按 12 大类分组，支持搜索过滤 |
| 拖拽添加 | 从元件库 drag & drop 到画布，30px 网格吸附 |
| 元件移动 | 画布内鼠标拖拽，实时更新连接线 |
| 旋转 | 画布上拖拽旋转手柄，90°/180°/270° 快速旋转 |
| 连接点连线 | 悬停显示连接点，点击拖拽到目标自动生成折线 |
| 线缆更换 | 点击已连接的线缆 → 更换起点/终点 → 点击新端口重新连接 |
| 线缆类型 | 可编辑线缆（网线/485/电源/交流/直流/高压/CAN/STS 等），颜色+标签+粗细+线型区分 |
| 线缆图例 | 浮动面板显示线缆类型图例，可拖拽自由移动、可调节窗口大小 |
| 线缆类型管理 | 右上角编辑按钮打开管理弹窗，支持添加/删除/编辑颜色/粗细/线型，数据保存到 `data/cable-types.json` |
| 线缆叠放 | 多根线缆连接同一端口对时自动按垂直方向偏移叠放（6px 间距） |
| CT 互感器 | 4 连接点（上下左右），可叠加在线缆上（高 z-index），支持 Shift+拖拽自由放置 |
| BOM 联动 | 画板同步 BOM 元件数量，元件可关联产品编码 |
| 属性面板 | 选中元件编辑标签/X/Y/产品编码，编码用 input+datalist 完整显示 "code \| desc"，支持复制/删除 |
| 多选 | Shift + 点击元件可多选，批量操作 |
| 产品编码 | 自动匹配元件可用的编码列表，编码描述 textarea 自适应文本长度 |

#### 画布交互

| 功能 | 说明 |
|------|------|
| 鼠标局部缩放 | 滚轮缩放以鼠标位置为中心（指哪放哪），按钮缩放以画布中心为准 |
| 缩放范围 | 5%~2000%（0.05× ~ 20×），网格密度动态跟随（5 档） |
| 无限网格 | 网格渲染在视口容器（wrap）伪元素上，始终覆盖整个可视区域，不受画布平移影响 |
| 重置视图 | 一键恢复原始大小并居中 |
| 画布拖拽 | 鼠标按住空白区域拖拽平移画布 |
| 全屏 | 支持全屏编辑模式，自动适配画布尺寸并居中 |

#### 保存机制

| 机制 | 说明 |
|------|------|
| 手动保存 | 「💾 保存」按钮，保存时按钮文本短暂变为「✅ 已保存」 |
| 自动保存 | 首次需手动保存激活，之后每 5 分钟检查脏标记，无修改不保存 |
| 关闭提示 | 有未保存修改时关闭页面弹出确认对话框 |
| 存储位置 | 保存到项目文件夹 `data/` 目录（含 `cable-types.json`），可随项目同步 |

### 元件库管理 (`admin.html` → 拓扑元件库)

三个子标签：**元件管理 | 模板管理 | 分类管理**

| 子标签 | 功能 |
|--------|------|
| 元件管理 | 50+ 元件 CRUD，按分类筛选，搜索，SVG 预览，连接点配置，导入/导出 JSON（含重绘的汇流柜元件：铜排母线+端子+回路分区） |
| 模板管理 | 预设拓扑模板 CRUD，编辑 nodes/edges JSON 数据 |
| 分类管理 | 一级分类树（可新增/编辑/删除），二级子分类管理 |

## localStorage / Storage 键值一览

| 键名 | 说明 |
|------|------|
| `ess_users` | 用户列表 JSON |
| `ess_session` | 当前登录会话 JSON |
| `ess_projects` | 项目数据 JSON |
| `ess_topology_data` | 拓扑方案数据 JSON |
| `ess_cable_types` | 线缆类型数据（编辑后持久化到 `data/cable-types.json`） |
| `ess_component_library` | 自定义元件库 JSON |
| `ess_component_templates` | 元件模板 JSON |
| `ess_products_override` | 管理员覆盖的产品数据 |
| `ess_category_override` | 管理员覆盖的大类注册表 |
| `ess_reqfield_override` | 管理员覆盖的需求字段注册表 |
| `ess-theme` | 主题偏好（`dark` / `light`） |
| `ess-bg-img` | 自定义背景图片 Base64 |
| `ess-bg-pos` | 背景定位值 |
| `ess_sidebar_collapsed` | 主页侧边栏折叠状态（`0` / `1`） |
| `ess_admin_sidebar_collapsed` | 管理后台侧边栏折叠状态（`0` / `1`） |

---

## 快速开始

### 纯浏览器预览

```bash
# 启动本地服务器（推荐，避免 CORS 问题）
python -m http.server 8080

# 浏览器访问
# http://localhost:8080/login.html
```

> **注意**: 直接用 `file://` 协议打开会导致 `storage.js` 的 `fetch()` CORS 报错（不影响核心功能，仅控制台噪音）。

### Electron 桌面应用（可选）

```bash
npm install
npm start                    # 开发模式
npm run build                # 打包 Windows NSIS 安装包
```

---

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| user | user123 | 普通用户 |

> 首次运行时自动创建，密码经 SHA-256 加密存储。

---

## 开发指南

### 修改产品数据

1. 以管理员登录（admin / admin123）
2. 进入管理后台 →「产品编码」Tab → 选择设备大类 → 修改编码和描述
3. 点击「💾 保存修改」

### 修改需求表选项

编辑 `js/data.js` 中的 `DATA.reqOptions` 和 `DATA.reqFieldRegistry`。

### 添加新设备类型

需同时修改 4 个文件：

1. `js/data.js` — 添加设备数组 + 在 `categoryRegistry` 注册大类
2. `js/ui.js` — 在 `renderMultiBranch()` 添加 HTML 区块
3. `js/form.js` — 在 `collectMulti()` 添加数据收集逻辑
4. `js/export.js` — 在 `buildConfigSheet()` 添加导出逻辑

### 添加新拓扑元件

编辑 `js/component-lib.js`：

1. 在 `COMPONENT_CATEGORIES` 添加分类（如需新分类）
2. 在 `COMPONENT_LIB` 添加元件定义（含 SVG 模板、连接点、默认尺寸）
3. 刷新管理后台 →「拓扑元件库」自动检测并合并新元件
