import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = Deno.env.get('SITE_URL') ?? ''

function getAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  if (SITE_URL && requestOrigin === SITE_URL) return requestOrigin
  if (/^http:\/\/localhost(:\d+)?$/.test(requestOrigin)) return requestOrigin
  return null
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

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email, group_id } = await req.json()

    if (!email || !group_id) {
      return new Response(JSON.stringify({ error: 'email_and_group_id_required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the calling user is a handler of the group
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: membership } = await anonClient
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('role', 'handler')
      .maybeSingle()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'not_handler' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to insert into allowed_emails
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const normalizedEmail = email.toLowerCase().trim()

    const { error } = await adminClient
      .from('allowed_emails')
      .insert({ email: normalizedEmail })

    const alreadyExisted = error?.code === '23505' // unique_violation

    if (error && !alreadyExisted) {
      return new Response(JSON.stringify({ error: String(error.message) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, already_existed: alreadyExisted }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
