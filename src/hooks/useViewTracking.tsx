import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generate a unique session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("vibeloop_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("vibeloop_session_id", sessionId);
  }
  return sessionId;
};

interface ViewTracker {
  postId: string;
  startTime: number;
  hasBeenCounted: boolean;
}

export const useViewTracking = (userId: string | undefined) => {
  const viewTrackers = useRef<Map<string, ViewTracker>>(new Map());
  const sessionId = useRef<string>(getSessionId());

  // Start tracking a view when content becomes visible
  const startViewTracking = useCallback((postId: string) => {
    if (viewTrackers.current.has(postId)) return;

    viewTrackers.current.set(postId, {
      postId,
      startTime: Date.now(),
      hasBeenCounted: false,
    });
  }, []);

  // Stop tracking and record the view if threshold is met
  const stopViewTracking = useCallback(async (postId: string) => {
    const tracker = viewTrackers.current.get(postId);
    if (!tracker || tracker.hasBeenCounted) return;

    const watchDuration = Math.floor((Date.now() - tracker.startTime) / 1000);

    // Mark as counted to prevent duplicate calls
    tracker.hasBeenCounted = true;

    try {
      // Call the database function to record the view
      const { data, error } = await supabase.rpc("record_content_view", {
        p_post_id: postId,
        p_user_id: userId || null,
        p_session_id: userId ? null : sessionId.current,
        p_watch_duration: watchDuration,
      });

      if (error) {
        console.error("Error recording view:", error);
        // Reset so it can be retried
        tracker.hasBeenCounted = false;
      }

      return data as boolean;
    } catch (error) {
      console.error("Error recording view:", error);
      tracker.hasBeenCounted = false;
      return false;
    }
  }, [userId]);

  // Track video view with time threshold
  const trackVideoView = useCallback((
    postId: string,
    videoElement: HTMLVideoElement
  ) => {
    let hasStarted = false;
    let viewRecorded = false;

    const handlePlay = () => {
      if (!hasStarted) {
        hasStarted = true;
        startViewTracking(postId);
      }
    };

    const handleTimeUpdate = async () => {
      if (viewRecorded) return;
      
      // Record view after 3 seconds of watching
      if (videoElement.currentTime >= 3) {
        viewRecorded = true;
        await stopViewTracking(postId);
      }
    };

    const handleEnded = async () => {
      if (!viewRecorded) {
        viewRecorded = true;
        await stopViewTracking(postId);
      }
    };

    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("ended", handleEnded);

    return () => {
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("ended", handleEnded);
    };
  }, [startViewTracking, stopViewTracking]);

  // Track image/text view with visibility
  const trackStaticContentView = useCallback((
    postId: string,
    element: HTMLElement
  ) => {
    let viewTimeout: ReturnType<typeof setTimeout> | null = null;
    let viewRecorded = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !viewRecorded) {
            // Start 3-second timer when visible
            viewTimeout = setTimeout(async () => {
              viewRecorded = true;
              await stopViewTracking(postId);
            }, 3000);
            startViewTracking(postId);
          } else if (!entry.isIntersecting && viewTimeout) {
            // Cancel timer if scrolled away
            clearTimeout(viewTimeout);
            viewTimeout = null;
          }
        });
      },
      { threshold: 0.5 } // 50% of content must be visible
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (viewTimeout) clearTimeout(viewTimeout);
    };
  }, [startViewTracking, stopViewTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      viewTrackers.current.clear();
    };
  }, []);

  return {
    startViewTracking,
    stopViewTracking,
    trackVideoView,
    trackStaticContentView,
  };
};
