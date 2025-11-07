import { requireAuth } from "@/lib/supabase-server";
import { getRecentResults, getResultsByUserAndModule } from "@/app/actions/results";
import { getModules } from "@/app/actions/modules";
import { getExercises } from "@/app/actions/exercises";
import { getAlternatives } from "@/app/actions/alternatives";
import { getCompany, createOrUpdateCompany } from "@/app/actions/company";
import { DashboardWithToggle } from "@/components/dashboard-with-toggle";
import { supabaseAdmin } from "@/lib/supabase";

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

	// Base modules list for member view (admin uses the same `modules`)
	let memberBaseModules = modules;

	// Fetch user results for member view
	let userResults = {};
	if (!isAdmin) {
		memberBaseModules = await getModules(companyId);
		const results = await Promise.all(
			memberBaseModules.map(async (module) => {
				const result = await getResultsByUserAndModule(userId, module.id);
				return { moduleId: module.id, result };
			})
		);
		userResults = results.reduce((acc, { moduleId, result }) => {
			if (result) acc[moduleId] = result;
			return acc;
		}, {} as any);
	}

	// Build a filtered list of modules for member view: must have at least one exercise
	// with non-empty question and at least one alternative
	const memberModules = await (async () => {
		const list = [] as typeof memberBaseModules;
		for (const m of memberBaseModules) {
			const exs = await getExercises(m.id);
			let eligible = false;
			for (const ex of exs) {
				if (ex.question && ex.question.trim().length > 0) {
					const alts = await getAlternatives(ex.id);
					if (alts.length > 0) { eligible = true; break; }
				}
			}
			if (eligible) list.push(m);
		}
		return list;
	})();

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

