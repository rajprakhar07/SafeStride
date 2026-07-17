/**
 * useVoiceAssistant.ts — updated in F-28
 * Adds always-on SOS keyword detection using SpeechRecognition in continuous mode.
 * Runs silently in background during active journey.
 * No audio sent to server — entirely on-device.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate }     from 'react-router-dom';
import { parseVoiceCommand, type ParsedVoiceCommand } from '../utils/voice.parser';
import { useAuthStore }    from '../store/authStore';
import { useJourneyStore } from '../store/journeyStore';
import { useSOSStore }     from '../store/sosStore';
import { triggerSOS }      from '../services/api/sos.api';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface UseVoiceAssistantReturn {
  voiceState:         VoiceState;
  transcript:         string;
  lastCommand:        ParsedVoiceCommand | null;
  isSupported:        boolean;
  isSOSListening:     boolean;
  startListening:     () => void;
  stopListening:      () => void;
  startSOSKeyword:    () => void;
  stopSOSKeyword:     () => void;
  speak:              (text: string) => void;
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u   = new SpeechSynthesisUtterance(text);
  u.lang    = 'en-IN';
  u.rate    = 0.9;
  u.volume  = 1.0;
  window.speechSynthesis.speak(u);
}

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const navigate      = useNavigate();
  const user          = useAuthStore((s) => s.user);
  const activeJourney = useJourneyStore((s) => s.activeJourney);
  const currentLocation = useJourneyStore((s) => s.currentLocation);
  const clearJourney  = useJourneyStore((s) => s.clearJourney);
  const setSOSActive  = useSOSStore((s) => s.setSOSActive);

  const [voiceState,      setVoiceState]      = useState<VoiceState>('idle');
  const [transcript,      setTranscript]      = useState('');
  const [lastCommand,     setLastCommand]     = useState<ParsedVoiceCommand | null>(null);
  const [isSOSListening,  setIsSOSListening]  = useState(false);

  const recognitionRef    = useRef<SpeechRecognition | null>(null);
  const sosRecognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const sosKeyword  = (user as any)?.preferences?.voiceSOSKeyword || 'help me';

  // ── Handle parsed command ──────────────────────────────────────────────────
  const handleCommand = useCallback(async (command: ParsedVoiceCommand) => {
    setLastCommand(command);
    setVoiceState('processing');

    switch (command.intent) {
      case 'START_JOURNEY': {
        const dest     = command.destination || 'your destination';
        const duration = command.durationMinutes || 20;
        speak(`Starting journey to ${dest}. Duration set to ${duration} minutes. Stay safe!`);
        setTimeout(() => navigate('/journey/start'), 1500);
        break;
      }
      case 'END_JOURNEY': {
        if (activeJourney) {
          speak("Journey ended. You're marked as safe. Glad you're home!");
          clearJourney();
          navigate('/');
        } else {
          speak("No active journey found.");
        }
        break;
      }
      case 'FAKE_CALL': {
        speak("Starting fake call.");
        setTimeout(() => navigate('/?action=fakecall'), 500);
        break;
      }
      case 'SOS_TRIGGER': {
        await fireSilentSOS();
        break;
      }
      default: {
        speak("Sorry, I didn't understand. Try: Start journey home in 20 minutes.");
        break;
      }
    }
    setTimeout(() => setVoiceState('idle'), 2000);
  }, [navigate, activeJourney, clearJourney]);

  // ── Silent SOS trigger ────────────────────────────────────────────────────
  const fireSilentSOS = useCallback(async () => {
    const loc = currentLocation
      ? { lat: currentLocation.lat, lng: currentLocation.lng }
      : { lat: 0, lng: 0 };

    try {
      const sosEvent = await triggerSOS({
        journeyId:   activeJourney?._id || null,
        triggeredBy: 'voice_keyword',
        location:    loc,
      });
      setSOSActive(sosEvent);
      // No visual feedback — completely silent
      console.log('🚨 Silent SOS triggered via voice keyword');
    } catch (err) {
      console.error('Silent SOS failed:', err);
    }
  }, [activeJourney, currentLocation, setSOSActive]);

  // ── Tap-to-talk recognition ───────────────────────────────────────────────
  const createRecognition = useCallback((continuous = false) => {
    if (!isSupported) return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r  = new SR();
    r.lang            = 'en-IN';
    r.continuous      = continuous;
    r.interimResults  = false;
    r.maxAlternatives = 3;
    return r;
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported || voiceState !== 'idle') return;
    const r = createRecognition(false);
    if (!r) return;

    r.onstart  = () => setVoiceState('listening');
    r.onresult = (e: SpeechRecognitionEvent) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) {
        setTranscript(final);
        handleCommand(parseVoiceCommand(final, sosKeyword));
      }
    };
    r.onerror = () => { setVoiceState('error'); setTimeout(() => setVoiceState('idle'), 2000); };
    r.onend   = () => { if (voiceState === 'listening') setVoiceState('idle'); };

    recognitionRef.current = r;
    r.start();
    setTranscript('');
  }, [isSupported, voiceState, createRecognition, handleCommand, sosKeyword]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceState('idle');
  }, []);

  // ── Always-on SOS keyword detection (F-28) ────────────────────────────────
  const startSOSKeyword = useCallback(() => {
    if (!isSupported || isSOSListening) return;

    const r = createRecognition(true); // continuous mode
    if (!r) return;

    r.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.toLowerCase();
        if (text.includes(sosKeyword.toLowerCase())) {
          console.log('🔑 SOS keyword detected:', text);
          fireSilentSOS();
          break;
        }
      }
    };

    // Auto-restart continuous recognition when it stops (browser limitation)
    r.onend = () => {
      if (isSOSListening) {
        try { r.start(); } catch { /* ignore restart errors */ }
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech') console.warn('SOS recognition error:', e.error);
    };

    sosRecognitionRef.current = r;
    try {
      r.start();
      setIsSOSListening(true);
      console.log(`👂 SOS keyword detection started — listening for: "${sosKeyword}"`);
    } catch { /* ignore */ }
  }, [isSupported, isSOSListening, createRecognition, sosKeyword, fireSilentSOS]);

  const stopSOSKeyword = useCallback(() => {
    sosRecognitionRef.current?.stop();
    sosRecognitionRef.current = null;
    setIsSOSListening(false);
    console.log('👂 SOS keyword detection stopped');
  }, []);

  // ── Auto-start SOS keyword during active journey ───────────────────────────
  useEffect(() => {
    if (activeJourney && isSupported) {
      startSOSKeyword();
    } else {
      stopSOSKeyword();
    }
    return () => stopSOSKeyword();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJourney?._id]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      sosRecognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    voiceState, transcript, lastCommand, isSupported, isSOSListening,
    startListening, stopListening, startSOSKeyword, stopSOSKeyword, speak,
  };
}