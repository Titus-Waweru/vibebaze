import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useEncryptionInit } from "@/hooks/useEncryptionInit";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Install from "./pages/Install";
import Earnings from "./pages/Earnings";
import AdminPanel from "./pages/AdminPanel";
import PostDetail from "./pages/PostDetail";
import Wallet from "./pages/Wallet";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CreatorsSchool from "./pages/CreatorsSchool";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import AiAssistant from "@/components/AiAssistant";
import PushNotificationReminder from "@/components/PushNotificationReminder";
import { supabase } from "@/integrations/supabase/client";


const queryClient = new QueryClient();

const AppRoutes = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
    setIsInstalled(checkInstalled);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setAuthUserId(session?.user?.id);
      if (session?.user?.id) fetchUserName(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setAuthUserId(session?.user?.id);
      if (session?.user?.id) fetchUserName(session.user.id);
      else setUserName(undefined);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserName = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", userId)
      .single();
    if (data) setUserName(data.full_name || data.username);
  };

  useEncryptionInit(authUserId);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <>
      {isAuthenticated && <PushNotificationReminder userName={userName} />}
      <Routes>
        <Route path="/" element={
          isInstalled ? (
            isAuthenticated ? <Navigate to="/feed" replace /> : <Navigate to="/auth" replace />
          ) : (
            <Landing />
          )
        } />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/create" element={<CreatePost />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/search" element={<Search />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/install" element={<Install />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/post/:postId" element={<PostDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/creators-school" element={<CreatorsSchool />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const AuthGatedAssistant = () => {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setAuthed(!!session));
    return () => subscription.unsubscribe();
  }, []);
  if (!authed) return null;
  return <AiAssistant />;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        <BrowserRouter>
          <AppRoutes />
          <AuthGatedAssistant />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
