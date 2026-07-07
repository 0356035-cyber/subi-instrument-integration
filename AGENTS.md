# AGENTS.md

## 1. 项目概述

本工作区 `C:\projects` 是 Sub-I 临床研究资料库与仪器培训/考核/授权系统的本地整合仓库。

项目采用 **Docker Compose 四容器、双系统独立** 的架构：

- `subi_knowledge_platform`：Sub-I 临床研究资料库，逐步演进为以 Project 为中心的临床研究项目平台。
- `instrument-training-home`：仪器培训、考核、授权与资质管理系统。
- 根目录：统一部署、启动脚本、备份恢复脚本、文档体系。

核心原则：

- 不整体重写。
- 不合并两个子系统。
- 不新建第三套应用。
- 新能力优先挂在 Project 下。
- 业务数据与代码严格分离。
- 统计与报告结论需规则引擎 + 人工审核，不允许 AI 自动定稿。

当前维护状态：

- 当前阶段暂停新功能开发。
- 优先做框架整理、文档同步、安全边界加固和长期维护规则完善。
- 功能路线以 `PROJECT_STATUS.md` 为准；不要根据旧任务摘要误判当前重点。
- Codex 每次接管项目时，默认先按 `docs/只读健康检查.md` 做只读健康检查。

## 2. 技术栈

### Sub-I 临床研究资料库

- 后端：FastAPI
- 前端：Streamlit
- 数据库：SQLite
- ORM：SQLAlchemy
- 认证：JWT，工号 `employee_id` 登录
- 附件存储：`subi_knowledge_platform/uploads/`
- 数据库文件：`subi_knowledge_platform/data/subi_knowledge.db`

### 仪器培训与授权系统

- 后端：FastAPI
- 前端：Streamlit
- 数据库：SQLite
- ORM：SQLAlchemy 2.x
- 迁移：Alembic
- 数据库文件：`instrument-training-home/data/instrument_training.db`

### 部署与运行

- Docker Compose
- Python `requirements.txt`
- Windows `.bat` / PowerShell 脚本
- 可选 Cloudflare Tunnel / 极空间部署配置

## 3. 目录结构说明

```text
C:\projects\
├── docker-compose.yml                  # 四容器统一编排
├── start-docker.bat / 启动系统.bat       # 推荐启动入口
├── backup-data.bat / 备份数据.bat        # 数据备份
├── restore-data.bat / 恢复数据.bat       # 数据恢复
├── README.md
├── README_FOR_CODEX.md                 # Codex 首要入口
├── PROJECT_STATUS.md                   # 当前阶段状态
├── docs/                               # 当前有效文档体系
│   ├── 系统总览.md
│   ├── 开发规范.md
│   ├── 代码地图.md
│   ├── 数据模型.md
│   ├── modules/                        # 模块文档
│   ├── tasks/                          # 阶段任务记录
│   └── archive/                        # 历史归档，默认不读
├── subi_knowledge_platform/            # Sub-I 主系统
│   ├── backend/
│   ├── frontend/
│   ├── data/                           # SQLite 数据库，不提交 Git
│   └── uploads/                        # 业务附件，不提交 Git
└── instrument-training-home/           # 培训系统
    ├── app/
    ├── streamlit_app/
    ├── alembic/
    ├── tests/
    └── data/                           # SQLite 数据库，不提交 Git
```

## 4. 本地启动、构建、测试命令

### 推荐启动方式

在 `C:\projects` 根目录运行：

```bat
启动系统.bat
```

或：

```bat
start-docker.bat
```

这会执行 Docker Compose 构建并启动四个容器：

- Training API: `http://127.0.0.1:8000`
- Training UI: `http://127.0.0.1:8501`
- Sub-I API: `http://127.0.0.1:8001`
- Sub-I UI: `http://127.0.0.1:8510`

注意：启动脚本可能自动创建 `subi_knowledge_platform\.env`，属于会修改文件并启动服务的命令。执行前需告知用户目的和影响。

具体行为：`scripts/start-docker.ps1` 在缺少 `subi_knowledge_platform\.env` 时，可能根据根目录 `.env.example` 创建默认配置。该行为方便新机启动，但可能写入默认服务账号和密码；运行启动脚本前必须向用户说明。

### Docker Compose

```bat
docker compose up -d --build
docker compose ps
docker compose logs
```

执行 `up -d --build` 前需说明影响：会构建镜像、启动/重启容器，可能触发数据库初始化或迁移逻辑。

### Sub-I 本地调试

```bat
subi_knowledge_platform\启动资料库系统.bat
```

