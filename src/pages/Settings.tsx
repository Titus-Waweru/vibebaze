import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import { PhoneNumberModal } from "@/components/PhoneNumberModal";
import { ArrowLeft, Camera, ChevronRight, DollarSign, Wallet, Loader2, Save, Phone, FileText, Shield, Bell } from "lucide-react";
import ReferralCard from "@/components/ReferralCard";
import { toast } from "sonner";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    isSupported: notificationsSupported, 
    isEnabled: notificationsEnabled, 
    isLoading: notificationsLoading,
    enableNotifications,
    disableNotifications 
  } = usePushNotifications();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [lastProfileUpdate, setLastProfileUpdate] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [daysUntilEdit, setDaysUntilEdit] = useState(0);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      await enableNotifications();
    } else {
      await disableNotifications();
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      
      setUsername(data.username || "");
      setFullName(data.full_name || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url);
      setPhoneNumber(data.phone_number);
      setLastProfileUpdate(data.last_profile_update);

      // Check if user can edit (10 days since last update)
      if (data.last_profile_update) {
        const lastUpdate = new Date(data.last_profile_update);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 10) {
          setCanEdit(false);
          setDaysUntilEdit(10 - daysDiff);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Check if editing is allowed
    if (!canEdit) {
      toast.error(`You can edit your profile again in ${daysUntilEdit} days`);
      return;
    }

    // Validate username
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          last_profile_update: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("Username is already taken");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Profile updated! You can edit again in 10 days.");
      navigate("/profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-6 max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
        </div>

        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            {!canEdit && (
              <p className="text-sm text-amber-500 mt-2">
                ⏳ You can edit your profile again in {daysUntilEdit} days
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-28 w-28 ring-4 ring-primary/20">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-primary text-background text-4xl">
                    {username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                  ) : (
                    <Camera className="h-4 w-4 text-primary-foreground" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Tap the camera icon to change your photo
              </p>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a unique username..."
                maxLength={30}
                className="placeholder:text-muted-foreground/50"
              />
              <p className="text-xs text-muted-foreground">
                This is how others will find and mention you
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your display name (optional)..."
                maxLength={50}
                className="placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a bit about yourself..."
                maxLength={160}
                rows={4}
                className="placeholder:text-muted-foreground/50"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/160
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving || !canEdit}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {canEdit ? "Save Changes" : `Edit in ${daysUntilEdit} days`}
            </Button>
          </CardContent>
        </Card>

        {/* Phone Number (Kenya) */}
        <Card className="border-border/50 shadow-card mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              M-PESA Phone Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            {phoneNumber ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <Phone className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{phoneNumber}</p>
                    <p className="text-sm text-muted-foreground">Ready for M-PESA transactions</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowPhoneModal(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Add your Kenyan phone number (+254) to receive tips and withdraw earnings via M-PESA.
                </p>
                <Button onClick={() => setShowPhoneModal(true)} className="gap-2">
                  <Phone className="h-4 w-4" />
                  Add Phone Number
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creator Wallet */}
        <Card 
          className="border-border/50 shadow-card mt-6 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/wallet")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <Wallet className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    View balance, transactions & withdraw
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Creator Earnings */}
        <Card 
          className="border-border/50 shadow-card mt-4 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/earnings")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Creator Earnings</h3>
                  <p className="text-sm text-muted-foreground">
                    Get paid when you reach 10,000 views
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        {notificationsSupported && (
          <Card className="border-border/50 shadow-card mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about likes, comments, follows, and tips
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                  disabled={notificationsLoading}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Section */}
        {user && (
          <div className="mt-6">
            <ReferralCard userId={user.id} />
          </div>
        )}

        {/* Legal Links */}
        <Card className="border-border/50 shadow-card mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => navigate("/terms")}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Terms & Conditions
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => navigate("/privacy")}
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy Policy
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {user && (
        <PhoneNumberModal 
          open={showPhoneModal}
          onOpenChange={setShowPhoneModal}
          userId={user.id}
          onSuccess={() => fetchProfile()}
        />
      )}
    </div>
  );
};

export default Settings;