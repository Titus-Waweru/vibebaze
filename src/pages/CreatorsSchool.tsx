import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Wallet,
  TrendingUp,
  Video,
  Heart,
  Sparkles,
  CheckCircle2,
  Lock,
  PlayCircle,
  BookOpen,
  Star,
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  locked: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  lessons: Lesson[];
  color: string;
}

const modules: Module[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of VibeBaze and set up your creator profile",
    icon: <Sparkles className="h-6 w-6" />,
    color: "from-purple-500 to-pink-500",
    lessons: [
      { id: "1-1", title: "Welcome to VibeBaze", description: "What makes VibeBaze different", duration: "3 min", completed: true, locked: false },
      { id: "1-2", title: "Setting Up Your Profile", description: "Create a profile that stands out", duration: "5 min", completed: true, locked: false },
      { id: "1-3", title: "Understanding Your Wallet", description: "How earning and payments work", duration: "4 min", completed: false, locked: false },
      { id: "1-4", title: "Your First Post", description: "Create content that gets noticed", duration: "6 min", completed: false, locked: false },
    ],
  },
  {
    id: "growing-audience",
    title: "Growing Your Audience",
    description: "Strategies to attract and retain followers in Africa",
    icon: <Users className="h-6 w-6" />,
    color: "from-blue-500 to-cyan-500",
    lessons: [
      { id: "2-1", title: "Know Your African Audience", description: "Understanding local trends", duration: "7 min", completed: false, locked: false },
      { id: "2-2", title: "Hashtag Strategies", description: "Using tags to get discovered", duration: "5 min", completed: false, locked: false },
      { id: "2-3", title: "Consistency is Key", description: "Building a posting schedule", duration: "4 min", completed: false, locked: true },
      { id: "2-4", title: "Engaging Your Community", description: "Turn viewers into fans", duration: "6 min", completed: false, locked: true },
    ],
  },
  {
    id: "content-creation",
    title: "Content Creation",
    description: "Master the art of creating viral African content",
    icon: <Video className="h-6 w-6" />,
    color: "from-orange-500 to-red-500",
    lessons: [
      { id: "3-1", title: "Video Fundamentals", description: "Lighting, sound, and framing", duration: "8 min", completed: false, locked: false },
      { id: "3-2", title: "Storytelling for Africans", description: "Connect with cultural narratives", duration: "6 min", completed: false, locked: true },
      { id: "3-3", title: "Low-Data Optimization", description: "Create content that loads fast", duration: "5 min", completed: false, locked: true },
      { id: "3-4", title: "Trending Sounds & Music", description: "Leverage local audio trends", duration: "4 min", completed: false, locked: true },
    ],
  },
  {
    id: "monetization",
    title: "Monetization Mastery",
    description: "Turn your content into real earnings via M-PESA",
    icon: <Wallet className="h-6 w-6" />,
    color: "from-green-500 to-emerald-500",
    lessons: [
      { id: "4-1", title: "M-PESA Setup", description: "Connect your phone for payouts", duration: "3 min", completed: false, locked: false },
      { id: "4-2", title: "Getting Tips", description: "Encourage fans to support you", duration: "5 min", completed: false, locked: true },
      { id: "4-3", title: "Subscriber Strategies", description: "Build recurring income", duration: "7 min", completed: false, locked: true },
      { id: "4-4", title: "Withdrawal Best Practices", description: "Managing your earnings", duration: "4 min", completed: false, locked: true },
    ],
  },
  {
    id: "personal-branding",
    title: "Personal Branding",
    description: "Build a memorable creator identity",
    icon: <Star className="h-6 w-6" />,
    color: "from-yellow-500 to-orange-500",
    lessons: [
      { id: "5-1", title: "Finding Your Niche", description: "What makes you unique", duration: "6 min", completed: false, locked: false },
      { id: "5-2", title: "Visual Identity", description: "Colors, fonts, and style", duration: "5 min", completed: false, locked: true },
      { id: "5-3", title: "Your Creator Story", description: "Sharing your journey", duration: "4 min", completed: false, locked: true },
      { id: "5-4", title: "Cross-Platform Presence", description: "Expand beyond VibeBaze", duration: "6 min", completed: false, locked: true },
    ],
  },
];

