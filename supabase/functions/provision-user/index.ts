import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type ProvisionRequest = {
  action?: 'create' | 'reset_password';
  type?: 'school' | 'teacher' | 'student';
  fullName?: string;
  email: string;
  phone?: string;
  password?: string;
  schoolId?: string;
  schoolName?: string;
  location?: string;
  subscriptionPlan?: 'basic' | 'pro' | 'enterprise';
  specialization?: string;
  licenseCategory?: string;
};

function generateTempPassword() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `Rw#${digits}`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'You must be signed in to perform this action.' }, { status: 200, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return Response.json({ error: 'Your session is invalid. Please sign out and sign in again.' }, { status: 200, headers: corsHeaders });
    }

    const { data: callerProfile, error: callerError } = await adminClient
      .from('profiles').select('role, school_id, is_active').eq('id', caller.id).single();
    if (callerError || !callerProfile?.is_active) {
      return Response.json({ error: 'Your account is not allowed to provision or manage users.' }, { status: 200, headers: corsHeaders });
    }

    const payload = await request.json() as ProvisionRequest;
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'Email address is required.' }, { status: 200, headers: corsHeaders });
    }

    const action = payload.action ?? 'create';

    // ── ACTION 1: RESET PASSWORD FOR EXISTING OR UNLINKED TEACHER / USER ──
    if (action === 'reset_password') {
      const newTempPassword = payload.password || generateTempPassword();

      // Find user in auth.users
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const targetUser = usersData?.users?.find(u => u.email?.toLowerCase() === email);

      if (targetUser) {
        // Auth account exists → update password & set must_change_password
        const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
          password: newTempPassword,
          user_metadata: { ...targetUser.user_metadata, must_change_password: true },
        });
        if (updateAuthError) {
          return Response.json({ error: updateAuthError.message }, { status: 200, headers: corsHeaders });
        }

        await adminClient.from('profiles').update({ must_change_password: true }).eq('id', targetUser.id);

        return Response.json({
          success: true,
          email,
          temporaryPassword: newTempPassword,
          message: `Password for ${email} successfully reset to ${newTempPassword}`
        }, { headers: corsHeaders });
      }

      // If user is not yet in auth.users, check if they exist in teachers table
      const { data: teacherRow } = await adminClient.from('teachers').select('*').eq('email', email).maybeSingle();

      if (teacherRow) {
        // Provision auth user for existing teacher row
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: newTempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: teacherRow.full_name,
            role: 'teacher',
            school_id: teacherRow.school_id,
            phone: teacherRow.phone,
            must_change_password: true
          },
        });

        if (createError || !created.user) {
          return Response.json({ error: createError?.message || 'Could not create auth credentials for teacher.' }, { status: 200, headers: corsHeaders });
        }

        // Link teacher row & set profile must_change_password
        await adminClient.from('teachers').update({ profile_id: created.user.id }).eq('id', teacherRow.id);
        await adminClient.from('profiles').update({ must_change_password: true }).eq('id', created.user.id);

        return Response.json({
          success: true,
          email,
          temporaryPassword: newTempPassword,
          message: `Auth account provisioned and password set to ${newTempPassword}`
        }, { headers: corsHeaders });
      }

      // Check if student row exists for email
      const { data: studentRow } = await adminClient.from('students').select('*').eq('email', email).maybeSingle();

      if (studentRow) {
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: newTempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: studentRow.full_name,
            role: 'student',
            school_id: studentRow.school_id,
            phone: studentRow.phone,
            must_change_password: true
          },
        });

        if (createError || !created.user) {
          return Response.json({ error: createError?.message || 'Could not create auth credentials for student.' }, { status: 200, headers: corsHeaders });
        }

        await adminClient.from('students').update({ profile_id: created.user.id }).eq('id', studentRow.id);
        await adminClient.from('profiles').update({ must_change_password: true }).eq('id', created.user.id);

        return Response.json({
          success: true,
          email,
          temporaryPassword: newTempPassword,
          message: `Auth account provisioned and password set to ${newTempPassword}`
        }, { headers: corsHeaders });
      }

      // Check if school exists for email
      const { data: schoolRow } = await adminClient.from('schools').select('*').eq('email', email).maybeSingle();

      if (schoolRow) {
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: newTempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: schoolRow.name,
            role: 'school_admin',
            school_id: schoolRow.id,
            must_change_password: true
          },
        });

        if (createError || !created.user) {
          return Response.json({ error: createError?.message || 'Could not create auth credentials for school admin.' }, { status: 200, headers: corsHeaders });
        }

        await adminClient.from('profiles').update({ must_change_password: true }).eq('id', created.user.id);

        return Response.json({
          success: true,
          email,
          temporaryPassword: newTempPassword,
          message: `School admin account provisioned and password set to ${newTempPassword}`
        }, { headers: corsHeaders });
      }

      return Response.json({ error: `No registered teacher, student, or school found with email ${email}` }, { status: 200, headers: corsHeaders });
    }

    // ── ACTION 2: PROVISION NEW USER (teacher / student / school) ──
    const fullName = payload.fullName?.trim();
    if (!fullName) {
      return Response.json({ error: 'Full name is required.' }, { status: 200, headers: corsHeaders });
    }

    const isPlatformAdmin = callerProfile.role === 'super_admin';
    if (payload.type === 'school' && !isPlatformAdmin) {
      return Response.json({ error: 'Only a platform administrator can create a school.' }, { status: 200, headers: corsHeaders });
    }
    if ((payload.type === 'teacher' || payload.type === 'student') && callerProfile.role !== 'school_admin' && !isPlatformAdmin) {
      return Response.json({ error: 'Only a school administrator can create teachers and students.' }, { status: 200, headers: corsHeaders });
    }

    let schoolId = payload.schoolId || (callerProfile.school_id as string | null);
    let schoolCode: string | null = null;

    if (payload.type === 'school') {
      if (!payload.schoolName?.trim()) {
        return Response.json({ error: 'School name is required.' }, { status: 200, headers: corsHeaders });
      }
      const { data: school, error: schoolError } = await adminClient.from('schools').insert({
        name: payload.schoolName.trim(), email, phone: payload.phone?.trim() || null,
        location: payload.location?.trim() || null, subscription_plan: payload.subscriptionPlan ?? 'basic', status: 'active',
      }).select('id, school_code').single();
      if (schoolError) {
        return Response.json({ error: schoolError.message }, { status: 200, headers: corsHeaders });
      }
      schoolId = school.id;
      schoolCode = school.school_code;
    }

    if (!schoolId) {
      return Response.json({ error: 'The administrator is not assigned to a school.' }, { status: 200, headers: corsHeaders });
    }
    const isGeneratedPass = payload.type !== 'student' || !payload.password;
    const password = isGeneratedPass ? generateTempPassword() : payload.password;
    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must contain at least 6 characters.' }, { status: 200, headers: corsHeaders });
    }

    const role = payload.type === 'school' ? 'school_admin' : payload.type;
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName, role, school_id: schoolId, phone: payload.phone?.trim() || null, must_change_password: isGeneratedPass },
    });

    if (createError || !created.user) {
      if (payload.type === 'school' && schoolId) await adminClient.from('schools').delete().eq('id', schoolId);
      return Response.json({ error: createError?.message ?? 'Could not create the account.' }, { status: 200, headers: corsHeaders });
    }

    // Ensure profiles row has full_name, role, school_id, phone, and must_change_password set
    await adminClient.from('profiles').update({
      full_name: fullName,
      role: role,
      school_id: schoolId,
      phone: payload.phone?.trim() || null,
      must_change_password: isGeneratedPass,
      is_active: true,
    }).eq('id', created.user.id);

    if (payload.type === 'teacher') {
      const { error } = await adminClient.from('teachers').insert({
        school_id: schoolId, profile_id: created.user.id, full_name: fullName, email, phone: payload.phone?.trim() || null,
        specialization: payload.specialization?.trim() || null, status: 'active',
      });
      if (error) {
        return Response.json({ error: error.message }, { status: 200, headers: corsHeaders });
      }
    }

    if (payload.type === 'student') {
      const { error } = await adminClient.from('students').insert({
        school_id: schoolId, profile_id: created.user.id, full_name: fullName, email, phone: payload.phone?.trim() || null,
        license_category: payload.licenseCategory?.trim() || null, status: 'active',
      });
      if (error) {
        return Response.json({ error: error.message }, { status: 200, headers: corsHeaders });
      }
    }

    const { data: profile } = await adminClient.from('profiles').select('public_id').eq('id', created.user.id).single();
    return Response.json({
      userId: created.user.id,
      publicId: profile?.public_id,
      schoolId,
      schoolCode,
      temporaryPassword: isGeneratedPass ? password : undefined
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Provisioning failed.' }, { status: 200, headers: corsHeaders });
  }
});
