# Analysis 模块演进设计评估

> 本文基于当前项目状态、未来临床研究 AI 平台蓝图与开发治理规范，对当前 Analysis 模块进行专项评估。  
> 本文只做架构和产品方向评估，不修改代码、不新增功能、不提出推翻式重构方案。

---

## 1. 当前 Analysis 模块结构

### 1.1 模块定位

当前 Analysis 模块是 Sub-I 平台中“规则/统计层”的第一版实现，已挂载在 Project 详情页的「分析」Tab 下。它的核心定位是：

- 从已确认 Dataset 读取结构化 Excel 数据。
- 由用户创建分析任务。
- 使用明确规则或统计方法执行分析。
- 保存 `result_json` 和 `log_json`。
- 为未来 Report 和 AI 解释提供可追溯的数据来源。

当前模块符合 Project 中心原则：API、数据模型、页面入口都围绕 `project_id` 展开。

### 1.2 数据模型

当前核心表是 `analysis_tasks`，ORM 模型为 `AnalysisTask`。

主要字段：

| 字段 | 当前作用 |
|------|----------|
| `project_id` | 关联 Project |
| `dataset_id` | 关联 Dataset |
| `name` | 分析任务名称 |
| `analysis_type` | 分析类型 |
| `population` | 分析人群 |
| `endpoint` | 终点 |
| `baseline_visit` | 基线访视 |
| `comparison_visit` | 对比访视 |
| `variable_column` | 分析指标列 |
| `method` | 实际方法 |
| `normality_test` | 正态性检验记录 |
| `alpha` | 显著性水平 |
| `parameters_json` | 扩展参数 |
| `status` | 草稿 / 已执行 / 已驳回 |
| `result_json` | 分析结果 |
| `log_json` | 执行留痕 |
| `created_by` | 创建人 |
| `reviewed_by` | 审核人字段，当前较轻 |

当前模型优点是简单、直接、可追溯；不足是 Analysis Design、Result、Artifact、Review 仍聚合在单表中，适合第一版，但不足以承载复杂临床分析工作流。

### 1.3 API

当前 API 均为项目级路径：

| 方法 | 路径 | 作用 |
|------|------|------|
| GET | `/projects/{project_id}/analysis/meta` | 获取分析类型、状态、已确认数据集 |
| GET | `/projects/{project_id}/datasets/{dataset_id}/analysis-options` | 获取数据集映射、访视值、指标列 |
| GET | `/projects/{project_id}/analysis` | 列出分析任务 |
| GET | `/projects/{project_id}/analysis/{task_id}` | 获取单个分析任务 |
| POST | `/projects/{project_id}/analysis` | 创建分析任务 |
| PUT | `/projects/{project_id}/analysis/{task_id}` | 更新分析任务 |
| POST | `/projects/{project_id}/analysis/{task_id}/execute` | 执行分析 |
| DELETE | `/projects/{project_id}/analysis/{task_id}` | 删除分析任务 |

API 已包含项目查看和编辑权限检查，并要求 Dataset 必须属于同一 Project 且状态为“已确认”。

### 1.4 页面

前端页面为 `frontend/analysis_pages.py`，嵌入项目详情「分析」Tab。

当前页面能力：

- 获取已确认 Dataset。
- 获取指标列和访视值。
- 创建分析任务。
- 配置分析类型、指标列、访视、`alpha`、分析人群、终点。
- 对 `proportion` 类型配置阈值和判定规则。
- 执行草稿任务。
- 展示任务列表、结果表、`result_json`、`log_json`。
- 删除草稿任务。

### 1.5 分析流程

当前流程：

```text
Project
  ↓
已确认 Dataset
  ↓
选择指标列 / 访视 / 分析类型 / 参数
  ↓
创建 AnalysisTask（草稿）
  ↓
执行规则引擎
  ↓
保存 result_json + log_json
  ↓
展示结果
```

当前已体现“Dataset 确认后才能分析”和“规则引擎输出留痕”的核心原则。

### 1.6 当前支持能力

当前支持 3 类分析：

| 类型 | 能力 |
|------|------|
| `paired_comparison` | 使用前后配对比较，Shapiro 正态性判断后选择配对 t 检验或 Wilcoxon |
| `change_rate` | 改变率描述统计 |
| `proportion` | 有效率 / 同意率，二项检验与 95% CI |

当前依赖：

