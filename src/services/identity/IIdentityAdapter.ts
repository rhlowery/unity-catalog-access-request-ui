export interface IdentityUser {
    id: string;
    name: string;
    email?: string;
    type?: string;
    initials?: string;
    provider?: string;
    groups?: string[];
}

export interface IdentityResponse {
    users: IdentityUser[];
    groups: IdentityUser[];
    servicePrincipals: IdentityUser[];
}

export interface IIdentityAdapter {
    name: string;
    type: string;
    fetchIdentities(config: any): Promise<IdentityResponse>;
    getCurrentUser(config: any): Promise<IdentityUser | null>;
    login?(provider: string, config: any): Promise<IdentityUser>;
    logout?(): Promise<void>;
}

export const IIdentityAdapter: IIdentityAdapter = {
    name: 'Abstract Identity Adapter',
    type: 'ABSTRACT',
    async fetchIdentities(_config: any): Promise<IdentityResponse> {
        throw new Error('Not implemented');
    },
    async getCurrentUser(_config: any): Promise<IdentityUser | null> {
        return null; // Default to no-op for adapters that don't handle auth
    }
};
