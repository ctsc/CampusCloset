import { z } from "zod";

const ALLOWED_DOMAIN = "@student.gsu.edu";

/**
 * Check if an email is from the allowed domain (case-insensitive).
 * Currently locked to @student.gsu.edu for V1 launch.
 * Broaden to all .edu for future versions.
 */
export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

/** Zod schema for email validation */
export const eduEmailSchema = z
  .string()
  .email("Please enter a valid email address")
  .refine(isAllowedEmail, {
    message: "A @student.gsu.edu email is required",
  });

/** Zod schema for sign-up form */
export const signUpSchema = z.object({
  email: eduEmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
  university: z.string().min(1, "University is required"),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

/** Zod schema for login form */
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