- `pandas`：读取 Excel 和处理数据。
- `numpy`：数值计算。
- `scipy`：统计检验。

---

## 2. 当前不足分析

### 2.1 是否符合临床研究分析流程

当前基本符合第一版临床研究统计流程：

```text
确认数据集 → 配置分析任务 → 规则执行 → 结果留痕 → 人工查看
```

不足：

- 尚未完整表达“分析方案 / 分析设计 / 分析任务 / 结果 / 审核”的分层。
- 尚未关联 Protocol / SAP 中预定义的终点和统计方法。
- 缺少纳入/剔除规则、分析集定义、缺失值处理策略的结构化表达。
- 人工审核流程较轻，尚不能支撑正式报告定稿前的统计审核。

结论：当前适合作为试点和标准分析 MVP，不足以直接承担完整临床研究统计管理。

### 2.2 是否支持多项目

支持较好。

证据：

- `analysis_tasks.project_id` 强制非空。
- API 采用 `/projects/{project_id}/analysis`。
- 创建、查看、执行、删除均检查 Project 权限。
- Dataset 必须属于同一个 Project。

当前风险：

- 与 ProjectVisitNode 的关系尚未结构化，跨项目访视命名不一致时，需要人工选择和解释。

### 2.3 是否支持多指标

部分支持。

当前 Dataset 可识别多个指标列，创建任务时每个 AnalysisTask 选择一个 `variable_column`。这意味着：

- 支持“多个指标分别创建多个任务”。
- 不支持“一个 Analysis Design 下批量分析多个指标”。
- 不支持多终点、多指标族、多重比较校正等正式统计设计。

未来若要支持 VISIA、OCT、问卷或功效评价，建议保留当前单任务模式，同时逐步引入 Analysis Design 作为批量或方案层。

### 2.4 是否支持多时间点

部分支持。

当前支持：

- Dataset 映射中有 `visit_column`。
- API 可列出数据集中的访视值。
- AnalysisTask 有 `baseline_visit` 和 `comparison_visit`。
- 当前分析主要围绕两时间点或单访视过滤。

不足：

- 访视值是 Excel 中的文本，不直接关联 `project_visit_nodes`。
- 不支持多个随访时间点的重复测量分析。
- 不支持时间点窗口、访视偏移、同一访视多次检测等复杂情况。

### 2.5 是否支持不同统计方法

已支持最小集合。

当前支持：

- 配对 t 检验。
- Wilcoxon 符号秩检验。
- Shapiro 正态性检验。
- 改变率描述统计。
- 二项比例和置信区间。

不足：

- 分析类型注册仍是 `ANALYSIS_TYPES` 字典 + `if` 分支。
- 缺少统一的分析类型接口。
- 缺少参数 schema、输入校验 schema、结果 schema。
- 不支持组间比较、方差分析、混合模型、重复测量、相关性、回归、生存分析等。
- 不支持问卷计分规则、设备算法版本、图像分析产物。

### 2.6 是否支持结果追溯

支持基础追溯。

当前 `log_json` 已记录：

- 执行时间。
- Dataset ID、名称、状态。
- Analysis 类型。
- Python / numpy / pandas / scipy 版本。
- 映射信息。
- 参数。
- 配对样本纳入情况。
- 方法选择。

不足：

- 未记录 Dataset 文件版本或文件哈希。
- 未记录执行人。
- 未记录算法版本。
- 未记录设备版本。
- 未记录审核意见和审核时间。
- Result 和 Log 与报告引用关系尚未实现。

### 2.7 是否支持人工审核

当前只具备轻量基础。

当前已有：

- `reviewed_by` 字段。
- `status` 包含“草稿 / 已执行 / 已驳回”。
- 已执行任务需先“驳回”才能修改参数。

不足：

- 没有“待审核 / 已审核 / 已定稿 / 已引用报告”等状态。
- 没有审核意见。
- 没有审核时间。
- 没有审核动作记录。
- 前端页面主要是执行和查看结果，没有完整审核入口。

结论：当前人工审核能力不足以支撑报告定稿或 AI 解释进入正式结论前的审查。

---

## 3. 未来 Analysis 模块目标架构

未来 Analysis 不应推翻当前实现，而应从当前 `AnalysisTask` MVP 渐进演进为以下分层：

