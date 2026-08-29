import { createApi } from '@reduxjs/toolkit/query/react';

import type { ApiEnvelope, ISubtask } from '../types';
import { SUBTASK_API } from '../types';

import type { ApiBaseQuery } from './area';
import type {
  CreateSubtaskRequest,
  CreateSubtaskResponse,
  DeleteSubtaskRequest,
  DeleteSubtaskResponse,
  GetSubtasksRequest,
  GetSubtasksResponse,
  UpdateSubtaskRequest,
  UpdateSubtaskResponse,
} from './subtasks.types';

export const createSubtaskApi = (baseQuery: ApiBaseQuery) => {
  const subtaskApi = createApi({
    reducerPath: 'subtaskApi',
    baseQuery,
    tagTypes: ['Subtask'],
    endpoints: builder => ({
      getSubtasks: builder.query<GetSubtasksResponse, GetSubtasksRequest>({
        query: taskId => SUBTASK_API.subtasks(taskId),
        // List endpoints wrap the array as { items } inside the data envelope.
        transformResponse: (raw: ApiEnvelope<{ items: ISubtask[] }>) => raw.data.items,
        transformErrorResponse: error => error.data,
        providesTags: (_result, _error, taskId) => [{ type: 'Subtask', id: taskId }],
      }),
      createSubtask: builder.mutation<CreateSubtaskResponse, CreateSubtaskRequest>({
        query: ({ taskId, ...body }) => ({
          url: SUBTASK_API.subtasks(taskId),
          method: 'POST',
          body,
        }),
        transformResponse: (raw: ApiEnvelope<CreateSubtaskResponse>) => raw.data,
        transformErrorResponse: error => error.data,
        invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Subtask', id: taskId }],
      }),
      updateSubtask: builder.mutation<UpdateSubtaskResponse, UpdateSubtaskRequest>({
        query: ({ taskId, id, ...body }) => ({
          url: SUBTASK_API.subtask(taskId, id),
          method: 'PATCH',
          body,
        }),
        transformResponse: (raw: ApiEnvelope<UpdateSubtaskResponse>) => raw.data,
        transformErrorResponse: error => error.data,
        // Optimistic: the checkbox toggle should feel instant, not wait a
        // network round-trip — a filled-but-not-yet-ticked checkbox for the
        // gap between tap and response read as a rendering bug on mobile.
        onQueryStarted: async ({ taskId, id, ...body }, { dispatch, queryFulfilled }) => {
          const patch = dispatch(
            subtaskApi.util.updateQueryData('getSubtasks', taskId, draft => {
              const found = draft.find(subtask => subtask.id === id);
              if (found) Object.assign(found, body);
            })
          );
          try {
            await queryFulfilled;
          } catch {
            patch.undo();
          }
        },
        invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Subtask', id: taskId }],
      }),
      deleteSubtask: builder.mutation<DeleteSubtaskResponse, DeleteSubtaskRequest>({
        query: ({ taskId, id }) => ({
          url: SUBTASK_API.subtask(taskId, id),
          method: 'DELETE',
        }),
        transformErrorResponse: error => error.data,
        invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Subtask', id: taskId }],
      }),
    }),
  });

  return subtaskApi;
};
