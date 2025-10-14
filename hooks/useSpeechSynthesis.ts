"use client";

import { useCallback, useMemo } from "react";

export const useSpeechSynthesis = () => {
  const supported = useMemo(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    [],
  );

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = navigator?.language ?? "en-US";
      synth.speak(utterance);
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
  }, [supported]);

  return { speak, stop, supported };
};
