import { z } from 'zod';

export const createAccountFormSchema = z
    .object({
        username: z.string().min(5, {
            message: 'Username must be at least 5 characters.',
        }),
        email: z.string().email({ message: 'Must be a valid email address.' }),
        password: z
            .string()
            .regex(
                /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
                'Password must be 8+ chars, incl. uppercase, number and special character',
            ),
        confirm: z.string(),
    })
    .refine((data) => data.password === data.confirm, {
        path: ['confirm'],
        message: 'Passwords do not match',
    });

export type CreateAccountFormData = z.infer<typeof createAccountFormSchema>;

export const createAccountDataSchema = z.object({
    username: z.string(),
    email: z.string().email({ message: 'Must be a valid email address.' }),
    password: z
        .string()
        .regex(
            /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
            'Password must be 8+ chars, incl. uppercase, number and special character',
        ),
});

export type CreateAccountData = z.infer<typeof createAccountDataSchema>;
