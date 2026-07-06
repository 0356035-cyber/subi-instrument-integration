> **已归档，仅供参考，不作为当前开发依据。**  
> 现行规则见：[README_FOR_CODEX.md](../../README_FOR_CODEX.md) → 文档索引。

---
# Clinical Research OS 2.0 — 架构蓝图

> 更新日期：2026-07-03  
> **状态：规划蓝图，不立即重写系统**  
> 现有 Docker 四容器、Sub-I 资料库、项目管理、排班日历、资质查询、仪器培训系统**继续稳定运行**，本文件描述演进方向。

---

## 1. 愿景：从「资料库系统」到「项目操作系统」

### 1.1 现状逻辑（1.0）

```
资料库
├── 资料
├── 分类
├── 版本
├── 项目          ← 已有一期能力
├── 排班          ← 阶段 0～2 已上线
└── 资质查询
```

### 1.2 目标逻辑（2.0）

**以 Project 为中心的临床研究工作平台（Project OS）**

```
Project 项目
├── Documents        项目资料
├── Datasets         数据集
├── Analysis         统计分析
├── Reports          报告输出
├── Schedule         项目排期
├── Staff & Qualification  人员与资质
└── AI Workspace     项目 AI 工作区
```

资料库不消失，而是成为**项目的一个子域**。现有 `document_group_id`、版本对比、全文检索、资料挂 `project_id`、项目日历、周排班、资质 BFF 等，均为 2.0 的基础资产。

---

## 2. 总原则

| 原则 | 说明 |
|------|------|
| **不打破现有部署** | 仍 `subi_knowledge_platform` + `instrument-training-home`，Docker 四容器 |
| **不合并培训系统** | 培训/授权保持独立服务，Sub-I 经 BFF（8001）代理 |
| **项目中心，渐进演进** | 新能力挂在 Project 下，旧入口可保留过渡期 |
| **AI 理解、规则计算、模板报告三层分离** | 见 §5 |
| **边用边迭代** | 先骨架与占位，再 Dataset → Analysis → Report → AI |

---

## 3. 两个系统的角色重定义

### 3.1 `subi_knowledge_platform` → 临床研究项目主平台

| 职责 | 现状 | 2.0 扩展 |
|------|------|----------|
| 项目管理 | ✅ 一期 | 项目详情页增强、全模块入口 |
| 项目资料 / 知识库 | ✅ | `document_type` 细化，强化项目 Tab |
| 数据集 | — | **新增** Dataset 模块 |
| 统计分析 | — | **新增** AnalysisTask + 规则引擎 |
| 报告生成 | — | **新增** Report + Word 模板 |
| AI 工作区 | — | **新增** AIWorkspace（项目下页面） |
| 排班日历 | ✅ 阶段 0～2 | 归入 Project.Schedule |
| 资质查询入口 | ✅ BFF | 归入 Project.Staff & Qualification |

**技术栈延续：** Streamlit + FastAPI + SQLite（规模增长后再评估）。

**整合方式延续：**

```
Sub-I 前端 (:8510) → Sub-I 后端 (:8001) → 培训 API (:8000)
```

服务账号仅存 `subi_knowledge_platform/.env`，不暴露前端。

### 3.2 `instrument-training-home` → 人员培训与仪器授权服务

**保持独立，不并入 Sub-I。**

| 职责 |
|------|
| 人员台账 |
| 仪器台账 |
| 培训 / 考核 / 授权记录 |
| 到期提醒 |
| 资质整合 API（供 Sub-I 调用） |

---

## 4. 目标模块结构（逻辑分区）

未来 `subi_knowledge_platform` 建议按域划分（**不必立刻物理拆仓**）：