```text
Analysis Design
  ↓
Analysis Task
  ↓
Analysis Engine
  ↓
Analysis Result
  ↓
Analysis Artifact
  ↓
Analysis Review
```

### 3.1 Analysis Design

定位：分析方案层。

用于表达：

- 来源 Protocol / SAP。
- 研究终点。
- 分析人群。
- 时间点。
- 指标集合。
- 统计方法计划。
- 纳入/剔除规则。
- 缺失值处理策略。
- 多重比较或亚组分析策略。

早期可以不单独建表，可先以任务字段和 JSON 承载；当一个项目需要多个终点、多指标、多时间点或 AI 起草分析计划时，再规划为独立实体。

### 3.2 Analysis Task

定位：可执行任务层。

当前 `AnalysisTask` 应继续保留，作为最小可执行单元：

- 一个 Project。
- 一个 Dataset 或未来某类数据源。
- 一个分析类型。
- 一组参数。
- 一次执行结果。

未来可让 Task 关联 Design，从“单个手工任务”扩展为“设计下的多个执行任务”。

### 3.3 Analysis Engine

定位：规则执行层。

当前 `runner.py` 是引擎雏形。未来应逐步演进为内部 registry：

```text
Analysis Engine
├── standard_stats
├── questionnaire
├── efficacy_rules
├── visia
├── oct
└── other_instruments
```

每种分析类型应具备：

- 输入校验。
- 参数 schema。
- 执行逻辑。
- 结果 schema。
- 日志 schema。
- 版本标识。

### 3.4 Analysis Result

定位：结构化结果层。

当前 `result_json` 已承担这个职责。未来应逐步规范：

- 结果摘要。
- 结果表。
- 统计量。
- P 值 / CI / 效应量。
- 样本量。
- 缺失情况。
- 是否可用于报告。
- 结果状态。

当结果需要被频繁查询、筛选、报告引用或跨任务复用时，可考虑拆为独立实体。

### 3.5 Analysis Artifact

定位：分析产物层。

未来用于管理：

- 导出结果表。
- 图表。
- 设备分析图片。
- 中间处理文件。
- 算法输出文件。
- 外部工具结果附件。

当前可暂不实现；Report 阶段若需要插图、导出表或设备分析图，应优先规划此层。

### 3.6 Analysis Review

定位：审核层。

未来应记录：

- 审核人。
- 审核时间。
- 审核结论。
- 审核意见。
- 退回原因。
- 是否允许进入 Report。
- 是否被 AI 解释引用。

这部分是连接 Analysis、Report 和 AI Workspace 的关键治理层。

---

## 4. 数据模型建议

### 4.1 已有模型保留

应保留：

- `AnalysisTask` 作为可执行分析任务。
- `project_id` 作为 Project 中心边界。
- `dataset_id` 作为 Dataset 来源。
- `analysis_type` 作为分析类型标识。
- `parameters_json` 作为早期扩展参数容器。
- `result_json` 作为结构化结果容器。
- `log_json` 作为执行留痕容器。
- `created_by`、`reviewed_by` 作为人员字段基础。

当前模型适合继续作为 Analysis MVP，不应推翻。

### 4.2 未来字段增加建议

在不立即实施的前提下，未来可按阶段考虑增加：

| 字段 | 用途 |
|------|------|
| `design_id` | 关联 Analysis Design |
| `data_source_type` | 区分 Dataset、仪器数据、问卷数据、外部结果 |
| `data_source_id` | 指向具体数据源 |
| `analysis_version` | 分析算法或规则版本 |
| `executed_by` | 执行人 |
| `executed_at` | 执行时间 |
| `review_status` | 审核状态 |
| `reviewed_at` | 审核时间 |
| `review_comment` | 审核意见 |
| `locked_at` | 被报告引用或定稿后锁定 |
| `source_document_ids` | 来源 Protocol / SAP / CRF |

### 4.3 未来实体规划

按治理规范，不建议一次性建全。建议按业务成熟度逐步规划：

| 实体 | 规划价值 | 触发时机 |
|------|----------|----------|
| `AnalysisDesign` | 承载 SAP/AI 起草的分析方案 | 项目需要多终点、多指标、多任务管理时 |
| `AnalysisResult` | 从 Task 中拆出可查询结果 | Report 频繁引用、多结果对比时 |
| `AnalysisArtifact` | 管理表格、图、设备输出文件 | Report 需要插图或设备结果时 |
| `AnalysisReview` | 完整审核记录 | Report 定稿和 AI 解释上线前 |
| `AnalysisEngineRegistry` | 分析类型注册元数据 | 分析类型明显增多时 |
| `InstrumentMeasurement` | 仪器检测记录 | VISIA/OCT 原始数据接入时 |

