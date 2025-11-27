import Navbar from "@/components/Navbar";
import { Bell } from "lucide-react";

const Notifications = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Notifications</h1>
        
        <div className="text-center py-20">
          <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      </div>
    </div>
  );
};

export default Notifications;