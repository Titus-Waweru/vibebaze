import { useRef, useEffect, useState, useCallback } from "react";
import { useVideoPlayback } from "@/contexts/VideoPlaybackContext";
import { Badge } from "@/components/ui/badge";
import { Play, Flame, TrendingUp, Sparkles, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VideoPlayerProps {
  src: string;
  postId: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  className?: string;
}

type VideoBadge = {
  label: string;
  icon: React.ReactNode;
  variant: "trending" | "hot" | "new" | "popular";
};

const getVideoBadge = (likes: number, comments: number, views: number): VideoBadge | null => {
  const engagement = likes + (comments * 2) + (views * 0.1);
  
  if (engagement >= 500) {
    return { label: "Trending", icon: <TrendingUp className="h-3 w-3" />, variant: "trending" };
  } else if (engagement >= 200) {
    return { label: "Hot", icon: <Flame className="h-3 w-3" />, variant: "hot" };
  } else if (engagement >= 50) {
    return { label: "Popular", icon: <Sparkles className="h-3 w-3" />, variant: "popular" };
  } else if (likes < 10 && views < 50) {
    return { label: "New", icon: <Eye className="h-3 w-3" />, variant: "new" };
  }
  return null;
};

// Get or create session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("vibebaze_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("vibebaze_session_id", sessionId);
  }
  return sessionId;
};

const VideoPlayer = ({ 
  src, 
  postId, 
  likesCount = 0, 
  commentsCount = 0, 
  viewsCount = 0,
  className = "" 
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { setCurrentlyPlaying, registerVideo, unregisterVideo, currentlyPlayingId } = useVideoPlayback();
  const { user } = useAuth();
  
  const badge = getVideoBadge(likesCount, commentsCount, viewsCount);

  // Pause video function for context
  const pauseVideo = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) {
      video.pause();
      video.currentTime = 0; // Reset to beginning
      setIsPlaying(false);
    }
  }, []);

  // Register/unregister with context
  useEffect(() => {
    registerVideo(postId, pauseVideo);
    return () => {
      unregisterVideo(postId);
    };
  }, [postId, registerVideo, unregisterVideo, pauseVideo]);

  // IntersectionObserver for scroll-based play/pause - TikTok-like behavior
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isNowVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
          setIsVisible(isNowVisible);

          if (isNowVisible) {
            // This video is now visible - pause all others and play this one
            setCurrentlyPlaying(postId);
          }
        });
      },
      {
        threshold: [0.5], // Trigger when 50% visible
        rootMargin: "-10% 0px -10% 0px", // Add some margin
      }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [postId, setCurrentlyPlaying]);

  // Auto-pause when another video becomes current
  useEffect(() => {
    if (currentlyPlayingId !== postId && isPlaying) {
      pauseVideo();
    }
  }, [currentlyPlayingId, postId, isPlaying, pauseVideo]);

  // Track view after 3 seconds of watching
  useEffect(() => {
    const video = videoRef.current;
    if (!video || viewRecorded) return;

    const handleTimeUpdate = async () => {
      if (viewRecorded) return;
      
      // Record view after 3 seconds of watching
      if (video.currentTime >= 3) {
        setViewRecorded(true);
        
        try {
          await supabase.rpc("record_content_view", {
            p_post_id: postId,
            p_user_id: user?.id || null,
            p_session_id: user?.id ? null : getSessionId(),
            p_watch_duration: Math.floor(video.currentTime),
          });
        } catch (error) {
          console.error("Error recording view:", error);
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [postId, user?.id, viewRecorded]);

  const handlePlay = () => {
    setCurrentlyPlaying(postId);
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setCurrentlyPlaying(postId);
      video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full bg-black group ${className}`}>
      {/* Video Badge */}
      {badge && (
        <div className="absolute top-3 left-3 z-10">
          <Badge 
            variant={badge.variant}
            className="flex items-center gap-1 shadow-lg animate-fade-in"
          >
            {badge.icon}
            {badge.label}
          </Badge>
        </div>
      )}

      {/* Play Overlay when paused */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer z-10 transition-opacity group-hover:bg-black/30"
          onClick={handleClick}
        >
          <div className="w-16 h-16 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-glow animate-scale-in">
            <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[600px] object-contain cursor-pointer"
        playsInline
        preload="metadata"
        onClick={handleClick}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={pauseVideo}
        controls={isPlaying}
        muted={false}
      />
    </div>
  );
};

export default VideoPlayer;
