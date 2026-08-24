import { z } from 'zod';

import type { RecurrenceFreq as RecurrenceFreqValue } from '../types';
import { MONTHDAY_LAST, RECURRENCE_MAX_INTERVAL, RECURRENCE_MIN_INTERVAL, RecurrenceFreq } from '../types';

import { taskSchema } from './task.schema';

const V = {
  bucketContentRequired: 'validation.bucketContentRequired',
  bucketContentMax: 'validation.bucketContentMax',
  processingResultInvalid: 'validation.processingResultInvalid',
  scheduledTimeInvalid: 'validation.scheduledTimeInvalid',
  freqInvalid: 'validation.recurrenceFreqInvalid',
  intervalRange: 'validation.recurrenceIntervalRange',
  monthdayRange: 'validation.recurrenceMonthdayRange',
} as const;

export const bucketSchema = z.object({
  content: z.string().min(1, V.bucketContentRequired).max(500, V.bucketContentMax),
});

// Mirrors RecurrenceSchedule minus byWeekday's required-array/scheduledTime —
// bucket-process nests scheduledTime on taskDetails instead.
const taskRecurrenceSchema = z.object({
  freq: z.enum(Object.values(RecurrenceFreq) as [RecurrenceFreqValue, ...RecurrenceFreqValue[]], {
    error: V.freqInvalid,
  }),
  interval: z.number().min(RECURRENCE_MIN_INTERVAL).max(RECURRENCE_MAX_INTERVAL, V.intervalRange),
  byWeekday: z.array(z.number()).optional(),
  byMonthday: z
    .number()
    .refine(value => value === MONTHDAY_LAST || (value >= 1 && value <= 31), V.monthdayRange)
    .optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
});

export const processBucketSchema = z.object({
  processingResult: z.enum(['task', 'note', 'trash'], { error: V.processingResultInvalid }),
  projectId: z.string().optional(),
  taskDetails: taskSchema
    .extend({
      scheduledTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, V.scheduledTimeInvalid)
        .optional()
        .nullable(),
      recurrence: taskRecurrenceSchema.optional(),
    })
    .optional(),
});

export type BucketFormData = z.infer<typeof bucketSchema>;
export type ProcessBucketFormData = z.output<typeof processBucketSchema>;
