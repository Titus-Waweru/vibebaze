import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="py-8 border-t border-border/50 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} VibeLoop. Built for African Creators 🌍
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/terms" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Terms & Conditions
            </Link>
            <Link 
              to="/privacy" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
