import { z } from 'zod';

export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } => {
    const result = schema.safeParse(data);
    if (!result.success) {
        const issues = result.error.issues;
        const errors = issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return { success: false, error: errors };
    }
    return { success: true, data: result.data };
};

export const loginSchema = z.object({
    userId: z.string().min(1).max(100),
    userName: z.string().min(1).max(100),
    email: z.string().email().optional(),
    groups: z.array(z.string()).optional(),
    role: z.string().max(50).optional(),
    provider: z.string().min(1).max(50),
    accessToken: z.string().optional()
});

export const storageRequestSchema = z.array(z.object({
    id: z.string().optional(),
    objects: z.array(z.any()).optional(),
    principals: z.array(z.any()).optional(),
    permissions: z.array(z.string()).optional(),
    justification: z.string().optional(),
    requesterId: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional()
}).passthrough());
