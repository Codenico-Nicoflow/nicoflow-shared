import { describe, expect, it, vi } from 'vitest';

import { createAnalyticsClient } from './client';

describe('createAnalyticsClient', () => {
  it('forwards an event with no properties', () => {
    const sender = { capture: vi.fn() };
    const client = createAnalyticsClient(sender);

    client.capture('app_opened');

    expect(sender.capture).toHaveBeenCalledWith('app_opened', undefined);
  });

  it('forwards an event with typed properties', () => {
    const sender = { capture: vi.fn() };
    const client = createAnalyticsClient(sender);

    client.capture('login_succeeded', { method: 'password' });

    expect(sender.capture).toHaveBeenCalledWith('login_succeeded', { method: 'password' });
  });
});
