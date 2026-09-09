import type {
  StepScheduling,
  VisitPoint,
  WorkflowStepTemplate,
} from '../types';
import { assignWorkflowColors } from './taskType';
import { relinkSequentialDependencies } from './workflow';
import { activityTypeFromName, isProductActivity } from './workflowResources';

export type WorkflowImportResult = {
  steps: WorkflowStepTemplate[];
  warnings: string[];
};

const DURATION_RE =
  /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|分钟|min|分)(?![a-zA-Z])/i;

function stripPrefix(line: string): string {
  return line
    .replace(/^\s*\d+[\.、.\)）]\s*/, '')
    .replace(/^\s*[\(（]\d+[\)）]\s*/, '')
    .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/, '')
    .replace(/^[-*•·]\s*/, '')
    .trim();
}

function splitCsvLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((cell) => cell.trim());
  }
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function splitIntoLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];
  if (normalized.includes('\n')) {
    return normalized
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !/^[-—=_]{3,}$/.test(line));
  }
  if (/[→＞]|->|-->/.test(normalized)) {
    return normalized
      .split(/\s*(?:→|->|＞|-->|>)\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (/\d+[\.、]/.test(normalized)) {
    return normalized
      .split(/(?=\d+[\.、])/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [normalized];
}

function detectVisitPoint(text: string): VisitPoint | undefined {
  if (/基线|\bBL\b/i.test(text)) return 'BL';
  if (/即刻|immediate|\bIMM\b/i.test(text)) return 'Immediate';
  if (/30\s*(?:min|分钟|分)/i.test(text)) return '30min';
  if (/(?:1\s*(?:h|小时)|60\s*(?:min|分钟))/i.test(text)) return '1h';
  return undefined;
}

function detectTaskType(name: string): string {
  return activityTypeFromName(name);
}

function parseDuration(text: string): number | null {
  const match = text.match(DURATION_RE);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function slugId(name: string, index: number): string {
  const slug =
    name
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'step';
  return `imp-${index + 1}-${slug}`;
}

type DraftStep = {
  name: string;
  durationMin: number;
  durationInferred?: boolean;
  taskType: string;
  visitPoint?: VisitPoint;
  resourceIds: string[];
  raw: string;
  roundOffsetMin?: number;
};

const AFTER_OFFSET_RE =
  /后\s*(\d+)\s*(?:minutes?|mins?|分钟|min|分)(?![a-zA-Z])/i;

function parseAfterPhrase(
  text: string
): { offset: number; after: string } | null {
  const match = text.match(AFTER_OFFSET_RE);
  if (!match || match.index == null) return null;
  const offset = Number(match[1]);
  if (!Number.isFinite(offset)) return null;
  return {
    offset,
    after: text.slice(match.index + match[0].length).trim(),
  };
}

function visitFromOffset(offset: number): VisitPoint | undefined {
  if (offset === 0) return 'Immediate';
  if (offset === 30) return '30min';
  if (offset === 60) return '1h';
  return undefined;
}

function inferRoundOffset(draft: DraftStep): number | undefined {
  if (looksLikeWaiting(draft.name, draft.taskType) || looksLikeWaiting(draft.raw, draft.taskType)) {
    return undefined;
  }
  if (draft.roundOffsetMin != null) return draft.roundOffsetMin;
  const after = parseAfterPhrase(draft.raw) ?? parseAfterPhrase(draft.name);
  if (after) return after.offset;
  if (draft.visitPoint === 'Immediate') return 0;
  if (draft.visitPoint === '30min') return 30;
  if (draft.visitPoint === '1h') return 60;
  return undefined;
}

function parseTable(lines: string[]): WorkflowImportResult | null {
  const header = splitCsvLine(lines[0]).map((cell) => cell.replace(/^\ufeff/, ''));
  if (header.length < 2) return null;
  const nameIdx = header.findIndex((cell) => /环节|名称|步骤|name/i.test(cell));
  const durationIdx = header.findIndex((cell) =>
    /耗时|时长|分钟|duration|min/i.test(cell)
  );
  const typeIdx = header.findIndex((cell) => /类型|type/i.test(cell));
  if (nameIdx < 0) return null;

  const warnings: string[] = [];
  const drafts: DraftStep[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    if (cells.every((cell) => !cell)) continue;
    const rawName = stripPrefix(cells[nameIdx >= 0 ? nameIdx : 0] ?? '');
    if (!rawName) continue;
    const after = parseAfterPhrase(rawName);
    const durationCell = durationIdx >= 0 ? cells[durationIdx] ?? '' : '';
    const numericDuration = /^\d+(?:\.\d+)?$/.test(durationCell.trim())
      ? Math.round(Number(durationCell.trim()))
      : null;
    const restDuration = after ? parseDuration(after.after) : parseDuration(rawName);
    const parsedDuration =
      parseDuration(durationCell) ?? numericDuration ?? restDuration;
    const typeCell = typeIdx >= 0 ? cells[typeIdx] ?? '' : '';
    const name =
      (after?.after.replace(DURATION_RE, '').trim() ||
        rawName.replace(DURATION_RE, '').trim() ||
        rawName);
    if (parsedDuration == null) {
      warnings.push(`「${name}」未写检测耗时，已按 5 分钟处理`);
    }
    drafts.push({
      name,
      durationMin: Math.max(0, parsedDuration ?? 5),
      durationInferred: parsedDuration == null,
      taskType: detectTaskType(typeCell || name),
      visitPoint: detectVisitPoint(`${rawName} ${typeCell}`) ?? (after ? visitFromOffset(after.offset) : undefined),
      resourceIds: [],
      raw: line,
      roundOffsetMin: after?.offset,
    });
  }

  return {
    steps: finalizeSteps(drafts),
    warnings,
  };
}

function parseFreeLine(line: string): DraftStep {
  const stripped = stripPrefix(line);
  const waiting = looksLikeWaiting(stripped, detectTaskType(stripped));
  const after = !waiting ? parseAfterPhrase(stripped) : null;

  if (after) {
    const restDuration = parseDuration(after.after);
    const name =
      after.after.replace(DURATION_RE, '').replace(/\s{2,}/g, ' ').trim() ||
      after.after ||
      stripped;
    return {
      name,
      durationMin: restDuration ?? 5,
      durationInferred: restDuration == null,
      taskType: detectTaskType(name),
      visitPoint: detectVisitPoint(stripped) ?? visitFromOffset(after.offset),
      resourceIds: [],
      raw: line,
      roundOffsetMin: after.offset,
    };
  }

  const matches = [...stripped.matchAll(new RegExp(DURATION_RE, 'gi'))];
  let chosen = matches[0];
  if (chosen?.index === 0 && matches[1] && detectVisitPoint(stripped)) {
    chosen = matches[1];
  }
  const durationMin = chosen ? Math.round(Number(chosen[1])) : null;
  let name = stripped;
  if (chosen && chosen.index != null && !waiting) {
    name = stripped.slice(0, chosen.index).replace(/\s{2,}/g, ' ').trim() || stripped;
  }
  const visitPoint = detectVisitPoint(stripped);
  return {
    name,
    durationMin: durationMin ?? 5,
    durationInferred: durationMin == null && !waiting,
    taskType: detectTaskType(name),
    visitPoint,
    resourceIds: [],
    raw: line,
    roundOffsetMin:
      visitPoint === 'Immediate'
        ? 0
        : visitPoint === '30min'
          ? 30
          : visitPoint === '1h'
            ? 60
            : undefined,
  };
}

function looksLikeWaiting(name: string, taskType: string): boolean {
  return taskType === 'waiting' || /等待(?!区)|休息/.test(name);
}

function parseOffsetMinutes(name: string): number | undefined {
  if (!/至|后/.test(name)) return undefined;
  const match = name.match(/(\d+)\s*(?:min|分钟|分)/i);
  if (!match) return undefined;
  return Number(match[1]);
}

function finalizeSteps(drafts: DraftStep[]): WorkflowStepTemplate[] {
  const prepared = drafts.map((draft) => ({
    ...draft,
    waiting:
      looksLikeWaiting(draft.name, draft.taskType) ||
      looksLikeWaiting(draft.raw, draft.taskType),
    roundOffsetMin: inferRoundOffset(draft),
  }));

  const steps: WorkflowStepTemplate[] = prepared.map((draft, index) => {
    const offset = parseOffsetMinutes(draft.raw) ?? parseOffsetMinutes(draft.name);
    const prev = index > 0 ? prepared[index - 1] : undefined;
    const firstOfRound =
      !draft.waiting &&
      draft.roundOffsetMin != null &&
      (prev == null ||
        prev.waiting ||
        prev.roundOffsetMin !== draft.roundOffsetMin);
    let scheduling: StepScheduling = 'sequential';
    let durationMin = Math.max(draft.waiting && offset != null ? 0 : 1, draft.durationMin);
    let targetOffsetMin: number | undefined;
    let visitPoint = draft.visitPoint;

    if (draft.waiting && offset != null) {
      scheduling = 'elastic_fill';
      durationMin = 0;
      targetOffsetMin = offset;
      visitPoint = visitPoint ?? visitFromOffset(offset);
    } else if (firstOfRound && draft.roundOffsetMin != null) {
      scheduling = 'anchor_offset';
      targetOffsetMin = draft.roundOffsetMin;
      visitPoint = visitPoint ?? visitFromOffset(draft.roundOffsetMin);
    }

    return {
      id: slugId(draft.name, index),
      order: index,
      name: draft.name,
      taskType: draft.taskType,
      visitPoint,
      resourceIds: [],
      durationMin,
      color: '#8c8c8c',
      scheduling,
      targetOffsetMin,
      anchorStepId: undefined as string | undefined,
      windowBeforeMin: scheduling === 'anchor_offset' && targetOffsetMin ? 5 : undefined,
      windowAfterMin: scheduling === 'anchor_offset' && targetOffsetMin ? 5 : undefined,
    };
  });

  const productLike =
    steps.find((step) => isProductActivity(step.name, step.taskType)) ?? steps[0];
  for (const step of steps) {
    if (step.scheduling === 'elastic_fill' || step.scheduling === 'anchor_offset') {
      const idx = steps.findIndex((item) => item.id === step.id);
      const previous =
        [...steps.slice(0, idx)]
          .reverse()
          .find((item) => isProductActivity(item.name, item.taskType)) ??
        (productLike && productLike.id !== step.id ? productLike : steps[Math.max(0, idx - 1)]);
      if (previous && previous.id !== step.id) {
        step.anchorStepId = previous.id;
      }
    }
  }

  return assignWorkflowColors(relinkSequentialDependencies(steps));
}

export function parseWorkflowText(text: string): WorkflowImportResult {
  const lines = splitIntoLines(text);
  if (lines.length === 0) {
    return { steps: [], warnings: ['没有识别到任何环节，请按一行一个环节粘贴'] };
  }

  const table = parseTable(lines);
  if (table && table.steps.length > 0) {
    return table;
  }

  const warnings: string[] = [];
  const drafts = lines.map((line) => {
    const draft = parseFreeLine(line);
    if (
      draft.durationInferred &&
      !looksLikeWaiting(draft.name, draft.taskType)
    ) {
      warnings.push(`「${draft.name}」未写检测耗时，已按 5 分钟处理`);
    }
    return draft;
  });

  return {
    steps: finalizeSteps(drafts),
    warnings,
  };
}

export const WORKFLOW_IMPORT_EXAMPLE = `环境适应 20分钟 等待区
BL VISIA 8分钟 VISIA
产品使用 5分钟 操作员
产品使用后5分钟 仪器1
产品使用后5分钟 仪器2
等待至30min
30min VISIA 8分钟 VISIA
30min TEWL 5分钟 TEWL`;
