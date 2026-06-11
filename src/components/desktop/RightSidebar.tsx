import { TrendingUp, Users, Sparkles, Hash, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Right-side discovery rail for desktop layout.
 * Uses placeholder data — to be wired to real queries in a follow-up.
 */

const TRENDING_TAGS = [
  { tag: "VibeBaze", posts: "12.4K" },
  { tag: "Naija", posts: "8.2K" },
  { tag: "Afrobeats", posts: "6.7K" },
  { tag: "KenyaTok", posts: "4.9K" },
  { tag: "Comedy", posts: "3.1K" },
];

const SUGGESTED = [
  { name: "Brian Otieno", handle: "@brian.ot", avatar: "" },
  { name: "Amaka Eze", handle: "@amaka", avatar: "" },
  { name: "Tunde Bakare", handle: "@tundeb", avatar: "" },
];

const GROWTH_TIPS = [
  "Post consistently — 3-5 vibes a week boosts your reach.",
  "Reply to every comment in your first hour for algorithmic lift.",
  "Use 2-3 trending tags + 1 niche tag per post.",
];

const RightSidebar = () => {
  const navigate = useNavigate();
  return (
    <aside className="hidden xl:flex fixed top-0 right-0 h-screen w-80 flex-col gap-4 overflow-y-auto px-4 py-6 border-l border-border bg-background/95 backdrop-blur-md z-30">
      {/* Trending Tags */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Trending Tags</h2>
        </div>
        <ul className="space-y-2">
          {TRENDING_TAGS.map((t) => (
            <li
              key={t.tag}
              onClick={() => navigate(`/search?q=%23${t.tag}`)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{t.tag}</span>
              </div>
              <span className="text-xs text-muted-foreground">{t.posts}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Suggested Creators */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Suggested Creators</h2>
        </div>
        <ul className="space-y-3">
          {SUGGESTED.map((u) => (
            <li key={u.handle} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.handle}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Follow
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {/* Growth Tips */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Growth Tips</h2>
        </div>
        <ul className="space-y-2">
          {GROWTH_TIPS.map((tip, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
              <TrendingUp className="h-3 w-3 mt-0.5 text-primary shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-xs"
          onClick={() => navigate("/creators-school")}
        >
          Visit Creators School →
        </Button>
      </section>

      <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
        VibeBaze · Africa's Creator Platform
      </p>
    </aside>
  );
};

export default RightSidebar;