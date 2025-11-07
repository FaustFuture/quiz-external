import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAuth } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	const { experienceId } = await params;
	
	// Ensure the user is logged in with Supabase
	const user = await requireAuth();
	const userId = user.id;

	const displayName = user.email?.split('@')[0] || user.id.slice(0, 8);

	// Redirect to the corresponding company dashboard
	// The experienceId is now treated as a companyId
	redirect(`/dashboard/${experienceId}`);

	return null;
}
