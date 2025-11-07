import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getUserCompanies } from "@/app/actions/company";

export default async function Page() {
	const user = await getCurrentUser();
	console.log("[Home Page] User:", user?.id);
	
	if (user) {
		const companies = await getUserCompanies(user.id);
		console.log("[Home Page] User companies:", companies);
		console.log("[Home Page] Number of companies:", companies.length);
		
		if (companies.length > 0) {
			console.log("[Home Page] Redirecting to dashboard:", companies[0].id);
			redirect(`/dashboard/${companies[0].id}`);
		} else {
			console.log("[Home Page] No companies found, redirecting to onboarding");
			redirect('/onboarding');
		}
	}
	
	console.log("[Home Page] No user, showing landing page");
	
	return (
		<div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto rounded-3xl bg-card p-8 border shadow-lg">
				<div className="text-center mb-12">
					<h1 className="text-5xl font-bold mb-4">
						Welcome to Quiz Platform
					</h1>
					<p className="text-lg text-muted-foreground">
						Interactive learning and assessment platform
					</p>
				</div>

				<div className="space-y-4">
					<Link href="/login" className="block">
						<Button className="w-full" size="lg">
							Get Started
						</Button>
					</Link>
					<Link href="/discover" className="block">
						<Button variant="outline" className="w-full" size="lg">
							Browse Modules
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
