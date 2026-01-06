import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface VideoPlaybackContextType {
  currentlyPlayingId: string | null;
  setCurrentlyPlaying: (id: string | null) => void;
  registerVideo: (id: string, pause: () => void) => void;
  unregisterVideo: (id: string) => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextType | undefined>(undefined);

export const VideoPlaybackProvider = ({ children }: { children: ReactNode }) => {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [videoRefs] = useState<Map<string, () => void>>(new Map());

  const registerVideo = useCallback((id: string, pause: () => void) => {
    videoRefs.set(id, pause);
  }, [videoRefs]);

  const unregisterVideo = useCallback((id: string) => {
    videoRefs.delete(id);
  }, [videoRefs]);

  const setCurrentlyPlaying = useCallback((id: string | null) => {
    // Pause all other videos
    videoRefs.forEach((pauseFn, videoId) => {
      if (videoId !== id) {
        pauseFn();
      }
    });
    setCurrentlyPlayingId(id);
  }, [videoRefs]);

  return (
    <VideoPlaybackContext.Provider value={{ 
      currentlyPlayingId, 
      setCurrentlyPlaying, 
      registerVideo, 
      unregisterVideo 
    }}>
      {children}
    </VideoPlaybackContext.Provider>
  );
};

export const useVideoPlayback = () => {
  const context = useContext(VideoPlaybackContext);
  if (!context) {
    throw new Error("useVideoPlayback must be used within a VideoPlaybackProvider");
  }
  return context;
};
