import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Type,
  Trash2,
  Check,
  X as XIcon,
  Sparkles,
  Palette,
  Plus,
  RotateCw,
} from "lucide-react";
import {
  TextLayer,
  createTextLayer,
  drawTextLayer,
  applyPreset,
  COLOR_SWATCHES,
  FONT_OPTIONS,
  VIBE_PRESETS,
  VibePreset,
} from "@/lib/editor/textLayer";
import { renderImageWithText, renderVideoWithText } from "@/lib/editor/renderers";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface Props {
  file: File;
  mediaType: "image" | "video";
  onCancel: () => void;
  onDone: (newFile: File) => void;
}

type Tab = "presets" | "font" | "color" | "size";

const MediaTextEditor = ({ file, mediaType, onCancel, onDone }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewUrl = useRef<string>(URL.createObjectURL(file));
  const [mediaSize, setMediaSize] = useState({ w: 1080, h: 1920 });
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("presets");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const dragRef = useRef<{
    active: boolean;
    layerId: string | null;
    startX: number;
    startY: number;
    startLayerX: number;
    startLayerY: number;
  }>({ active: false, layerId: null, startX: 0, startY: 0, startLayerX: 0, startLayerY: 0 });

  const selected = layers.find((l) => l.id === selectedId) || null;

  // Load media to get natural size
  useEffect(() => {
    if (mediaType === "image") {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setMediaSize({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = previewUrl.current;
    } else {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      v.src = previewUrl.current;
      v.onloadedmetadata = () => {
        videoRef.current = v;
        setMediaSize({ w: v.videoWidth, h: v.videoHeight });
        v.currentTime = Math.min(0.5, v.duration * 0.1);
        v.onseeked = () => drawCanvas();
      };
    }
    return () => {
      URL.revokeObjectURL(previewUrl.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = mediaSize.w;
    canvas.height = mediaSize.h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mediaType === "image" && imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    } else if (mediaType === "video" && videoRef.current) {
      try {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } catch {
        // ignore until ready
      }
    }
    layers.forEach((l) => drawTextLayer(ctx, l, canvas.width, canvas.height));
  }, [layers, mediaSize, mediaType]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Pointer interactions on canvas (drag selected layer)
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    // Find topmost layer under the pointer (simple bbox via font size)
    let hit: TextLayer | null = null;
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const fontPx = Math.min(mediaSize.w, mediaSize.h) * l.fontSizeRatio;
      const halfW = (l.text.length * fontPx * 0.35) / mediaSize.w;
      const halfH = (fontPx * 1.2) / mediaSize.h;
      if (Math.abs(nx - l.x) < halfW + 0.04 && Math.abs(ny - l.y) < halfH + 0.04) {
        hit = l;
        break;
      }
    }
    if (hit) {
      setSelectedId(hit.id);
      dragRef.current = {
        active: true,
        layerId: hit.id,
        startX: nx,
        startY: ny,
        startLayerX: hit.x,
        startLayerY: hit.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    } else {
      setSelectedId(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const dx = nx - dragRef.current.startX;
    const dy = ny - dragRef.current.startY;
    setLayers((prev) =>
      prev.map((l) =>
        l.id === dragRef.current.layerId
          ? {
              ...l,
              x: clamp(dragRef.current.startLayerX + dx, 0.05, 0.95),
              y: clamp(dragRef.current.startLayerY + dy, 0.05, 0.95),
            }
          : l
      )
    );
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const addText = () => {
    const layer = createTextLayer("Your text");
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
    setTab("presets");
  };

  const updateSelected = (patch: Partial<TextLayer>) => {
    if (!selectedId) return;
    setLayers((prev) => prev.map((l) => (l.id === selectedId ? { ...l, ...patch } : l)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedId));
    setSelectedId(null);
  };

  const handleExport = async () => {
    if (layers.length === 0) {
      onDone(file);
      return;
    }
    setExporting(true);
    setExportProgress(0);
    try {
      let out: File;
      if (mediaType === "image") {
        out = await renderImageWithText(file, layers);
      } else {
        out = await renderVideoWithText(file, layers, (p) =>
          setExportProgress(Math.round(p * 100))
        );
      }
      onDone(out);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't render text. Posting original media.");
      onDone(file);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-white hover:bg-white/10">
          <XIcon className="h-5 w-5" />
        </Button>
        <span className="text-white text-sm font-medium">Add Text</span>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="bg-gradient-primary text-white"
        >
          <Check className="h-4 w-4 mr-1" /> Done
        </Button>
      </div>

      {/* Canvas preview */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden p-2">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="max-h-full max-w-full touch-none rounded-lg"
          style={{ aspectRatio: `${mediaSize.w} / ${mediaSize.h}` }}
        />

        {/* Floating actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Button size="icon" onClick={addText} className="rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white border-0">
            <Plus className="h-5 w-5" />
          </Button>
          {selected && (
            <>
              <Button
                size="icon"
                onClick={() => updateSelected({ rotation: selected.rotation + Math.PI / 12 })}
                className="rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white border-0"
              >
                <RotateCw className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={deleteSelected}
                className="rounded-full bg-destructive/80 hover:bg-destructive text-white border-0"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>

        {exporting && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 p-6">
            <p className="text-white font-medium">
              {mediaType === "video" ? "Rendering video…" : "Rendering image…"}
            </p>
            {mediaType === "video" && (
              <div className="w-64">
                <Progress value={exportProgress} className="h-2" />
                <p className="text-white/70 text-xs text-center mt-2">{exportProgress}%</p>
              </div>
            )}
            <p className="text-white/60 text-xs text-center max-w-xs">
              Text is being burned into your media. Don't close this screen.
            </p>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="bg-black/90 backdrop-blur border-t border-white/10">
        {selected ? (
          <>
            {/* Text input */}
            <div className="px-3 pt-3">
              <Input
                value={selected.text}
                onChange={(e) => updateSelected({ text: e.target.value })}
                placeholder="Type your text"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* Tab content */}
            <div className="px-3 pt-3 pb-2 min-h-[88px]">
              {tab === "presets" && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(Object.keys(VIBE_PRESETS) as VibePreset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateSelected(applyPreset(selected, p))}
                      className={`flex-shrink-0 px-4 h-16 rounded-xl text-sm font-bold capitalize border ${
                        selected.preset === p
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-white/15"
                      } bg-white/5 text-white`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              {tab === "font" && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => updateSelected({ fontFamily: f.value })}
                      style={{ fontFamily: f.value }}
                      className={`flex-shrink-0 px-4 h-16 rounded-xl text-base border ${
                        selected.fontFamily === f.value
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-white/15"
                      } bg-white/5 text-white`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
              {tab === "color" && (
                <div className="flex gap-2 flex-wrap">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateSelected({ color: c, gradient: null })}
                      className={`h-10 w-10 rounded-full border-2 ${
                        selected.color === c && !selected.gradient
                          ? "border-primary"
                          : "border-white/30"
                      }`}
                      style={{ background: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              )}
              {tab === "size" && (
                <div className="space-y-3 px-1">
                  <div>
                    <label className="text-white/70 text-xs">Size</label>
                    <Slider
                      value={[Math.round(selected.fontSizeRatio * 1000)]}
                      min={30}
                      max={180}
                      step={1}
                      onValueChange={(v) =>
                        updateSelected({ fontSizeRatio: v[0] / 1000 })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-xs">Outline</label>
                    <Slider
                      value={[Math.round(selected.strokeWidth * 100)]}
                      min={0}
                      max={15}
                      step={1}
                      onValueChange={(v) => {
                        const w = v[0] / 100;
                        updateSelected({
                          strokeWidth: w,
                          strokeColor: w > 0 ? selected.strokeColor || "#000000" : null,
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tab switcher */}
            <div className="grid grid-cols-4 border-t border-white/10">
              <TabBtn icon={<Sparkles className="h-4 w-4" />} label="Vibe" active={tab === "presets"} onClick={() => setTab("presets")} />
              <TabBtn icon={<Type className="h-4 w-4" />} label="Font" active={tab === "font"} onClick={() => setTab("font")} />
              <TabBtn icon={<Palette className="h-4 w-4" />} label="Color" active={tab === "color"} onClick={() => setTab("color")} />
              <TabBtn icon={<span className="text-xs font-bold">Aa</span>} label="Size" active={tab === "size"} onClick={() => setTab("size")} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-6">
            <Button onClick={addText} className="bg-gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Text
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const TabBtn = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`py-3 flex flex-col items-center gap-1 text-xs ${
      active ? "text-primary" : "text-white/70"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default MediaTextEditor;