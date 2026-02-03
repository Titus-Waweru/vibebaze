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
      // For videos, download directly (watermarking requires server-side processing)
      // In production, this should be handled by an edge function
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
