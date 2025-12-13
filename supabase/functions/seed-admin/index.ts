import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const adminEmail = "kiema@epicspot.com";
    const adminPassword = "Admin123";
    const adminName = "Kiema Admin";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some((u) => u.email === adminEmail);

    if (userExists) {
      return new Response(
        JSON.stringify({ success: false, message: "L'utilisateur admin existe déjà" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: "admin",
      },
    });

    if (authError) {
      throw authError;
    }

    // Update profile to ensure admin role
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "admin", name: adminName })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Ensure user_roles entry exists
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: authData.user.id, role: "admin" }, { onConflict: "user_id,role" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Compte administrateur créé avec succès",
        email: adminEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
