# 任务：阶段 5 — Analysis 统计分析

> **状态：** ✅ 已完成  
> **完成日期：** 2026-07-06

---

## 背景

在已确认 Dataset 上执行 2～3 种标准统计，输出 `result_json` 与 `log_json` 留痕，为阶段 6 报告生成提供输入。

---

## 涉及文件

| 文件 | 说明 |
|------|------|
| `backend/models.py` | `AnalysisTask` ORM |
| `backend/analysis/migrations.py` | `analysis_tasks` 表 |
| `backend/analysis/crud.py` | CRUD + 执行 |
| `backend/analysis/routes.py` | REST API |
| `backend/analysis/engine/runner.py` | 规则引擎入口 |
| `backend/analysis/engine/data_loader.py` | 从 Dataset 加载 DataFrame |
| `backend/analysis/engine/stats_utils.py` | 配对检验、正态性 |
| `backend/schemas.py` | Analysis Pydantic |
| `backend/main.py` | 路由注册 + migration |
| `frontend/analysis_pages.py` | 分析 Tab UI |
| `frontend/project_management.py` | Tab 接入 |
| `backend/scripts/analysis_smoke_test.py` | API 冒烟测试 |

---

## 已完成

- [x] `analysis_tasks` 表与 migration
- [x] 三种分析类型：配对比较、改变率、有效率/同意率
- [x] 仅「已确认」数据集可分析
- [x] 执行后写入 `result_json`、`log_json`（含 `packages` 版本留痕）
- [x] 项目详情「分析」Tab 可用
- [x] API 冒烟测试通过

---

## 分析类型

| `analysis_type` | 说明 |
|-----------------|------|
| `paired_comparison` | 使用前后配对比较（Shapiro 正态性 → t 检验 / Wilcoxon） |
| `change_rate` | 改变率描述统计 |
| `proportion` | 二项有效率 + 95% CI |

---

## API 端点

| 方法 | 路径 |
|------|------|
| GET | `/projects/{id}/analysis/meta` |
| GET | `/projects/{id}/analysis` |
| POST | `/projects/{id}/analysis` |
| GET/PUT/DELETE | `/projects/{id}/analysis/{task_id}` |
| POST | `/projects/{id}/analysis/{task_id}/execute` |
| GET | `/projects/{id}/datasets/{ds_id}/analysis-options` |

---

## 验收

在项目 A 的 `[Dataset冒烟]` 已确认数据集上创建 `paired_comparison` 任务并执行，`status=已执行`，`log_json.packages` 有值。

复测：

```bat
cd subi_knowledge_platform
set PYTHONPATH=.
set PERM_TEST_PASSWORD=你的当前密码
.venv\Scripts\python.exe backend\scripts\analysis_smoke_test.py
```

冒烟脚本**不会**自动重置密码。需先确保存在已确认数据集（可运行 `dataset_smoke_test.py`）。