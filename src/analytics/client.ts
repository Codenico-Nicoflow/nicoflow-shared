import type { AnalyticsEventName, AnalyticsEventProperties } from './events';

/**
 * Platform seam for the actual capture call — same pattern as
 * TokenStorage/WSLifecycleAdapter in src/api/adapters.ts. Neither this file
 * nor any feature may import posthog-js or posthog-react-native directly;
 * each consuming app constructs its own RawAnalyticsSender (wrapping
 * whichever PostHog SDK it uses) and passes it to createAnalyticsClient.
 */
export interface RawAnalyticsSender {
  capture(eventName: string, properties?: Record<string, unknown>): void;
}

export interface AnalyticsClient {
  capture<Name extends AnalyticsEventName>(
    eventName: Name,
    ...args: AnalyticsEventProperties<Name> extends undefined ? [] : [properties: AnalyticsEventProperties<Name>]
  ): void;
}

export const createAnalyticsClient = (sender: RawAnalyticsSender): AnalyticsClient => ({
  capture: (eventName, ...args) => {
    sender.capture(eventName, args[0] as Record<string, unknown> | undefined);
  },
});
