import { extensionRequest } from './extensionRequest';

export async function deliverPrompt(url: string, data: {
  promptText: string; autoSend: boolean; readAloud: boolean; platform: string;
}): Promise<boolean> {
  let copied = false;
  try {
    await navigator.clipboard.writeText(data.promptText);
    copied = true;
  } catch {
    // Clipboard is a convenience; direct tab injection does not depend on it.
  }
  await extensionRequest({ action: 'openTabAndPaste', url, data });
  return copied;
}
