import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

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

    // Convert to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(amount * 100);

    // Generate unique reference
    const reference = `vb_${userId.slice(0, 8)}_${Date.now()}`;

    // Initialize Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
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

    if (!data.status) {
      console.error('Paystack error:', data);
      throw new Error(data.message || 'Failed to initialize payment');
    }

    console.log('Paystack initialized:', { reference, amount: amountInKobo });

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
    console.error('Initialize error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
