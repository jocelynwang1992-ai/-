/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Chinese TTS Pronunciation Engine using Web Speech Synthesis API.
 * Provides high-quality, lightweight audio for student learning.
 */

export interface SpeechRateOption {
  label: string;
  value: number;
}

export const SPEECH_RATES: SpeechRateOption[] = [
  { label: "极慢 (0.5x)", value: 0.5 },
  { label: "较慢 (0.75x)", value: 0.75 },
  { label: "标准 (1.0x)", value: 1.0 },
  { label: "略快 (1.25x)", value: 1.25 }
];

// In-memory cache of speaker names mapped back to their roles to ensure consistency during a conversation session
const speakerRoleCache: Record<string, "A" | "B"> = {};

// Keep track of the active session ID to prevent overlapping or out-of-order playbacks, and hold a reference to prevent GC.
let currentSessionId = 0;
let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Splits prose or a paragraph of text into manageable sentence chunks.
 * This completely prevents browsers from cutting off long TTS playbacks.
 */
function splitParagraphIntoSentences(text: string): string[] {
  // Regex to split on major Chinese and English sentence delimiters while keeping them
  const delimiterRegex = /[^。！？!?\n]+[。！？!?\n]*/g;
  const matches = text.match(delimiterRegex) || [text];
  
  const results: string[] = [];
  for (const rawMatch of matches) {
    const trimmed = rawMatch.trim();
    if (!trimmed) continue;
    
    // If a sentence segment is too long (> 70 characters), sub-split it by commas
    // to guarantee maximum browser SpeechSynthesis stability.
    if (trimmed.length > 70) {
      const commaParts = trimmed.split(/[,，、]/);
      let temp = "";
      for (const piece of commaParts) {
        if ((temp + piece).length > 70) {
          if (temp) results.push(temp.trim());
          temp = piece;
        } else {
          temp = temp ? temp + "，" + piece : piece;
        }
      }
      if (temp) {
        results.push(temp.trim());
      }
    } else {
      results.push(trimmed);
    }
  }
  return results;
}

/**
 * Identifies speaker role from sentence content to enable dynamic role-playing TTS
 */
function detectSpeakerRole(sentenceText: string, defaultRole: "A" | "B"): "A" | "B" {
  const colonIndex = sentenceText.indexOf("：") !== -1 ? sentenceText.indexOf("：") : sentenceText.indexOf(":");
  if (colonIndex !== -1 && colonIndex < 15) {
    const prefix = sentenceText.substring(0, colonIndex).trim();
    if (prefix.includes("阿星") || prefix.includes("狐狸")) {
      return "A";
    }
    if (prefix.includes("猫头鹰") || prefix.includes("星星")) {
      return "B";
    }
  }
  
  if (sentenceText.startsWith("阿星") || sentenceText.includes("阿星说")) {
    return "A";
  }
  if (sentenceText.startsWith("猫头鹰") || sentenceText.includes("猫头鹰说")) {
    return "B";
  }
  if (sentenceText.startsWith("星星") || sentenceText.includes("星星说")) {
    return "B";
  }
  
  return defaultRole;
}

/**
 * Chinese TTS Pronunciation Engine using Web Speech Synthesis API.
 * Uses adaptive pitches and dual-voice lookups to simulate an authentic
 * dialogue with Speaker A (Male/Baritone) and Speaker B (Female/Soprano).
 * 
 * Heavily upgraded: Handles text sentences recursively to prevent brownouts, chrome timeouts,
 * and enables dynamic dual-voice switching inside a single text block!
 */
