import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhoneNumberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export const PhoneNumberModal = ({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: PhoneNumberModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Handle different input formats
    if (digits.startsWith("254")) {
      return `+${digits}`;
    } else if (digits.startsWith("0")) {
      return `+254${digits.substring(1)}`;
    } else if (digits.startsWith("7") || digits.startsWith("1")) {
      return `+254${digits}`;
    }
    return value;
  };

  const validateKenyanPhone = (phone: string): boolean => {
    // Must be +254 followed by 7 or 1, then 8 more digits
    const pattern = /^\+254[17][0-9]{8}$/;
    return pattern.test(phone);
  };

  const handleSubmit = async () => {
    setError("");
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!validateKenyanPhone(formattedPhone)) {
      setError("Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ phone_number: formattedPhone })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast.success("Phone number verified! You can now use monetization features.");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating phone:", err);
      setError("Failed to save phone number. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20">
            <Phone className="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle className="text-center text-xl">Kenyan Phone Number Required</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            To send or receive money on VibeBaze, you need a valid Kenyan M-PESA number (+254).
            This is what makes VibeBaze different — built for African creators!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712345678 or +254712345678"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setError("");
              }}
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Enter your Safaricom or Airtel Kenya number
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Why Kenya only?</strong><br />
              VibeBaze is an African-first platform. We're starting with Kenya and M-PESA, 
              with more African countries coming soon! 🌍
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !phoneNumber.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Verify Number
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
