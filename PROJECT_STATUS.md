# 项目状态

> **用途：** 记录当前有效状态，供每次开发前快速对齐。  
> **何时读：** 与 `README_FOR_CODEX.md` 一并阅读。  
> **更新义务：** 完成阶段性任务或发现新问题时同步更新。  
> **关联：** 路线图细节见 [docs/tasks/](./docs/tasks/)；架构见 [docs/系统总览.md](./docs/系统总览.md)。

**更新日期：** 2026-07-07（暂停新功能开发，优先框架整理与文档一致性）

---

## 当前工作模式

### 当前已批准开发任务

- Analysis V2 第一阶段：已完成执行版本、人工审核和审核留痕的代码实现，并通过隔离单元测试与手动页面验证。
- Analysis V2 第二阶段：已完成现有三类分析的 Engine 注册、统一输入校验、结果与日志契约，并通过隔离单元测试。
- Analysis V2 第三阶段：已完成单组自身前后对照的资料类型选择、等级资料描述统计与多指标批量配对分析，并通过隔离单元测试；等待重建服务后的手动页面验证。

当前暂停新功能开发，优先进行：

- 框架整理
- 文档一致性同步
- 安全边界加固
- Codex 接管流程完善

Report 仍是下一功能阶段，但本轮不开发 Report、不启动 AI Workspace、不新增业务能力。

---

## 路线图阶段（Clinical Research OS 2.0）

| 阶段 | 名称 | 状态 |
|------|------|------|
| 1 | 代码地图 | ✅ 已完成 |
| 2 | 架构 2.0 文档 | ✅ 已完成 |
| 3 | Project 多 Tab | ✅ 已完成 |
| 3+ | §14.12 分层权限 MVP | ✅ 已完成 |
| 4 | Dataset 数据集 | ✅ 已完成 |
| 5 | Analysis 统计分析 | ✅ 已完成 |
| 6 | Report 报告生成 | ⏸ 下一功能阶段，当前暂停开发 |
| 7 | AI Workspace | 未开始 |
| 8 | 半自动 AI（远期） | 未开始 |

---

## 已完成（当前有效）

### 整合与部署
- Docker 四容器统一部署（`docker-compose.yml`）
- 备份 / 恢复 / 离线部署包 / 极空间 + Cloudflare Tunnel 支持

### Sub-I 资料库
- 资料版本组 `document_group_id`、对比、独立详情页
- 项目管理一期 + 8 Tab 详情页（5 个实装 + 3 个占位）；全盘权限用户可查看临床研究项目汇总与人工维护的报告进展（不启动 Report 模块）
- Project 数据质量：项目负责人存在/启用校验、基线日格式校验，以及项目状态与报告进展的人工确认提示
- 资质 BFF：培训仪器列表响应增加契约校验，避免异常上游响应被静默视为空列表
- 培训系统登录白名单：支持可选工号白名单，显式维护时优先按 `employee_id` 同步，未配置时兼容现有姓名白名单
- 数据安全治理：迁移发布门禁、隔离恢复演练前置条件已固化；数据安全校验覆盖两个子仓、两份数据库与最新备份
- `document_type` 字段与项目资料 Tab 筛选
- 排班日历阶段 0～2：访视节点、周排班、冲突预警、资质联动
- 资质查询 BFF + 按工号/仪器/批量核验
- **§14.12 权限 MVP：** `permissions.py`、`ProjectMember`、`AuditLog`、`ProjectLeadNotification`、`audience_scope`
- **阶段 4 Dataset：** Excel 上传、sheet 预览、列映射、草稿/已确认
- **阶段 5 Analysis：** 配对比较 / 改变率 / 有效率，执行留痕 `log_json`
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
| 框架整理与文档一致性 | 当前优先 |
| **阶段 6 Report（P1）** | 下一功能阶段，当前暂停开发 |
| 界面人工抽检 | 可在项目详情「分析」Tab 创建并执行分析任务 |
| 文档与代码对齐 | 持续维护 |

---

## 当前主要问题

1. **阶段 6 未启动：** Report 报告生成尚无实现。
2. **样例数据在库中：** 权限验证项目/资料 + `[Dataset冒烟]` / `[Analysis冒烟]` 测试数据，可按需清理。

---

## 下一步优先级

| 优先级 | 任务 | 参考文档 |
|--------|------|----------|
| ~~P0~~ | ~~权限运营验证~~ | ✅ [docs/tasks/权限运营验证.md](./docs/tasks/权限运营验证.md) |
| ~~P1~~ | ~~阶段 4 Dataset~~ | ✅ [docs/tasks/阶段4-Dataset.md](./docs/tasks/阶段4-Dataset.md) |
| ~~P1~~ | ~~阶段 5 Analysis~~ | ✅ [docs/tasks/阶段5-Analysis.md](./docs/tasks/阶段5-Analysis.md) |
| **当前** | 框架整理、文档一致性、安全边界加固 | [docs/tasks/README.md](./docs/tasks/README.md) |
| P1 | 阶段 6 Report：模板 + docx 生成（下一功能阶段，当前暂停开发） | [docs/modules/报告生成.md](./docs/modules/报告生成.md) |
| P2 | 排班日历细节修复（按使用反馈） | [docs/modules/排班与项目日历.md](./docs/modules/排班与项目日历.md) |

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
| 权限运营验证（P0） | [docs/tasks/权限运营验证.md](./docs/tasks/权限运营验证.md) |
| 阶段 4 Dataset | [docs/tasks/阶段4-Dataset.md](./docs/tasks/阶段4-Dataset.md) |
| 阶段 5 Analysis | [docs/tasks/阶段5-Analysis.md](./docs/tasks/阶段5-Analysis.md) |
| 框架整理与加固：第一轮 | [docs/tasks/框架整理与加固-第一轮.md](./docs/tasks/框架整理与加固-第一轮.md) |
| 框架整理与加固：第二轮 | [docs/tasks/框架整理与加固-第二轮.md](./docs/tasks/框架整理与加固-第二轮.md) |
