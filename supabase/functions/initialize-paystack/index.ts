import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface InitializePaymentRequest {
  amount: number; // Amount in KES
  email: string;
  userId: string;
  callbackUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not found in environment');
      throw new Error('Payment service not configured');
    }

    // Log key prefix for debugging (safe - only first 10 chars)
    console.log('Paystack key prefix:', paystackSecret.substring(0, 10) + '...');

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: InitializePaymentRequest = await req.json();
    const { amount, email, userId, callbackUrl } = body;

    // Validate request
    if (!amount || amount < 50) {
      throw new Error('Minimum amount is KES 50');
    }

    if (userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    // Convert to smallest currency unit (kobo for NGN, cents for KES)
    const amountInSmallestUnit = Math.round(amount * 100);

    // Generate unique reference
    const reference = `vb_${userId.slice(0, 8)}_${Date.now()}`;

    console.log('Initializing Paystack payment:', { reference, amount, amountInSmallestUnit, email });

    // Initialize Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInSmallestUnit,
        currency: 'KES',
        reference,
        callback_url: callbackUrl || 'https://vibebaze.lovable.app/wallet',
        metadata: {
          user_id: userId,
          transaction_type: 'wallet_funding',
          custom_fields: [
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: userId
            }
          ]
        },
        channels: ['mobile_money', 'card', 'bank'],
      }),
    });

    const data = await response.json();
    console.log('Paystack response status:', response.status, 'success:', data.status);

    if (!data.status) {
      console.error('Paystack error:', JSON.stringify(data));
      throw new Error(data.message || 'Failed to initialize payment');
    }

    console.log('Paystack initialized successfully:', { reference, authorization_url: data.data.authorization_url });

    return new Response(JSON.stringify({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Initialize payment error:', message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
