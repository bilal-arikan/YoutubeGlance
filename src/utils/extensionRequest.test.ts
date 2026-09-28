import { extensionRequest } from './extensionRequest';

describe('Extension requests', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('rejects a closed message channel', async () => {
    (globalThis as any).chrome = { runtime: {
      lastError: { message: 'Message channel closed' },
      sendMessage: (_message: unknown, callback: Function) => callback(),
    } };
    await expect(extensionRequest({})).rejects.toThrow('Message channel closed');
    expect(jest.getTimerCount()).toBe(0);
  });
  it('handles an invalidated extension without leaving a timeout', async () => {
    (globalThis as any).chrome = { runtime: { sendMessage: () => { throw new Error('Extension context invalidated'); } } };
    await expect(extensionRequest({})).rejects.toThrow('Extension context invalidated');
    expect(jest.getTimerCount()).toBe(0);
  });
  it('bounds a worker that never responds', async () => {
    (globalThis as any).chrome = { runtime: { sendMessage: () => {} } };
    const result = extensionRequest({});
    const assertion = expect(result).rejects.toThrow('did not respond');
    jest.advanceTimersByTime(45000);
    await assertion;
  });
});
