describe('Worker to AI editor delivery', () => {
  let listener: Function;
  let executeScript: jest.Mock;
  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = '<textarea></textarea><button aria-label="Run">Run</button>';
    executeScript = jest.fn(async ({ func, args }) => [{ result: await func(...args) }]);
    (globalThis as any).chrome = {
      runtime: {
        onMessage: { addListener: (callback: Function) => { listener = callback; } },
        onInstalled: { addListener: jest.fn() },
      },
      tabs: {
        create: jest.fn().mockResolvedValue({ id: 7 }),
        get: jest.fn().mockResolvedValue({ id: 7, status: 'complete' }),
        onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
        onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
      },
      scripting: { executeScript },
    };
    await import('./serviceWorker');
  });

  const request = () => new Promise<any>(resolve => listener({
    action: 'openTabAndPaste', url: 'https://aistudio.google.com/',
    data: { promptText: 'Video title\nFull transcript\nSummary instructions', platform: 'aistudio', autoSend: false },
  }, {}, resolve));

  it('pastes the entire prompt and never sends when auto-send is off', async () => {
    const clicked = jest.fn();
    document.querySelector('button')!.addEventListener('click', clicked);
    await expect(request()).resolves.toEqual({ success: true });
    expect(document.querySelector('textarea')!.value).toBe('Video title\nFull transcript\nSummary instructions');
    expect(clicked).not.toHaveBeenCalled();
  });

  it('returns injection errors to the caller', async () => {
    executeScript.mockRejectedValue(new Error('Cannot access this page'));
    await expect(request()).resolves.toEqual({ success: false, error: 'Cannot access this page' });
  });

  it('does not claim success when the editor is missing', async () => {
    jest.useFakeTimers();
    executeScript.mockResolvedValue([{ result: false }]);
    const pending = request();
    await jest.advanceTimersByTimeAsync(9000);
    await expect(pending).resolves.toEqual({ success: false, error: expect.stringContaining('Could not confirm') });
    jest.useRealTimers();
  });

  it('accepts a missing acknowledgement when the prompt is actually in the editor', async () => {
    executeScript.mockResolvedValueOnce([{ result: undefined }]).mockResolvedValueOnce([{ result: true }]);
    await expect(request()).resolves.toEqual({ success: true });
    expect(executeScript).toHaveBeenCalledTimes(2);
  });

  it('does not claim success when editor input is rejected', async () => {
    document.querySelector('textarea')!.addEventListener('input', event => {
      (event.target as HTMLTextAreaElement).value = '';
    });
    await expect(request()).resolves.toEqual({ success: false, error: expect.stringContaining('did not accept') });
  });
});
