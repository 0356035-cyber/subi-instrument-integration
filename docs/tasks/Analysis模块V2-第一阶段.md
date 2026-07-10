# 任务：Analysis 模块 V2 第一阶段

> 状态：已完成
>
> 完成日期：2026-07-10

## 目标

在不重构 Analysis 模块、不新增复杂实体的前提下，为现有 `AnalysisTask` 补充执行版本、人工审核和结果追溯能力。

## 已实现

- `analysis_tasks` 使用增量字段迁移补充执行人、执行时间、分析版本、审核状态、审核信息和执行历史 JSON。
- 项目负责人可提交审核；`admin` 与 `schedule_manager` 可通过或驳回。
- 审核动作由专用 API 控制，通用任务更新接口不能修改审核状态或审核人。
- 已通过任务重跑前会归档当前结果、日志和审核快照；新版本重新进入未提交审核状态。
- 待审核任务不可重跑；驳回必须填写意见并将任务退回草稿。
- 项目内 Analysis Tab 显示执行版本、审核状态、审核意见和历史执行版本。

## 涉及接口

- `POST /projects/{project_id}/analysis/{task_id}/submit-review`
- `POST /projects/{project_id}/analysis/{task_id}/review`

## 验证状态

- 已完成 Python AST 语法检查。
- 已新增并运行内存 SQLite 单元测试用例：`1 passed`。
- 测试使用 `sqlite:///:memory:`，不读取或写入真实业务数据库。
- 未启动服务、未运行数据库迁移、未运行会写入业务库的冒烟脚本。

## 后续验证

在具备项目依赖的隔离环境中运行：

```bat
cd subi_knowledge_platform
python -m pytest backend/tests/test_analysis_review_crud.py
```

随后手动验证项目负责人提交审核、主任审核通过/驳回、审核通过后重跑和历史版本显示。

## 完成记录

- 已完成项目负责人执行与提交审核、主任通过或驳回、审核通过后重跑和历史版本显示的手动页面验证。
- 已启动 Sub-I 后端并确认健康接口返回 `200`。
- 已确认真实 `analysis_tasks` 表完成 V2 增量字段迁移。
- 未运行会写入样例数据的冒烟脚本。
