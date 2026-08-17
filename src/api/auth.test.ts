import { configureStore } from '@reduxjs/toolkit';
import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../test/server';
import type { IUser } from '../types';

import { createAuthApi } from './auth';

const API = 'http://localhost:8080/v1';

const baseQuery = fetchBaseQuery({ baseUrl: API });

const makeUser = (overrides: Partial<IUser> = {}): IUser =>
  ({
    id: 'user-1',
    email: 'nico@example.com',
    username: 'nico',
    plan: 'free',
    ...overrides,
  }) as IUser;

const makeStore = () => {
  const actions = { clearAuth: () => ({ type: 'auth/clearAuth' }), setToken: () => ({ type: 'auth/setToken', payload: null }), setUser: () => ({ type: 'auth/setUser', payload: null }) };
  const authApi = createAuthApi(baseQuery, actions, () => 'UTC');
  const store = configureStore({
    reducer: { [authApi.reducerPath]: authApi.reducer },
    middleware: gDM => gDM().concat(authApi.middleware),
  });
  return { store, authApi };
};

describe('authApi.login / register platform', () => {
  it('defaults platform to "web" when the caller omits it', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { token: 't', refreshToken: 'r', user: makeUser() }, error: null });
      })
    );

    const { store, authApi } = makeStore();
    await store.dispatch(authApi.endpoints.login.initiate({ identifier: 'nico', password: 'pw', remember: false }));

    expect(body).toEqual(expect.objectContaining({ platform: 'web' }));
  });

  it('passes platform: "mobile" through when the caller specifies it', async () => {
    let loginBody: unknown;
    let registerBody: unknown;
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        loginBody = await request.json();
        return HttpResponse.json({ data: { token: 't', refreshToken: 'r', user: makeUser() }, error: null });
      }),
      http.post(`${API}/auth/register`, async ({ request }) => {
        registerBody = await request.json();
        return HttpResponse.json({ data: { token: 't', refreshToken: 'r', user: makeUser() }, error: null });
      })
    );

    const { store, authApi } = makeStore();
    await store.dispatch(
      authApi.endpoints.login.initiate({ identifier: 'nico', password: 'pw', remember: false, platform: 'mobile' })
    );
    await store.dispatch(
      authApi.endpoints.register.initiate({
        email: 'nico@example.com',
        password: 'pw',
        username: 'nico',
        platform: 'mobile',
      })
    );

    expect(loginBody).toEqual(expect.objectContaining({ platform: 'mobile' }));
    expect(registerBody).toEqual(expect.objectContaining({ platform: 'mobile' }));
  });
});

describe('authApi.refreshToken', () => {
  it('omits the request body when called with no args (web: cookie-based refresh)', async () => {
    let bodyText: string | undefined;
    server.use(
      http.post(`${API}/auth/refresh-token`, async ({ request }) => {
        bodyText = await request.text();
        return HttpResponse.json({ data: { token: 't', refreshToken: 'r', user: makeUser() }, error: null });
      })
    );

    const { store, authApi } = makeStore();
    const res = await store.dispatch(authApi.endpoints.refreshToken.initiate());

    expect(bodyText).toBe('');
    expect('data' in res ? res.data : undefined).toEqual(expect.objectContaining({ token: 't' }));
  });

  it('sends { refreshToken } in the body when called with a token (mobile: no cookie jar)', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/auth/refresh-token`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { token: 't2', refreshToken: 'r2', user: makeUser() }, error: null });
      })
    );

    const { store, authApi } = makeStore();
    const res = await store.dispatch(authApi.endpoints.refreshToken.initiate({ refreshToken: 'stored-raw-token' }));

    expect(body).toEqual({ refreshToken: 'stored-raw-token' });
    expect('data' in res ? res.data : undefined).toEqual(expect.objectContaining({ token: 't2' }));
  });
});
