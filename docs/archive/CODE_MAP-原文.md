> **已归档，仅供参考，不作为当前开发依据。**  
> 现行规则见：[README_FOR_CODEX.md](../../README_FOR_CODEX.md) → 文档索引。

---
# Clinical Research OS — 代码地图

> 更新日期：2026-07-03  
> **用途：** Codex / 开发者快速定位「改哪、不该改哪」；对照 [ARCHITECTURE.md](./ARCHITECTURE.md) 与 [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) 推进 2.0。  
> **原则：** 保持四容器部署与 `instrument-training-home` 独立边界；渐进演进，不整体重写。

---

## 1. 仓库与部署拓扑

```
D:/projects/                          ← 整合仓（docker-compose、文档、脚本）
├── subi_knowledge_platform/          ← Sub-I 临床研究主平台（2.0 主战场）
├── instrument-training-home/           ← 仪器培训/考核/授权（独立，经 BFF 整合）
├── docker-compose.yml                  ← 四容器编排
├── docker-compose.zspace.yml           ← 极空间覆盖
├── docker-compose.tunnel.yml           ← Cloudflare Tunnel
└── scripts/                          ← 备份、离线部署、启动脚本
```

### 1.1 四容器与端口

| 容器 | 源码目录 | 端口 | 数据库 / 文件 |
|------|----------|------|---------------|
| `instrument_train_backend` | `instrument-training-home/` | 8000 | `data/instrument_training.db` |
| `instrument_train_frontend` | `instrument-training-home/streamlit_app/` | 8501 | — |
| `subi_backend` | `subi_knowledge_platform/backend/` | 8001 | `data/subi_knowledge.db` + `uploads/` |
| `subi_frontend` | `subi_knowledge_platform/frontend/` | 8510 | 只调 8001 |

### 1.2 跨系统调用链

```
Sub-I 前端 (:8510)
    → Sub-I 后端 (:8001)
        ├── SQLite subi_knowledge.db（项目/资料/排班）
        └── BFF /integrations/training/* → 培训 API (:8000)
                                              └── SQLite instrument_training.db
```

**硬约束：** 培训服务账号 JWT 仅存 `subi_knowledge_platform/.env`；Sub-I 前端**不得**直连 8000。

---

## 2. Sub-I 平台（`subi_knowledge_platform`）

### 2.1 目录结构（现状）

```
subi_knowledge_platform/
├── backend/
│   ├── main.py                 # FastAPI 入口、用户/资料/项目 API
│   ├── models.py               # SQLAlchemy 模型（users, projects, documents, schedule）
│   ├── schemas.py              # Pydantic 请求/响应
│   ├── crud.py                 # 用户、资料、项目 CRUD
│   ├── auth.py                 # JWT、角色校验
│   ├── database.py             # SQLite 引擎与会话
│   ├── config.py               # 环境变量
│   ├── document_versions.py    # 版本组、生效日排序
│   ├── document_compare.py     # 资料对比
│   ├── project_migrations.py   # projects 表、document.project_id
│   ├── schedule_crud.py        # 排班域业务逻辑
│   ├── schedule_routes.py      # 排班 API 路由
│   ├── schedule_migrations.py  # 排班表结构迁移
│   └── integrations/
│       ├── routes.py           # BFF：/integrations/training/*
│       ├── instrument_training.py  # HTTP 客户端
│       └── schemas.py
├── frontend/
│   ├── app.py                  # Streamlit 主壳（~2650 行，资料库核心 UI）
│   ├── project_management.py   # 项目管理列表/详情/新建
│   ├── schedule_calendar.py    # 项目日历、访视节点 Tab
│   ├── schedule_roster.py      # 周排班页
│   └── qualification_inquiry.py # 资质查询（调 BFF）
├── data/subi_knowledge.db      # 业务库（不提交 Git）
└── uploads/                    # 资料附件（不提交 Git）
```

### 2.2 后端文件职责

