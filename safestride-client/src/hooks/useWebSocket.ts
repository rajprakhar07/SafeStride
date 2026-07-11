/**
 * useWebSocket.ts — F-12
 * Socket.io client hook for real-time journey tracking.
 * Connects to /journey namespace, sends pings, receives location updates.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore }    from '../store/authStore';
import { useJourneyStore } from '../store/journeyStore';

const SOCKET_URL    = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const PING_INTERVAL = 10_000; // 10 seconds

export function useWebSocket() {
  const socketRef     = useRef<Socket | null>(null);
  const pingTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const accessToken      = useAuthStore((s) => s.accessToken);
  const setConnected     = useJourneyStore((s) => s.setConnected);
  const setCurrentLocation = useJourneyStore((s) => s.setCurrentLocation);
  const setETA           = useJourneyStore((s) => s.setETA);
  const setDeviationAlert = useJourneyStore((s) => s.setDeviationAlert);
  const clearJourney     = useJourneyStore((s) => s.clearJourney);

  // ── Connect to /journey namespace ────────────────────────────────────────────
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    if (!accessToken) return;

    const socket = io(`${SOCKET_URL}/journey`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: 5,
      reconnectionDelay:   1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('location:update', (data) => {
      setCurrentLocation({
        lat:       data.lat,
        lng:       data.lng,
        accuracy:  data.accuracy,
        speed:     data.speed,
        timestamp: data.timestamp,
      });
      if (data.eta) {
        setETA(new Date(data.eta), data.remainingMeters, data.remainingMinutes);
      }
    });

    socket.on('journey:deviation', () => {
      setDeviationAlert(true);
    });

    socket.on('journey:ended', () => {
      stopPinging();
      clearJourney();
    });

    socket.on('error', (err: { message: string }) => {
      console.error('Socket error:', err.message);
    });

    socketRef.current = socket;
  }, [accessToken, setConnected, setCurrentLocation, setETA, setDeviationAlert, clearJourney]);

  // ── Join a journey room ───────────────────────────────────────────────────────
  const joinJourney = useCallback((journeyId: string) => {
    socketRef.current?.emit('journey:join', { journeyId });
  }, []);

  // ── Send a single location ping ───────────────────────────────────────────────
  const sendPing = useCallback((pingData: {
    lat: number; lng: number; accuracy?: number;
    speed?: number | null; heading?: number | null;
    batteryLevel?: number | null; timestamp?: number;
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('location:ping', pingData);
    }
  }, []);

  // ── Start auto-pinging every 10 seconds ───────────────────────────────────────
  const startPinging = useCallback((getPingData: () => {
    lat: number; lng: number; accuracy?: number;
    speed?: number | null; heading?: number | null;
    batteryLevel?: number | null;
  } | null) => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);

    pingTimerRef.current = setInterval(() => {
      const data = getPingData();
      if (data) sendPing({ ...data, timestamp: Date.now() });
    }, PING_INTERVAL);
  }, [sendPing]);

  // ── Stop auto-pinging ─────────────────────────────────────────────────────────
  const stopPinging = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  // ── End journey via socket ────────────────────────────────────────────────────
  const endJourneySocket = useCallback((journeyId: string) => {
    socketRef.current?.emit('journey:end', { journeyId });
    stopPinging();
  }, [stopPinging]);

  // ── Disconnect ────────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    stopPinging();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
  }, [stopPinging, setConnected]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPinging();
      socketRef.current?.disconnect();
    };
  }, [stopPinging]);

  return { connect, disconnect, joinJourney, sendPing, startPinging, stopPinging, endJourneySocket };
}