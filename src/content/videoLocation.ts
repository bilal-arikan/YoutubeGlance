export function getVideoId(): string | null {
  if (window.location.pathname !== '/watch') return null;
  const id = new URL(window.location.href).searchParams.get('v');
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}

export function isYouTubeVideoURL(): boolean {
  return ['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(window.location.hostname)
    && getVideoId() !== null;
}
