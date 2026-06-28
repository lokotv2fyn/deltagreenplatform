import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = Deno.env.get('SITE_URL') ?? ''

function getAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  if (SITE_URL && requestOrigin === SITE_URL) return requestOrigin
  if (/^http:\/\/localhost(:\d+)?$/.test(requestOrigin)) return requestOrigin
  return null
}

function isAllowedRedirect(redirectTo: string): boolean {
  try {
    const redirectOrigin = new URL(redirectTo).origin
    if (SITE_URL && redirectOrigin === new URL(SITE_URL).origin) return true
    if (/^http:\/\/localhost(:\d+)?$/.test(redirectOrigin)) return true
    return false
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('origin')
  const allowedOrigin = getAllowedOrigin(requestOrigin)
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

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

    if (redirectTo && !isAllowedRedirect(redirectTo)) {
      return new Response(JSON.stringify({ error: 'invalid_redirect' }), {
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