此方式会启动 Sub-I 后端 `8001` 和前端 `8510`。资质查询依赖培训 API `8000`。

### 培训系统测试

培训系统已有 pytest 测试：

```bat
cd instrument-training-home
pytest
```

运行测试前需确认测试是否会写入本地数据库或依赖当前数据状态。

测试风险分类：

- 纯内存测试：使用 `sqlite:///:memory:`，不写真实数据库，确认依赖后可运行。
- 真实 API 测试：请求 `127.0.0.1` 或 `localhost` 上的服务，可能创建/删除测试记录，必须确认目标服务和数据隔离。
- 写库冒烟脚本：Sub-I `backend/scripts/*smoke_test.py`、`permission_ops_validation.py` 会通过 API 写入业务库，必须确认 `SUBI_DATA_PROFILE` 和用户授权。

### Sub-I 冒烟脚本

Sub-I 存在写数据的验证脚本，例如：

```text
subi_knowledge_platform/backend/scripts/permission_ops_validation.py
subi_knowledge_platform/backend/scripts/dataset_smoke_test.py
subi_knowledge_platform/backend/scripts/analysis_smoke_test.py
```

这些脚本可能写入样例数据或修改测试状态。运行前必须确认当前 `SUBI_DATA_PROFILE`，并向用户说明影响。

## 5. 环境变量说明

### 根目录

- `.env.example`：Sub-I `.env` 示例来源。
- `.env.tunnel.example`：Cloudflare Tunnel 配置示例。
- `grok-proxy.env.example`：Grok Build 相关配置示例。

### Sub-I

实际配置文件：

```text
subi_knowledge_platform/.env
```

示例文件：

```text
subi_knowledge_platform/.env.example
```

关键变量：

```env
INSTRUMENT_TRAINING_API_BASE=http://instrument-training-home-backend:8000/api/v1
INSTRUMENT_TRAINING_SERVICE_EMPLOYEE_ID=3267
INSTRUMENT_TRAINING_SERVICE_PASSWORD=change-me
INSTRUMENT_TRAINING_TIMEOUT=10
SUBI_DATA_PROFILE=dev
SUBI_ALLOW_TEST_MUTATION=0
```

规则：

- 不要把真实密码、Token、密钥写入代码或文档。
- 不要覆盖已有 `.env`。
- 修改 `.env.example` 可以，但不得泄露真实值。
- `SUBI_DATA_PROFILE=production` 时，不得运行会写入测试数据的脚本，除非用户明确确认。

### 培训系统

配置入口：

```text
instrument-training-home/app/config.py
```

默认读取项目 `.env`，包含：

- `database_url`
- `api_prefix`
- `api_base_url`
- `jwt_secret`
- `jwt_expire_minutes`
- `login_allowed_names`

## 6. 重要业务模块说明

### Sub-I 资料库

主要入口：

- 后端：`subi_knowledge_platform/backend/main.py`
- 前端：`subi_knowledge_platform/frontend/app.py`

核心模块：

- 用户与认证：`backend/auth.py`、`backend/crud.py`
- 权限：`backend/permissions.py`
- 资料与版本：`backend/document_versions.py`、`backend/document_compare.py`
- 项目管理：`projects` API、`frontend/project_management.py`
- 排班日历：`backend/schedule_routes.py`、`backend/schedule_crud.py`、`frontend/schedule_calendar.py`、`frontend/schedule_roster.py`
- 资质整合 BFF：`backend/integrations/`
- Dataset：`backend/datasets/`、`frontend/dataset_pages.py`
- Analysis：`backend/analysis/`、`frontend/analysis_pages.py`
- Report：规划中，建议落点 `backend/reports/`、`frontend/report_pages.py`

### 仪器培训系统

主要入口：

- 后端：`instrument-training-home/app/main.py`
- 前端：`instrument-training-home/streamlit_app/main.py`

核心模块：

- 人员管理：`app/api/v1/users.py`
- 仪器管理：`app/api/v1/instruments.py`
- 培训记录：`app/api/v1/training_records.py`
- 考核记录：`app/api/v1/assessment_records.py`
- 授权管理：`app/api/v1/authorizations.py`
- 整合 API：`app/api/v1/integrations.py`
- Excel 导入：`app/api/v1/imports.py`
- 前端页面：`streamlit_app/01_*` 至 `10_*`

## 7. 数据库 / 文件存储 / API 调用注意事项

### 数据库

业务数据库文件：

```text
subi_knowledge_platform/data/subi_knowledge.db
instrument-training-home/data/instrument_training.db
```

