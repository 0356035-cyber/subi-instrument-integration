# 任务：TEWL/Corneo 仪器数据自动整理

> **状态：** 代码实现与隔离验证完成，待真实仪器文件页面验证
> **范围：** 仅 Project 内 Dataset 的 `tewl_corneo_v1` 受控模板。

## 目标

将固定格式的 TEWL/Corneo 原始 `.xlsx` 上传为 `Instrument Data` 后，保留原文件，并自动生成可用于现有 Analysis 模块的两份派生数据集。

## 业务规则

- `Subject` 拆为项目编码、访视事件、受试者编号；前三段组成项目编码，随后两段分别为访视与受试者编号。
- 来源项目编码必须匹配当前 Project 的 `project_code`。
- 自动扫描已支持的 Sheet；存在 `CM825 Single` 时按受试者、访视、Tags 分组，3 条有效 `Hydration` 计算均值；存在 `TMHex` 时同一受试者、访视、Tags 仅保留 1 条有效 `TEWL Robust [g/m²/h]`。两个 Sheet 可独立存在。
- 异常不自动纠正、不静默取值；派生数据集保留草稿，不进入 Analysis。

## 数据模型

仅扩展现有 `Dataset`：

- `source_dataset_id`：派生数据集来源。
- `processing_log_json`：模板、来源 Sheet、行数和异常留痕。

不新建独立仪器系统、通用仪器实体或跨系统数据库关联。

## 验证

- Subject 解析与项目编号校验。
- 三条 Hydration 的均值计算。
- TEWL Robust 单值提取。
- 缺失、重复和测量次数异常阻断。
- 生成的 Dataset 映射可被 Analysis 读取。
