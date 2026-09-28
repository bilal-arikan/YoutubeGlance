/** Register before checking status so cached pages cannot race the listener. */
export function waitForTabReady(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    };
    const finish = (error?: Error) => { cleanup(); error ? reject(error) : resolve(); };
    const onUpdated = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabId && info.status === 'complete') finish();
    };
    const onRemoved = (id: number) => {
      if (id === tabId) finish(new Error('The AI tab was closed.'));
    };
    const timer = setTimeout(() => finish(new Error('The AI page took too long to load.')), 20000);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs.get(tabId).then(tab => {
      if (tab.status === 'complete') finish();
    }).catch(error => finish(error instanceof Error ? error : new Error(String(error))));
  });
}