### 4.4 不建议现在新增的实体

当前不建议立即新增：

- 完整临床数据仓库。
- 通用仪器平台全量模型。
- 复杂多租户分析任务系统。
- 独立 AI 统计结论表。
- 与 Training 数据库强绑定的外键关系。

---

## 5. 分析类型扩展方案

### 5.1 总体扩展原则

未来分析类型应以“内部模块化”扩展，不为每种分析新建独立系统。

建议目标：

```text
analysis/engine/
├── registry
├── standard_stats
├── questionnaire
├── efficacy
├── visia
├── oct
└── shared
```

每类分析统一定义：

- 输入数据要求。
- 参数结构。
- 校验规则。
- 执行函数。
- 结果表格式。
- 日志格式。
- 版本号。
- 审核要求。

### 5.2 常规统计

当前基础：

- 配对比较。
- 改变率。
- 比例分析。

未来可渐进支持：

- 组间比较。
- 多时间点描述统计。
- 重复测量分析。
- 相关性分析。
- 回归分析。
- 安全性汇总。
- 多重比较说明。

优先级建议：

1. 扩展描述统计和多时间点表。
2. 扩展组间比较。
3. 再考虑复杂模型。

### 5.3 问卷分析

适配性较高。

推荐路径：

- 继续使用 Dataset 上传问卷 Excel。
- 在 Dataset 映射中识别受试者、访视、题项、维度。
- 在 Analysis 中新增问卷计分规则。
- 输出维度分、总分、变化值、有效率或分布表。

适合先作为 Analysis 内部新类型，不需要独立系统。

### 5.4 VISIA 分析

适配性中等偏低，需要等待真实数据样本。

可能输入：

- 设备导出 Excel。
- 图像文件。
- 指标截图或报告文件。
- 设备专属指标。

推荐路径：

1. 先确认 VISIA 实际导出格式。
2. 如果是 Excel 指标表，先走 Dataset + Analysis。
3. 如果涉及图像和设备文件，再规划 `InstrumentMeasurement` / `DeviceDataFile`。
4. 分析结果仍应进入 Analysis Result，并供 Report 引用。

禁止在未验证数据样本前设计全量通用 VISIA 平台。

### 5.5 OCT 分析

适配性中等偏低。

OCT 可能涉及：

- 图像。
- 层厚数据。
- 扫描参数。
- 设备导出报告。
- 时间点对比。

推荐路径：

- 先作为设备数据试点，不直接抽象成完整仪器平台。
- 对结构化导出数据，可先接入 Dataset。
- 对图像和专属文件，应规划 DeviceDataFile。
- 统计和功效评价仍通过 Analysis 层输出可追溯结果。

### 5.6 其他仪器

通用原则：

- 能导出结构化 Excel 的，优先走 Dataset。
- 有图像、二进制文件、设备报告的，逐步规划 DeviceDataFile。
- 不同仪器共享 Analysis Result、Artifact、Review、Report 这条下游链路。
- 不直接复制培训系统仪器台账，只通过资质 BFF 获取授权信息。

---

## 6. 与 Dataset、Report、AI Workspace 的关系

### 6.1 与 Dataset 的关系

Dataset 是 Analysis 的主要输入层。

当前关系：

```text
Dataset（已确认）
  ↓
AnalysisTask
  ↓
result_json + log_json
```

未来应增强：

- Dataset 版本追踪。
- Dataset 与项目时间点的映射。
- Dataset 与 Subject / Sample / InstrumentMeasurement 的关系。
- Dataset 映射质量检查。

Analysis 不应直接读取未确认或未映射的数据。

### 6.2 与 Report 的关系

Report 应引用 Analysis 的审核后结果。

目标链路：

```text
AnalysisTask / AnalysisResult
  ↓
Report 选择来源分析
  ↓
模板填表
  ↓
人工审核
  ↓
归档为 Document
```

要求：

- Report 不应直接从原始 Excel 自行计算统计结论。
- Report 应能回溯到 AnalysisTask、Dataset 和执行日志。
- 已被定稿报告引用的结果应受保护，避免无留痕覆盖。

