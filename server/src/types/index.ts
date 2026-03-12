export interface JwtPayload {
    sub: string;       // userId
    name: string;
    email: string;
    groups: string[];
    role: string;
    permissions: string[];
    provider: string;  // MOCK | OAUTH | SAML | DATABRICKS
    jti?: string;      // Required for new tokens
}

export interface StorageRequest {
    id: string;
    objects?: any[];
    principals?: any[];
    permissions?: string[];
    justification?: string;
    requesterId?: string;
    status?: string;
    createdAt?: number;
    updatedAt?: number;
    [key: string]: any;
}

export interface AuditEntry {
    type: string;
    actor: string;
    action: string;
    target: string;
    details?: any;
    userId?: string;
    serverTimestamp?: number;
    signature?: string;
    signer?: string;
}