规则：

- 不得提交数据库文件到 Git。
- 不得用 Git checkout/reset 恢复数据库文件。
- 不得随意删除、替换、清空数据库。
- 数据库变更必须通过明确迁移逻辑实现。
- Sub-I 当前使用 `ensure_*` 启动迁移模式。
- 培训系统使用 Alembic。

### 文件存储

Sub-I 业务附件目录：

```text
subi_knowledge_platform/uploads/
```

规则：

- 不得删除或清空。
- 不得移动或重命名已有业务附件。
- 不得提交上传文件到 Git。
- 修改上传/下载逻辑时必须保持路径穿越防护。

### API 调用边界

- Sub-I 前端只能调用 Sub-I 后端 `8001`。
- Sub-I 后端通过 BFF 调用培训 API `8000/api/v1`。
- Sub-I 不应直接写培训系统数据库。
- 培训系统不应被合并进 Sub-I。
- 人员关联统一使用 `employee_id`。

## 8. 禁止操作清单

未经用户明确确认，不得执行以下操作：

- 删除、移动、重命名 `data/`、`uploads/`、`backups/`。
- 删除或覆盖任何 `.db` 文件。
- 清空、重置、迁移生产数据库。
- 运行恢复脚本 `restore-data.bat`。
- 运行可能写入业务库的冒烟脚本。
- 覆盖已有 `.env`、`.env.tunnel` 或真实配置文件。
- 将密钥、密码、Token 写入代码、文档或提交记录。
- 执行大规模重构、目录重组或跨系统合并。
- 将 `instrument-training-home` 合并进 `subi_knowledge_platform`。
- 新建第三套应用绕过现有架构。
- 直接修改生产数据库内容。
- 用 `git reset --hard`、`git checkout -- data/*.db` 等方式回滚业务数据。
- 未说明影响就运行 `docker compose up --build`、安装依赖、构建镜像、迁移数据库、启动服务。
- 在 `frontend/app.py` 或 `backend/main.py` 继续堆叠大型新域逻辑；新域应优先拆到独立模块。
- 未经用户确认，不得配置 Git `safe.directory`。当前 Codex 沙盒用户可能对两个子仓触发 `dubious ownership`，这是环境权限问题，不应擅自修改用户级 Git 配置。

## 9. 修改代码前的检查流程

每次开始任务前：

1. 阅读：
   - `AGENTS.md`
   - `README_FOR_CODEX.md`
   - `PROJECT_STATUS.md`
2. 先按 `docs/只读健康检查.md` 做只读健康检查：
   - 只读文件、列目录、查看 Git 状态。
   - 只检查 `.env` 是否存在，不打印、不复制、不解析真实内容。
   - 只检查 `data/`、`uploads/`、`backups/` 目录是否存在，不枚举敏感文件细节，不读取内容。
   - 不运行 Docker、服务、pytest、冒烟脚本、备份恢复脚本或迁移。
3. 根据任务选读：
   - `docs/系统总览.md`
   - `docs/开发规范.md`
   - `docs/代码地图.md`
   - `docs/数据模型.md`
   - `docs/只读健康检查.md`
   - 相关 `docs/modules/*.md`
   - 相关 `docs/tasks/*.md`
4. 确认任务属于哪个仓库：
   - Sub-I：资料、项目、Dataset、Analysis、Report、AI、权限、排班、资质 BFF
   - 培训系统：人员、仪器、培训、考核、授权、资质整合 API
   - 根目录：Compose、备份、部署、文档
5. 检查 Git 状态：
   - 根目录
   - `subi_knowledge_platform`
   - `instrument-training-home`
   - 若子仓库出现 `dubious ownership` / `safe.directory` 提示，停止并向用户说明；不要擅自运行 `git config --global --add safe.directory ...`。
6. 识别是否涉及：
   - 数据库结构
   - 业务数据
   - 附件文件
   - 环境变量
   - 启动/构建/迁移
   - 权限边界
7. 若涉及高风险操作，先向用户说明：
   - 准备运行什么
   - 目的是什么
   - 可能影响什么
   - 是否会写文件、启动服务、改数据库或覆盖数据
8. 优先小步修改，避免无关重构。
9. 修改模块后，必要时同步更新：
   - `docs/modules/`
   - `docs/代码地图.md`
   - `docs/数据模型.md`
   - `PROJECT_STATUS.md`
   - `docs/tasks/`

## 10. 每次完成任务后的交付格式

完成任务后，回复应包含：

### 修改了哪些文件

列出实际修改的文件，例如：

