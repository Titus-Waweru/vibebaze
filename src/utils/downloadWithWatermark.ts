import vibebazeLogo from "@/assets/vibebaze-logo.png";

interface DownloadOptions {
  url: string;
  filename: string;
  username: string;
  type: "image" | "video";
}

/**
 * Downloads media with VibeBaze watermark
 */
export async function downloadWithWatermark({ url, filename, username, type }: DownloadOptions): Promise<boolean> {
  try {
    // Generate branded filename
    const date = new Date();
    const year = date.getFullYear();
    const extension = filename.split(".").pop() || (type === "video" ? "mp4" : "jpg");
    const brandedFilename = `VibeBaze_${username}_${year}_${Date.now()}.${extension}`;

    if (type === "video") {
      // For videos, add watermark overlay using canvas + video element
      try {
        const watermarkedBlob = await addVideoWatermark(url, username);
        const downloadUrl = URL.createObjectURL(watermarkedBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = brandedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        return true;
      } catch (videoError) {
        console.warn("Video watermark failed, downloading without watermark:", videoError);
        // Fallback: download without watermark
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = brandedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        return true;
      }
    }

    // For images, add watermark using canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // Load the main image
    const mainImage = await loadImage(url);
    canvas.width = mainImage.width;
    canvas.height = mainImage.height;

    // Draw main image
    ctx.drawImage(mainImage, 0, 0);

    // Load logo
    const logo = await loadImage(vibebazeLogo);

    // Calculate watermark size (max 15% of image width)
    const maxLogoWidth = canvas.width * 0.15;
    const logoRatio = logo.height / logo.width;
    const logoWidth = Math.min(logo.width, maxLogoWidth);
    const logoHeight = logoWidth * logoRatio;

    // Position: bottom-right with padding
    const padding = canvas.width * 0.03;
    const logoX = canvas.width - logoWidth - padding;
    const logoY = canvas.height - logoHeight - padding;

    // Draw semi-transparent background for watermark
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.roundRect(logoX - 8, logoY - 8, logoWidth + 16, logoHeight + 40, 8);
    ctx.fill();

    // Draw logo
    ctx.globalAlpha = 0.8;
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    ctx.globalAlpha = 1;

    // Draw username
    const fontSize = Math.max(12, canvas.width * 0.02);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.textAlign = "center";
    ctx.fillText(`@${username}`, logoX + logoWidth / 2, logoY + logoHeight + fontSize + 4);

    // Convert canvas to blob and download
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))), "image/jpeg", 0.95);
    });

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = brandedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    return true;
  } catch (error) {
    console.error("Download with watermark error:", error);
    return false;
  }
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
 * Captures a single frame from the video, draws watermark, and returns as WebM blob.
 * For full video watermarking we capture frames via canvas + MediaRecorder.
 */
async function addVideoWatermark(videoUrl: string, username: string): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;

      const response = await fetch(videoUrl);
      const videoBlob = await response.blob();
      video.src = URL.createObjectURL(videoBlob);

      video.addEventListener("loadedmetadata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;

        // Use MediaRecorder to capture watermarked frames
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm",
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(video.src);
          resolve(new Blob(chunks, { type: "video/webm" }));
        };

        // Load logo for watermark
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.src = vibebazeLogo;

        logo.onload = () => {
          mediaRecorder.start();
          video.play();

          const drawFrame = () => {
            if (video.ended || video.paused) {
              mediaRecorder.stop();
              return;
            }

            // Draw video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw watermark (bottom-right)
            const maxLogoWidth = canvas.width * 0.12;
            const logoRatio = logo.height / logo.width;
            const logoWidth = Math.min(logo.width, maxLogoWidth);
            const logoHeight = logoWidth * logoRatio;
            const padding = canvas.width * 0.03;
            const logoX = canvas.width - logoWidth - padding;
            const logoY = canvas.height - logoHeight - padding - 24;

            // Semi-transparent background
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.beginPath();
            ctx.roundRect(logoX - 6, logoY - 6, logoWidth + 12, logoHeight + 30, 6);
            ctx.fill();

            // Logo
            ctx.globalAlpha = 0.7;
            ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
            ctx.globalAlpha = 1;

            // Username
            const fontSize = Math.max(10, canvas.width * 0.018);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.textAlign = "center";
            ctx.fillText(`@${username}`, logoX + logoWidth / 2, logoY + logoHeight + fontSize + 2);

            requestAnimationFrame(drawFrame);
          };

          requestAnimationFrame(drawFrame);
        };

        logo.onerror = () => {
          // If logo fails, still watermark with text only
          mediaRecorder.start();
          video.play();

          const drawFrame = () => {
            if (video.ended || video.paused) {
              mediaRecorder.stop();
              return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const fontSize = Math.max(12, canvas.width * 0.02);
            const padding = canvas.width * 0.03;
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(
              canvas.width - padding - 120,
              canvas.height - padding - fontSize - 8,
              120 + padding,
              fontSize + 16
            );
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.textAlign = "right";
            ctx.fillText(`VibeBaze @${username}`, canvas.width - padding, canvas.height - padding);

            requestAnimationFrame(drawFrame);
          };
          requestAnimationFrame(drawFrame);
        };
      });

      video.addEventListener("error", () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video"));
      });
    } catch (err) {
      reject(err);
    }
  });
}
