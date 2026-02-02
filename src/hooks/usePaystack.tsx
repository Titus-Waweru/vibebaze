import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePaystack = () => {
  const [loading, setLoading] = useState(false);

  const initializePayment = async (amount: number, email: string, userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-paystack', {
        body: { 
          amount, 
          email, 
          userId,
          callbackUrl: `${window.location.origin}/wallet?payment=success`
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Redirect to Paystack checkout
      window.location.href = data.authorization_url;
      return true;
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'Failed to initialize payment');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    initializePayment,
    loading,
  };
};
