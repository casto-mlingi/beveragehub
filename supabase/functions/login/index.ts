import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, phone, password } = await req.json();
    const identifier = phone || email;

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ error: "Email/phone and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows, error } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${identifier},phone.eq.${identifier}`)
      .limit(1);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = rows?.[0];
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user has a hashed password, verify it
    if (user.password) {
      // Use bcrypt via a simple comparison approach
      // Since Deno doesn't have bcryptjs natively, we'll use npm:bcryptjs
      const bcrypt = await import("npm:bcryptjs@2.4.3");
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return new Response(
          JSON.stringify({ error: "Invalid password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (user.password !== null && user.password !== undefined) {
      // Plain text password check (legacy)
      if (user.password !== password) {
        return new Response(
          JSON.stringify({ error: "Invalid password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Map snake_case to camelCase for the client
    const toCamel = (str: string) =>
      str.replace(/([-_][a-z])/g, (g) => g.toUpperCase().replace("_", ""));

    const camelUser: Record<string, any> = {};
    for (const key of Object.keys(user)) {
      if (key !== "password") {
        camelUser[toCamel(key)] = user[key];
      }
    }

    return new Response(JSON.stringify(camelUser), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
