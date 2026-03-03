import { z } from "zod";

/**
 * Check if an email ends with .edu (case-insensitive).
 * Accepts all .edu domains broadly (students, alumni, staff).
 */
export function isEduEmail(email: string): boolean {
  return /@.+\.edu$/i.test(email);
}

/** Zod schema for .edu email validation */
export const eduEmailSchema = z
  .string()
  .email("Please enter a valid email address")
  .refine(isEduEmail, {
    message: "A .edu email address is required",
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
