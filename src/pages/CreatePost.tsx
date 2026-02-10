import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import HashtagSuggestions from "@/components/HashtagSuggestions";
import { Image, Video, Music, FileText, Upload, X, Eye } from "lucide-react";

const MAX_VIDEO_DURATION_SECONDS = 8 * 60; // 8 minutes

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState<"text" | "image" | "video" | "audio">("text");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedHashtags.includes("VibeBaze")) {
      setSelectedHashtags(["VibeBaze"]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("username, avatar_url, full_name").eq("id", user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    }
  }, [user]);

  // Generate preview URL for selected file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreviewUrl(null);
    }
  }, [file]);

  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
          toast.error(`Video must be less than 8 minutes. Yours is ${Math.ceil(video.duration / 60)} minutes.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(true); // Allow if we can't check
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate video duration
      if (postType === "video") {
        const valid = await validateVideoDuration(selectedFile);
        if (!valid) {
          e.target.value = "";
          return;
        }
      }
      
      setFile(selectedFile);
    }
  };

  const handleToggleHashtag = (tag: string) => {
    setSelectedHashtags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const { data, error } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      clearInterval(progressInterval);
      if (error) throw error;
      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      return publicUrl;
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to create a post");
      return;
    }

    if (!caption && postType === "text") {
      toast.error("Please add some text");
      return;
    }

    if (!file && postType !== "text") {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);

    try {
      let mediaUrl = null;
      if (file) {
        mediaUrl = await uploadFile(file);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        type: postType,
        caption: caption || null,
        media_url: mediaUrl,
        is_private: false,
        hashtags: selectedHashtags.length > 0 ? selectedHashtags : null,
      });

      if (error) throw error;

      toast.success("Post created successfully!");
      navigate("/feed");
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              Create Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Post Type Selection */}
              <div className="space-y-2">
                <Label>Post Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button type="button" variant={postType === "text" ? "default" : "outline"} onClick={() => { setPostType("text"); setFile(null); }} className={postType === "text" ? "bg-gradient-primary" : ""}>
                    <FileText className="h-5 w-5" />
                  </Button>
                  <Button type="button" variant={postType === "image" ? "default" : "outline"} onClick={() => { setPostType("image"); setFile(null); }} className={postType === "image" ? "bg-gradient-primary" : ""}>
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button type="button" variant={postType === "video" ? "default" : "outline"} onClick={() => { setPostType("video"); setFile(null); }} className={postType === "video" ? "bg-gradient-primary" : ""}>
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button type="button" variant={postType === "audio" ? "default" : "outline"} onClick={() => { setPostType("audio"); setFile(null); }} className={postType === "audio" ? "bg-gradient-primary" : ""}>
                    <Music className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              {postType !== "text" && (
                <div className="space-y-3">
                  <Label>Upload {postType} {postType === "video" && <span className="text-xs text-muted-foreground">(max 8 min)</span>}</Label>

                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors relative">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        postType === "image"
                          ? "image/*"
                          : postType === "video"
                          ? "video/*"
                          : "audio/*"
                      }
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      {file ? (
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm text-foreground truncate max-w-[200px]">{file.name}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setFile(null);
                            }}
                            className="p-1 rounded-full hover:bg-muted"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Click to upload from device
                        </p>
                      )}
                    </label>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Uploading...</span>
                        <span className="text-primary font-medium">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}

              {/* Caption */}
              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Textarea
                  id="caption"
                  placeholder="Share your thoughts..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  maxLength={300}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {caption.length}/300
                </p>
              </div>

              {/* Hashtag Suggestions */}
              <HashtagSuggestions
                caption={caption}
                mediaType={postType}
                selectedHashtags={selectedHashtags}
                onToggleHashtag={handleToggleHashtag}
              />

              {/* Preview Toggle */}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4" />
                {showPreview ? "Hide Preview" : "Preview Post"}
              </Button>

              {/* Post Preview */}
              {showPreview && (
                <Card className="border-border/50 overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-primary text-background">
                        {profile?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{profile?.username || "You"}</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>

                  {/* Preview media */}
                  {postType === "image" && filePreviewUrl && (
                    <img src={filePreviewUrl} alt="Preview" className="w-full max-h-[400px] object-contain bg-muted" />
                  )}
                  {postType === "video" && filePreviewUrl && (
                    <video src={filePreviewUrl} controls className="w-full max-h-[400px] bg-black" />
                  )}
                  {postType === "audio" && filePreviewUrl && (
                    <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
                      <audio src={filePreviewUrl} controls className="w-full" />
                    </div>
                  )}
                  {postType === "text" && caption && (
                    <div className="p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 min-h-[150px] flex items-center justify-center">
                      <p className="text-xl text-foreground text-center font-medium">{caption}</p>
                    </div>
                  )}

                  {caption && postType !== "text" && (
                    <div className="px-4 pt-3">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{profile?.username || "You"}</span>{" "}
                        {caption}
                      </p>
                    </div>
                  )}

                  {selectedHashtags.length > 0 && (
                    <div className="px-4 py-2 flex flex-wrap gap-1.5">
                      {selectedHashtags.map((tag) => (
                        <span key={tag} className="text-xs text-primary">#{tag}</span>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                disabled={loading}
              >
                {loading ? "Creating..." : "Share Post"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatePost;
