import { deliverPrompt } from './promptDelivery';

describe('Prompt delivery', () => {
  const sendMessage = jest.fn();
  const writeText = jest.fn();
  const data = { promptText: 'Video title and transcript', autoSend: false, readAloud: false, platform: 'chatgpt' };
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).chrome = { runtime: { sendMessage } };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    sendMessage.mockImplementation((_message, callback) => callback({ success: true }));
  });

  it('opens the AI tab even when clipboard permission is denied', async () => {
    writeText.mockRejectedValue(new DOMException('Document is not focused', 'NotAllowedError'));
    await expect(deliverPrompt('https://chatgpt.com', data)).resolves.toBe(false);
    expect(sendMessage).toHaveBeenCalledWith({ action: 'openTabAndPaste', url: 'https://chatgpt.com', data }, expect.any(Function));
    expect(sendMessage.mock.calls[0][0].data.autoSend).toBe(false);
  });

  it('keeps clipboard backup when available', async () => {
    writeText.mockResolvedValue(undefined);
    await expect(deliverPrompt('https://chatgpt.com', data)).resolves.toBe(true);
  });

  it('reports delivery failure instead of claiming success', async () => {
    writeText.mockResolvedValue(undefined);
    sendMessage.mockImplementation((_message, callback) => callback({ success: false, error: 'AI editor not found' }));
    await expect(deliverPrompt('https://chatgpt.com', data)).rejects.toThrow('AI editor not found');
  });
});
