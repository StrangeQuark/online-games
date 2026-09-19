import { useState } from "react";

/** Preferences are optional: private browsing and full storage must never stop play. */
export function usePreference<T extends string>(
  key: string,
  initial: T,
  choices: readonly T[],
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`afterhours:${key}`) as T;
      return choices.includes(stored) ? stored : initial;
    } catch {
      return initial;
    }
  });
  const save = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(`afterhours:${key}`, next);
    } catch {
      /* Play without storage. */
    }
  };
  return [value, save] as const;
}