| 文件 | 职责 | 2.0 改动倾向 |
|------|------|--------------|
| `main.py` | 应用启动、migration 钩子、认证、用户、资料、项目 REST | 新域路由改为 `include_router`，少追加单体逻辑 |
| `models.py` | 全部 ORM 表定义 | 扩展 `Document.document_type`；新增 Dataset/Analysis/Report/AI 表 |
| `crud.py` | 用户、资料、项目 | 资料/项目逻辑可逐步抽到 `documents/`、`projects/` |
| `schedule_*.py` | 访视模板、日历、排班、草稿 | **稳定域**，仅增强，不拆容器 |
| `integrations/*` | 培训资质 BFF | 项目 Tab「人员资质」继续复用 |
| `document_*.py` | 版本组、对比 | **稳定域** |
| `project_migrations.py` | 项目相关 DDL | 延续 migration 模式 |

### 2.3 数据库表（`subi_knowledge.db`）

| 表名 | 模型类 | 说明 | 2.0 |
|------|--------|------|-----|
| `users` | `User` | 工号登录、角色 admin/editor/viewer | 保持 |
| `projects` | `Project` | 项目台账 | 扩展字段见 DATA_MODEL |
| `documents` | `Document` | 资料；`project_id` 可空=通用库 | 加 `document_type` |
| `visit_templates` | `VisitTemplate` | 访视模板 | 保持 |
| `visit_template_nodes` | `VisitTemplateNode` | 模板节点 | 保持 |
| `project_visit_nodes` | `ProjectVisitNode` | 项目访视节点 | 保持 |
| `calendar_events` | `CalendarEvent` | 日历事件 | 保持 |
| `personal_availability` | `PersonalAvailability` | 个人在岗状态 | 保持 |
| `roster_week_drafts` | `RosterWeekDraft` | 周排班草稿 | 保持 |
| `project_assignments` | `ProjectAssignment` | 项目人员岗位 | 保持 |
| `datasets` | — | — | **2.0 阶段 4 新增** |
| `analysis_tasks` | — | — | **2.0 阶段 5 新增** |
| `reports` | — | — | **2.0 阶段 6 新增** |
| `ai_workspace` / `ai_action_logs` | — | — | **2.0 阶段 7 新增** |

### 2.4 REST API 路由地图

#### 认证与用户（`main.py`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/login` | 工号密码登录 |
| GET | `/me` | 当前用户 |
| POST | `/users/me/change-password` | 改密 |
| GET/POST | `/users` | 用户列表 / 创建（admin） |
| PUT | `/users/{id}` | 更新用户 |
| PUT | `/users/{id}/toggle` | 启用/禁用 |
| POST | `/users/{id}/reset-password` | 重置密码 |
| DELETE | `/users/{id}` | 删除用户 |

#### 资料（`main.py`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/documents` | 列表（支持 `project_id`、分类、搜索） |
| GET | `/documents/stats` | 统计 |
| POST | `/documents` | 上传 |
| GET | `/documents/compare` | 版本对比 |
| GET | `/documents/{id}` | 详情 |
| GET | `/documents/{id}/versions` | 版本组 |
| POST | `/documents/groups/{id}/refresh-version-status` | 刷新版本状态 |
| PUT | `/documents/{id}` | 更新元数据 |
| DELETE | `/documents/{id}` | 删除 |
| GET | `/documents/{id}/download` | 下载附件 |
| GET | `/categories` | 默认分类列表 |

#### 项目（`main.py`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/meta` | 状态/功效/伦理枚举 |
| GET | `/projects` | 列表筛选 |
| GET | `/projects/similar` | 相似项目推荐 |
| POST | `/projects` | 新建 |
| GET | `/projects/{id}` | 详情 |
| PUT | `/projects/{id}` | 更新 |
| DELETE | `/projects/{id}` | 删除（有关联资料时拒绝） |

#### 排班（`schedule_routes.py`，无前缀）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/schedule/meta` | 排班元数据 |
| GET | `/visit-templates` | 访视模板列表 |
| GET/PUT | `/projects/{id}/visit-nodes` | 项目访视节点 |
| POST | `/projects/{id}/visit-nodes/apply-template` | 套用模板 |
| POST | `/projects/{id}/calendar/sync` | 同步日历 |
| GET/POST | `/calendar/events` | 日历事件 |
| PUT/DELETE | `/calendar/events/{id}` | 改/删事件 |
| GET | `/availability` | 个人可用性 |
| GET | `/availability/department` | 科室视图 |
| PUT | `/availability/me` | 更新本人 |
| GET/PUT/DELETE | `/availability/draft` | 周排班草稿 |
| GET | `/availability/resume` | 续填提示 |
| PUT | `/availability/batch` | 批量提交 |
| POST/DELETE | `/assignments` / `/assignments/{id}` | 项目岗位 |

