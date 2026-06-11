import { Home, Search, Bell, MessageCircle, Heart, User, PlusCircle, Settings, Sparkles } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import vibebazeLogo from "@/assets/vibebaze-logo.png";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "notifications" | "messages";
}

const NAV_ITEMS: NavItem[] = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/search", label: "Explore", icon: Search },
  { to: "/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
  { to: "/messages", label: "Messages", icon: MessageCircle, badgeKey: "messages" },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/creators-school", label: "Creators School", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

const LeftSidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const [{ count: nCount }, { data: convos }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
        supabase
          .from("conversations")
          .select("id")
          .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`),
      ]);
      setUnreadNotifications(nCount || 0);
      if (convos && convos.length) {
        const { count: mCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", convos.map((c) => c.id))
          .neq("sender_id", user.id)
          .eq("is_read", false);
        setUnreadMessages(mCount || 0);
      }
    };
    fetchCounts();
    const ch = supabase
      .channel("desktop-sidebar-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, fetchCounts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, fetchCounts)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const getBadge = (key?: "notifications" | "messages") => {
    if (key === "notifications") return unreadNotifications;
    if (key === "messages") return unreadMessages;
    return 0;
  };

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 xl:w-72 flex-col border-r border-border bg-background/95 backdrop-blur-md z-40">
      <div
        className="flex items-center gap-3 px-6 py-5 cursor-pointer"
        onClick={() => navigate("/feed")}
      >
        <img src={vibebazeLogo} alt="VibeBaze" className="h-10 w-10 object-contain" />
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          VibeBaze
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, badgeKey }) => {
          const active = pathname === to || (to !== "/feed" && pathname.startsWith(to));
          const badge = getBadge(badgeKey);
          return (
            <NavLink
              key={to}
              to={to}
              className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                active
                  ? "bg-primary/15 text-primary font-semibold"
                  : "hover:bg-muted/50 text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`h-6 w-6 ${active ? "text-primary" : ""}`} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-base">{label}</span>
            </NavLink>
          );
        })}

        <div className="pt-4">
          <Button
            onClick={() => navigate("/create")}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 rounded-xl py-6 text-base font-semibold gap-2"
          >
            <PlusCircle className="h-5 w-5" />
            Create Post
          </Button>
        </div>
      </nav>

      <div className="px-6 py-4 border-t border-border/50 text-xs text-muted-foreground">
        © {new Date().getFullYear()} VibeBaze
      </div>
    </aside>
  );
};

export default LeftSidebar;