```text
- subi_knowledge_platform/backend/reports/routes.py
- subi_knowledge_platform/frontend/report_pages.py
- docs/modules/报告生成.md
```

### 为什么修改

简要说明业务目标与技术原因。

### 如何验证

说明已执行的验证方式，例如：

```text
- 已运行 pytest
- 已启动 Docker 四容器并检查健康接口
- 已手动验证 Streamlit 页面流程
- 未运行测试，原因是……
```

如果没有运行测试，必须明确说明原因。

### 是否存在风险

说明可能影响：

- 数据库
- 文件上传/下载
- 权限
- 旧数据兼容
- 部署
- 性能
- 用户操作路径

### 后续建议

列出建议下一步，但不要擅自继续执行高风险操作。

## 11. 当前文档有效性约定

当前有效文档：

- `README_FOR_CODEX.md`
- `PROJECT_STATUS.md`
- `docs/系统总览.md`
- `docs/开发规范.md`
- `docs/代码地图.md`
- `docs/数据模型.md`
- `docs/modules/`
- `docs/tasks/`

历史参考文档：

- `docs/archive/`

默认不读取 `docs/archive/`，除非用户明确要求追溯历史决策。

## 12. 当前路线图状态

截至 `PROJECT_STATUS.md` 记录：

- 阶段 1：代码地图，已完成
- 阶段 2：架构 2.0 文档，已完成
- 阶段 3：Project 多 Tab，已完成
- 阶段 3+：分层权限 MVP，已完成
- 阶段 4：Dataset，已完成
- 阶段 5：Analysis，已完成
- 阶段 6：Report，下一开发重点
- 阶段 7：AI Workspace，未开始

下一阶段开发应优先围绕 Report：模板管理、Analysis 结果填表、docx 生成、归档为项目 Document。

## 13. Codex 默认工作模式

Codex 在本项目中的默认工作模式为：

1. 先理解，不急于修改。
2. 先阅读有效文档，再阅读代码。
3. 先给出实施方案，再进行代码修改。
4. 优先小步修改，不做无关重构。
5. 每次只围绕用户当前任务修改必要文件。
6. 涉及数据库、附件、环境变量、启动脚本、Docker、迁移、备份恢复时，必须先说明风险并等待用户确认。
7. 不得因为发现旧代码不够理想而主动进行大规模重构。
8. 不得绕过现有系统架构新建独立应用。
9. 不得擅自引入新的大型依赖、框架或服务。
10. 修改完成后必须说明验证方式；未验证必须说明原因。

默认优先级：

- 安全性 > 数据完整性 > 业务连续性 > 代码优雅性 > 开发速度

## 14. Report 阶段开发边界

当前下一阶段开发重点是 Report 模块。

Report 模块应优先挂载在 Sub-I 的 Project 下，作为项目工作流的一部分，而不是独立系统。

建议开发方向：

1. 报告模板管理
2. 从 Analysis 结果中选择数据
3. 自动填入报告结构
4. 生成 docx 报告
5. 将生成报告归档为项目 Document
6. 支持人工审核与人工修改
7. 保留报告生成记录与版本

Report 阶段暂不应优先开发：

- AI Workspace
- 自动生成最终结论
- 自动替代人工审核
- 新建第三套报告系统
- 跨系统大规模重构
- 复杂可视化引擎
- 多租户 SaaS 架构

报告结论必须遵守：

- AI 可以辅助起草、归纳和填充。
- 统计结论必须来自规则引擎或明确计算逻辑。
- 最终报告必须经过人工审核。
- 不允许 AI 在无人审核的情况下自动定稿临床研究结论。

## 15. 修改前后自检清单

每次修改前，Codex 应检查：

- 当前任务属于 Sub-I、培训系统，还是根目录部署文档。
- 是否涉及数据库结构。
- 是否涉及真实业务数据。
- 是否涉及 uploads 附件。
- 是否涉及 .env 或密钥。
- 是否涉及 Docker、启动脚本、迁移或备份恢复。
- 是否需要更新文档。

每次修改后，Codex 应检查：

- 是否误改 data/ 目录。
- 是否误改 uploads/ 目录。
- 是否误改 .env。
- 是否误提交 .db 文件。
- 是否引入新的未说明依赖。
- 是否破坏双系统独立边界。
- 是否把新逻辑堆叠到 main.py 或 app.py。
- 是否需要更新 docs/代码地图.md、docs/数据模型.md、PROJECT_STATUS.md 或 docs/modules/。
- 是否已经说明验证方式。

如果发现高风险变更，应停止并向用户说明，而不是继续修改。
