import type { IBucket, ProcessingResult, TaskEnergy, TaskPriority, TiptapDoc } from '../types';

import type { RecurrenceSchedule } from './recurrence.types';

export interface CreateBucketDto {
  content: string;
}

export interface UpdateBucketDto {
  content?: string;
}

// The schedule fields a processed task can carry, reusing RecurrenceSchedule's
// freq/interval/date shape. byWeekday is optional here (unlike the standalone
// recurrence-rule endpoint) since bucket-process only requires it for weekly freq.
export type TaskRecurrence = Omit<RecurrenceSchedule, 'byWeekday' | 'scheduledTime'> & {
  byWeekday?: number[];
};

// Only title is required; an omitted field means "use the task service default".
export interface TaskDetails {
  title: string;
  notes?: string;
  priority?: TaskPriority;
  energy?: TaskEnergy;
  rollsOver?: boolean;
  scheduledFor?: string; // soft intention — ISO date "YYYY-MM-DD"
  scheduledTime?: string; // "HH:MM"
  recurrence?: TaskRecurrence;
  estimatedMinutes?: number;
  url?: string;
}

// Only title is required; an omitted `content` means "use the note service
// default" (the empty doc), which is why it is optional rather than nullable.
export interface NoteDetails {
  title: string;
  content?: TiptapDoc;
}

export interface ProcessBucketDto {
  processingResult: ProcessingResult;
  projectId?: string;
  taskDetails?: TaskDetails;
  noteDetails?: NoteDetails;
}

export type BucketResponse = IBucket;
// The list endpoint wraps items like the other list endpoints: { data: { items: [...] } }.
export type BucketsResponse = { items: IBucket[] };
