import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

// Apply saved theme preference on load — respect system preference unless user overrides
const savedTheme = localStorage.getItem("vibebaze-theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (savedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
}

// Persistent session: proactively refresh on tab focus / reconnect so users
// stay logged in across days/PWA restarts as long as refresh token is valid.
const refreshSession = () => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) supabase.auth.refreshSession().catch(() => {});
  });
};
window.addEventListener("focus", refreshSession);
window.addEventListener("online", refreshSession);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshSession();
});

createRoot(document.getElementById("root")!).render(<App />);
