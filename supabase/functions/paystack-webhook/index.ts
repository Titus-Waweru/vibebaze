import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    channel: string;
    metadata: {
      user_id: string;
      transaction_type: string;
    };
    customer: {
      email: string;
    };
    paid_at: string;
  };
}

// Verify Paystack webhook signature
async function verifyPaystackSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    // Verify webhook signature
    if (signature) {
      const isValid = await verifyPaystackSignature(body, signature, paystackSecret);
      if (!isValid) {
        console.error('Invalid Paystack signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload: PaystackWebhookPayload = JSON.parse(body);
    console.log('Paystack webhook received:', payload.event);

    // Only process successful charges
    if (payload.event !== 'charge.success') {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data } = payload;
    const userId = data.metadata?.user_id;
    const transactionType = data.metadata?.transaction_type || 'wallet_funding';

    if (!userId) {
      console.error('No user_id in webhook metadata');
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for idempotency - don't process same reference twice
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('payment_reference', data.reference)
      .single();

    if (existingTx) {
      console.log('Transaction already processed:', data.reference);
      return new Response(JSON.stringify({ message: 'Already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Amount is in kobo (smallest unit), convert to KES
    const amountInKES = data.amount / 100;

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        receiver_id: userId,
        amount: amountInKES,
        net_amount: amountInKES,
        platform_fee: 0,
        transaction_type: 'earnings', // Using earnings for wallet funding
        status: 'completed',
        payment_method: 'paystack' as any, // We'll need to add this enum value
        payment_reference: data.reference,
        description: 'Wallet funding via Paystack',
        completed_at: new Date().toISOString(),
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
      throw txError;
    }

    // Update user's wallet balance
    const { error: walletError } = await supabase.rpc('add_wallet_balance', {
      p_user_id: userId,
      p_amount: amountInKES,
    });

    // If RPC doesn't exist, update directly with raw query
    if (walletError) {
      console.log('RPC not found, updating wallet directly');
      // Get current balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        const newBalance = (wallet.available_balance || 0) + amountInKES;
        await supabase
          .from('wallets')
          .update({ 
            available_balance: newBalance,
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId);
      }
    }

    console.log('Wallet funded successfully:', { userId, amount: amountInKES });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
