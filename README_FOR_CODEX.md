# README for Codex

> **用途：** Codex / AI 助手每次进入本工作区时的**首要入口**。  
> **何时读：** 任何开发任务开始前。  
> **关联：** 长期维护规则见 [AGENTS.md](./AGENTS.md)；当前状态见 [PROJECT_STATUS.md](./PROJECT_STATUS.md)；细节见 [docs/](./docs/) 目录。

---

## 项目核心目标

在 **Docker 四容器、双系统独立** 的前提下，将 Sub-I 资料库从「文档中心」渐进演进为 **以 Project 为中心的临床研究项目平台（Clinical Research OS 2.0）**：

- 已上线：资料库、项目管理、排班日历、资质查询、分层权限
- 规划中：Dataset → Analysis → Report → AI Workspace

**原则：** 不整体重写、不合并培训系统、不建第三套应用、统计结论经规则引擎 + 人审。

---

## 系统概况

| 组件 | 仓库 / 容器 | 端口 |
|------|-------------|------|
| Sub-I 前端 | `subi_frontend` | 8510 |
| Sub-I 后端 | `subi_backend` | 8001 |
| 培训前端 | `instrument_train_frontend` | 8501 |
| 培训后端 | `instrument_train_backend` | 8000 |

- **整合仓根目录：** `C:\projects`（`subi-instrument-integration`）
- **子仓库：** `subi_knowledge_platform/`、`instrument-training-home/`
- **人员关联键：** 工号 `employee_id`
- **业务数据：** `*.db`、`uploads/` 不提交 Git，用 `备份数据.bat` 同步

---

## 主要目录结构

```
C:\projects\
├── docker-compose.yml          # 四容器编排
├── start-docker.bat / 启动系统.bat
├── README_FOR_CODEX.md         # 本文件
├── PROJECT_STATUS.md           # 当前状态
├── docs/
│   ├── 系统总览.md
│   ├── 开发规范.md
│   ├── 代码地图.md / 数据模型.md
│   ├── modules/                  # 按功能模块
│   ├── tasks/                    # 具体开发任务
│   └── archive/                  # 历史文档（默认不读）
├── subi_knowledge_platform/    # Sub-I 主战场
└── instrument-training-home/   # 培训系统（独立）
```

Sub-I 后端关键域：`backend/permissions.py`、`schedule_*.py`、`integrations/`；前端：`frontend/app.py`、`project_management.py`。

---

## 关键开发规则（硬约束）

1. **不合并** `instrument-training-home` 进 Sub-I 单应用
2. Sub-I 前端**只调 8001**；培训服务账号仅存 `subi_knowledge_platform/.env`
3. **不删除** 稳定能力（版本组、资质 BFF、排班、权限）除非文档明确废弃
4. 新功能挂在 `project_id` 下，优先抽 `backend/<域>/` 与 `frontend/*_pages.py`
5. 统计**最终结论**经规则引擎 + 人审；AI 不得单独定稿
6. DB 变更用 migration 脚本，不手改生产库
7. `role`（系统权限）≠ `job_title`（业务职务）；项目负责人靠 `Project.owner_employee_id`

---

## 当前工作模式

**当前阶段暂停新功能开发。** 本轮优先事项是框架整理、文档同步、安全边界加固与长期维护规则完善。

功能路线、已完成阶段和下一功能重点以 [PROJECT_STATUS.md](./PROJECT_STATUS.md) 为准；不要仅根据旧任务记录判断当前开发重点。除非用户明确要求，本阶段不要启动 Report、AI Workspace 或其他新功能开发。

框架维护默认边界：

1. 不修改业务数据、附件、真实配置或数据库结构。
2. 不运行 Docker、服务启动、构建、迁移、备份恢复或写库冒烟脚本，除非用户明确确认。
3. 优先更新文档、脚本说明、测试风险标注和 Codex 接管规则。
4. 发现文档与代码不一致时，先列出差异并请用户确认。

Codex 接管项目时的只读检查优先级：

1. `AGENTS.md`
2. 本文件 `README_FOR_CODEX.md`
3. [docs/只读健康检查.md](./docs/只读健康检查.md)
4. `PROJECT_STATUS.md`
5. [docs/代码地图.md](./docs/代码地图.md)
6. [docs/开发规范.md](./docs/开发规范.md)
7. [docs/tasks/README.md](./docs/tasks/README.md)

只读检查时，只检查 `.env` 是否存在，不打印、不复制、不解析真实内容；只检查 `data/`、`uploads/`、`backups/` 目录是否存在，不枚举敏感文件细节，不读取内容。如果子仓 Git 出现 `dubious ownership` / `safe.directory`，只记录现象，不自动处理。

---

## 文档索引

| 文档 | 用途 |
|------|------|
| [AGENTS.md](./AGENTS.md) | Codex 长期维护规则与禁止操作 |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 已完成 / 进行中 / 问题 / 优先级 |
| [docs/只读健康检查.md](./docs/只读健康检查.md) | 不启动、不写入的接管检查流程 |
| [docs/系统总览.md](./docs/系统总览.md) | 架构、业务流程、模块关系 |
| [docs/开发规范.md](./docs/开发规范.md) | 编码、目录、运行、测试 |
| [docs/代码地图.md](./docs/代码地图.md) | 文件、API、表、页面索引 |
| [docs/tasks/README.md](./docs/tasks/README.md) | 阶段任务与维护任务索引 |
| [docs/数据模型.md](./docs/数据模型.md) | 核心对象与字段 |
| [docs/数据分析规范.md](./docs/数据分析规范.md) | Dataset / Analysis 规则（阶段 4～5） |
| [docs/报告生成规范.md](./docs/报告生成规范.md) | Word 报告规则（阶段 6） |
| [docs/modules/](./docs/modules/) | 各功能模块专篇 |
| [docs/tasks/](./docs/tasks/) | 具体任务记录 |
| [docs/archive/](./docs/archive/) | 历史归档（默认不读） |

---

## Codex 阅读规则

1. **每次开发前**必须先读 `AGENTS.md`、`README_FOR_CODEX.md` 和 `PROJECT_STATUS.md`。
2. **按任务选读**：只打开相关 `docs/modules/<模块>.md`；改表结构或找文件时再读 `docs/代码地图.md` / `docs/数据模型.md`。
3. **默认不读** `docs/archive/`，除非用户明确要求查历史。
4. **修改某模块后**，同步更新对应 `docs/modules/` 文档（及必要时 `docs/代码地图.md`）。
5. **完成具体任务后**，更新 `docs/tasks/` 中对应记录与 `PROJECT_STATUS.md`。
6. **文档与代码冲突时**，先列出不一致点并向用户确认；**不默认文档正确**。

---

## 快速启动

```bat
启动系统.bat
```

| 服务 | 地址 |
|------|------|
| 培训系统 | http://127.0.0.1:8501 |
| Sub-I 资料库 | http://127.0.0.1:8510 |

默认账号：工号 `3267`（部署后请改密）。

---

## 新对话粘贴模板

```text
请阅读 C:\projects\README_FOR_CODEX.md 和 PROJECT_STATUS.md，
以及 AGENTS.md，再按任务阅读相关 docs/modules/ 文档。
在不动四容器与 instrument-training-home 独立边界的前提下推进指定任务。
默认渐进修改，禁止整体重写。
```
