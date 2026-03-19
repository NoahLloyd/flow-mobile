import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Platform } from "react-native";

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const mod = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module not available (Expo Go)
}

/**
 * Hook for speech-to-text input.
 * Falls back gracefully if native module isn't available (Expo Go).
 */
export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isAvailable, setIsAvailable] = useState(!!ExpoSpeechRecognitionModule);

  // Register event listeners if module is available
  if (useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent("result", (event: any) => {
      const results = event.results;
      if (results && results.length > 0) {
        const latest = results[results.length - 1];
        if (latest && latest.length > 0) {
          setTranscript(latest[0].transcript || "");
        }
      }
    });

    useSpeechRecognitionEvent("end", () => {
      setIsListening(false);
    });

    useSpeechRecognitionEvent("error", (event: any) => {
      console.log("[voice] error:", event.error, event.message);
      setIsListening(false);
      if (event.error === "not-allowed") {
        Alert.alert(
          "Permission Denied",
          "Microphone access is required for voice input. Please enable it in Settings."
        );
      }
    });
  }

  const startListening = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        "Not Available",
        "Voice input requires a development build. It's not available in Expo Go."
      );
      return;
    }

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert(
          "Permission Denied",
          "Microphone permission is required for voice input."
        );
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
      setIsListening(true);
    } catch (error: any) {
      console.log("[voice] start error:", error);
      Alert.alert("Voice Error", error.message || "Failed to start voice input");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!ExpoSpeechRecognitionModule) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    isAvailable,
    startListening,
    stopListening,
    resetTranscript,
  };
}
