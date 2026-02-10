import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Gift, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TipButtonProps {
  creatorId: string;
  creatorUsername: string;
  postId?: string;
  onTip: (amount: number) => Promise<boolean>;
  disabled?: boolean;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}

const TIP_AMOUNTS = [10, 20, 50, 100, 200, 500];

const TipButton = ({
  creatorId,
  creatorUsername,
  postId,
  onTip,
  disabled = false,
  variant = "ghost",
  size = "icon",
  className,
}: TipButtonProps) => {
  const [open, setOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const handleSendTip = async () => {
    if (!selectedAmount) return;

    setSending(true);
    const success = await onTip(selectedAmount);
    setSending(false);

    if (success) {
      setOpen(false);
      setSelectedAmount(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={cn("text-muted-foreground hover:text-primary", className)}
        >
          <Gift className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Send a Tip
          </DialogTitle>
          <DialogDescription>
            Support <span className="font-medium text-foreground">@{creatorUsername}</span> with a tip
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 py-4">
          {TIP_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant={selectedAmount === amount ? "default" : "outline"}
              className={cn(
                "h-12 text-base font-medium transition-all",
                selectedAmount === amount && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => setSelectedAmount(amount)}
            >
              KSh {amount}
            </Button>
          ))}
        </div>

        {selectedAmount && (
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              You're sending <span className="font-medium text-foreground">KSh {selectedAmount}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Creator receives: <span className="font-medium text-foreground">KSh {(selectedAmount * 0.85).toFixed(0)}</span>
              <span className="ml-1">(15% platform fee: KSh {(selectedAmount * 0.15).toFixed(0)})</span>
            </p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendTip}
            disabled={!selectedAmount || sending}
            className="w-full sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Send Tip
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TipButton;
