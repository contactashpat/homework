"use client";

import { useEffect } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";

export const StoreHydrator = () => {
  const hydrate = useFlashcardStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
};
