# 任务：阶段 4 — Dataset 数据集

> **状态：** ✅ 已完成  
> **完成日期：** 2026-07-06

---

## 背景

项目需上传脱敏 Excel，识别列与访视映射，为阶段 5 统计分析提供输入。

---

## 涉及文件

| 文件 | 说明 |
|------|------|
| `backend/models.py` | `Dataset` ORM |
| `backend/datasets/migrations.py` | `datasets` 表 |
| `backend/datasets/crud.py` | Excel 解析、列识别 |
| `backend/datasets/routes.py` | REST API |
| `backend/schemas.py` | Dataset Pydantic |
| `backend/main.py` | 路由注册 + migration |
| `frontend/dataset_pages.py` | 数据集 Tab UI |
| `frontend/project_management.py` | Tab 接入 |
| `backend/scripts/dataset_smoke_test.py` | API 冒烟测试 |

---

## 已完成

- [x] `datasets` 表与 migration
- [x] `POST /projects/{id}/datasets` 上传 .xlsx
- [x] sheet 选择 + `GET .../preview` 前 20 行预览
- [x] 列自动识别 + 人工确认映射（样品编号 / 访视 / 指标）
- [x] 保存 `detected_columns_json`、`visit_mapping_json`、`variable_mapping_json`
- [x] 状态：草稿 → 已确认
- [x] 项目详情「数据集」Tab 可用
- [x] API 冒烟测试通过

---

## API 端点

| 方法 | 路径 |
|------|------|
| GET | `/projects/{id}/datasets/meta` |
| GET | `/projects/{id}/datasets` |
| POST | `/projects/{id}/datasets` |
| GET | `/projects/{id}/datasets/{ds_id}` |
| GET | `/projects/{id}/datasets/{ds_id}/preview?sheet_name=` |
| PUT | `/projects/{id}/datasets/{ds_id}` |
| DELETE | `/projects/{id}/datasets/{ds_id}` |

---

## 验收

已在项目 A（`[权限运营验证] 项目A-3267负责`）上传测试 xlsx，映射确认成功，`status=已确认`。

复测：

```bat
cd subi_knowledge_platform
set PYTHONPATH=.
.venv\Scripts\python.exe backend\scripts\dataset_smoke_test.py
```