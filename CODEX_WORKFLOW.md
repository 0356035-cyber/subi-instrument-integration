# Codex / AI 开发协作约定

> 更新日期：2026-07-03  
> 适用于在 **Clinical Research OS 2.0** 蓝图下使用 Codex、Cursor、Grok 等继续开发。  
> **前提：不整体重写、不打破 Docker 四容器与培训系统独立边界。**

---

## 1. 开发前必读（按顺序）

1. [系统总览.md](./系统总览.md) — **当前已上线什么**
2. [CODE_MAP.md](./CODE_MAP.md) — **改哪、不该改哪（文件/API/表索引）**
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — **2.0 方向与边界**
4. [DATA_MODEL.md](./DATA_MODEL.md) — **目标数据模型**
5. [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — **当前应做哪一阶段**
6. [项目整合交接文档.md](./项目整合交接文档.md) — 整合细节、权限 §14.12

**新对话粘贴模板：**

```text
请阅读 projects/CODE_MAP.md、DEVELOPMENT_ROADMAP.md、ARCHITECTURE.md，
在不动四容器与 instrument-training-home 独立边界的前提下，
推进 Clinical Research OS 2.0 阶段 N：<具体任务>。
默认渐进修改，禁止整体重写。
```

---

## 2. 不可违反的硬约束

| # | 约束 |
|---|------|
| 1 | **不合并** `instrument-training-home` 进 Sub-I 单仓单应用 |
| 2 | **不增加** 第五套业务 Web 系统；新能力进 `subi_knowledge_platform` 逻辑域 |
| 3 | Sub-I 前端**只调 8001**；培训凭证仅在 `.env`，不进前端 |
| 4 | **不删除** 现有稳定能力（版本组、资质 BFF、排班等）除非交接文档明确废弃 |
| 5 | 统计**最终结论**必须经规则引擎 + 人审，AI 不得单独定稿 |
| 6 | 业务数据 `*.db`、`uploads/` **不提交 Git** |
| 7 | 极空间部署保持 `docker compose` 可一键起四容器 |

---

## 3. 代码应落在哪

| 需求类型 | 仓库 | 目录倾向 |
|----------|------|----------|
| 项目 / 资料 / 数据集 / 分析 / 报告 / AI | `subi_knowledge_platform` | 见 ARCHITECTURE §4 |
| 培训 / 考核 / 授权 / 资质 API | `instrument-training-home` | `app/` + `streamlit_app/` |
| Compose / 备份 / 部署脚本 | `subi-instrument-integration` | 根目录 `projects/` |

**禁止：** 在 `app.py` 单文件追加数百行新域逻辑；应抽 `frontend/*_pages.py` 与 `backend/*_routes.py`。

---

## 4. 单次任务推荐流程

```
1. 对照 DEVELOPMENT_ROADMAP 确认阶段
2. 只改该阶段相关文件（最小 diff）
3. 扩展 DB：migration 脚本，不手改生产库
4. 本地 docker compose up --build 验证
5. 关键路径手测（登录、项目、资料、排班、资质）
6. 三仓库分别 commit；整合仓更新文档
7. 极空间：拷变更目录 → build → up（勿覆盖 data/）
```

---

## 5. AI / 分析 / 报告 实现检查单

新增功能时自检：

| 问题 | 必须通过 |
|------|----------|
| 是否挂在 `project_id` 下？ | 项目资料 / 数据集 / 分析 / 报告 应是 |
| AI 是否只写草稿/建议？ | 是 |
| 数值结果是否有 `log_json`？ | 是 |
| 报告是否走 Word 模板？ | 阶段 4+ 是 |
| 定稿是否回 Document 归档？ | 是 |
| 是否影响培训库数据？ | 不应直接写培训库 |

---

## 6. 测试期望

| 层级 | 要求 |
|------|------|
| 单元测试 | 新统计规则、新 CRUD 应有 |
| API | 现有 pytest 风格延续 |
| UI | Streamlit 关键路径手测记录于 PR/交接 |
| 回归 | 资质查询、版本对比、登录白名单不回归 |

---

## 7. 文档更新义务

| 变更类型 | 更新 |
|----------|------|
| 新模块上线 | `系统总览.md` + `DEVELOPMENT_ROADMAP` 状态列 |
| 新表/字段 | `DATA_MODEL.md` |
| 架构决策 | `ARCHITECTURE.md` 或 `项目整合交接文档.md` §14 |
| 仅小 bugfix | 可不扩架构文档 |

---

## 8. 极空间同步提醒

- NAS 常**无 git** → 拷贝变更文件夹 + `docker compose build`
- **勿覆盖** `instrument-training-home/data/`、`subi_knowledge_platform/data/`、`uploads/`
- 前端若 UI 旧：重建 frontend 容器且 `--no-cache`（见回家部署经验）

---

## 9. 明确不做（Codex 勿主动提议）

- 完整 LIMS
- 拖拽甘特图 / MS Project 级 PM
- 每人一套独立子库
- 培训与 Sub-I 合并为一个 Streamlit
- AI 全自动签发报告无审核
- 未经讨论接医院 HR / 外部 LIMS API