import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Image, Video, Music, FileText, Upload } from "lucide-react";

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState<"text" | "image" | "video" | "audio">("text");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("media")
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    return publicUrl;
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
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
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
                        <p className="text-sm text-foreground">{file.name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Click to upload {postType}
                        </p>
                      )}
                    </label>
                  </div>
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