### 6.3 与 AI Workspace 的关系

AI Workspace 应使用 Analysis 作为可信计算来源。

AI 可以：

- 基于 Protocol / SAP 起草 Analysis Design。
- 解释已执行 Analysis 结果。
- 为 Report 起草文字。
- 提醒结果与方案不一致。

AI 不能：

- 直接替代 Analysis Engine。
- 直接生成最终 P 值或统计结论。
- 绕过人工审核写入 Report 定稿。

目标链路：

```text
Document: Protocol / SAP
  ↓
AI 起草 Analysis Design
  ↓
人工确认
  ↓
Analysis Engine 执行
  ↓
AI 解释结果草稿
  ↓
人工审核
  ↓
Report 引用
```

---

## 7. 分阶段开发路线

### 阶段 0：保持当前 MVP 稳定

目标：

- 不重构当前 Analysis。
- 保持现有三类分析可用。
- 保持 Dataset 确认后再分析的边界。
- 保持 `result_json` / `log_json` 留痕。

收益：

- 当前项目可继续用于真实脱敏 Excel 试点。
- 为 Report 阶段提供基础结果来源。

风险：

- 不应在此阶段扩展复杂仪器分析。

### 阶段 1：补齐 Analysis 治理语义

目标：

- 明确 Analysis 状态语义。
- 梳理“草稿 / 已执行 / 已驳回 / 待审核 / 已审核 / 被报告引用”的目标状态。
- 定义审核意见、审核时间、审核人、报告引用保护的规则。

收益：

- 为 Report 和 AI 解释提供可信输入。
- 避免 AI 或报告绕过统计审核。

实现原则：

- 优先文档和流程设计。
- 需要代码时小步扩展当前 `AnalysisTask`。

### 阶段 2：稳定 Analysis Engine 扩展接口

目标：

- 将现有分析类型逐步整理为统一接口。
- 形成分析类型注册约定。
- 统一输入校验、参数、结果、日志格式。

收益：

- 后续问卷、功效评价、仪器分析能逐步加入。
- 避免每个分析类型形成独立孤岛。

约束：

- 不引入复杂插件市场。
- 不改变现有 Project / Dataset / Analysis 主链路。

### 阶段 3：扩展常规统计和问卷分析

目标：

- 在现有 Dataset + Analysis 基础上扩展常规统计。
- 优先支持问卷类结构化数据。
- 输出可供 Report 引用的结果表。

收益：

- 贴近临床研究常见数据形态。
- 风险低于直接接入复杂仪器图像。

### 阶段 4：接入仪器数据试点

目标：

- 选择一个真实仪器场景试点。
- 先确认导出格式和人工流程。
- 能走 Dataset 的先走 Dataset。
- 需要文件/图像管理时再规划 InstrumentMeasurement / DeviceDataFile。

收益：

- 避免未验证需求下的过度设计。
- 为 VISIA、OCT 等设备分析形成可复制路径。

### 阶段 5：与 Report 和 AI Workspace 深度联动

目标：

- Report 引用审核后的 Analysis 结果。
- AI 读取 Protocol / SAP 起草分析设计。
- AI 解释 Analysis 结果，但不生成最终结论。
- AI 输出进入审核和留痕。

收益：

- 形成 Project 下“资料 → 数据 → 分析 → 解释 → 报告”的闭环。
- 符合未来临床研究 AI 平台方向。

---

## 8. 总体评估结论

当前 Analysis 模块已经能够支撑未来临床研究 AI 平台的第一阶段需求：它是 Project 下的规则计算入口，能够从已确认 Dataset 创建分析任务，执行常用统计，保存结构化结果和执行日志。

但它还不足以直接支撑完整临床研究分析平台。主要短板是：分析设计层缺失、多指标和多时间点能力较弱、分析类型扩展接口不够标准、审核流程较轻、分析产物管理缺失、与 Report 和 AI Workspace 的正式闭环尚未建立。

推荐路线是保留当前 `AnalysisTask` 作为 MVP 核心，围绕治理规范渐进增强：先补齐审核和状态语义，再稳定 Analysis Engine 扩展接口，然后扩展常规统计和问卷分析，最后基于真实数据样本接入 VISIA、OCT 等仪器分析。整个过程不需要推翻现有系统，也不应绕过 Project 中心架构。