#### 培训整合 BFF（`integrations/routes.py`，前缀 `/integrations/training`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/integrations/training/health` | 培训 API 健康检查 |
| GET | `/integrations/training/instruments` | 仪器列表 |
| GET | `/integrations/training/qualifications` | 人员资质查询 |
| GET | `/integrations/training/qualifications/by-instrument` | 按仪器查资质 |
| POST | `/integrations/training/qualifications/batch-check` | 批量资质校验 |

#### 2.0 规划 API（尚未实现）

| 前缀 | 阶段 | 规划文件 |
|------|------|----------|
| `/projects/{id}/datasets` | 4 | `backend/datasets/routes.py` |
| `/projects/{id}/analysis` | 5 | `backend/analysis/routes.py` |
| `/projects/{id}/reports` | 6 | `backend/reports/routes.py` |
| `/projects/{id}/ai` | 7 | `backend/ai_workspace/routes.py` |

### 2.5 前端页面路由（`app.py` + 模块）

导航由 `st.session_state.current_page` 驱动，侧边栏 `_get_navigation_pages()` 定义主入口。

| `current_page` | 渲染函数 | 源文件 | 角色 |
|----------------|----------|--------|------|
| `仪表盘` | `show_dashboard()` | `app.py` | 全部 |
| `资料列表` | `show_document_list()` | `app.py` | 全部 |
| `分类详情` | `show_category_page()` | `app.py` | 全部 |
| `资料详情` | `show_document_detail_page()` | `app.py` | 全部 |
| `上传资料` | `show_upload_form()` | `app.py` | editor+ |
| `用户管理` | `show_user_management()` | `app.py` | admin |
| `项目管理` | `show_project_list_page()` | `project_management.py` | 全部 |
| `新建项目` | `show_project_create_page()` | `project_management.py` | editor+ |
| `项目详情` | `show_project_detail_page()` | `project_management.py` | 全部 |
| `项目日历` | `show_calendar_page()` | `schedule_calendar.py` | 全部 |
| `周排班` | `show_roster_page()` | `schedule_roster.py` | 全部 |
| `授权资质查询` | `show_qualification_inquiry_page()` | `qualification_inquiry.py` | 全部 |

**登录流：** 未登录 → `show_login_page()`；`must_change_password` → 强制改密页。

### 2.6 项目详情页现状 vs 2.0 目标（阶段 3）

**当前 Tab（`project_management.py` → `show_project_detail_page`，阶段 3 已上线）：**

```
概览 | 资料 | 排期 | 人员资质 | 数据集 | 分析 | 报告 | AI 工作区
```

| Tab | 状态 | 实现落点 |
|-----|------|----------|
| 概览 | ✅ 基本信息 + 模块状态 + 相似项目 | `project_management.py` |
| 资料 | ✅ 项目 Document 列表 + 上传入口 | `project_management.py` |
| 排期 | ✅ 访视节点与日历同步 | `schedule_calendar.show_project_visit_tab` |
| 人员资质 | ✅ 嵌入资质查询面板 | `qualification_inquiry.show_qualification_inquiry_panel` |
| 数据集 | 🔲 占位（阶段 4） | 规划 `dataset_pages.py` |
| 分析 | 🔲 占位（阶段 5） | 规划 `analysis_pages.py` |
| 报告 | 🔲 占位（阶段 6） | 规划 `report_pages.py` |
| AI 工作区 | 🔲 占位（阶段 7） | 规划 `ai_workspace.py` |

**不该改：** 通用资料库侧边栏入口、版本对比、独立「项目日历」「周排班」全局页（过渡期保留）。

### 2.7 2.0 新增文件规划（`ARCHITECTURE.md` §4）

