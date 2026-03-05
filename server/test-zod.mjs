import { z } from 'zod';
import fs from 'fs';

const storageRequestSchema = z.array(z.object({
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

const validateInput = (schema, data) => {
    const result = schema.safeParse(data);
    if (!result.success) {
        const issues = result.error.issues;
        const errors = issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return { success: false, error: errors };
    }
    return { success: true, data: result.data };
};

const data = JSON.parse(fs.readFileSync('./data/requests.json', 'utf8'));
console.log("Old data validation error:", validateInput(storageRequestSchema, data).error);

const newRequest = {
    id: Date.now().toString(),
    objects: [{ id: 'tbl_transactions' }],
    principals: ['user_alice'],
    permissions: ['SELECT'],
    justification: "Valid length justification",
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    approvals: [],
    comments: []
};
const newData = [...data, newRequest];
console.log("New data validation error:", validateInput(storageRequestSchema, newData).error);
