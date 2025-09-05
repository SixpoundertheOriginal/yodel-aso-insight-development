import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')
    
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
      user_id: user.user.id 
    })
    if (!isSuperAdmin) throw new Error('Super admin access required')

    if (req.method === 'GET') {
      // List all organizations (super admin can see all)
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        data: organizations || [],
        meta: { total: organizations?.length || 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (req.method === 'POST') {
      // Handle both create and update/delete via body action
      const body = await req.json()
      
      if (body.action === 'update') {
        // Update organization
        const { id, payload } = body
        if (!id || !payload) {
          throw new Error('Missing required fields: id, payload for update')
        }

        const { data: updatedOrg, error } = await supabase
          .from('organizations')
          .update(payload)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          data: updatedOrg,
          message: 'Organization updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      } else if (body.action === 'delete') {
        // Delete organization
        const { id } = body
        if (!id) {
          throw new Error('Missing required field: id for delete')
        }

        const { error } = await supabase
          .from('organizations')
          .delete()
          .eq('id', id)

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          message: 'Organization deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      } else {
        // Create new organization
        // Validate required fields
        if (!body.name || !body.slug || !body.domain) {
          throw new Error('Missing required fields: name, slug, domain')
        }

        // Check if slug already exists
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', body.slug)
          .single()

        if (existing) {
          throw new Error('Organization slug already exists')
        }

        // Insert new organization
        const { data: newOrg, error } = await supabase
          .from('organizations')
          .insert({
            name: body.name,
            slug: body.slug,
            domain: body.domain,
            subscription_tier: body.subscription_tier || 'professional',
            settings: body.settings || {}
          })
          .select()
          .single()

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          data: newOrg,
          message: 'Organization created successfully'
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

    } else {
      throw new Error('Method not allowed')
    }

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: error.message.includes('not authenticated') ? 401 : 
             error.message.includes('access required') ? 403 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})