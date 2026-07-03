import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, HardDrive, Database, Image as ImageIcon, Video, Music, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

interface StorageStats {
  total_bytes: number;
  total_files: number;
  avg_bytes: number;
  image_bytes: number; image_count: number;
  video_bytes: number; video_count: number;
  audio_bytes: number; audio_count: number;
  other_bytes: number; other_count: number;
  largest_files: { name: string; size: number; mime: string }[];
  growth_30d: { day: string; bytes: number }[];
}

interface DbStats {
  database_bytes: number;
  active_connections: number;
  tables: { table_name: string; total_bytes: number; table_bytes: number; index_bytes: number; row_estimate: number }[];
}

interface MediaStats {
  uploads_today: number;
  uploads_7d: number;
  videos_total: number;
  images_total: number;
  audio_total: number;
  text_total: number;
  posts_missing_thumbnail: number;
  views_24h: number;
}

const AdminSystemHealthTab = () => {
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [db, setDb] = useState<DbStats | null>(null);
  const [media, setMedia] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, m] = await Promise.all([
        supabase.rpc("admin_storage_stats"),
        supabase.rpc("admin_db_stats"),
        supabase.rpc("admin_media_stats"),
      ]);
      if (s.error) throw s.error;
      if (d.error) throw d.error;
      if (m.error) throw m.error;
      setStorage(s.data as unknown as StorageStats);
      setDb(d.data as unknown as DbStats);
      setMedia(m.data as unknown as MediaStats);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load system health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !storage) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalMediaBytes = storage?.total_bytes || 0;
  const pct = (part: number) => (totalMediaBytes > 0 ? (part / totalMediaBytes) * 100 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Storage & System Health</h2>
          <p className="text-sm text-muted-foreground">Live storage usage, database size, and media pipeline metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Top-line cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <HardDrive className="h-3.5 w-3.5" /> Total media storage
            </div>
            <div className="text-xl font-bold">{formatBytes(storage?.total_bytes || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{storage?.total_files || 0} files</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Database className="h-3.5 w-3.5" /> Database size
            </div>
            <div className="text-xl font-bold">{formatBytes(db?.database_bytes || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{db?.active_connections || 0} active connections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Uploads (24h)</div>
            <div className="text-xl font-bold">{media?.uploads_today ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{media?.uploads_7d ?? 0} in last 7d</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Avg. file size</div>
            <div className="text-xl font-bold">{formatBytes(storage?.avg_bytes || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Views (24h): {media?.views_24h ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Media breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Storage by media type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Images", icon: ImageIcon, bytes: storage?.image_bytes || 0, count: storage?.image_count || 0 },
            { label: "Videos", icon: Video, bytes: storage?.video_bytes || 0, count: storage?.video_count || 0 },
            { label: "Audio", icon: Music, bytes: storage?.audio_bytes || 0, count: storage?.audio_count || 0 },
            { label: "Other", icon: FileText, bytes: storage?.other_bytes || 0, count: storage?.other_count || 0 },
          ].map(row => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <row.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{row.label}</span>
                  <span className="text-xs text-muted-foreground">({row.count} files)</span>
                </div>
                <span className="font-medium">{formatBytes(row.bytes)}</span>
              </div>
              <Progress value={pct(row.bytes)} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Media pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Media pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-muted-foreground text-xs">Videos</div><div className="font-semibold text-lg">{media?.videos_total ?? 0}</div></div>
          <div><div className="text-muted-foreground text-xs">Images</div><div className="font-semibold text-lg">{media?.images_total ?? 0}</div></div>
          <div><div className="text-muted-foreground text-xs">Audio</div><div className="font-semibold text-lg">{media?.audio_total ?? 0}</div></div>
          <div><div className="text-muted-foreground text-xs">Text posts</div><div className="font-semibold text-lg">{media?.text_total ?? 0}</div></div>
          {(media?.posts_missing_thumbnail ?? 0) > 0 && (
            <div className="col-span-2 md:col-span-4 flex items-center gap-2 text-amber-500 text-xs bg-amber-500/10 rounded-md p-2">
              <AlertTriangle className="h-4 w-4" />
              {media?.posts_missing_thumbnail} video posts are missing thumbnails
            </div>
          )}
        </CardContent>
      </Card>

      {/* Largest files */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Largest files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {(storage?.largest_files || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No files yet.</p>
          )}
          {(storage?.largest_files || []).map((f, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-xs">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.mime || "unknown"}</p>
              </div>
              <span className="ml-3 font-medium">{formatBytes(f.size)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Table sizes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Database tables (top 25)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                  <th className="py-2 font-normal">Table</th>
                  <th className="py-2 font-normal text-right">Rows (est.)</th>
                  <th className="py-2 font-normal text-right">Table</th>
                  <th className="py-2 font-normal text-right">Indexes</th>
                  <th className="py-2 font-normal text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(db?.tables || []).map(t => (
                  <tr key={t.table_name} className="border-b border-border/30 last:border-0">
                    <td className="py-1.5 font-mono text-xs">{t.table_name}</td>
                    <td className="py-1.5 text-right">{t.row_estimate.toLocaleString()}</td>
                    <td className="py-1.5 text-right">{formatBytes(t.table_bytes)}</td>
                    <td className="py-1.5 text-right">{formatBytes(t.index_bytes)}</td>
                    <td className="py-1.5 text-right font-medium">{formatBytes(t.total_bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemHealthTab;