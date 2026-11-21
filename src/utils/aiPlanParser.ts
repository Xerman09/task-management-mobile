import { TaskPriority } from '../types';

export interface ParsedPlanTask {
  title: string;
  description?: string;
  priority: TaskPriority;
  category?: string;
  due_date?: string;
  estimated_minutes?: number | null;
  steps: string[];
}

export const TASKFLOW_FORMAT_TEMPLATE = `TASK: Setup Database & Migrations
Priority: high
Due: 2026-11-25
Category: Development
Estimate: 2h
Description: Initialize schema and verify migrations on staging.
Steps:
- [ ] Review database.sql and check indexes
- [ ] Run migrator script and verify tables
- [ ] Test fresh import and rollback

TASK: Build User Profile Settings
Priority: medium
Due: 2026-11-27
Category: Development
Estimate: 1.5h
Description: Allow users to update name, avatar, and password.
Steps:
- [ ] Create avatar upload endpoint
- [ ] Build profile form UI with validation`;

export const TASKFLOW_AI_ASSISTANT_PROMPT = `Based on our project plan above, please convert all action items into the exact TaskFlow import format below so I can paste them directly into my task manager.

RULES:
1. Output ONLY the formatted tasks inside a single plain-text or markdown code block (no extra intro or outro text).
2. Start each main task with: TASK: <Task Title>
3. Optional metadata lines right under TASK:
   - Priority: urgent | high | medium | low  (default: medium)
   - Due: YYYY-MM-DD  (omit if no specific deadline)
   - Category: <Group name, e.g. Work, Development, Design>
   - Estimate: <e.g. 30m, 1.5h, 2h>
   - Description: <1-2 sentence summary>
4. List actionable sub-steps under "Steps:" using:
   - [ ] <Step title>
5. Keep task titles concise and make every step concrete and actionable.

FORMAT EXAMPLE:
${TASKFLOW_FORMAT_TEMPLATE}`;

function normalizePriority(raw?: string): TaskPriority {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'urgent' || val === 'critical' || val === 'p0' || val === 'p1') return 'urgent';
  if (val === 'high' || val === 'p2') return 'high';
  if (val === 'low' || val === 'p4') return 'low';
  return 'medium';
}

function parseEstimateToMinutes(raw?: string): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  const hrMatch = s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)$/);
  if (hrMatch) return Math.max(1, Math.round(parseFloat(hrMatch[1]) * 60));
  const minMatch = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
  if (minMatch) return Math.max(1, Math.round(parseFloat(minMatch[1])));
  const num = parseFloat(s);
  return !Number.isNaN(num) && num > 0 ? Math.round(num) : null;
}

function normalizeDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const match = raw.trim().match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return match ? match[1] : undefined;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function extractInlineMetadata(titleText: string): {
  title: string;
  priority?: TaskPriority;
  due_date?: string;
} {
  let clean = titleText.trim();
  let priority: TaskPriority | undefined;
  let due_date: string | undefined;

  const prioTag = clean.match(/\[(urgent|high|medium|low|critical|p0|p1|p2|p4)\]/i);
  if (prioTag) {
    priority = normalizePriority(prioTag[1]);
    clean = clean.replace(prioTag[0], '').trim();
  }

  const dateTag = clean.match(/(?:@|\(|due:\s*)(\d{4}-\d{2}-\d{2})\)?/i);
  if (dateTag) {
    due_date = dateTag[1];
    clean = clean.replace(dateTag[0], '').trim();
  }

  return { title: clean, priority, due_date };
}

