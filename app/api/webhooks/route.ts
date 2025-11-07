import type { NextRequest } from "next/server";

// Webhook handler is no longer needed with Supabase auth
// If you need to handle Supabase webhooks (e.g., for auth events), 
// configure them in the Supabase Dashboard → Database → Webhooks

export async function POST(request: NextRequest): Promise<Response> {
	// Placeholder for future webhook handling
	// You can add Supabase database webhooks or auth webhooks here if needed
	
	return new Response("OK", { status: 200 });
}
