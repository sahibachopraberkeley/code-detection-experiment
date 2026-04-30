import { useRef, useCallback, useEffect } from 'react';
import type { BehaviorLog } from '../types';

export function useBehaviorLogger() {
  const logRef = useRef<BehaviorLog>({
    visibilityChanges: [],
    scrollEvents: [],
    copyAttempts: [],
    responseChanges: [],
    stimulusViewStart: Date.now(),
    stimulusViewEnd: 0,
    timeToFirstInteraction: null,
  });

  const firstInteractionRecorded = useRef(false);

  // Reset the logger for a new stimulus
  const reset = useCallback(() => {
    logRef.current = {
      visibilityChanges: [],
      scrollEvents: [],
      copyAttempts: [],
      responseChanges: [],
      stimulusViewStart: Date.now(),
      stimulusViewEnd: 0,
      timeToFirstInteraction: null,
    };
    firstInteractionRecorded.current = false;
  }, []);

  // Record visibility changes (tab switches)
  useEffect(() => {
    const handleVisibilityChange = () => {
      logRef.current.visibilityChanges.push({
        timestamp: Date.now(),
        isVisible: !document.hidden,
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Log scroll events on the code container (throttled to max 1 per 500ms)
  const lastScrollTime = useRef(0);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 500) return;
    lastScrollTime.current = now;
    const target = e.currentTarget;
    logRef.current.scrollEvents.push({
      timestamp: now,
      scrollTop: target.scrollTop,
      scrollHeight: target.scrollHeight,
    });
  }, []);

  // Log copy attempts
  const handleCopy = useCallback((_e: React.ClipboardEvent) => {
    const selectedText = window.getSelection()?.toString() || '';
    logRef.current.copyAttempts.push({
      timestamp: Date.now(),
      selectedText: selectedText.slice(0, 200), // Limit stored text length
    });
    // Mild deterrent - don't fully prevent, just log
  }, []);

  // Log response changes
  const logResponseChange = useCallback(
    (field: 'aiDetection' | 'aiConfidence' | 'effort' | 'effortConfidence' | 'mergeWillingness', oldValue: string | number | null, newValue: string | number) => {
      // Record first interaction time
      if (!firstInteractionRecorded.current) {
        logRef.current.timeToFirstInteraction = Date.now() - logRef.current.stimulusViewStart;
        firstInteractionRecorded.current = true;
      }

      logRef.current.responseChanges.push({
        timestamp: Date.now(),
        field,
        oldValue,
        newValue,
      });
    },
    []
  );

  // Finalize the log when moving to next stimulus
  const finalize = useCallback((): BehaviorLog => {
    logRef.current.stimulusViewEnd = Date.now();
    return { ...logRef.current };
  }, []);

  return {
    reset,
    handleScroll,
    handleCopy,
    logResponseChange,
    finalize,
  };
}
