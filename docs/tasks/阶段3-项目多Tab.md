# 任务：阶段 3 — 项目多 Tab

> **状态：** ✅ 已完成  
> **完成日期：** 2026-07-03

---

## 背景

将项目详情页重构为 2.0 目标信息架构，所有资料、排期、资质围绕 Project 展示。

---

## 涉及文件

- `frontend/project_management.py` — 详情 Tab
- `frontend/schedule_calendar.py` — 排期 Tab
- `frontend/qualification_inquiry.py` — 人员资质面板
- `backend/models.py` — `document_type` 列
- `backend/main.py` — 资料 API 扩展

---

## 修改目标

- [x] Tab：概览 / 资料 / 排期 / 人员资质 / 数据集 / 分析 / 报告 / AI
- [x] 项目资料 Tab 列表 + 上传
- [x] 未实现模块清晰占位
- [x] `document_type` 字段与录入 UI
- [x] 通用资料库侧边栏入口保留

---

## 验收

打开任一项目，可在一处看到资料、排期、成员资质；占位 Tab 指向后续阶段。