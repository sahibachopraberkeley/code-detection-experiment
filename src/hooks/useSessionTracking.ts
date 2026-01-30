import { useRef, useCallback, useEffect } from 'react';
import type { SessionTracking, ScreenType } from '../types';
import { getProlificParams } from '../config';

export function useSessionTracking() {
  const trackingRef = useRef<SessionTracking>(initializeTracking());
  const lastBlurTime = useRef<number | null>(null);

  // Initialize tracking on mount
  useEffect(() => {
    // Set up global event listeners
    const handleFocus = () => {
      const now = Date.now();
      let timeAway: number | undefined;

      if (lastBlurTime.current !== null) {
        timeAway = now - lastBlurTime.current;
        trackingRef.current.totalTimeAway += timeAway;
      }

      trackingRef.current.focusEvents.push({
        timestamp: now,
        type: 'focus',
        timeAwayMs: timeAway,
      });
      lastBlurTime.current = null;
    };

    const handleBlur = () => {
      const now = Date.now();
      lastBlurTime.current = now;
      trackingRef.current.blurCount++;
      trackingRef.current.focusEvents.push({
        timestamp: now,
        type: 'blur',
      });
    };

    const handleBeforeUnload = () => {
      trackingRef.current.focusEvents.push({
        timestamp: Date.now(),
        type: 'beforeunload',
      });
      // Try to save to localStorage before leaving
      try {
        localStorage.setItem('session_tracking_backup', JSON.stringify(trackingRef.current));
      } catch (e) {
        // Ignore storage errors
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    const handleMouseMove = () => {
      trackingRef.current.mouseActivity.totalMoves++;
      trackingRef.current.mouseActivity.lastMoveTime = Date.now();
    };

    const handleClick = (e: MouseEvent) => {
      trackingRef.current.mouseActivity.totalClicks++;
      // Only store last 100 clicks to avoid huge data
      if (trackingRef.current.mouseActivity.clickPositions.length < 100) {
        trackingRef.current.mouseActivity.clickPositions.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now(),
        });
      }
    };

    const handleResize = () => {
      trackingRef.current.windowResizes.push({
        timestamp: Date.now(),
        width: window.innerWidth,
        height: window.innerHeight,
      });
      // Update current window size
      trackingRef.current.windowWidth = window.innerWidth;
      trackingRef.current.windowHeight = window.innerHeight;
    };

    // Throttle mouse move to avoid too many events
    let mouseMoveTimeout: number | null = null;
    const throttledMouseMove = () => {
      if (mouseMoveTimeout === null) {
        mouseMoveTimeout = window.setTimeout(() => {
          handleMouseMove();
          mouseMoveTimeout = null;
        }, 100); // Only log every 100ms
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', throttledMouseMove);
    document.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
    };
  }, []);

  // Record when entering a new page/screen
  const recordPageEnter = useCallback((screen: ScreenType) => {
    // Close out previous page if exists
    const pageTimings = trackingRef.current.pageTimings;
    if (pageTimings.length > 0) {
      const lastPage = pageTimings[pageTimings.length - 1];
      if (lastPage.exitTime === null) {
        lastPage.exitTime = Date.now();
        lastPage.duration = lastPage.exitTime - lastPage.enterTime;
      }
    }

    // Add new page
    trackingRef.current.pageTimings.push({
      screen,
      enterTime: Date.now(),
      exitTime: null,
      duration: null,
    });
  }, []);

  // Record a rapid response (for bot detection)
  const recordRapidResponse = useCallback(() => {
    trackingRef.current.rapidResponses++;
  }, []);

  // Finalize tracking data
  const finalize = useCallback((): SessionTracking => {
    const now = Date.now();
    trackingRef.current.sessionEnd = now;
    trackingRef.current.totalDuration = now - trackingRef.current.sessionStart;

    // Close out last page
    const pageTimings = trackingRef.current.pageTimings;
    if (pageTimings.length > 0) {
      const lastPage = pageTimings[pageTimings.length - 1];
      if (lastPage.exitTime === null) {
        lastPage.exitTime = now;
        lastPage.duration = lastPage.exitTime - lastPage.enterTime;
      }
    }

    return { ...trackingRef.current };
  }, []);

  // Get current tracking state
  const getTracking = useCallback((): SessionTracking => {
    return { ...trackingRef.current };
  }, []);

  return {
    recordPageEnter,
    recordRapidResponse,
    finalize,
    getTracking,
  };
}

function initializeTracking(): SessionTracking {
  const { prolificPid, studyId, sessionId } = getProlificParams();

  return {
    // Prolific metadata
    prolificPid,
    studyId,
    sessionId,

    // Device/browser info
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,

    // Session timing
    sessionStart: Date.now(),
    sessionEnd: null,
    totalDuration: null,

    // Page timings
    pageTimings: [],

    // Focus/attention tracking
    focusEvents: [],
    totalTimeAway: 0,
    blurCount: 0,

    // Mouse activity
    mouseActivity: {
      totalMoves: 0,
      totalClicks: 0,
      clickPositions: [],
      lastMoveTime: null,
    },

    // Quality signals
    windowResizes: [],
    rapidResponses: 0,
  };
}