const CreatorsSchool = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Calculate overall progress
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => l.completed).length,
    0
  );
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  const getModuleProgress = (module: Module) => {
    const completed = module.lessons.filter((l) => l.completed).length;
    return Math.round((completed / module.lessons.length) * 100);
  };

  if (selectedLesson) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
        <Navbar />
        <div className="container mx-auto px-4 pt-6 max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedLesson(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{selectedLesson.title}</h1>
              <p className="text-sm text-muted-foreground">{selectedLesson.duration} lesson</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-card">
            <CardContent className="pt-6">
              {/* Video placeholder */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-6">
                <div className="text-center">
                  <PlayCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Lesson video coming soon!</p>
                </div>
              </div>

              <h2 className="text-lg font-semibold mb-2">{selectedLesson.title}</h2>
              <p className="text-muted-foreground mb-6">{selectedLesson.description}</p>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <h3 className="font-medium text-foreground mb-2">Key Takeaways</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                    <span>Interactive lessons tailored for African creators</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                    <span>Practical tips you can apply immediately</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                    <span>Earn badges as you complete modules</span>
                  </li>
                </ul>
              </div>

              <Button className="w-full mt-6 bg-gradient-primary hover:shadow-glow">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Complete
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (selectedModule) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
        <Navbar />
        <div className="container mx-auto px-4 pt-6 max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedModule(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{selectedModule.title}</h1>
              <p className="text-sm text-muted-foreground">{selectedModule.lessons.length} lessons</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-card mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedModule.color} flex items-center justify-center`}>
                  {selectedModule.icon}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">{selectedModule.title}</h2>
                  <p className="text-sm text-muted-foreground">{selectedModule.description}</p>
                </div>
              </div>
              <Progress value={getModuleProgress(selectedModule)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {getModuleProgress(selectedModule)}% complete
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {selectedModule.lessons.map((lesson, index) => (
              <Card
                key={lesson.id}
                className={`border-border/50 transition-all ${
                  lesson.locked ? "opacity-60" : "hover:border-primary/50 cursor-pointer"
                }`}
                onClick={() => !lesson.locked && setSelectedLesson(lesson)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      lesson.completed
                        ? "bg-green-500/20 text-green-500"
                        : lesson.locked
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/20 text-primary"
                    }`}>
                      {lesson.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : lesson.locked ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground">{lesson.description}</p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {lesson.duration}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Creators School</h1>
            <p className="text-sm text-muted-foreground">Level up your creator game</p>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="border-border/50 shadow-card bg-gradient-to-br from-primary/20 via-background to-accent/20 mb-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-primary/20">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">Your Learning Journey</h2>
                <p className="text-sm text-muted-foreground">
                  {completedLessons} of {totalLessons} lessons completed
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {overallProgress}%
              </Badge>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* Modules Grid */}
        <div className="space-y-4">
          {modules.map((module) => (
            <Card
              key={module.id}
              className="border-border/50 shadow-card hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => setSelectedModule(module)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
                    {module.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{module.title}</h3>
                      {getModuleProgress(module) === 100 && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{module.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={getModuleProgress(module)} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{getModuleProgress(module)}%</span>
                    </div>
                  </div>
                  <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Creator Tips */}
        <Card className="border-border/50 shadow-card mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Post during peak hours</p>
                <p className="text-xs text-muted-foreground">7-9 PM EAT gets the most engagement</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Reply to comments</p>
                <p className="text-xs text-muted-foreground">Creators who reply get 3x more followers</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Wallet className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Add your M-PESA number</p>
                <p className="text-xs text-muted-foreground">Enable tips to start earning today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorsSchool;
