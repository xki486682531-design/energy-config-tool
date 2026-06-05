# 数据文件夹

此文件夹包含储能柜配置工具的所有持久化数据。

## 文件说明

| 文件 | 内容 |
|------|------|
| `users.json` | 用户账号信息（用户名、密码哈希、角色） |
| `projects.json` | 项目配置记录 |
| `components.json` | 元件库数据 |
| `templates.json` | 元件模板 |
| `categories.json` | 元件分类 |
| `products.json` | 产品库配置（型号、分类、必填字段） |
| `topology.json` | 拓扑方案数据 |
| `settings.json` | 系统设置（主题、背景等） |

## 工作原理

- **首次使用**：管理员后台右上角点击同步按钮，选择此 `data/` 文件夹授权写入权限
- **日常使用**：数据先写入浏览器 localStorage（即时生效），500ms 后自动同步到 JSON 文件
- **换电脑**：把整个 `energy-config-tool-main` 文件夹拷贝过去即可，打开页面会自动加载 data/ 中的 JSON 数据

## 注意

- 此文件夹及其中的 JSON 文件需要随项目一起备份
- 建议将此文件夹加入版本控制（Git），方便团队协作
- 不要在浏览器隐身模式下使用，否则 localStorage 数据无法持久化到文件
