import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Loader2 } from "lucide-react";
import { useUserReports } from "@/hooks/useUserReports";
import type { Database } from "@/integrations/supabase/types";

type ReportReason = Database["public"]["Enums"]["report_reason"];

interface ReportContentDialogProps {
  postId?: string;
  userId?: string;
  commentId?: string;
  trigger?: React.ReactNode;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "nudity", label: "Nudity / Sexual Content" },
  { value: "violence", label: "Violence / Graphic Content" },
  { value: "harassment", label: "Harassment / Bullying" },
  { value: "hate_speech", label: "Hate Speech" },
  { value: "scam_fraud", label: "Scam / Fraud" },
  { value: "spam", label: "Spam" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

const ReportContentDialog = ({ postId, userId, commentId, trigger }: ReportContentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { submitReport } = useUserReports();

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    const success = await submitReport(reason as ReportReason, description, {
      postId,
      userId,
      commentId,
    });
    setSubmitting(false);
    if (success) {
      setOpen(false);
      setReason("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1">
            <Flag className="h-4 w-4" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Additional details (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context..."
              maxLength={500}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!reason || submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportContentDialog;
