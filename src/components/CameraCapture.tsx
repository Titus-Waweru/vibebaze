import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Video, X, RotateCcw, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File, type: "image" | "video") => void;
  mode: "image" | "video";
}

const CameraCapture = ({ open, onClose, onCapture, mode }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = useCallback(async () => {
    try {
      setLoading(true);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsStreaming(true);
    } catch (error: any) {
      console.error("Camera error:", error);
      toast.error("Could not access camera. Please check permissions.");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [facingMode, mode, onClose]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsRecording(false);
  }, []);

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    setTimeout(startCamera, 100);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm",
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setCapturedVideo(blob);
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedVideo(null);
    startCamera();
  };

  const confirmCapture = async () => {
    if (mode === "image" && capturedImage) {
      // Convert base64 to File
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `vibebaze_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file, "image");
    } else if (mode === "video" && capturedVideo) {
      const file = new File([capturedVideo], `vibebaze_video_${Date.now()}.webm`, { type: "video/webm" });
      onCapture(file, "video");
    }
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCapturedVideo(null);
    onClose();
  };

  // Start camera when dialog opens
  useState(() => {
    if (open) {
      startCamera();
    }
    return () => stopCamera();
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {mode === "image" ? <Camera className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            {mode === "image" ? "Take Photo" : "Record Video"}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Live Camera Feed */}
          {isStreaming && !capturedImage && !capturedVideo && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {/* Captured Video Preview */}
          {capturedVideo && (
            <video
              src={URL.createObjectURL(capturedVideo)}
              controls
              className="w-full h-full object-cover"
            />
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white" />
              Recording
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 flex items-center justify-center gap-4">
          {!capturedImage && !capturedVideo ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>

              {mode === "image" ? (
                <Button
                  size="lg"
                  onClick={capturePhoto}
                  disabled={!isStreaming}
                  className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90"
                >
                  <Camera className="h-8 w-8" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isStreaming}
                  className={`rounded-full w-16 h-16 ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
                >
                  {isRecording ? (
                    <div className="w-6 h-6 bg-white rounded" />
                  ) : (
                    <Video className="h-8 w-8" />
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                disabled={!isStreaming}
                className="rounded-full"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={retake}
                className="gap-2"
              >
                <RotateCcw className="h-5 w-5" />
                Retake
              </Button>

              <Button
                size="lg"
                onClick={confirmCapture}
                className="gap-2 bg-gradient-primary hover:shadow-glow"
              >
                <Check className="h-5 w-5" />
                Use {mode === "image" ? "Photo" : "Video"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
