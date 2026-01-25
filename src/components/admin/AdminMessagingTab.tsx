import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Bell, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Send, 
  FileJson, 
  Key,
  AlertTriangle,
  RefreshCw,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ServiceAccountInfo {
  projectId: string;
  clientEmail: string;
  hasPrivateKey: boolean;
  isValid: boolean;
}

interface PushTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: {
    total?: number;
    sent?: number;
    failed?: number;
  };
}

const AdminMessagingTab = () => {
  // Service Account State
  const [serviceAccount, setServiceAccount] = useState<ServiceAccountInfo | null>(null);
  const [parsedJson, setParsedJson] = useState<{
    project_id?: string;
    client_email?: string;
    private_key?: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Push Test State
  const [testTitle, setTestTitle] = useState("VibeLoop Test Notification");
  const [testBody, setTestBody] = useState("This is a test push notification from VibeLoop admin panel.");
  const [adminSecret, setAdminSecret] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<PushTestResult | null>(null);
  
  // Secrets update state
  const [updatingSecrets, setUpdatingSecrets] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setServiceAccount(null);
    setParsedJson(null);

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setUploadError("Please upload a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);

        // Validate required fields
        const requiredFields = ['project_id', 'client_email', 'private_key'];
        const missingFields = requiredFields.filter(field => !json[field]);

        if (missingFields.length > 0) {
          setUploadError(`Missing required fields: ${missingFields.join(', ')}`);
          return;
        }

        // Validate private key format
        if (!json.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
          setUploadError("Invalid private key format. Please use a valid Firebase Service Account JSON.");
          return;
        }

        // Validate it looks like a Firebase service account
        if (json.type !== 'service_account') {
          setUploadError("This doesn't appear to be a Firebase Service Account JSON. Please check the file.");
          return;
        }

        // Store parsed JSON and create summary
        setParsedJson(json);
        setServiceAccount({
          projectId: json.project_id,
          clientEmail: json.client_email,
          hasPrivateKey: true,
          isValid: true
        });

        toast.success("Service Account JSON parsed successfully");
      } catch (error) {
        console.error("JSON parse error:", error);
        setUploadError("Invalid JSON file. Please check the file format.");
      }
    };

    reader.onerror = () => {
      setUploadError("Failed to read file");
    };

    reader.readAsText(file);
  }, []);

  const handleCopySecrets = useCallback(async () => {
    if (!parsedJson) {
      toast.error("No service account data to copy");
      return;
    }

    const secretsText = `
FCM_CLIENT_EMAIL: ${parsedJson.client_email}
VITE_FIREBASE_PROJECT_ID: ${parsedJson.project_id}
FCM_PRIVATE_KEY: (see below)

Private Key:
${parsedJson.private_key}
    `.trim();

    try {
      await navigator.clipboard.writeText(secretsText);
      toast.success("Secrets copied to clipboard! Add them to your backend secrets.");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  }, [parsedJson]);

  const handleSendTestNotification = async () => {
    if (!testTitle.trim() || !testBody.trim()) {
      toast.error("Please fill in title and message");
      return;
    }

    if (!adminSecret.trim()) {
      toast.error("Admin secret is required");
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-app-update-notification",
        {
          body: {
            title: testTitle.trim(),
            body: testBody.trim(),
            adminSecret: adminSecret.trim(),
          },
        }
      );

      if (error) throw error;

      const result: PushTestResult = {
        success: true,
        message: `Notification sent successfully`,
        timestamp: new Date().toISOString(),
        details: {
          total: data.total || 0,
          sent: data.success || 0,
          failed: data.failed || 0
        }
      };

      setLastResult(result);
      toast.success(`Test notification sent! ${data.success}/${data.total} delivered`);
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      
      const result: PushTestResult = {
        success: false,
        message: error.message || "Failed to send notification",
        timestamp: new Date().toISOString()
      };
      
      setLastResult(result);
      toast.error("Failed to send test notification");
    } finally {
      setSending(false);
    }
  };

  const clearFile = () => {
    setServiceAccount(null);
    setParsedJson(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Firebase Service Account Upload */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Firebase Service Account
          </CardTitle>
          <CardDescription>
            Upload your Firebase Service Account JSON to enable FCM HTTP v1 push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                Click to upload Service Account JSON
              </p>
              <p className="text-xs text-muted-foreground">
                Download from Firebase Console → Project Settings → Service Accounts
              </p>
            </div>

            {/* Error Display */}
            {uploadError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Upload Error</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {serviceAccount && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Valid Service Account</AlertTitle>
                <AlertDescription className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Project ID</Label>
                      <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded">
                        {serviceAccount.projectId}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Client Email</Label>
                      <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded truncate">
                        {serviceAccount.clientEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-500 border-green-500/50">
                      <Key className="h-3 w-3 mr-1" />
                      Private Key Present
                    </Badge>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopySecrets}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Copy Secrets
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFile}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Upload Different File
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How to get Service Account JSON</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Go to Firebase Console → Your Project</li>
                <li>Click Settings (gear icon) → Project Settings</li>
                <li>Go to "Service Accounts" tab</li>
                <li>Click "Generate new private key"</li>
                <li>Upload the downloaded JSON file here</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Test Push Notification */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Test Push Notification
          </CardTitle>
          <CardDescription>
            Send a test notification to verify FCM is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-secret">Admin Secret *</Label>
            <Input
              id="admin-secret"
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Enter admin secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-title">Notification Title *</Label>
            <Input
              id="test-title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="e.g., Test Notification"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-body">Notification Message *</Label>
            <Textarea
              id="test-body"
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              placeholder="e.g., This is a test notification..."
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {testBody.length}/200
            </p>
          </div>

          <Button
            onClick={handleSendTestNotification}
            disabled={sending}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test Notification
          </Button>

          {/* Last Result Display */}
          {lastResult && (
            <Alert className={lastResult.success ? "border-green-500/50 bg-green-500/10" : "border-destructive/50 bg-destructive/10"}>
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertTitle className={lastResult.success ? "text-green-500" : "text-destructive"}>
                {lastResult.success ? "Push Sent Successfully" : "Push Failed"}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">{lastResult.message}</p>
                {lastResult.details && (
                  <div className="flex gap-4 text-xs">
                    <span>Total: {lastResult.details.total}</span>
                    <span className="text-green-500">Sent: {lastResult.details.sent}</span>
                    <span className="text-destructive">Failed: {lastResult.details.failed}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(lastResult.timestamp).toLocaleString()}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Alert className="border-amber-500/20 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm text-amber-500">
              This sends a real push notification to all subscribed users. Use for testing only.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* FCM Configuration Status */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            FCM Configuration Status
          </CardTitle>
          <CardDescription>
            Current backend secrets configuration for push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">FCM_CLIENT_EMAIL</span>
              </div>
              <Badge variant="outline" className="text-green-500 border-green-500/50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">FCM_PRIVATE_KEY</span>
              </div>
              <Badge variant="outline" className="text-green-500 border-green-500/50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">VITE_FIREBASE_PROJECT_ID</span>
              </div>
              <Badge variant="outline" className="text-green-500 border-green-500/50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These secrets are required for FCM HTTP v1 API. Update them via Backend → Secrets if needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMessagingTab;
