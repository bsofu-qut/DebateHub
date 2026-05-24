jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
}));

import App from './App';

test('exports the DebateHub app component', () => {
  expect(typeof App).toBe('function');
});
