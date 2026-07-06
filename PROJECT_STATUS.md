# 项目状态

> **用途：** 记录当前有效状态，供每次开发前快速对齐。  
> **何时读：** 与 `README_FOR_CODEX.md` 一并阅读。  
> **更新义务：** 完成阶段性任务或发现新问题时同步更新。  
> **关联：** 路线图细节见 [docs/tasks/](./docs/tasks/)；架构见 [docs/系统总览.md](./docs/系统总览.md)。

**更新日期：** 2026-07-06

---

## 路线图阶段（Clinical Research OS 2.0）

| 阶段 | 名称 | 状态 |
|------|------|------|
| 1 | 代码地图 | ✅ 已完成 |
| 2 | 架构 2.0 文档 | ✅ 已完成 |
| 3 | Project 多 Tab | ✅ 已完成 |
| 3+ | §14.12 分层权限 MVP | ✅ 已完成 |
| 4 | Dataset 数据集 | ⏳ **下一开发重点** |
| 5 | Analysis 统计分析 | 未开始 |
| 6 | Report 报告生成 | 未开始 |
| 7 | AI Workspace | 未开始 |
| 8 | 半自动 AI（远期） | 未开始 |

---

## 已完成（当前有效）

### 整合与部署
- Docker 四容器统一部署（`docker-compose.yml`）
- 备份 / 恢复 / 离线部署包 / 极空间 + Cloudflare Tunnel 支持

### Sub-I 资料库
- 资料版本组 `document_group_id`、对比、独立详情页
- 项目管理一期 + 8 Tab 详情页（4 个实装 + 4 个占位）
- `document_type` 字段与项目资料 Tab 筛选
- 排班日历阶段 0～2：访视节点、周排班、冲突预警、资质联动
- 资质查询 BFF + 按工号/仪器/批量核验
- **§14.12 权限 MVP：** `permissions.py`、`ProjectMember`、`AuditLog`、`ProjectLeadNotification`、`audience_scope`
- 培训人员同步：`POST /users/sync-from-training`（默认仅新增）
- 侧边栏改密 + 改密后自动登出

### 仪器培训系统
- 培训/考核/授权 ID 按日期重排、多次授权、仪器合并、整合 API

### 团队账号（`role_seed`）

| 工号 | 姓名 | `role` | `job_title` |
|------|------|--------|-------------|
| 3223 | 江文才 | `admin` | 临床研究部主任 |
| 326 | 谈益妹 | `schedule_manager` | 科室主任 |
| 3267 | 王建玟 | `system_maintainer` | 系统构建与维护 |

---

## 正在开发 / 待验证

| 项 | 说明 |
|----|------|
| **运营验证（P0）** | 创建真实项目、配置成员与负责人、验证各角色可见/可改边界 |
| 主任修改提醒 | 后端与横幅已上线，需在真实项目中验收弹窗/已读流程 |
| 文档与代码对齐 | 本次文档重构后持续维护 |

---

## 当前主要问题

1. **业务数据偏空：** 此前检查可能为 0 个项目，权限规则需在真实数据上验证。
2. **部分 UI 待运营反馈：** 待处理变更横幅、项目成员 Tab 等需实际使用场景检验。
3. **阶段 4 未启动：** Dataset 模块尚无 backend/frontend 实现文件。

---

## 下一步优先级

| 优先级 | 任务 | 参考文档 |
|--------|------|----------|
| **P0** | 运营验证：建项目、设负责人/成员、测权限与通知 | [docs/modules/权限与用户管理.md](./docs/modules/权限与用户管理.md) |
| **P1** | 阶段 4 Dataset：Excel 上传、sheet 选择、列映射 | [docs/tasks/阶段4-Dataset.md](./docs/tasks/阶段4-Dataset.md) |
| P2 | 排班日历细节修复（基线日、日历同步等，按使用反馈） | [docs/modules/排班与项目日历.md](./docs/modules/排班与项目日历.md) |

---

## 明确不做

- 完整 LIMS、每人独立子库、培训系统并入 Sub-I
- 复制上周排班（已明确不实现）
- AI 全自动签发报告无人工审核

---

## 任务记录索引

| 任务 | 文档 |
|------|------|
| 阶段 3 多 Tab | [docs/tasks/阶段3-项目多Tab.md](./docs/tasks/阶段3-项目多Tab.md) |
| 权限分层 MVP | [docs/tasks/权限分层-MVP.md](./docs/tasks/权限分层-MVP.md) |
| 阶段 4 Dataset（进行中） | [docs/tasks/阶段4-Dataset.md](./docs/tasks/阶段4-Dataset.md) |