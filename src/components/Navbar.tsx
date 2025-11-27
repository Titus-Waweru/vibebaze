import { Home, Search, PlusCircle, Bell, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Desktop */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              VibeSphere
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
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg transition-all duration-200"
              activeClassName="text-primary"
            >
              <Bell className="h-6 w-6" />
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
          <div className="hidden md:block w-20"></div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;