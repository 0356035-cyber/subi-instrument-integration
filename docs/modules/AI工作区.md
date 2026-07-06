# AI 工作区

> **用途：** 阶段 7 AI Workspace 设计与落点。  
> **何时读：** 开发 Protocol/SAP 理解、分析计划草稿时。  
> **状态：** **未开始**（远期阶段 8 为半自动）。  
> **关联：** [系统总览.md](../系统总览.md) §三层分离。

---

## 原则

AI **理解**项目资料，输出建议，**不自动执行**统计、不单独定稿结论。

---

## 第一版任务

- [ ] 读取已上传 Protocol / SAP（Document）
- [ ] 提取研究设计、终点、访视、统计方法
- [ ] 生成分析计划草稿
- [ ] 「问这个项目」基础问答（脱敏、留痕）

---

## 规划落点

```
backend/ai_workspace/
├── routes.py
└── indexer.py

frontend/ai_workspace.py
```

约束：不直连数据库写结论；`ai_action_logs` 记录参考文档。