# 未来临床研究 AI 平台蓝图

> 本蓝图基于《项目未来演进架构适配评估报告》与当前项目实际状态整理。  
> 定位：定义未来 1-2 年产品与架构方向，不作为代码改造方案，不要求重构，不新增当前开发任务。

---

## 1. 平台定位

未来平台的定位是：以 Project 为核心的临床研究工作平台，在保留现有 Sub-I 资料库和仪器培训系统独立边界的基础上，逐步承载项目管理、资料归档、数据采集、统计分析、AI 辅助解释和报告生成。

平台不是完整 LIMS，也不是替代 Word、SPSS、GraphPad、R 或人工审核的全自动系统。它更适合成为部门内部的“临床研究项目操作系统”：

- 项目资料找得到、挂得住、追得回。
- 项目时间点、人员、资质和数据能放在同一个 Project 视图下管理。
- 标准统计分析可由规则引擎执行并留痕。
- 报告可由模板和结构化分析结果生成初稿。
- AI 负责理解、归纳、解释和起草，不负责无人审核定稿。

目标形态：

```text
Clinical Research AI Platform
├── Project 工作台
├── 资料与知识库
├── 数据集与仪器数据
├── 规则统计与功效评价
├── AI 辅助分析
├── 报告生成与审核
└── 培训资质联邦查询
```

---

## 2. 核心业务对象

### 2.1 当前已存在或已具备基础的对象

| 对象 | 当前基础 | 未来角色 |
|------|----------|----------|
| Project | `projects` | 平台中心对象，承载研究全流程 |
| User | `users` | 登录、权限、负责人、审核人 |
| ProjectMember | `project_members` | 项目成员与协作边界 |
| Document | `documents` | Protocol、SAP、CRF、Raw Data、报告归档、知识库资料 |
| Schedule | 访视节点、日历、排班表 | 项目时间线与执行计划 |
| Dataset | `datasets` | 结构化数据入口，先以 Excel 为主 |
| AnalysisTask | `analysis_tasks` | 规则统计、功效评价和结果留痕 |
| Instrument Qualification | 培训系统 + BFF | 项目人员仪器资质事实源 |

### 2.2 未来逐步引入的对象

这些对象不要求一次性建设，应随真实业务流程逐步引入：

| 对象 | 作用 |
|------|------|
| Subject | 受试者脱敏编号、入排状态、项目内分组 |
| StudyVisit / Timepoint | 统一研究时间点，连接排班、样品、数据和分析 |
| Sample | 样品编号、采集时间、关联受试者和时间点 |
| ProjectInstrument | 项目使用仪器清单 |
| InstrumentMeasurement | 一次仪器检测记录 |
| DeviceDataFile | VISIA、OCT 等设备原始文件、图像、导出表 |
| AnalysisArtifact | 分析输出物，如结果表、图片、导出文件 |
| Report | 报告生成记录、模板、状态和来源分析 |
| ReviewRecord | 审核意见、退回、定稿和版本留痕 |
| AIActionLog | AI 引用来源、输出、人工采纳与模型版本记录 |

---

## 3. Project 中心架构

未来所有新增能力优先挂载到 Project 下，而不是新建第三套应用或绕开现有资料库。

```text
Project
├── 基本信息
│   ├── 编号 / 名称 / 申办方
│   ├── 功效宣称 / 伦理类型 / 状态
│   └── 负责人 / 成员 / 权限
│
├── 研究资料
│   ├── Protocol
│   ├── SAP
│   ├── CRF
│   ├── 原始数据附件
│   └── 历史版本
│
├── 研究执行
│   ├── 访视模板
│   ├── 项目时间点
│   ├── 日历事件
│   └── 周排班与人员资质
│
├── 数据管理
│   ├── Dataset
│   ├── Subject
│   ├── Sample
│   └── InstrumentMeasurement
│
├── 分析与评价
│   ├── 标准统计分析
│   ├── 仪器专项分析
│   ├── 问卷分析
│   └── 功效评价
│
├── AI 工作区
│   ├── 研究方案理解
│   ├── 分析计划草稿
│   ├── 结果解释草稿
│   └── 项目问答
│
└── 报告输出
    ├── Word 模板
    ├── 分析结果填表
    ├── AI 润色草稿
    ├── 人工审核
    └── 定稿归档为 Document
```

