import { waitForTabReady } from './tabReady';

describe('AI tab readiness', () => {
  let tabs: any;
  beforeEach(() => {
    jest.useFakeTimers();
    tabs = {
      get: jest.fn().mockResolvedValue({ status: 'loading' }),
      onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
      onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
    };
    (globalThis as any).chrome = { tabs };
  });
  afterEach(() => jest.useRealTimers());

  it('handles a cached tab that completed before the listener was attached', async () => {
    tabs.get.mockResolvedValue({ status: 'complete' });
    await waitForTabReady(10);
    expect(tabs.onUpdated.removeListener).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('waits for the correct tab and cleans up listeners', async () => {
    const pending = waitForTabReady(10);
    const onUpdated = tabs.onUpdated.addListener.mock.calls[0][0];
    onUpdated(11, { status: 'complete' });
    expect(tabs.onUpdated.removeListener).not.toHaveBeenCalled();
    onUpdated(10, { status: 'complete' });
    await pending;
    expect(tabs.onRemoved.removeListener).toHaveBeenCalled();
  });

  it('reports a tab closed while loading', async () => {
    const pending = waitForTabReady(10);
    tabs.onRemoved.addListener.mock.calls[0][0](10);
    await expect(pending).rejects.toThrow('closed');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reports load timeout instead of leaving a listener', async () => {
    const pending = waitForTabReady(10);
    const assertion = expect(pending).rejects.toThrow('too long');
    jest.advanceTimersByTime(20000);
    await assertion;
    expect(tabs.onUpdated.removeListener).toHaveBeenCalled();
  });
});
