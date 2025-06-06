import { z } from 'zod';

export const signInSchema = z.object({
    email: z.string().email({ message: 'Must be a valid email address.' }),
    password: z
        .string()
        .regex(
            /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
            'Password must be 8+ chars, incl. uppercase, number and special character',
        ),
});

export type SignInInfo = z.infer<typeof signInSchema>;
