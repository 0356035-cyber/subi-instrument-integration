# 数据导入（Dataset）

> **用途：** 阶段 4 Dataset 模块设计与落点。  
> **何时读：** 开发 Excel 上传、字段映射时。  
> **状态：** **未开始** — 当前优先开发任务。  
> **关联：** 规范见 [数据分析规范.md](../数据分析规范.md)；任务见 [tasks/阶段4-Dataset.md](../tasks/阶段4-Dataset.md)。

---

## 目标

项目可上传 Excel；系统读 sheet、识别列名、保存映射，供 Analysis 引用。

---

## 第一版功能

- [ ] 上传 Excel
- [ ] 选择 sheet
- [ ] 预览前 20 行
- [ ] 识别样品编号 / 访视 / 指标列（含人工确认）
- [ ] 保存 `Dataset` 记录
- [ ] 项目详情「数据集」Tab 从占位变为可用

---

## 规划落点

```
backend/datasets/
├── routes.py
├── crud.py
└── migrations.py

frontend/dataset_pages.py
```

API 前缀：`/projects/{id}/datasets`

---

## 不做（本阶段）

- 复杂数据清洗
- 仪器原始文件自动对接