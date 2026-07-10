/**
 * Returns the base URL for API calls.
 * - In dev mode (Vite dev server), relative '/api' paths are proxied automatically.
 * - In production Electron (file://), we need the full URL to the embedded server.
 */
export function getApiBase(): string {
  // If running inside Electron in production (file:// protocol), use direct URL
  if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
    return (window as any).electronAPI.getBackofficeUrl();
  }

  // If page is loaded from file:// (fallback detection)
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://127.0.0.1:3001';
  }

  // Dev mode or browser: relative path works with Vite proxy
  return '';
}

/**
 * Wrapper around fetch that prepends the API base URL.
 * Includes a 10-second timeout to prevent hanging requests.
 */
export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const base = getApiBase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  return fetch(`${base}${path}`, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}
