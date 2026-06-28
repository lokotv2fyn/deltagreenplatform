import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, redirectTo } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'email_required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data } = await adminClient
      .from('allowed_emails')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (!data) {
      return new Response(JSON.stringify({ error: 'not_authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Trigger magic link via Supabase auth REST API (same as signInWithOtp)
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        create_user: true,
        ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
      }),
    })

    const result = await res.json()

    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
