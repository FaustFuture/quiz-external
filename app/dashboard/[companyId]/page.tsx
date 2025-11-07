import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { getRecentResults, getResultsByUserAndModule } from "@/app/actions/results";
import { getModules } from "@/app/actions/modules";
import { getExercises } from "@/app/actions/exercises";
import { getAlternatives } from "@/app/actions/alternatives";
import { getCompany, createOrUpdateCompany } from "@/app/actions/company";
import { DashboardWithToggle } from "@/components/dashboard-with-toggle";

export default async function DashboardPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	const { companyId } = await params;
	
	// Get headers for debugging
	const headersList = await headers();
	console.log("Headers:", Object.fromEntries(headersList.entries()));
	
	// Ensure the user is logged in on whop
	const { userId } = await whopsdk.verifyUserToken(headersList);
	console.log("Verified User ID:", userId);

	// Fetch the necessary data from whop
	const [company, user, access] = await Promise.all([
		whopsdk.companies.retrieve(companyId),
		whopsdk.users.retrieve(userId),
		whopsdk.users.checkAccess(companyId, { id: userId }),
	]);

	console.log("Company:", company);
	console.log("User:", user);
	console.log("Access:", access);
	// Get company name, fallback to ID if name is not available
	const companyName = (company as any).name || (company as any).title || companyId;

	// Fetch or create company record
	let companyData = null;
	try {
		companyData = await getCompany(companyId);
		console.log("Company data:", companyData);
		if (!companyData) {
			// Create company record if it doesn't exist
			console.log("Creating company record for:", companyId, companyName);
			const createResult = await createOrUpdateCompany(companyId, companyName);
			console.log("Create result:", createResult);
			if (createResult.success) {
				companyData = createResult.data;
			}
		}
	} catch (error) {
		console.log("Error with company data, continuing without it:", error);
		// Continue without company data - the component will handle it
	}

	// Check if user is admin based on access data
	const isAdmin = checkUserIsAdmin(userId, company, access);
	console.log("Is admin:", isAdmin);

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

function checkUserIsAdmin(userId: string, company: any, access: any): boolean {
	console.log("Checking admin status for user:", userId);
	console.log("Company owner ID:", company?.owner_user?.id);
	console.log("Access data:", access);
	
	// Check if user is the company owner
	if (company?.owner_user?.id === userId) {
		console.log("User is company owner - granting admin access");
		return true;
	}
	
	// Check access level
	if (access?.access_level === "admin") {
		console.log("User has admin access level - granting admin access");
		return true;
	}
	
	// Check if user has access
	if (access?.has_access === true) {
		console.log("User has access but not admin level - member view");
		return false;
	}
	
	console.log("User has no access - member view");
	return false;
}

