import type { IRecurrenceRule, IRecurrenceStats, RecurrenceFreq } from '../types';

// The schedule half of a rule, shared by create and update. Kept separate from
// the template half so RecurrenceField can own exactly this shape.
export type RecurrenceSchedule = {
  freq: RecurrenceFreq;
  interval: number;
  byWeekday: number[];
  byMonthday?: number | null;
  startDate: string;
  endDate?: string | null;
  // "HH:MM" or null for all-day. Pro-only to SET — the server's 403 becomes the
  // dialog's upgrade prompt; clearing is open on every plan.
  scheduledTime?: string | null;
};

// POST /projects/:projectId/recurrence-rules — creates the rule and materializes
// instance #1 server-side, in the same transaction.
export type CreateRecurrenceRuleRequest = RecurrenceSchedule & {
  projectId: string;
  title: string;
  notes?: string | null;
  priority?: string;
  energy?: string;
  estimatedMinutes?: number | null;
};

// POST /tasks/:taskId/convert-to-recurring — turns an existing plain task into
// instance #1 of a new rule, IN PLACE (no new task row). Same body shape as
// create, but the server ignores the template fields (title/notes/priority/
// energy/estimatedMinutes) and projectId — it reads those straight off the
// task instead, so the produced rule can't drift from what's actually stored.
// They're still typed here so a caller can build the payload the same way it
// builds CreateRecurrenceRuleRequest, without the type lying about what's
// actually read.
export type ConvertToRecurringRequest = RecurrenceSchedule & {
  taskId: string;
  title: string;
  notes?: string | null;
  priority?: string;
  energy?: string;
  estimatedMinutes?: number | null;
};

// PATCH /recurrence-rules/:id — every field optional. `endDate: null` explicitly
// clears the end condition (reviving an exhausted series), which is why it is
// nullable rather than merely absent.
export type UpdateRecurrenceRuleRequest = Partial<Omit<RecurrenceSchedule, 'byWeekday'>> & {
  id: string;
  title?: string;
  notes?: string | null;
  priority?: string;
  energy?: string;
  estimatedMinutes?: number | null;
  byWeekday?: number[];
};

export type ListRecurrenceRulesRequest = {
  projectId?: string;
};

export type ListRecurrenceRulesResponse = {
  items: IRecurrenceRule[];
};

export type PauseRecurrenceRuleRequest = {
  id: string;
  paused: boolean;
};

export type RecurrenceStatsResponse = IRecurrenceStats;

// Re-export to avoid consumers needing to import from ../types
// for the individual interfaces — they only need this types file.
export type { IRecurrenceRule, IRecurrenceStats };
