// Authenticate QR Edge Function
// Called by mobile app after scanning QR code to authenticate web session
// Implementation: Phase 5

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface AuthenticateQRPayload {
  token: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const payload: AuthenticateQRPayload = await req.json();
    const { token } = payload;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createAdminClient();

    // TODO: Phase 5 Implementation
    // 1. Verify the JWT and get user ID
    // 2. Find pending web_session with matching token
    // 3. Check session hasn't expired
    // 4. Update web_session with practitioner_id and status='authenticated'
    // 5. Return success

    console.log(`Authenticating QR token: ${token.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({
        message: "QR authentication not yet implemented",
        token: token.substring(0, 8) + "...",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error authenticating QR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