```
backend/
├── datasets/          # routes.py, crud.py, migrations.py
├── analysis/          # routes.py, engine/, crud.py
├── reports/           # routes.py, template_fill.py
└── ai_workspace/      # routes.py, indexer.py

frontend/
├── dataset_pages.py
├── analysis_pages.py
├── report_pages.py
└── ai_workspace.py

templates/
├── word/              # 报告 Word 模板
└── excel/             # 可选导入模板
```

---

## 3. 仪器培训系统（`instrument-training-home`）

### 3.1 目录结构

```
instrument-training-home/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── bootstrap.py            # 启动迁移、登录白名单同步
│   ├── config.py               # 配置、login_allowed_names
│   ├── database.py
│   ├── api/v1/                 # REST 路由
│   ├── models/                 # ORM
│   ├── schemas/                # Pydantic
│   └── services/               # 业务逻辑
├── streamlit_app/
│   ├── main.py                 # st.navigation 多页壳
│   ├── api_client.py           # 调后端 API
│   ├── auth_session.py         # 会话与页面权限
│   ├── 01_personnel_management.py
│   ├── 02_instrument_management.py
│   ├── 03_training_management.py
│   ├── 04_assessment_management.py
│   ├── 05_authorization_management.py
│   ├── 06_operation_logs.py
│   ├── 07_statistics_report.py
│   ├── 08_data_import.py
│   ├── 09_expiry_reminder.py
│   ├── 10_comprehensive_lookup.py
│   └── person_qualification_linkage.py  # 综合查询联动表
├── alembic/versions/           # DB 迁移
└── data/instrument_training.db # 业务库（不提交 Git）
```

### 3.2 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 人员；含 `can_login` 登录白名单 |
| `instruments` | 仪器台账 |
| `training_records` | 培训记录 |
| `assessment_records` | 考核记录 |
| `authorizations` | 授权记录 |
| `operation_logs` | 操作审计 |

### 3.3 API 路由（前缀 `/api/v1`）

| 模块 | 路径前缀 | 文件 |
|------|----------|------|
| 认证 | `/auth` | `api/v1/auth.py` |
| 用户 | `/users` | `api/v1/users.py` |
| 仪器 | `/instruments` | `api/v1/instruments.py` |
| 培训 | `/training-records` | `api/v1/training_records.py` |
| 考核 | `/assessment-records` | `api/v1/assessment_records.py` |
| 授权 | `/authorizations` | `api/v1/authorizations.py` |
| 操作日志 | `/operation-logs` | `api/v1/operation_logs.py` |
| 整合 | `/integrations` | `api/v1/integrations.py`（供 Sub-I BFF） |
| 导入 | `/imports` | `api/v1/imports.py` |

### 3.4 前端页面（`st.navigation`）

| url_path | 页面文件 | 标题 |
|----------|----------|------|
| `home` | `home_dashboard.py` | 首页 |
| `statistics` | `07_statistics_report.py` | 统计报表 |
| `personnel` | `01_personnel_management.py` | 人员管理 |
| `instrument` | `02_instrument_management.py` | 仪器管理 |
| `training` | `03_training_management.py` | 培训记录 |
| `assessment` | `04_assessment_management.py` | 考核记录 |
| `authorization` | `05_authorization_management.py` | 授权管理 |
| `comprehensive-lookup` | `10_comprehensive_lookup.py` | 人员综合查询 |
| `expiry-reminder` | `09_expiry_reminder.py` | 到期提醒 |
| `operation-logs` | `06_operation_logs.py` | 操作日志 |
| `data-import` | `08_data_import.py` | Excel 导入 |
| `change-password` | `change_password_page.py` | 修改密码 |

### 3.5 2.0 边界：培训系统改什么

| 改 | 不改 |
|----|------|
| 资质 API 扩展（若 Sub-I Tab 需要） | 并入 Sub-I 单应用 |
| 整合端点 `integrations.py` | Sub-I 直接写培训库 |
| 登录白名单、操作日志修复 | 项目/Dataset/Analysis 逻辑 |

---

## 4. 整合仓（`projects/` 根目录）

