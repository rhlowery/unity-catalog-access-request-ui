import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { SecureLocalStorageAdapter } from './adapters/SecureLocalStorageAdapter';
import { RDBMSAdapter } from './adapters/RDBMSAdapter';
import { GitAdapter } from './adapters/GitAdapter';
import { VolatileAdapter } from './adapters/VolatileAdapter';
import { UnityCatalogAdapter } from './adapters/UnityCatalogAdapter';
import { BFFStorageAdapter } from './adapters/BFFStorageAdapter';
import { ConfigService } from '../config/ConfigService';
import { IStorageAdapter, AccessRequest, Grant } from './IStorageAdapter';

export const getAdapter = (config: any): IStorageAdapter => {
  // Determine storage type and return appropriate adapter
  const type = config?.storageType || config?.type || 'BFF'; // Default to BFF

  if (type === 'LOCAL') {
    console.warn('[Security] Using LOCAL storage bounds. Consider SECURE_LOCAL, BFF, UNITY_CATALOG or GIT for production.');
  }

  switch (type) {
    case 'BFF':
      return BFFStorageAdapter;
    case 'LOCAL':
      return LocalStorageAdapter;
    case 'SECURE_LOCAL':
      return SecureLocalStorageAdapter;
    case 'RDBMS':
      return RDBMSAdapter;
    case 'GIT':
      return GitAdapter;
    case 'VOLATILE':
      return VolatileAdapter;
    case 'UNITY_CATALOG':
      return UnityCatalogAdapter;
    default:
      return BFFStorageAdapter; // Default to BFF
  }
};

/**
 * StorageService Facade
 * Resolves the configuration and delegates calls dynamically to the appropriate storage adapter.
 */
export const StorageService = {
  async loadRequests(): Promise<AccessRequest[]> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    return await adapter.load(config);
  },

  async saveRequests(requests: AccessRequest[]): Promise<boolean> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    return await adapter.save(requests, config);
  },

  async createRequest(request: Partial<AccessRequest>): Promise<boolean> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    const newRequest = {
      id: Date.now().toString(),
      ...request,
      createdAt: new Date(),
      status: 'PENDING',
      approvals: [],
      comments: []
    };
    return await adapter.upsertRequest(newRequest as AccessRequest, config);
  },

  async getRequest(id: string): Promise<AccessRequest | undefined> {
    const requests = await this.loadRequests();
    return requests.find((r: AccessRequest) => r.id === id);
  },

  async updateRequest(id: string, updates: Partial<AccessRequest>): Promise<boolean> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    const requests = await adapter.load(config);
    const requestIndex = requests.findIndex((r: AccessRequest) => r.id === id);

    if (requestIndex === -1) {
      throw new Error(`Request with ID ${id} not found`);
    }

    const updatedRequest = { ...requests[requestIndex], ...updates };
    return await adapter.upsertRequest(updatedRequest as AccessRequest, config);
  },

  async deleteRequest(id: string): Promise<boolean> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    const requests = await adapter.load(config);
    const updatedRequests = requests.filter((r: AccessRequest) => r.id !== id);
    return await adapter.save(updatedRequests, config);
  },

  async upsertRequest(request: AccessRequest): Promise<boolean> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    return await adapter.upsertRequest(request, config);
  },

  async getGrants(object: any): Promise<Grant[]> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    return await adapter.getGrants(object, config);
  },

  async getApprovers(): Promise<Record<string, string[]>> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    return await adapter.getApprovers(config);
  },

  async saveApprovers(approvers: Record<string, string[]>): Promise<boolean> {
    const config = await ConfigService.getResolvedConfig();
    const adapter = getAdapter(config);
    return await adapter.saveApprovers(approvers, config);
  }
};