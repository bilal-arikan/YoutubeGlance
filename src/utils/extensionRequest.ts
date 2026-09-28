export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Surface disconnected workers and bound requests that never reply. */
export function extensionRequest<T>(message: object): Promise<ExtensionResponse<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The extension did not respond. Refresh the video and try again.')), 45000);
    try {
      chrome.runtime.sendMessage(message, (response: ExtensionResponse<T> | undefined) => {
        clearTimeout(timer);
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message || 'Extension connection failed. Refresh the page.'));
        else if (!response?.success) reject(new Error(response?.error || 'The extension returned no result.'));
        else resolve(response);
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}
