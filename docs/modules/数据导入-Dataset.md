# 数据导入（Dataset）

> **用途：** 阶段 4 Dataset 模块设计与落点。  
> **何时读：** 开发 Excel 上传、字段映射时。  
> **状态：** ✅ 已上线（2026-07-06）  
> **关联：** 规范见 [数据分析规范.md](../数据分析规范.md)；任务见 [tasks/阶段4-Dataset.md](../tasks/阶段4-Dataset.md)。

---

## 目标

项目可上传 Excel；系统读 sheet、识别列名、保存映射，供 Analysis 引用。

---

## 第一版功能

- [x] 上传 Excel（.xlsx）
- [x] 选择 sheet
- [x] 预览前 20 行
- [x] 识别样品编号 / 访视 / 指标列（含人工确认）
- [x] 保存 `Dataset` 记录
- [x] 项目详情「数据集」Tab 可用
- [x] TEWL/Corneo 受控仪器模板：保留原始文件，并从 `CM825 Single`、`TMHex` 原始 Sheet 自动生成角质层水分与 TEWL 分析数据集

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

## TEWL/Corneo 受控自动整理

当用户上传包含 `CM825 Single` 或 `TMHex` 的 `.xlsx` 文件时，系统自动识别为 `tewl_corneo_v1` 模板并将来源标记为“仪器数据”；不要求上传时手动选择类型，也不要求两个 Sheet 同时存在：

- `Subject` 按“项目编码 - 访视事件 - 受试者编号”拆分；前三段构成项目编码，随后两段分别作为访视与受试者编号。
- 解析出的项目编码必须与当前 Project 的 `project_code` 一致；解析失败、项目不一致、缺失值和重复值均记录为异常。
- 存在 `CM825 Single` 时，仅读取 `Hydration`，按受试者、访视、`Tags` 分组；每组恰有 3 条有效数据时计算 `hydration_mean`。
- 读取会包含 Excel 中的隐藏行；隐藏仅影响显示，不会使原始测量被遗漏。
- 存在 `TMHex` 时，仅读取 `TEWL Robust [g/m²/h]`；每个受试者、访视、`Tags` 组合必须恰有 1 条有效数据，输出 `tewl_robust`。
- 原始仪器文件仍保存为 `Instrument Data`；每个已识别参数各自生成一个 `Analysis Dataset`，自动完成 `subject_id`、`visit_code` 与指标列映射。
- 无异常时派生数据集自动确认；有异常时保留草稿，不进入 Analysis，直到人工核对。
- 派生数据集通过 `source_dataset_id` 关联原始数据集，并在 `processing_log_json` 保留模板、行数、规则与异常记录。

当前仅支持该受控模板。问卷宽表、XML 和其他仪器格式仍须单独设计规则，不能按本模板猜测处理。

---

## 不做（本阶段）

- 复杂数据清洗
- 非受控仪器原始文件自动对接