```
subi_knowledge_platform/
├── backend/
│   ├── auth/
│   ├── documents/          ← 现有 + document_type
│   ├── projects/           ← 现有，增强
│   ├── datasets/           ← 规划
│   ├── analysis/           ← 规划
│   ├── reports/            ← 规划
│   ├── ai_workspace/       ← 规划
│   ├── schedule/           ← 现有 schedule_*
│   ├── integrations/       ← 资质 BFF
│   └── common/
├── frontend/
│   ├── app.py
│   ├── project_management.py
│   ├── document_pages.py   ← 自 app.py 逐步抽出
│   ├── dataset_pages.py
│   ├── analysis_pages.py
│   ├── report_pages.py
│   ├── ai_workspace.py
│   ├── schedule_calendar.py
│   ├── schedule_roster.py
│   └── qualification_inquiry.py
├── data/
├── uploads/
├── templates/                ← 规划
│   ├── word/
│   └── excel/
└── tests/
```

**Codex / 后续开发：** 新功能优先落入上表对应域，避免在 `app.py` 无限膨胀。

---

## 5. 三层技术路线（核心原则）

### 5.1 AI 层：负责理解，不负责最终计算

**AI 做：**

- 读取 Protocol / SAP
- 识别终点、访视、统计规则
- 生成分析计划草稿、报告文字初稿
- 回答项目问题

**AI 不做：**

- 最终 P 值 / 样本剔除的权威确认
- 最终统计结论定稿
- 最终报告定稿与排版

### 5.2 规则 / 统计层：可重复计算

Python 规则引擎实现标准套路，例如：

- 正态性检验、配对 t、Wilcoxon、二项、卡方/Fisher
- 描述性统计、改变率、有效率、安全性汇总

每次分析**必须留痕**：输入数据、方法、包版本、参数、纳入样本、缺失处理、输出、日志（便于与 SPSS / GraphPad / R 对齐）。

### 5.3 报告层：模板化输出

```
Word 模板 → 占位符填充 → 结果表/图插入 → AI 润色 Results → 人工审核 → 定稿归档
```

不由 AI 自由排版；复杂统计仍外用 SPSS 等，**结果回项目**。

### 5.4 分析流水线（目标形态）

```
AI 读取 Protocol / SAP
        ↓
生成分析计划草稿
        ↓
用户确认
        ↓
规则引擎执行统计
        ↓
输出结果表 + 日志
        ↓
人工审核
```

---

## 6. 项目 AI 工作区（页面概念）

Project 详情下的 **AI Workspace** 页面（非独立系统）：

**项目资料状态：**

- Protocol / SAP / CRF / Raw Data 是否已上传

**AI 解析状态：**

- 研究目的、主要终点、访视节点、统计方法是否已识别
- 数据字段映射是否待确认

**可执行任务（随阶段开放）：**

- 生成分析计划 / 执行统计分析 / 生成结果表 / 生成报告初稿 / 问这个项目

阶段 5 起 AI 仅为**建议**；阶段 6 起「计划确认 → 执行 → 写报告」半自动，人审占比 10%～20%。

---

## 7. 部署与边界（不变）

| 项 | 决策 |
|----|------|
| 容器数量 | 仍 4 个业务容器 + 可选 `cloudflared` |
| 第三套应用 | ❌ 不另建 |
| 完整 LIMS | ❌ 不做 |
| 培训系统合并 | ❌ 不合并 |
| 通用法规库 | ✅ 保留，`project_id` 可空 |

---

## 8. 相关文档

| 文档 | 内容 |
|------|------|
| [DATA_MODEL.md](./DATA_MODEL.md) | 六大核心对象字段 |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | 阶段 1～8 路线图（当前推进阶段 3） |
| [CODE_MAP.md](./CODE_MAP.md) | 文件/API/表/页面代码地图 |
| [CODEX_WORKFLOW.md](./CODEX_WORKFLOW.md) | 开发与 Codex 协作约定 |
| [系统总览.md](./系统总览.md) | 当前已上线系统一页总览 |
| [项目整合交接文档.md](./项目整合交接文档.md) | 历史规划 §14、权限 §14.12 |

---

## 9. 新对话延续 2.0 规划

```text
请阅读 projects/ARCHITECTURE.md、DATA_MODEL.md、DEVELOPMENT_ROADMAP.md，
在不动 Docker 四容器与培训独立边界的前提下，推进 Clinical Research OS 2.0 指定阶段。
当前系统已稳定运行；默认渐进增强，不整体重写。
```