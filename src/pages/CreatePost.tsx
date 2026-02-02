import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Image, Video, Music, FileText, Upload, X } from "lucide-react";

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState<"text" | "image" | "video" | "audio">("text");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress for better UX (Supabase doesn't provide native progress)
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
                  <Button
                    type="button"
                    variant={postType === "text" ? "default" : "outline"}
                    onClick={() => setPostType("text")}
                    className={postType === "text" ? "bg-gradient-primary" : ""}
                  >
                    <FileText className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant={postType === "image" ? "default" : "outline"}
                    onClick={() => setPostType("image")}
                    className={postType === "image" ? "bg-gradient-primary" : ""}
                  >
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant={postType === "video" ? "default" : "outline"}
                    onClick={() => setPostType("video")}
                    className={postType === "video" ? "bg-gradient-primary" : ""}
                  >
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant={postType === "audio" ? "default" : "outline"}
                    onClick={() => setPostType("audio")}
                    className={postType === "audio" ? "bg-gradient-primary" : ""}
                  >
                    <Music className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              {postType !== "text" && (
                <div className="space-y-2">
                  <Label>Upload {postType}</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors relative">
                    <Input
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
                          Click to upload {postType}
                        </p>
                      )}
                    </label>
                  </div>
                  
                  {/* Upload Progress */}
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