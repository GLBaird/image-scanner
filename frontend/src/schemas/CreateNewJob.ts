import { z } from 'zod';

export const createNewJobSchema = z.object({
    name: z
        .string()
        .min(5, { message: 'Name must be at least 5 characters.' })
        .max(50, { message: 'Name must be less than 50 characters.' }),
    description: z.string().max(250, { message: 'Description must be less than 250 characters.' }),
    source: z.string().nonempty({ message: 'You must choose a source' }),
});

export type CreateNewJobInfo = z.infer<typeof createNewJobSchema>;
