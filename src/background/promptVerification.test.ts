import { verifyPromptInTab } from './promptVerification';

describe('Read-only delivery verification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<div contenteditable="true"></div>';
    (globalThis as any).chrome = { scripting: {
      executeScript: jest.fn(async ({ func, args }) => [{ result: func(...args) }]),
    } };
  });
  afterEach(() => jest.useRealTimers());

  it('waits for a delayed editor update without changing the page', async () => {
    const editor = document.querySelector('[contenteditable]')!;
    const pending = verifyPromptInTab(7, 'Title\nCaption text');
    setTimeout(() => { editor.textContent = 'Title Caption text'; }, 1000);
    await jest.advanceTimersByTimeAsync(1500);
    await expect(pending).resolves.toBe(true);
    expect(editor.textContent).toBe('Title Caption text');
  });

  it('rejects truncated or unrelated drafts', async () => {
    document.querySelector('[contenteditable]')!.textContent = 'Title';
    const pending = verifyPromptInTab(7, 'Title Caption text');
    await jest.advanceTimersByTimeAsync(8500);
    await expect(pending).resolves.toBe(false);
    expect(document.querySelector('[contenteditable]')!.textContent).toBe('Title');
  });
});
