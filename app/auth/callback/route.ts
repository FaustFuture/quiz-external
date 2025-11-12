import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { ensureUserInDatabase } from '@/app/actions/users'

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url)
	const code = requestUrl.searchParams.get('code')
	const origin = requestUrl.origin

	if (code) {
		const cookieStore = await cookies()
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll()
					},
					setAll(cookiesToSet) {
						try {
							cookiesToSet.forEach(({ name, value, options }) =>
								cookieStore.set(name, value, options)
							)
						} catch {
							// The `setAll` method was called from a Route Handler.
						}
					},
				},
			}
		)

		const { error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error) {
			// After email confirmation, check if user has companies
			const { data: { user } } = await supabase.auth.getUser()

			if (user) {
				// Ensure user is saved to the users table before proceeding
				await ensureUserInDatabase(user.id)

				// Check if user has any companies
				const { data: memberships } = await supabase
					.from('companies_users')
					.select('company_id')
					.eq('user_id', user.id)
					.limit(1)

				// If no companies, redirect to onboarding (first time user)
				// Otherwise, redirect to home which will take them to dashboard
				if (!memberships || memberships.length === 0) {
					return NextResponse.redirect(`${origin}/onboarding`)
				}
			}

			return NextResponse.redirect(`${origin}/`)
		}
	}

	// Return the user to an error page with instructions
	return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
