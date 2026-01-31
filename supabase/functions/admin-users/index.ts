import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: string;
  companyId?: string;
}

interface AssignCompanyRequest {
  userId: string;
  companyId: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_super_admin && profile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const url = new URL(req.url);
    const path = url.pathname;

    if (path.includes('/list-users') && req.method === 'GET') {
      const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;

      return new Response(
        JSON.stringify({ users: authUsers.users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/create-user') && req.method === 'POST') {
      const body: CreateUserRequest = await req.json();

      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name,
        },
      });

      if (createError) throw createError;

      await supabaseAdmin
        .from('profiles')
        .update({ role: body.role })
        .eq('id', authData.user.id);

      if (body.companyId) {
        await supabaseAdmin
          .from('user_company_access')
          .insert({
            user_id: authData.user.id,
            company_id: body.companyId,
            role: body.role,
          });
      }

      return new Response(
        JSON.stringify({ user: authData.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/assign-company') && req.method === 'POST') {
      const body: AssignCompanyRequest = await req.json();

      const { error } = await supabaseAdmin
        .from('user_company_access')
        .upsert({
          user_id: body.userId,
          company_id: body.companyId,
          role: body.role,
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/toggle-super-admin') && req.method === 'POST') {
      if (!profile?.is_super_admin) {
        throw new Error('Only super admins can modify super admin status');
      }

      const body: { userId: string; isSuperAdmin: boolean } = await req.json();

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_super_admin: body.isSuperAdmin })
        .eq('id', body.userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/reset-password') && req.method === 'POST') {
      const body: { userId: string; newPassword: string } = await req.json();

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        body.userId,
        { password: body.newPassword }
      );

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});