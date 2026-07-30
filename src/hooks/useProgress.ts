import { useCallback, useEffect, useState } from 'react';
import type { ProgressState } from '../types';

const STORAGE_KEY = 'best-practice-game-progress';

const defaultProgress: ProgressState = {
  completed: {},
  attempts: {},
  lastVariant: {},
};

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress;
    } catch {
      return defaultProgress;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const markAttempt = useCallback((problemId: string) => {
    setProgress((prev) => ({
      ...prev,
      attempts: {
        ...prev.attempts,
        [problemId]: (prev.attempts[problemId] ?? 0) + 1,
      },
    }));
  }, []);

  const markComplete = useCallback((problemId: string) => {
    setProgress((prev) => ({
      ...prev,
      completed: { ...prev.completed, [problemId]: true },
    }));
  }, []);

  const setLastVariant = useCallback((problemId: string, variantId: string) => {
    setProgress((prev) => ({
      ...prev,
      lastVariant: { ...prev.lastVariant, [problemId]: variantId },
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { progress, markAttempt, markComplete, setLastVariant, resetProgress };
}
