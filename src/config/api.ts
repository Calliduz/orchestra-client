/**
 * ORCHESTRA Client API & Telemetry Configuration
 * Dynamically resolves backend host for seamless multi-device LAN demonstrations
 */

export const getApiBaseUrl = (): string => {
  // 1. Explicit environment variable override
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Dynamic host inference (browser environment)
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Connects to backend on port 5000 of the same host (works for localhost and LAN IPs like 192.168.x.x)
    return `${protocol}//${hostname}:5000`;
  }

  // 3. Fallback
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_V1_URL = `${API_BASE_URL}/api/v1`;
export const SOCKET_URL = API_BASE_URL;
