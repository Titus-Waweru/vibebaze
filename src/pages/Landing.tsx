import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Users, Heart, Zap, Download, Globe } from "lucide-react";
import heroGradient from "@/assets/hero-gradient.jpg";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Footer } from "@/components/Footer";

const Landing = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col">
      <InstallPrompt />
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 z-0">
          <img src={heroGradient} alt="VibeLoop Background" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{
          animationDelay: "1s"
        }} />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="animate-fade-in">
            {/* African-First Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Africa's Creator Platform 🌍</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">VibeLoop</h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Express yourself. Connect authentically. Earn from your creativity.
            </p>
            <p className="text-lg text-primary/80 mb-8 max-w-xl mx-auto">
              Built for African creators — monetize with M-PESA, no barriers.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-accent-glow transition-all duration-300 text-lg px-8 py-6" onClick={() => navigate("/auth?mode=signup")}>
                Get Started
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/10 text-lg px-8 py-6" onClick={() => navigate("/auth?mode=login")}>
                Sign In
              </Button>
            </div>
            
            {/* Install App Banner */}
            <div className="mt-6">
              <Button variant="ghost" className="text-muted-foreground hover:text-primary hover:bg-primary/10 gap-2" onClick={() => navigate("/install")}>
                <Download className="h-4 w-4" />
                Install App for Offline Access
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto animate-slide-up" style={{
            animationDelay: "0.2s"
          }}>
            {[{
              icon: Users,
              label: "African Creators",
              value: "10K+"
            }, {
              icon: Heart,
              label: "Daily Vibes",
              value: "50K+"
            }, {
              icon: Zap,
              label: "M-PESA Transactions",
              value: "1K+"
            }, {
              icon: Sparkles,
              label: "Communities",
              value: "500+"
            }].map((stat, index) => <div key={index} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Why African Creators Choose VibeLoop
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            No international payment barriers. Withdraw directly to M-PESA. Built with Africa in mind.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[{
              title: "Earn with M-PESA",
              description: "Receive tips and withdraw instantly to your Kenyan phone number. No bank account needed.",
              icon: Zap
            }, {
              title: "Build Your Community",
              description: "Connect with fellow African creators. Share your culture, your stories, your vibe.",
              icon: Users
            }, {
              title: "Go Viral Locally",
              description: "Our algorithm boosts African content. Your talent, showcased to your people.",
              icon: Heart
            }].map((feature, index) => <div key={index} className="bg-card border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 group hover:shadow-glow">
                <div className="bg-gradient-primary rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-8 w-8 text-background" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Ready to Share Your Vibe?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of African creators already earning on VibeLoop
          </p>
          <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-accent-glow transition-all duration-300 text-lg px-8 py-6" onClick={() => navigate("/auth?mode=signup")}>
            Create Your Account
            <Zap className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};
export default Landing;