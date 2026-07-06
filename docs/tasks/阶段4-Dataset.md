# 任务：阶段 4 — Dataset 数据集

> **状态：** ⏳ 待开发（当前 P1 优先级）  
> **前置：** P0 运营验证建议先完成

---

## 背景

项目需上传脱敏 Excel，识别列与访视映射，为阶段 5 统计分析提供输入。

---

## 涉及文件（规划）

```
backend/datasets/routes.py
backend/datasets/crud.py
backend/datasets/migrations.py
frontend/dataset_pages.py
frontend/project_management.py    # 数据集 Tab 接入
backend/models.py                 # Dataset ORM
backend/main.py                   # include_router
```

---

## 修改目标

- [ ] `datasets` 表与 migration
- [ ] `POST /projects/{id}/datasets` 上传 Excel
- [ ] sheet 选择 + 前 20 行预览
- [ ] 列识别 + 人工确认映射
- [ ] 保存 `detected_columns_json`、`visit_mapping_json`、`variable_mapping_json`
- [ ] 状态：草稿 → 已确认
- [ ] 项目详情「数据集」Tab 可用

---

## 不做

- 复杂数据清洗
- 仪器原始文件自动对接

---

## 验收

一个真实项目上传脱敏 Excel，映射保存成功，可被后续 Analysis 引用。

---

## 注意事项

- 遵循 [数据分析规范.md](../数据分析规范.md)
- 数据权限挂 `project_id`，遵循 [modules/权限与用户管理.md](../modules/权限与用户管理.md)
- 新域勿堆进 `app.py`