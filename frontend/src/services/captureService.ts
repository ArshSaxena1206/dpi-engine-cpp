const API = 'http://localhost:3001/api/v1';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export interface NetworkInterface {
  id: string;
  name: string;
  description: string;
  ipAddress: string;
  isUp: boolean;
}

export interface CaptureParams {
  interface: string;
  duration: 30 | 60 | 300;
  filter?: string;
  autoAnalyze: boolean;
}

export interface NpcapStatus {
  installed: boolean;
  path: string | null;
}

export interface CaptureSession {
  sessionId: string;
  outputPath: string;
}

export interface StopResult {
  sessionId: string;
  stopped: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);
  let body: { success: boolean; data?: T; error?: { message?: string } };
  try {
    body = await res.json();
  } catch {
    throw new Error('Invalid JSON response from server');
  }
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Check whether npcap is installed on the host machine.
 */
export async function checkNpcap(): Promise<NpcapStatus> {
  return request<NpcapStatus>(`${API}/capture/check-npcap`);
}

/**
 * Fetch the list of available network interfaces.
 */
export async function getInterfaces(): Promise<NetworkInterface[]> {
  return request<NetworkInterface[]>(`${API}/capture/interfaces`);
}

/**
 * Start a live capture session.
 * Returns the sessionId to correlate WebSocket events.
 */
export async function startCapture(params: CaptureParams): Promise<CaptureSession> {
  return request<CaptureSession>(`${API}/capture/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

/**
 * Stop an active capture session early.
 */
export async function stopCapture(sessionId: string): Promise<StopResult> {
  return request<StopResult>(`${API}/capture/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}
