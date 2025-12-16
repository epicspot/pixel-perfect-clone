import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IdleVehicle {
  id: number;
  registration_number: string;
  brand: string | null;
  model: string | null;
  agency_name: string | null;
  hours_idle: number;
  last_trip_date: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting idle vehicle check...");

    // Get all active vehicles
    const { data: vehicles, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, registration_number, brand, model, agency_id, agency:agencies(name)")
      .eq("status", "active");

    if (vehicleError) {
      console.error("Error fetching vehicles:", vehicleError);
      throw vehicleError;
    }

    if (!vehicles || vehicles.length === 0) {
      console.log("No active vehicles found");
      return new Response(JSON.stringify({ message: "No active vehicles", idleCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get vehicles currently on active trips
    const { data: activeTrips } = await supabase
      .from("trips")
      .select("vehicle_id")
      .in("status", ["boarding", "departed", "in_progress"])
      .not("vehicle_id", "is", null);

    const activeVehicleIds = new Set(activeTrips?.map((t: any) => t.vehicle_id) || []);

    // Get latest trip for each vehicle
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const { data: recentTrips } = await supabase
      .from("trips")
      .select("vehicle_id, departure_datetime, arrival_datetime")
      .not("vehicle_id", "is", null)
      .gte("departure_datetime", fortyEightHoursAgo.toISOString());

    const vehiclesWithRecentTrips = new Set(recentTrips?.map((t: any) => t.vehicle_id) || []);

    // Find idle vehicles (48h+ without trip)
    const idleVehicles: IdleVehicle[] = [];
    const now = new Date();

    for (const vehicle of vehicles) {
      if (activeVehicleIds.has(vehicle.id)) continue;
      if (vehiclesWithRecentTrips.has(vehicle.id)) continue;

      // Get the last trip for this vehicle to calculate idle time
      const { data: lastTrip } = await supabase
        .from("trips")
        .select("arrival_datetime, departure_datetime")
        .eq("vehicle_id", vehicle.id)
        .order("departure_datetime", { ascending: false })
        .limit(1)
        .single();

      const lastDate = lastTrip?.arrival_datetime || lastTrip?.departure_datetime;
      let hoursIdle = 48;
      
      if (lastDate) {
        hoursIdle = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60));
      }

      if (hoursIdle >= 48) {
        idleVehicles.push({
          id: vehicle.id,
          registration_number: vehicle.registration_number,
          brand: vehicle.brand,
          model: vehicle.model,
          agency_name: (vehicle.agency as any)?.name || null,
          hours_idle: hoursIdle,
          last_trip_date: lastDate || null,
        });
      }
    }

    console.log(`Found ${idleVehicles.length} idle vehicles (48h+)`);

    if (idleVehicles.length === 0) {
      return new Response(JSON.stringify({ message: "No idle vehicles found", idleCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin and manager emails
    const { data: recipients } = await supabase
      .from("profiles")
      .select("email, name, role")
      .in("role", ["admin", "manager"]);

    if (!recipients || recipients.length === 0) {
      console.log("No admin/manager recipients found");
      return new Response(JSON.stringify({ message: "No recipients found", idleCount: idleVehicles.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email content
    const vehicleList = idleVehicles
      .map((v) => {
        const days = Math.floor(v.hours_idle / 24);
        const hours = v.hours_idle % 24;
        return `• ${v.registration_number} (${v.brand || ''} ${v.model || ''}) - ${v.agency_name || 'Non assigné'} - Immobilisé depuis ${days}j ${hours}h`;
      })
      .join("\n");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px;">
          ⚠️ Alerte: Véhicules immobilisés (+48h)
        </h2>
        
        <p style="color: #374151; font-size: 16px;">
          ${idleVehicles.length} véhicule(s) sont immobilisés depuis plus de 48 heures sans voyage assigné.
        </p>
        
        <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">Véhicules concernés:</h3>
          <pre style="font-family: monospace; color: #78350f; white-space: pre-wrap;">${vehicleList}</pre>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Veuillez vérifier la disponibilité de ces véhicules et planifier leur utilisation si possible.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p>Ce message est généré automatiquement par le système de gestion de flotte.</p>
          <p>Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Ouagadougou' })}</p>
        </div>
      </div>
    `;

    // Send email using Resend API directly
    const recipientEmails = recipients.map((r: any) => r.email);
    console.log(`Sending notification to ${recipientEmails.length} recipients`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Transport Express <onboarding@resend.dev>",
        to: recipientEmails,
        subject: `⚠️ Alerte: ${idleVehicles.length} véhicule(s) immobilisé(s) depuis +48h`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    // Log the notification in audit_logs
    await supabase.from("audit_logs").insert({
      action: "IDLE_VEHICLE_NOTIFICATION",
      entity_type: "vehicle",
      description: `Notification envoyée pour ${idleVehicles.length} véhicule(s) immobilisé(s): ${idleVehicles.map(v => v.registration_number).join(', ')}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        idleCount: idleVehicles.length,
        recipientCount: recipientEmails.length,
        vehicles: idleVehicles.map((v) => v.registration_number),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-idle-vehicles function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
