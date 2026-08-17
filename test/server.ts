import { setupServer } from 'msw/node';

// No default handlers — every test registers exactly the routes it needs via
// server.use(...). Unlike nicoflow-frontend's __tests__/server.ts (which
// preloads the web app's full mock handler set), this package has no app to
// mock: each slice test is self-contained.
export const server = setupServer();
