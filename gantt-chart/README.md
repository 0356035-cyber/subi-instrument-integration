# 临床研究检测排程甘特图 MVP

皮肤临床研究现场检测排程工具。**当前交付：P0 阶段**。

## 快速启动

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest 单元测试
npm run build
```

要求：Node.js ≥ 18

## P0 已实现

- 受试者视图甘特图（自研 div 绝对定位 + `@dnd-kit` 水平拖拽）
- 显示粒度 1/2/5/10/15/30 min
- 内部时间：**当天分钟偏移量**（导出时格式化为 HH:mm）
- `Task.resourceIds[]` 多资源占用
- `isElastic` 等待类任务标记（联动伸缩逻辑已实现，UI 待 P2 开放）
- 资源冲突检测（capacity=1 区间交叉，capacity>1 扫描线）
- 风险提示面板（仅资源冲突）
- 受试者增删：工具栏添加；行首铅笔打开信息窗可编辑或删除（含确认）
- 自动安排多名受试者（MVP）：在指定时段内逐名选择新增资源重叠最少的到场时间；不改变流程内部顺序、锚点和时长
- 优化未到场排程：仅重新安排 `scheduled` 状态受试者；已到场、已完成和已取消记录保持锁定，并在确认前预览结果
- 全局精确优化：使用 HiGHS/WASM 混合整数规划，在指定候选间隔和分钟级资源容量模型下返回 `OPTIMAL` 时提供全局最优证明
- 新增并全局精确重排：新受试者和全部 `scheduled` 受试者同时优化；已到场、已完成和已取消记录锁定不动
- 短环节识别：窄条外置标签 + 悬停提示 + 右侧「环节详情」面板
- 固定内置示例数据 + Vitest 核心函数测试

## P1 / P2 待续

| 阶段 | 功能 |
|------|------|
| P1 | 资源视图、时间窗/依赖检测 UI、吸附粒度、CSV 导出、localStorage |
| P2 | cascade/整体拖拽模式 UI、任务详情编辑、Excel 导出 |

## 项目结构

```
src/
├── types/index.ts
├── data/sampleData.ts       # 固定示例（S01↔S03 重叠 4min，S02 超窗 3min）
├── utils/
│   ├── time.ts              # snapMinutes、HH:mm 格式化
│   ├── conflicts.ts         # 冲突检测纯函数
│   ├── drag.ts              # updateTaskTime
│   └── __tests__/           # Vitest 测试
├── store/scheduleStore.ts
└── components/
    ├── GanttChart.tsx       # DndContext + 时间轴
    ├── TaskBar.tsx          # useDraggable
    ├── Toolbar.tsx
    └── RiskPanel.tsx
```

## 内置示例冲突（P0 可见）

1. **资源冲突**：S01 即刻 VISIA（09:41–09:49）与 S03 BL VISIA（09:45–09:53）在 `VISIA_01` 重叠 **4 min**
2. **时间窗超窗**（P1 UI）：S02 30min VISIA 安排在 10:34，超出允许窗口 3 min（已有测试覆盖）

## 核心约定

- 显示粒度 / 吸附粒度 / 计算精度分离，`durationMin` 不因显示粒度改变
- severity：资源冲突=high，超窗=high，接近边界=low（≤2min），依赖=medium
- MVP 不支持跨行换资源、resize、Undo
