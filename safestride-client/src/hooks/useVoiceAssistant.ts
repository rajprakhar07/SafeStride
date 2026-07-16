/**
 * useVoiceAssistant.ts — F-27
 * Voice assistant hook using Web Speech API.
 *
 * Features:
 *   - Tap-to-talk (manual activation)
 *   - Parses transcript with voice.parser.ts
 *   - Triggers: start journey, end journey, fake call
 *   - Spoken confirmation via SpeechSynthesis
 *   - Works in Chrome Android (primary target)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate }     from 'react-router-dom';
import { parseVoiceCommand, type ParsedVoiceCommand } from '../utils/voice.parser';
import { useAuthStore }    from '../store/authStore';
import { useJourneyStore } from '../store/journeyStore';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface UseVoiceAssistantReturn {
  voiceState:   VoiceState;
  transcript:   string;
  lastCommand:  ParsedVoiceCommand | null;
  isSupported:  boolean;
  startListening: () => void;
  stopListening:  () => void;
  speak:          (text: string) => void;
}

// ─── Speech synthesis helper ──────────────────────────────────────────────────
function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // cancel any ongoing speech
  const utterance       = new SpeechSynthesisUtterance(text);
  utterance.lang        = 'en-IN'; // Indian English
  utterance.rate        = 0.9;
  utterance.pitch       = 1.0;
  utterance.volume      = 1.0;
  window.speechSynthesis.speak(utterance);
}

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const navigate      = useNavigate();
  const user          = useAuthStore((s) => s.user);
  const activeJourney = useJourneyStore((s) => s.activeJourney);
  const clearJourney  = useJourneyStore((s) => s.clearJourney);

  const [voiceState,  setVoiceState]  = useState<VoiceState>('idle');
  const [transcript,  setTranscript]  = useState('');
  const [lastCommand, setLastCommand] = useState<ParsedVoiceCommand | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported    = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  // Get user's SOS keyword from preferences (stored in authStore)
  const sosKeyword = (user as any)?.preferences?.voiceSOSKeyword || 'help me';

  // ── Handle parsed command ──────────────────────────────────────────────────
  const handleCommand = useCallback(async (command: ParsedVoiceCommand) => {
    setLastCommand(command);
    setVoiceState('processing');

    switch (command.intent) {
      case 'START_JOURNEY': {
        const dest    = command.destination || 'your destination';
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
        // SOS is handled by useSOS hook — just navigate
        speak("SOS triggered. Help is on the way.");
        break;
      }

      case 'UNKNOWN':
      default: {
        speak("Sorry, I didn't understand that. Try saying: Start journey home in 20 minutes.");
        break;
      }
    }

    setTimeout(() => setVoiceState('idle'), 2000);
  }, [navigate, activeJourney, clearJourney]);

  // ── Initialize SpeechRecognition ──────────────────────────────────────────
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition       = new SpeechRecognition();

    recognition.lang           = 'en-IN';
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setVoiceState('listening');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
        const command = parseVoiceCommand(finalTranscript, sosKeyword);
        handleCommand(command);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        speak("I didn't hear anything. Please try again.");
      }
      setVoiceState('error');
      setTimeout(() => setVoiceState('idle'), 2000);
    };

    recognition.onend = () => {
      if (voiceState === 'listening') setVoiceState('idle');
    };

    return recognition;
  }, [isSupported, sosKeyword, handleCommand, voiceState]);

  // ── Start listening ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) {
      alert('Voice commands are not supported in this browser. Please use Chrome on Android.');
      return;
    }

    if (voiceState !== 'idle') return;

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setTranscript('');
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setVoiceState('error');
    }
  }, [isSupported, voiceState, initRecognition]);

  // ── Stop listening ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceState('idle');
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    voiceState,
    transcript,
    lastCommand,
    isSupported,
    startListening,
    stopListening,
    speak,
  };
}