export function parseAiPlanText(
  rawInput: string,
  defaults: { priority?: TaskPriority; category?: string; dueDate?: string } = {}
): ParsedPlanTask[] {
  const cleaned = stripCodeFences(rawInput);
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/);
  const defaultPriority = defaults.priority || 'medium';
  const defaultCategory = defaults.category || 'Work';
  const defaultDueDate = defaults.dueDate || undefined;

  const hasExplicitTasks = lines.some((l) => /^\s*(?:TASK\s*:|#{1,3}\s+)/i.test(l));

  const tasks: ParsedPlanTask[] = [];
  let current: ParsedPlanTask | null = null;
  let inStepsSection = false;

  const pushCurrent = () => {
    if (current && current.title.trim()) {
      tasks.push({
        ...current,
        title: current.title.trim().slice(0, 255),
        steps: current.steps.map((s) => s.trim()).filter(Boolean),
      });
    }
    current = null;
    inStepsSection = false;
  };

  if (hasExplicitTasks) {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const taskPrefixMatch = line.match(/^TASK\s*:\s*(.+)$/i);
      const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
      if (taskPrefixMatch || headingMatch) {
        pushCurrent();
        const rawTitle = (taskPrefixMatch ? taskPrefixMatch[1] : headingMatch![1]).trim();
        const meta = extractInlineMetadata(rawTitle);
        current = {
          title: meta.title || rawTitle,
          priority: meta.priority || defaultPriority,
          category: defaultCategory,
          due_date: meta.due_date || defaultDueDate,
          estimated_minutes: null,
          steps: [],
        };
        continue;
      }

      if (!current) continue;

      if (!inStepsSection) {
        const prioMatch = line.match(/^Priority\s*:\s*(.+)$/i);
        if (prioMatch) {
          current.priority = normalizePriority(prioMatch[1]);
          continue;
        }
        const dueMatch = line.match(/^(?:Due|Due Date|Deadline)\s*:\s*(.+)$/i);
        if (dueMatch) {
          const parsedDate = normalizeDate(dueMatch[1]);
          if (parsedDate) current.due_date = parsedDate;
          continue;
        }
        const catMatch = line.match(/^(?:Category|Group)\s*:\s*(.+)$/i);
        if (catMatch) {
          current.category = catMatch[1].trim() || defaultCategory;
          continue;
        }
        const estMatch = line.match(/^(?:Estimate|Estimated|Time)\s*:\s*(.+)$/i);
        if (estMatch) {
          current.estimated_minutes = parseEstimateToMinutes(estMatch[1]);
          continue;
        }
        const descMatch = line.match(/^(?:Description|Desc|Notes?)\s*:\s*(.+)$/i);
        if (descMatch) {
          current.description = descMatch[1].trim();
          continue;
        }
        if (/^(?:Steps|Subtasks|Checklist)\s*:?$/i.test(line)) {
          inStepsSection = true;
          continue;
        }
      }

      const stepMatch = line.match(/^(?:[-*•]\s*(?:\[[ xX]?\]\s*)?|\d+[.)]\s+)(.+)$/);
      if (stepMatch) {
        inStepsSection = true;
        const stepTitle = stepMatch[1].trim();
        if (stepTitle) current.steps.push(stepTitle);
        continue;
      }

      if (!inStepsSection) {
        current.description = current.description ? `${current.description}\n${line}` : line;
      }
    }

    pushCurrent();
    return tasks;
  }

  const hasIndentedSubItems = lines.some((l) => /^(?:\s{2,}|\t)(?:[-*•]\s*(?:\[[ xX]?\]\s*)?|\d+[.)]\s+).+/.test(l));
  let currentFromBullet = false;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const isIndented = /^(?:\s{2,}|\t)/.test(rawLine);
    const bulletMatch = rawLine.trim().match(/^(?:[-*•]\s*(?:\[[ xX]?\]\s*)?|\d+[.)]\s+)(.+)$/);

    if (hasIndentedSubItems && isIndented && bulletMatch && current) {
      current.steps.push(bulletMatch[1].trim());
      continue;
    }

    if (bulletMatch) {
      if (!hasIndentedSubItems && current && !currentFromBullet) {
        current.steps.push(bulletMatch[1].trim());
        continue;
      }
      pushCurrent();
      currentFromBullet = true;
      const meta = extractInlineMetadata(bulletMatch[1]);
      current = {
        title: meta.title || bulletMatch[1].trim(),
        priority: meta.priority || defaultPriority,
        category: defaultCategory,
        due_date: meta.due_date || defaultDueDate,
        estimated_minutes: null,
        steps: [],
      };
      continue;
    }

    pushCurrent();
    currentFromBullet = false;
    const meta = extractInlineMetadata(rawLine.trim());
    current = {
      title: meta.title || rawLine.trim(),
      priority: meta.priority || defaultPriority,
      category: defaultCategory,
      due_date: meta.due_date || defaultDueDate,
      estimated_minutes: null,
      steps: [],
    };
  }

  pushCurrent();
  return tasks;
}

