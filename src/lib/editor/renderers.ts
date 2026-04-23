import { TextLayer, drawTextLayer } from "./textLayer";

/**
 * Flatten text layers onto an image and return a JPEG File.
 */
export async function renderImageWithText(
  imageFile: File,
  layers: TextLayer[]
): Promise<File> {
  const img = await loadImage(URL.createObjectURL(imageFile));
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0);
  layers.forEach((l) => drawTextLayer(ctx, l, canvas.width, canvas.height));

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92
    )
  );

  const baseName = imageFile.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}_text.jpg`, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Burn text layers into a video using canvas + MediaRecorder.
 * Output is .webm (browser-native). onProgress is 0..1.
 */
export async function renderVideoWithText(
  videoFile: File,
  layers: TextLayer[],
  onProgress?: (p: number) => void
): Promise<File> {
  const url = URL.createObjectURL(videoFile);
  const video = document.createElement("video");
  video.src = url;
  video.muted = false;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Video load failed"));
  });

  const w = video.videoWidth;
  const h = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Capture canvas video stream
  const canvasStream = canvas.captureStream(30);

  // Try to capture audio from the video element
  let combinedStream: MediaStream = canvasStream;
  try {
    // captureStream on HTMLVideoElement is supported in Chromium/Firefox
    const videoStream = (video as any).captureStream
      ? (video as any).captureStream()
      : (video as any).mozCaptureStream?.();
    if (videoStream) {
      const audioTracks = videoStream.getAudioTracks();
      if (audioTracks.length > 0) {
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks,
        ]);
      }
    }
  } catch {
    // No audio capture — silent video output
  }

  // Pick a supported mimeType
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mimeType =
    candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "video/webm";

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  let raf = 0;
  let stopped = false;
  const draw = () => {
    if (stopped) return;
    ctx.drawImage(video, 0, 0, w, h);
    layers.forEach((l) => drawTextLayer(ctx, l, w, h));
    if (video.duration > 0) {
      onProgress?.(Math.min(1, video.currentTime / video.duration));
    }
    raf = requestAnimationFrame(draw);
  };

  recorder.start(100);
  await video.play();
  draw();

  await new Promise<void>((resolve) => {
    video.onended = () => resolve();
  });

  stopped = true;
  cancelAnimationFrame(raf);
  recorder.stop();
  const blob = await done;
  URL.revokeObjectURL(url);

  const baseName = videoFile.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}_text.webm`, { type: mimeType });
}