| 文件/目录 | 职责 |
|-----------|------|
| `docker-compose*.yml` | 四容器编排、极空间、Tunnel |
| `scripts/*.ps1`, `*.py` | 启动、备份、离线包 |
| `*.bat` | Windows 一键脚本 |
| `ARCHITECTURE.md` | 2.0 架构蓝图 |
| `DATA_MODEL.md` | 目标数据模型 |
| `DEVELOPMENT_ROADMAP.md` | 落地顺序与验收 |
| `CODEX_WORKFLOW.md` | AI 开发硬约束 |
| `CODE_MAP.md` | 本文件 |
| `系统总览.md` | 1.0 已上线能力 |
| `项目整合交接文档.md` | 历史规划 §14、权限 §14.12、§15 |

---

## 5. 模块 → 2.0 对象对照

| 2.0 对象 | 1.0 代码落点 | 下一阶段 |
|----------|--------------|----------|
| **Project** | `models.Project`, `crud.py`, `project_management.py` | 阶段 3：详情多 Tab |
| **Document** | `models.Document`, `app.py` 资料流 | 加 `document_type` |
| **Schedule** | `schedule_*.py`, `schedule_calendar.py`, `schedule_roster.py` | 归入项目 Tab |
| **Staff & Qualification** | BFF + `qualification_inquiry.py` + 培训 `integrations` | 阶段 3：项目 Tab |
| **Dataset** | — | 阶段 4：新 backend/frontend 域 |
| **AnalysisTask** | — | 阶段 5：规则引擎 + `log_json` |
| **Report** | — | 阶段 6：`templates/word/` |
| **AIWorkspace** | — | 阶段 7：建议不执行 |

---

## 6. 改哪 / 不该改哪（速查）

### 6.1 按任务类型

| 任务 | 主要改 | 避免改 |
|------|--------|--------|
| 项目详情多 Tab | `project_management.py`, 少量 `app.py` | 拆散 `schedule_crud` |
| Dataset | 新 `backend/datasets/`, `dataset_pages.py` | `instrument-training-home` |
| Analysis | 新 `backend/analysis/`, `analysis_pages.py` | 在 `app.py` 堆统计 |
| Report | 新 `backend/reports/`, `templates/word/` | AI 自由排版 |
| AI Workspace | 新 `backend/ai_workspace/`, `ai_workspace.py` | AI 写最终 P 值 |
| 资质展示 | `qualification_inquiry.py`, BFF | 复制培训全表到 Sub-I |
| 排班增强 | `schedule_*.py` | 第五容器 |
| 部署/sync | 根目录 compose + 脚本 | 覆盖 `*.db` |

### 6.2 按角色权限（Sub-I）

| 角色 | 能力 |
|------|------|
| `viewer` | 读资料、项目、排班、资质查询 |
| `editor` | 上传资料、建/改项目、排班编辑 |
| `admin` | 用户管理、删项目 |

权限细节见 `项目整合交接文档.md` §14.12。

---

## 7. 本地验证路径

```powershell
cd D:\projects
docker compose up --build -d
```

| 检查项 | URL / 操作 |
|--------|------------|
| Sub-I 前端 | http://localhost:8510 |
| Sub-I API | http://localhost:8001/health |
| 培训前端 | http://localhost:8501 |
| 培训 API | http://localhost:8000/health |
| 登录 | 工号 `3267` / 密码 `123456`（Sub-I） |

**回归清单：** 登录 → 资料列表/版本对比 → 项目管理 → 项目日历/周排班 → 资质查询 → 培训系统人员综合查询。

---

## 8. 相关文档

| 文档 | 何时读 |
|------|--------|
| [系统总览.md](./系统总览.md) | 确认**已上线**什么 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 2.0 方向与模块边界 |
| [DATA_MODEL.md](./DATA_MODEL.md) | 新表/字段设计 |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | **当前应做第几阶段** |
| [CODEX_WORKFLOW.md](./CODEX_WORKFLOW.md) | 单次任务流程与硬约束 |

---

## 9. 新对话粘贴模板

```text
请阅读 projects/CODE_MAP.md、DEVELOPMENT_ROADMAP.md、ARCHITECTURE.md，
在不动四容器与 instrument-training-home 独立边界的前提下，
推进 Clinical Research OS 2.0 阶段 N：<具体任务>。
默认渐进修改，禁止整体重写。
```