Project 是业务上下文边界，也是权限、数据追溯和 AI 上下文组织的核心边界。

---

## 4. 模块关系

### 4.1 当前模块关系

```text
Sub-I 平台
├── 用户与权限
├── 项目管理
├── 资料库与版本
├── 排班与项目日历
├── Dataset
├── Analysis
├── Report（规划）
├── AI Workspace（规划）
└── Training BFF
    └── 仪器培训系统
```

### 4.2 未来目标模块关系

```text
核心平台层
├── Project
├── User / Permission
├── Document / Knowledge Base
├── Review / Audit
└── Integration BFF

研究数据层
├── Dataset
├── Subject
├── Timepoint
├── Sample
└── Instrument Data

分析规则层
├── Standard Statistics
├── Efficacy Rules
├── Questionnaire Analysis
├── VISIA Analysis
└── OCT Analysis

AI 辅助层
├── Document Understanding
├── Analysis Plan Draft
├── Result Interpretation Draft
├── Report Draft Assistance
└── Project Q&A

输出交付层
├── Report Template
├── Generated Docx
├── Review Flow
└── Archived Document
```

### 4.3 与培训系统的关系

培训系统继续作为独立子系统：

- 负责人员、仪器、培训、考核、授权和到期管理。
- 继续保留独立数据库。
- Sub-I 通过 BFF 查询资质，不直接写培训数据库。
- Project 在人员安排、仪器检测和排班时引用资质查询结果。

---

## 5. 数据流

### 5.1 项目资料到 AI 和报告的数据流

```text
上传项目资料
    ↓
Document + document_type + content_text
    ↓
AI 读取 Protocol / SAP / CRF
    ↓
生成研究设计、终点、访视、分析计划草稿
    ↓
人工确认
    ↓
进入 Dataset / Analysis / Report 工作流
```

### 5.2 数据集到统计分析的数据流

```text
脱敏 Excel / 原始数据文件
    ↓
Dataset 上传
    ↓
Sheet 预览与列映射
    ↓
人工确认 Dataset
    ↓
AnalysisTask 配置
    ↓
规则引擎执行
    ↓
result_json + log_json
    ↓
人工审核
    ↓
报告引用
```

### 5.3 仪器检测数据流

早期可先按 Dataset 承载导出 Excel；当 VISIA、OCT 等仪器数据稳定后，再逐步形成更明确的数据流：

```text
Project 设定检测仪器
    ↓
资质 BFF 查询检测人员授权
    ↓
采集仪器原始文件 / 导出表
    ↓
InstrumentMeasurement / DeviceDataFile
    ↓
设备专项分析模块
    ↓
AnalysisArtifact / AnalysisTask
    ↓
功效评价与报告
```

### 5.4 报告生成数据流

```text
Project 基本信息
    +
Document: Protocol / SAP
    +
AnalysisTask.result_json
    +
人工撰写或 AI 辅助润色文本
    ↓
Word 模板填充
    ↓
生成 docx 草稿
    ↓
人工审核
    ↓
定稿
    ↓
归档为项目 Document
```

### 5.5 权限与审计数据流

```text
用户登录
    ↓
role + owner_employee_id + ProjectMember
    ↓
判断项目可见 / 可编辑
    ↓
修改项目资料、Dataset、Analysis、Report
    ↓
AuditLog / Notification / ReviewRecord
```

---

## 6. AI 能力边界

### 6.1 AI 可以做什么

AI 是辅助层，不是最终决策层。可支持：

- 读取和总结项目 Protocol、SAP、CRF。
- 提取研究设计、终点、访视、检测项目和统计方法。
- 生成分析计划草稿。
- 基于规则引擎结果生成解释草稿。
- 辅助报告 Results / Discussion 初稿撰写和润色。
- 在项目资料范围内进行问答。
- 对资料缺口、数据映射疑点、报告一致性提出提醒。

### 6.2 AI 不可以做什么

AI 不应：

- 自动决定最终统计结论。
- 自动确认 P 值、显著性或功效评价结论。
- 自动剔除样本或确认分析人群。
- 绕过规则引擎直接生成最终分析结果。
- 无人工审核生成定稿报告。
- 修改真实业务数据、数据库结构或权限配置。
- 替代项目负责人、统计审核人或主任审核。

### 6.3 AI 与规则引擎的关系

