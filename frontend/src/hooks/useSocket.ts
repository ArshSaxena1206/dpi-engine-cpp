import { useEffect, useState, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';
const POLL_INTERVAL = 5000;

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface AppStats {
  metrics: {
    totalPackets: number;
    forwarded: number;
    dropped: number;
    activeFlows: number;
  };
  apps: { name: string; count: number; percentage: number; isBlocked: boolean }[];
  domains: { domain: string; app: string }[];
  rawOutput?: string;
}

// Singleton socket – shared across all components
let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
  }
  return globalSocket;
}

/**
 * Custom hook that returns the shared Socket.io instance,
 * real-time stats, and the connection status.
 *
 * Falls back to polling /api/v1/stats every 5 s when the
 * WebSocket connection is unavailable.
 */
export function useSocket() {
  const socket = getSocket();
  const [status, setStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'disconnected',
  );
  const [stats, setStats] = useState<AppStats | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fallback polling ──────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/stats`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setStats(json.data);
        }
      } catch { /* backend unreachable – ignore */ }
    }, POLL_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    const onConnect = () => {
      setStatus('connected');
      stopPolling();
    };
    const onDisconnect = () => {
      setStatus('disconnected');
      startPolling();
    };
    const onReconnecting = () => setStatus('reconnecting');
    const onStatsUpdate = (data: AppStats) => setStats(data);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnecting);
    socket.on('stats:update', onStatsUpdate);

    // If already disconnected at mount, start polling
    if (!socket.connected) startPolling();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnecting);
      socket.off('stats:update', onStatsUpdate);
      stopPolling();
    };
  }, [socket, startPolling, stopPolling]);

  return { socket, status, stats };
}
