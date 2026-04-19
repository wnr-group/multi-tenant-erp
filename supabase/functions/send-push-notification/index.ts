import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { pushToken, title, body, data } = await req.json() as {
      pushToken: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };

    const message = {
      to: pushToken,
      title,
      body,
      data: data ?? {},
      sound: "default",
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
