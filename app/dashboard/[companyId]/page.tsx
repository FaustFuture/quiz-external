import { requireAuth } from "@/lib/supabase-server";
import { getRecentResults } from "@/app/actions/results";
import { getModules } from "@/app/actions/modules";
import { getCompany, createOrUpdateCompany } from "@/app/actions/company";
import { DashboardWithToggle } from "@/components/dashboard-with-toggle";
import { supabaseAdmin } from "@/lib/supabase";
// PERFORMANCE OPTIMIZATION: Import optimized data fetching functions
import { getModulesWithEligibilityCheck, getUserResultsForModules } from "@/app/actions/modules-optimized";

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	const { companyId } = await params;

	console.log("[Dashboard] Company ID:", companyId);

	// Ensure the user is logged in with Supabase
	const user = await requireAuth();
	const userId = user.id;

	console.log("[Dashboard] Authenticated User ID:", userId);
	console.log("[Dashboard] User Email:", user.email);

	// Fetch company data from database
	let companyData = null;
	let companyName = companyId; // Default fallback

	try {
		companyData = await getCompany(companyId);
		console.log("[Dashboard] Company data:", companyData);

		if (!companyData) {
			// Create company record if it doesn't exist
			console.log("[Dashboard] Creating company record for:", companyId);
			const createResult = await createOrUpdateCompany(companyId, companyId);
			console.log("[Dashboard] Create result:", createResult);
			if (createResult.success) {
				companyData = createResult.data;
			}
		}

		if (companyData?.name) {
			companyName = companyData.name;
		}
	} catch (error) {
		console.log("[Dashboard] Error with company data, continuing without it:", error);
	}

	// Check if user is admin - for now, check if they created the company or based on a companies_users table
	const isAdmin = await checkUserIsAdmin(userId, companyId);
	console.log("[Dashboard] Is admin:", isAdmin);

	// Fetch recent results and modules for admin sidebar
	const [recentResults, modules] = isAdmin
		? await Promise.all([
			getRecentResults(companyId, 10),
			getModules(companyId)
		])
		: [[], []];

	// PERFORMANCE OPTIMIZATION: Use optimized data fetching for member view
	// This replaces the N+1 query problem that was fetching exercises and alternatives
	// separately for each module (which could result in hundreds of database queries)
	let memberModules = modules;
	let userResults = {};

	if (!isAdmin) {
		// Fetch eligible modules with a single optimized query instead of N+1 queries
		memberModules = await getModulesWithEligibilityCheck(companyId);

		// Batch fetch all user results in a single query instead of one per module
		const moduleIds = memberModules.map(m => m.id);
		userResults = await getUserResultsForModules(userId, moduleIds);
	}

	return (
		<DashboardWithToggle
			isAdmin={isAdmin}
			companyId={companyId}
			userId={userId}
			companyName={companyName}
			companyData={companyData}
			recentResults={recentResults}
			modules={modules}
			memberModules={memberModules}
			userResults={userResults}
		/>
	);
}

async function checkUserIsAdmin(userId: string, companyId: string): Promise<boolean> {
	try {
		console.log("[checkUserIsAdmin] Checking for user:", userId, "company:", companyId);

		const { data, error } = await supabaseAdmin
			.from('companies_users')
			.select('role')
			.eq('company_id', companyId)
			.eq('user_id', userId)
			.single();

		console.log("[checkUserIsAdmin] Query result:", { data, error });

		if (error || !data) {
			console.log("[checkUserIsAdmin] No membership found or error, user is not admin");
			return false;
		}

		const isAdmin = data.role === 'admin';
		console.log("[checkUserIsAdmin] Role:", data.role, "Is admin:", isAdmin);
		return isAdmin;
	} catch (error) {
		console.log("[checkUserIsAdmin] Error checking admin status:", error);
		return false;
	}
}

