import heroCreators from "@/assets/landing-hero-creators.jpg";
import heroGradient from "@/assets/hero-gradient.jpg";

/**
 * Shared layered background for auth pages (login/signup, reset, verify).
 * Renders a real photo + gradient mesh + dark overlays + floating orbs.
 * Place inside a relative + overflow-hidden parent.
 */
const AuthBackground = () => (
  <>
    <div className="absolute inset-0 z-0 pointer-events-none">
      <img
        src={heroCreators}
        alt=""
        aria-hidden
        className="w-full h-full object-cover opacity-30 scale-105"
      />
      <img
        src={heroGradient}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.25),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.2),transparent_55%)]" />
    </div>
    <div className="absolute top-10 -left-10 w-72 h-72 bg-primary/25 rounded-full blur-3xl animate-float pointer-events-none" />
    <div className="absolute bottom-10 -right-10 w-80 h-80 bg-accent/25 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: "1.2s" }} />
  </>
);

export default AuthBackground;
