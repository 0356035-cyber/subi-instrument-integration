# Clinical Research OS 2.0 — 核心数据模型

> 更新日期：2026-07-03  
> **状态：目标模型（规划）** — 与现有 SQLite 表**渐进对齐**，非一次性迁移。  
> 已有对象（Project、Document、Schedule 等）在实现时**扩展字段**，避免推翻重建。

---

## 1. 模型总览

```
Project（根）
├── Document[]          项目资料（含通用库 project_id 可空）
├── Dataset[]
├── AnalysisTask[]
├── Report[]
├── Schedule / Calendar / Roster   （现有排班域）
├── AIWorkspace（1:1 或项目级聚合视图）
└── StaffQualification（视图/API，数据在 instrument-training-home）
```

---

## 2. Project — 项目

**最高层业务对象。** 一期 `Project` 表已存在，本表为 2.0 目标字段全集。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int PK | |
| `project_code` | string | 项目编号 |
| `project_name` | string | 项目名称 |
| `sponsor` | string | 申办方 |
| `study_type` | string | 研究类型 |
| `claim_type` | string | 功效宣称类型 |
| `body_area` | string | 部位 |
| `ethics_type` | string | 伦理类型 |
| `status` | string | 进行中 / 已完成 / 暂停等 |
| `start_date` | date | |
| `end_date` | date | 可空 |
| `principal_investigator` | string | PI |
| `sub_i` | string | Sub-I 负责人工号或姓名 |
| `tags` | json / 关联表 | 多标签 |
| `created_by` | FK User | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

**权限：** 见 `项目整合交接文档.md` §14.12（项目成员只读、负责人可编、总库合并）。

---

## 3. Document — 资料

**复用现有 `Document` 模型**，扩展 `document_type`，强化 `project_id`。

| 字段 | 说明 |
|------|------|
| `project_id` | 可空；空 = 通用资料库 |
| `document_group_id` | 版本组（已有） |
| `title` | |
| `category` | 法规 / 模版 / 内部要求 / 项目分类等 |
| `audience_scope` | 内部要求可见范围（已有规划） |
| `version` | |
| `effective_date` | |
| `status` | 草稿 / 定稿等 |
| `tags` | |
| `content_text` | 全文检索 |
| `file_path` | 附件 |
| **`document_type`** | **2.0 新增，见下表** |

### 3.1 `document_type` 建议枚举

| 值 | 含义 |
|----|------|
| `Protocol` | 研究方案 |
| `SAP` | 统计分析计划 |
| `CRF` | 病例报告表 |
| `ICF` | 知情同意 |
| `Ethics Approval` | 伦理批件 |
| `Raw Data` | 原始数据文件归档 |
| `Statistical Report` | 统计报告 |
| `CSR` | 临床研究报告 |
| `Template` | 模版 |
| `Internal Requirement` | 部门内部要求 |
| `Other` | 其他 |

**用途：** AI 与报告模块识别「哪份是方案 / SAP / 报告」，非替代 `category` 权限逻辑。

---

## 4. Dataset — 数据集

**2.0 新增。** 第一版：上传 Excel、读 sheet、识别列、存元数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int PK | |
| `project_id` | FK Project | |
| `name` | string | 数据集名称 |
| `dataset_type` | enum | 见下表 |
| `file_path` | string | 存储路径 |
| `sheet_name` | string | Excel sheet |
| `original_filename` | string | |
| `upload_time` | datetime | |
| `uploaded_by` | FK User | |
| `row_count` | int | |
| `column_count` | int | |
| `detected_columns_json` | json | 列名列表 |
| `visit_mapping_json` | json | 访视列映射 |
| `variable_mapping_json` | json | 指标列映射 |
| `status` | string | 草稿 / 已确认 |
| `notes` | text | |

### 4.1 `dataset_type`

- `Raw Data`
- `Cleaned Data`
- `Instrument Data`
- `Questionnaire Data`
- `Safety Data`
- `Analysis Dataset`

---

## 5. AnalysisTask — 统计分析任务