```text
AI：理解、建议、起草、解释
规则引擎：计算、判定、留痕、可复现
人工审核：确认、修订、定稿、签发
```

AI 输出必须保留来源：

- 引用的 Document。
- 引用的 AnalysisTask。
- Prompt 或任务类型。
- 模型版本。
- 输出时间。
- 人工是否采纳。

### 6.4 AI 与报告的关系

报告应遵守：

- Word 模板控制结构和排版。
- AnalysisTask 提供可追溯表格和统计结果。
- AI 只辅助文字初稿和解释草稿。
- 人工审核后才能定稿。
- 定稿报告归档为 Project Document。

---

## 7. 未来 1-2 年演进方向

### 阶段 1：Project 工作流闭环

时间范围：近期到 6 个月。

方向：

- 继续以 Project 详情页作为主工作台。
- 完成 Report 的产品闭环定义：模板、来源分析、生成、审核、归档。
- 让项目资料、Dataset、Analysis、Report 形成可追溯链路。
- 统一 Dataset / Analysis 与项目访视节点的对应规则。

收益：

- Project 从资料管理中心升级为研究交付中心。
- 后续 AI 能围绕完整项目上下文工作。

风险：

- 报告功能若过早追求复杂自动化，会压过当前系统稳定性。

### 阶段 2：分析能力模块化

时间范围：6-12 个月。

方向：

- 稳定 Analysis 的内部扩展边界。
- 在现有标准统计基础上，逐步增加问卷分析、功效评价规则。
- 对 VISIA、OCT 等仪器先从真实导出样本和人工流程调研开始。
- 优先支持可结构化、可验证、可复现的分析。

收益：

- 新分析能力可以逐个增加，不影响核心平台。
- 统计结果、设备分析结果和报告生成可以共享统一结果格式。

风险：

- 在没有真实设备数据样本前抽象通用仪器平台，容易过度设计。

### 阶段 3：研究数据对象增强

时间范围：12-18 个月。

方向：

- 根据实际项目需要逐步引入 Subject、Timepoint、Sample、InstrumentMeasurement。
- 将 Excel Dataset 从“唯一数据入口”演进为“结构化数据入口之一”。
- 将仪器原始文件、图像和导出表纳入 Project 上下文。

收益：

- 支持多仪器、多时间点、多样品的研究管理。
- 为 AI 和自动化报告提供更可靠的数据上下文。

风险：

- 数据对象增加会带来录入和维护成本，需要先确定真实工作流。

### 阶段 4：AI Workspace 接入

时间范围：12-24 个月。

方向：

- 以项目资料问答、Protocol/SAP 理解和分析计划草稿作为第一批 AI 能力。
- 再逐步进入结果解释草稿和报告文字润色。
- 建立 AIActionLog，保留引用来源、输出、模型版本和人工采纳情况。
- 保持 AI、规则引擎、人工审核三层分离。

收益：

- 降低资料阅读、分析计划起草和报告初稿成本。
- 提升项目知识复用能力。

风险：

- 如果 AI 输出缺少来源和审核记录，会影响可信度和合规边界。

---

## 8. 平台设计原则

1. Project 优先  
   新能力优先挂 Project，不新建第三套系统。

2. 双系统独立  
   培训系统继续独立，Sub-I 通过 BFF 查询资质。

3. 数据与代码分离  
   业务数据库、附件、真实配置不进入代码仓库。

4. 规则先于 AI  
   统计结论来自规则引擎或明确计算逻辑，AI 只辅助解释和起草。

5. 人工审核不可省略  
   报告和临床研究结论必须经过人工审核。

6. 渐进演进  
   先做稳定闭环，再扩展仪器分析和 AI 能力。

7. 保持可追溯  
   数据来源、分析参数、执行日志、报告版本、AI 输出都应可追溯。

---

## 9. 总体蓝图结论

未来临床研究 AI 平台的核心不是“让 AI 自动完成研究”，而是让 Project 成为临床研究全流程的结构化工作台：资料、时间点、人员、资质、数据、分析、报告和知识问答都围绕同一个项目上下文组织。

当前项目已经具备这个方向的基础。未来 1-2 年最稳妥的路线是先完成 Project 下的报告与分析闭环，再逐步扩展受试者、样品和仪器数据对象，最后接入可审计、可追溯、受规则约束的 AI 辅助能力。
