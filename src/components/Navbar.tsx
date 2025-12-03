import { Home, Search, PlusCircle, Bell, User, Download } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();

      // Subscribe to new notifications
      const channel = supabase
        .channel('navbar-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Desktop */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              VibeLoop
            </h1>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-around w-full md:justify-center md:gap-8">
            <NavLink
              to="/feed"
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg transition-all duration-200"
              activeClassName="text-primary"
            >
              <Home className="h-6 w-6" />
              <span className="text-xs md:text-sm">Home</span>
            </NavLink>

            <NavLink
              to="/search"
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg transition-all duration-200"
              activeClassName="text-primary"
            >
              <Search className="h-6 w-6" />
              <span className="text-xs md:text-sm">Search</span>
            </NavLink>

            <Button
              onClick={() => navigate("/create")}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300 rounded-full p-3 -mt-8 md:mt-0 md:rounded-lg md:px-6"
            >
              <PlusCircle className="h-6 w-6" />
              <span className="hidden md:inline ml-2">Create</span>
            </Button>

            <NavLink
              to="/notifications"
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg transition-all duration-200 relative"
              activeClassName="text-primary"
            >
              <div className="relative">
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs md:text-sm">Alerts</span>
            </NavLink>

            <NavLink
              to="/profile"
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg transition-all duration-200"
              activeClassName="text-primary"
            >
              <User className="h-6 w-6" />
              <span className="text-xs md:text-sm">Profile</span>
            </NavLink>
          </div>

          {/* Right side - Desktop */}
          <div className="hidden md:flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/install")}
              className="border-primary/50 hover:bg-primary/10 gap-2"
            >
              <Download className="h-4 w-4" />
              Install
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