**2.0 新增。** 由用户确认计划后，规则引擎执行，非 AI 直接算 P 值。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int PK | |
| `project_id` | FK Project | |
| `dataset_id` | FK Dataset | |
| `name` | string | 任务名称 |
| `analysis_type` | string | 分析类型 |
| `population` | string | 分析人群 |
| `endpoint` | string | 终点 |
| `baseline_visit` | string | 基线访视 |
| `comparison_visit` | string | 对比访视 |
| `method` | string | 方法名 |
| `normality_test` | bool / string | |
| `alpha` | float | 显著性水平 |
| `status` | enum | 草稿 / 待审 / 已执行 / 已驳回 |
| `result_json` | json | 结构化结果 |
| `result_table_path` | string | 导出表路径 |
| `log_json` | json | 完整执行日志 |
| `created_by` | FK User | |
| `reviewed_by` | FK User | 可空 |
| `created_at` | datetime | |
| `updated_at` | datetime | |

**第一版分析类型候选：** 使用前后配对、改变率、有效率/同意率、安全性汇总（与 §14 及 SPSS 套路对齐后再定）。

---

## 6. Report — 报告

**2.0 新增。** 模板驱动，非 AI 自由排版。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int PK | |
| `project_id` | FK Project | |
| `report_type` | enum | 见下表 |
| `template_id` | FK 模版 | |
| `title` | string | |
| `version` | string | |
| `status` | enum | 草稿 / 待审 / 定稿 |
| `generated_file_path` | string | docx 等 |
| `source_analysis_ids` | json | 关联 AnalysisTask |
| `generation_log_json` | json | |
| `created_by` | FK User | |
| `reviewed_by` | FK User | |
| `created_at` | datetime | |

### 6.1 `report_type`

- `Statistical Report`
- `Clinical Study Report`
- `Summary Report`
- `Ethics Submission Document`

**阶段 4 最小能力：** Word 占位符填充 + 表插入 + 导出 + 归档为 Document。

---

## 7. AIWorkspace — 项目 AI 工作区

**2.0 新增。** 可为项目级聚合表 + 缓存，或主要由 Document/Dataset/Analysis 状态计算得出。

| 字段 / 概念 | 说明 |
|-------------|------|
| `project_id` | FK Project |
| `indexed_documents` | 已纳入索引的文档 ID 列表 |
| `extracted_protocol_info` | json |
| `extracted_sap_info` | json |
| `detected_endpoints` | json |
| `detected_visits` | json |
| `suggested_analysis_plan` | json / text |
| `chat_history` | json（可选） |
| `ai_action_logs` | 关联审计表 |
| `review_status` | 待确认 / 已确认 |

---

## 8. Schedule — 排班（现有，归入 Project）

现有实体（已实现，名称以代码为准）：

- 访视模板 / 项目访视节点
- 日历事件
- 周排班 / 个人可用性 / 项目人员岗位

**关系：** 均挂 `project_id`；详见 `schedule_migrations.py` 与 `项目整合交接文档.md` §14.11。

---

## 9. Staff & Qualification — 人员与资质（联邦）

**数据主存：`instrument-training-home`**

Sub-I 侧仅：

- 项目成员 / 负责人关系（`ProjectMember` 等）
- 资质查询 BFF 与项目详情 Tab 展示
- 排班选人时调用资质 API

不在 Sub-I 复制培训/考核/授权全量台账。

---

## 10. 与现有表的关系（迁移策略）

| 策略 | 说明 |
|------|------|
| **扩展优于重建** | Project、Document 加列；新模块新表 |
| **通用资料** | `project_id IS NULL` 行为不变 |
| **版本组** | `document_group_id` 不变 |
| **分阶段迁移** | 每阶段 Alembic / 项目内 migration 脚本 |
| **不做大 bang** | 旧页面保留至新 Tab 稳定 |

---

## 11. 索引与检索（延续 + 扩展）

| 能力 | 1.0 | 2.0 |
|------|-----|-----|
| 资料全文 | `content_text` | 保留 |
| 项目标签组合筛选 | ✅ | 保留 |
| 数据集列元数据 | — | `detected_columns_json` |
| 分析/报告日志 | — | `log_json` / `generation_log_json` |
| 语义检索 | 规划 §14 | 可选阶段 6+ |