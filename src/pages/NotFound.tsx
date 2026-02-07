import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import vibebazeLogo from "@/assets/vibebaze-logo.png";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <img
          src={vibebazeLogo}
          alt="VibeBaze"
          className="h-16 w-auto mx-auto mb-8"
        />
        <h1 className="mb-2 text-7xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">
          404
        </h1>
        <p className="mb-2 text-xl font-semibold text-foreground">
          Oops! This page doesn't exist
        </p>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for may have been moved or doesn't exist anymore. Let's get you back on track!
        </p>
        <Button asChild size="lg" className="bg-gradient-primary hover:shadow-glow gap-2">
          <Link to="/">
            <Home className="h-5 w-5" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
