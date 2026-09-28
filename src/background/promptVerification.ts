/** Read-only confirmation accommodates editors that commit pasted text later. */
export async function verifyPromptInTab(tabId: number, prompt: string): Promise<boolean> {
  const deadline = Date.now() + 8000;
  do {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        args: [prompt],
        func: (expected: string) => {
          const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
          return Array.from(document.querySelectorAll<HTMLElement>('textarea, [contenteditable="true"]'))
            .some(editor => {
              const value = editor.tagName === 'TEXTAREA'
                ? (editor as HTMLTextAreaElement).value
                : editor.innerText || editor.textContent || '';
              return normalize(value) === normalize(expected);
            });
        },
      });
      if (results.some(result => result.result === true)) return true;
    } catch {
      // A redirect may briefly destroy the frame; retry reading, never re-send.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  } while (Date.now() < deadline);
  return false;
}
