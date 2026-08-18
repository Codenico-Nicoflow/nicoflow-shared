/**
 * The single typed event taxonomy for product analytics (PostHog). No
 * feature on any platform calls `capture('some_string')` directly — every
 * event is a key in this map, so a typo or an abandoned event name is a
 * compile error, not a silent gap in a dashboard funnel six months later.
 *
 * Each event's properties are typed here too. `undefined` (no properties)
 * is a valid value, not the absence of a definition — an event with no
 * useful properties still belongs in the map.
 */
export interface AnalyticsEvents {
  app_opened: undefined;
  login_clicked: undefined;
  login_succeeded: { method: 'password' };
  signup_succeeded: undefined;
  task_created: { source: 'quick_add' | 'inbox_process' | 'project_view' };
  task_completed: { taskId: string };
  upgrade_clicked: { surface: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

export type AnalyticsEventProperties<Name extends AnalyticsEventName> = AnalyticsEvents[Name];
