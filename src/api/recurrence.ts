import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { createApi } from '@reduxjs/toolkit/query/react';

import type { ApiEnvelope, IRecurrenceRule } from '../types';
import { RECURRENCE_API } from '../types';

import type { ApiBaseQuery } from './area';
import type {
  ConvertToRecurringRequest,
  CreateRecurrenceRuleRequest,
  ListRecurrenceRulesRequest,
  ListRecurrenceRulesResponse,
  PauseRecurrenceRuleRequest,
  RecurrenceStatsResponse,
  UpdateRecurrenceRuleRequest,
} from './recurrence.types';
import type { createTaskApi } from './tasks';

// Tags don't cross createApi instances — the constructed taskApi is injected
// so the task lists it owns can be invalidated directly.
export type TaskApi = ReturnType<typeof createTaskApi>;

// Recurrence rule data layer (E-050). Every mutation also changes the task rows
// the rule owns — creating a rule materializes instance #1, editing re-stamps the
// live instance, deleting reaps the pending one — so each invalidates 'Task' on
// taskApi as well as its own tag. 'RecurrenceStats' is separate because stats
// are derived from occurrence rows and move when a task is completed, not only
// when the rule itself changes.
export const createRecurrenceApi = (baseQuery: ApiBaseQuery, taskApi: TaskApi) => {
  const refreshTasksOnSuccess = async (
    _arg: unknown,
    { dispatch, queryFulfilled }: { dispatch: Dispatch<UnknownAction>; queryFulfilled: Promise<unknown> }
  ) => {
    try {
      await queryFulfilled;
      dispatch(taskApi.util.invalidateTags(['Task', 'TimeSpread']));
    } catch {
      // mutation failed — nothing to refresh.
    }
  };

  const recurrenceApi = createApi({
    reducerPath: 'recurrenceApi',
    baseQuery,
    tagTypes: ['RecurrenceRule', 'RecurrenceStats'],
    endpoints: builder => ({
      getRecurrenceRules: builder.query<ListRecurrenceRulesResponse, ListRecurrenceRulesRequest>({
        query: ({ projectId } = {}) => {
          const qs = projectId ? `?${new URLSearchParams({ projectId }).toString()}` : '';
          return `${RECURRENCE_API.LIST}${qs}`;
        },
        transformResponse: (raw: ApiEnvelope<ListRecurrenceRulesResponse>) => raw.data,
        transformErrorResponse: error => error.data,
        providesTags: result =>
          result
            ? [
                ...result.items.map(({ id }) => ({ type: 'RecurrenceRule' as const, id })),
                { type: 'RecurrenceRule' as const, id: 'LIST' },
              ]
            : [{ type: 'RecurrenceRule' as const, id: 'LIST' }],
      }),

      getRecurrenceRule: builder.query<IRecurrenceRule, string>({
        query: id => `${RECURRENCE_API.DETAIL}${id}`,
        transformResponse: (raw: ApiEnvelope<IRecurrenceRule>) => raw.data,
        transformErrorResponse: error => error.data,
        providesTags: (_result, _error, id) => [{ type: 'RecurrenceRule', id }],
      }),

      getRecurrenceStats: builder.query<RecurrenceStatsResponse, string>({
        query: id => `${RECURRENCE_API.STATS}${id}/stats`,
        transformResponse: (raw: ApiEnvelope<RecurrenceStatsResponse>) => raw.data,
        transformErrorResponse: error => error.data,
        providesTags: (_result, _error, id) => [{ type: 'RecurrenceStats', id }],
      }),

      createRecurrenceRule: builder.mutation<IRecurrenceRule, CreateRecurrenceRuleRequest>({
        query: ({ projectId, ...body }) => ({
          url: `${RECURRENCE_API.CREATE}${projectId}/recurrence-rules`,
          method: 'POST',
          body,
        }),
        transformResponse: (raw: ApiEnvelope<IRecurrenceRule>) => raw.data,
        transformErrorResponse: error => error.data,
        invalidatesTags: [{ type: 'RecurrenceRule', id: 'LIST' }],
        onQueryStarted: refreshTasksOnSuccess,
      }),

      updateRecurrenceRule: builder.mutation<IRecurrenceRule, UpdateRecurrenceRuleRequest>({
        query: ({ id, ...body }) => ({
          url: `${RECURRENCE_API.DETAIL}${id}`,
          method: 'PATCH',
          body,
        }),
        transformResponse: (raw: ApiEnvelope<IRecurrenceRule>) => raw.data,
        transformErrorResponse: error => error.data,
        invalidatesTags: (_result, _error, { id }) => [
          { type: 'RecurrenceRule', id },
          { type: 'RecurrenceRule', id: 'LIST' },
        ],
        onQueryStarted: refreshTasksOnSuccess,
      }),

      pauseRecurrenceRule: builder.mutation<IRecurrenceRule, PauseRecurrenceRuleRequest>({
        query: ({ id, paused }) => ({
          url: `${RECURRENCE_API.PAUSE}${id}/pause`,
          method: 'PATCH',
          body: { paused },
        }),
        transformResponse: (raw: ApiEnvelope<IRecurrenceRule>) => raw.data,
        transformErrorResponse: error => error.data,
        invalidatesTags: (_result, _error, { id }) => [
          { type: 'RecurrenceRule', id },
          { type: 'RecurrenceRule', id: 'LIST' },
        ],
        onQueryStarted: refreshTasksOnSuccess,
      }),

      // Turns an existing plain task into instance #1 of a new rule, IN PLACE —
      // no new task row. Counterpart to createRecurrenceRule for a task that
      // already exists rather than one being created fresh. Invalidates the
      // task family too since the converted task's shape (recurrenceRuleId,
      // status, scheduledFor/scheduledTime) changed under it.
      convertTaskToRecurring: builder.mutation<IRecurrenceRule, ConvertToRecurringRequest>({
        query: ({ taskId, ...body }) => ({
          url: `${RECURRENCE_API.CONVERT}${taskId}/convert-to-recurring`,
          method: 'POST',
          body,
        }),
        transformResponse: (raw: ApiEnvelope<IRecurrenceRule>) => raw.data,
        transformErrorResponse: error => error.data,
        invalidatesTags: [{ type: 'RecurrenceRule', id: 'LIST' }],
        onQueryStarted: refreshTasksOnSuccess,
      }),

      deleteRecurrenceRule: builder.mutation<void, string>({
        query: id => ({
          url: `${RECURRENCE_API.DETAIL}${id}`,
          method: 'DELETE',
        }),
        transformErrorResponse: error => error.data,
        invalidatesTags: (_result, _error, id) => [
          { type: 'RecurrenceRule', id },
          { type: 'RecurrenceRule', id: 'LIST' },
        ],
        onQueryStarted: refreshTasksOnSuccess,
      }),
    }),
  });

  return recurrenceApi;
};
