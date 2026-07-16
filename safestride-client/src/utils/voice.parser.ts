/**
 * voice.parser.ts — F-26
 * NLP intent parser for voice commands using regex patterns.
 * Runs entirely on-device — nothing sent to server.
 *
 * Supported intents:
 *   START_JOURNEY  — "Start journey home in 20 minutes"
 *   END_JOURNEY    — "I'm home / Reached / Journey complete"
 *   SOS_TRIGGER    — custom codeword (checked separately)
 *   FAKE_CALL      — "Fake call / Call mom"
 *   UNKNOWN        — anything else
 */

export type VoiceIntent =
  | 'START_JOURNEY'
  | 'END_JOURNEY'
  | 'SOS_TRIGGER'
  | 'FAKE_CALL'
  | 'UNKNOWN';

export interface ParsedVoiceCommand {
  intent:          VoiceIntent;
  transcript:      string;
  destination?:    string;   // extracted destination name
  durationMinutes?: number;  // extracted duration in minutes
  confidence:      number;   // 0-1
}

// ─── Saved places aliases ─────────────────────────────────────────────────────
const PLACE_ALIASES: Record<string, string> = {
  home:     'home',
  house:    'home',
  office:   'work',
  work:     'work',
  college:  'college',
  school:   'college',
  station:  'station',
};

// ─── Regex patterns ───────────────────────────────────────────────────────────
const PATTERNS = {
  START_JOURNEY: [
    /(?:start|begin|starting)\s+(?:journey|trip|travel|tracking)/i,
    /(?:going|heading|walking|travelling?|commuting)\s+(?:to|towards?)\s+(.+?)(?:\s+in\s+(\d+)\s*(?:min(?:utes?)?|mins?))?$/i,
    /i(?:'?m)?\s+(?:going|leaving|heading|walking)\s+(?:home|to\s+(.+?))?(?:\s+in\s+(\d+)\s*(?:min(?:utes?)?|mins?))?/i,
    /(?:take me|navigate|route)\s+(?:to|home)/i,
  ],

  END_JOURNEY: [
    /(?:i(?:'?m)?\s+)?(?:home|reached|arrived|safe|here)\s*(?:now|already)?/i,
    /journey\s+(?:over|done|complete|ended|finished)/i,
    /(?:stop|end|cancel|finish)\s+(?:journey|tracking|trip)/i,
    /(?:i(?:'?m)?\s+)?(?:safe|okay|ok)\s+now/i,
  ],

  FAKE_CALL: [
    /(?:fake|pretend|simulate)\s+(?:call|phone|ring)/i,
    /call\s+(?:mom|dad|friend|sister|brother|home)/i,
    /(?:make|start)\s+(?:a\s+)?(?:call|phone\s+call)/i,
  ],
};

// ─── Duration extractor ───────────────────────────────────────────────────────
function extractDuration(text: string): number | undefined {
  const patterns = [
    /(\d+)\s*(?:min(?:utes?)?|mins?)/i,
    /(\d+)\s*(?:hour|hr)s?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      // Convert hours to minutes
      if (pattern.source.includes('hour')) return value * 60;
      return value;
    }
  }
  return undefined;
}

// ─── Destination extractor ────────────────────────────────────────────────────
function extractDestination(text: string): string | undefined {
  // Try to extract "to X" or "towards X"
  const toMatch = text.match(/(?:to|towards?)\s+([a-z\s]+?)(?:\s+in\s+\d+|\s*$)/i);
  if (toMatch) {
    const dest = toMatch[1].trim().toLowerCase();
    return PLACE_ALIASES[dest] || dest;
  }

  // Check for saved place keywords
  for (const [alias, place] of Object.entries(PLACE_ALIASES)) {
    if (text.toLowerCase().includes(alias)) return place;
  }

  return undefined;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a voice transcript into a structured intent.
 * @param transcript — raw speech recognition output
 * @param sosKeyword — user's custom SOS codeword (checked first)
 */
export function parseVoiceCommand(
  transcript: string,
  sosKeyword?: string
): ParsedVoiceCommand {
  const text = transcript.trim();

  // ── Check SOS keyword first (highest priority) ───────────────────────────
  if (sosKeyword && text.toLowerCase().includes(sosKeyword.toLowerCase())) {
    return {
      intent:     'SOS_TRIGGER',
      transcript: text,
      confidence: 1.0,
    };
  }

  // ── Check END_JOURNEY ────────────────────────────────────────────────────
  for (const pattern of PATTERNS.END_JOURNEY) {
    if (pattern.test(text)) {
      return {
        intent:     'END_JOURNEY',
        transcript: text,
        confidence: 0.9,
      };
    }
  }

  // ── Check START_JOURNEY ──────────────────────────────────────────────────
  for (const pattern of PATTERNS.START_JOURNEY) {
    if (pattern.test(text)) {
      return {
        intent:          'START_JOURNEY',
        transcript:      text,
        destination:     extractDestination(text),
        durationMinutes: extractDuration(text),
        confidence:      0.85,
      };
    }
  }

  // ── Check FAKE_CALL ──────────────────────────────────────────────────────
  for (const pattern of PATTERNS.FAKE_CALL) {
    if (pattern.test(text)) {
      return {
        intent:     'FAKE_CALL',
        transcript: text,
        confidence: 0.9,
      };
    }
  }

  // ── Unknown ──────────────────────────────────────────────────────────────
  return {
    intent:     'UNKNOWN',
    transcript: text,
    confidence: 0.0,
  };
}

/**
 * Quick test — check if transcript matches any known intent.
 */
export function hasKnownIntent(transcript: string, sosKeyword?: string): boolean {
  return parseVoiceCommand(transcript, sosKeyword).intent !== 'UNKNOWN';
}

// ─── Unit-testable examples ───────────────────────────────────────────────────
// parseVoiceCommand("Start journey home in 20 minutes")
//   → { intent: 'START_JOURNEY', destination: 'home', durationMinutes: 20 }
//
// parseVoiceCommand("I'm home")
//   → { intent: 'END_JOURNEY' }
//
// parseVoiceCommand("help me", "help me")
//   → { intent: 'SOS_TRIGGER' }
//
// parseVoiceCommand("fake call")
//   → { intent: 'FAKE_CALL' }