export function speakChinese(
  text: string, 
  rate: number = 1.0, 
  onEnd?: () => void,
  forcedSpeakerRole?: "A" | "B",
  isProseMode?: boolean
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("Speech Synthesis not supported in this browser.");
    return null;
  }

  // Cancel any ongoing speaking immediately
  window.speechSynthesis.cancel();

  // Increment currentSessionId to invalidate any previously running speech cascades
  currentSessionId++;
  const thisRequestId = currentSessionId;

  const cleanedText = text.trim();
  if (!cleanedText) {
    if (onEnd) onEnd();
    return null;
  }

  // Determine base role
  const baseRole: "A" | "B" = forcedSpeakerRole || "B";

  // Parse text into individual sentence utterances
  const sentences = splitParagraphIntoSentences(cleanedText);
  if (sentences.length === 0) {
    if (onEnd) onEnd();
    return null;
  }

  let firstUtterance: SpeechSynthesisUtterance | null = null;

  // Run the recursive talking cycle
  function speakSentenceAtIndex(idx: number) {
    // 1. Is the text fully read out loud?
    if (idx >= sentences.length) {
      activeUtterance = null;
      if (onEnd) {
        onEnd();
      }
      return;
    }

    // 2. Reject if another speaking task or a stop was triggered
    if (thisRequestId !== currentSessionId) {
      return;
    }

    const rawSentence = sentences[idx];
    let sentenceToSpeak = rawSentence;
    let localRole = detectSpeakerRole(rawSentence, baseRole);

    // Filter out names and punctuation from speaking aloud if matching "Speaker：" prefix (ONLY if NOT in prose mode)
    const colonMatch = rawSentence.match(/^([^：:]+)[：:](.*)$/);
    if (colonMatch) {
      const prefix = colonMatch[1].trim();
      if (prefix.length < 15) {
        if (!isProseMode) {
          sentenceToSpeak = colonMatch[2].trim();
        }
        // Override the cache as we identified a clear dialogue label
        if (prefix.includes("阿星") || prefix.includes("狐狸")) {
          localRole = "A";
        } else if (prefix.includes("猫头鹰") || prefix.includes("星星")) {
          localRole = "B";
        }
      }
    }

    if (!sentenceToSpeak.trim()) {
      speakSentenceAtIndex(idx + 1);
      return;
    }

    // Core Utterance creation
    const utterance = new SpeechSynthesisUtterance(sentenceToSpeak);
    activeUtterance = utterance; // Keep active pointer to bypass garbage collection cut-off bugs

    if (idx === 0) {
      firstUtterance = utterance;
    }

    // Lookup available system voices for Chinese/Mandarin
    const voices = window.speechSynthesis.getVoices();
    const chineseVoices = voices.filter(
      v => v.lang.startsWith("zh-") || v.lang.includes("Chinese") || v.lang.includes("Mandarin")
    );

    let selectedVoice = chineseVoices[0] || null;
    let pitch = 1.0;

    if (localRole === "A") {
      // Speaker A is Male Dialogue or Little Fox
      const maleVoice = chineseVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes("kangkang") || 
               name.includes("zhiwei") || 
               name.includes("sinji") || 
               name.includes("yunxi") || 
               name.includes("yunjian") || 
               name.includes("yunyang") || 
               name.includes("xiaoyu") ||
               name.includes("male") ||
               name.includes("man");
      });
      
      if (maleVoice) {
        selectedVoice = maleVoice;
        pitch = 0.95;
      } else {
        pitch = 0.82; // Drop pitch on generic voice fallback
      }
    } else {
      // Speaker B is Female Dialogue / Owl / Narrator
      const femaleVoice = chineseVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes("tingting") || 
               name.includes("yaoyao") || 
               name.includes("huihui") || 
               name.includes("meijia") || 
               name.includes("xiaoxiao") || 
               name.includes("xiaoyi") ||
               name.includes("female") ||
               name.includes("woman");
      });

      if (femaleVoice) {
        selectedVoice = femaleVoice;
        pitch = 1.05;
      } else {
        pitch = 1.16; // Lift pitch on generic voice fallback
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Set parameters
    utterance.lang = "zh-CN";
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Progression callbacks
    utterance.onend = () => {
      setTimeout(() => {
        speakSentenceAtIndex(idx + 1);
      }, 100);
    };

    utterance.onerror = (err) => {
      console.warn("TTS sentence error:", err);
      setTimeout(() => {
        speakSentenceAtIndex(idx + 1);
      }, 100);
    };

    window.speechSynthesis.speak(utterance);

    // Force resumption if speech synthesis gets accidentally suspended (Safari iOS/Chrome background tab protection)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  // Ignite cascade
  speakSentenceAtIndex(0);

  return firstUtterance;
}

export function stopSpeaking() {
  currentSessionId++;
  activeUtterance = null;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
