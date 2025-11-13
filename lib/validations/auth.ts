import { z } from 'zod'

export const loginSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address'),
	password: z
		.string()
		.min(1, 'Password is required')
		.min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address'),
	password: z
		.string()
		.min(1, 'Password is required')
		.min(6, 'Password must be at least 6 characters')
		.regex(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
			'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		),
	confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword'],
})

export const profileUpdateSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address'),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	password: z
		.string()
		.optional()
		.refine((val) => !val || val.length >= 6, {
			message: 'Password must be at least 6 characters',
		})
		.refine((val) => !val || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val), {
			message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
		}),
	confirmPassword: z.string().optional(),
}).refine((data) => {
	// If password is provided, confirmPassword must match
	if (data.password && data.password.length > 0) {
		return data.password === data.confirmPassword
	}
	return true
}, {
	message: "Passwords don't match",
	path: ['confirmPassword'],
})

export const anonymousUpgradeSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address'),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	password: z
		.string()
		.min(1, 'Password is required for account upgrade')
		.min(6, 'Password must be at least 6 characters')
		.regex(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
			'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		),
	confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword'],
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>
export type AnonymousUpgradeFormData = z.infer<typeof anonymousUpgradeSchema>

