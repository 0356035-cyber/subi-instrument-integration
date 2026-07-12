# 任务：Analysis 模块 V2 第二阶段

> 状态：已完成
>
> 目标：统一现有 Analysis Engine 的注册、输入校验、结果和日志契约，不新增分析类型。

## 范围

- 保留配对比较、变化率和有效率三类现有算法。
- 新增轻量分析类型注册表，声明必需映射、任务字段、参数和默认值。
- 统一 `result_json` 的版本、类型和摘要字段。
- 统一 `log_json` 的 Engine 版本与输入校验留痕。
- 使用内存 DataFrame 测试三种类型的共享契约。

## 不在范围内

- 数据库迁移、API 或页面功能变更。
- 新统计方法、问卷、VISIA、OCT、Report 或 AI Workspace。

## 验证

- 已运行 `backend/tests/test_analysis_review_crud.py` 与 `backend/tests/test_analysis_engine_contract.py`。
- 共 `5 passed`；测试仅使用内存 SQLite、内存 DataFrame 与模拟 Dataset，不读取或写入真实业务数据和附件。
