import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { RDBMSAdapter } from './adapters/RDBMSAdapter';
import { GitAdapter } from './adapters/GitAdapter';
import { VolatileAdapter } from './adapters/VolatileAdapter';
import { SecretsService as GlobalSecretsService } from '../secrets/SecretsService';
import { UnityCatalogAdapter } from './adapters/UnityCatalogAdapter';

export const getAdapter = (config: any) => {
  // Determine storage type and return appropriate adapter
  switch (config.type) {
    case 'LOCAL':
      return LocalStorageAdapter;
    case 'RDBMS':
      return RDBMSAdapter;
    case 'GIT':
      return GitAdapter;
    case 'VOLATILE':
      return VolatileAdapter;
    case 'UNITY_CATALOG':
      return UnityCatalogAdapter;
    default:
      return LocalStorageAdapter; // Default to local storage
  }
};

export const loadRequests = () => {
  const requests = [];
  const result = localStorage.getItem('acs_requests_v1');
  if (result) {
    try {
      const data = typeof result === 'string' ? JSON.parse(result) : result;
      // Only return valid requests
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[StorageService] Failed to load requests:', e);
      return [];
    }
  }
  return requests;
};

export const saveRequests = (requests) => {
  try {
    const data = JSON.stringify(requests);
    localStorage.setItem('acs_requests_v1', data);
    return true;
  } catch (e) {
    console.error('[StorageService] Failed to save requests:', e);
    return false;
  }
};

export const getRequest = (id) => {
  const requests = loadRequests();
  const request = requests.find(r => r.id === id);
  return request;
};

export const createRequest = (request) => {
  try {
    const requests = loadRequests();
    const newRequest = {
      id: Date.now().toString(),
      ...request,
      createdAt: new Date(),
      status: 'PENDING',
      approvals: [],
      comments: []
    };
    
    const updatedRequests = [...requests, newRequest];
    return saveRequests(updatedRequests);
  } catch (e) {
    console.error('[StorageService] Failed to create request:', e);
    return null;
  }
};

export const updateRequest = (id, updates) => {
  try {
    const requests = loadRequests();
    const requestIndex = requests.findIndex(r => r.id === id);
    
    if (requestIndex === -1) {
      throw new Error(`Request with ID ${id} not found`);
    }
    
    requests[requestIndex] = { ...requests[requestIndex], ...updates };
    return saveRequests(requests);
  } catch (e) {
    console.error('[StorageService] Failed to update request:', e);
    return false;
  }
};

export const deleteRequest = (id) => {
  try {
    const requests = loadRequests();
    const updatedRequests = requests.filter(r => r.id !== id);
    return saveRequests(updatedRequests);
  } catch (e) {
    console.error('[StorageService] Failed to delete request:', e);
    return false;
  }
};

// Legacy StorageService export for backward compatibility
export const StorageService = {
  loadConfig: (key: string) => {
    return localStorage.getItem(key);
  },
  saveConfig: (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
  getConfig: () => {
    const config = localStorage.getItem('uc_config');
    return config ? JSON.parse(config) : {};
  },
  getResolvedConfig: async () => {
    const config = StorageService.getConfig();
    return await GlobalSecretsService.resolveConfig(config);
  },
  loadRequests,
  saveRequests,
  createRequest,
  updateRequest,
  deleteRequest,
  getRequest,
  async upsertRequest(request: any) {
    const requests = loadRequests();
    const index = requests.findIndex(r => r.id === request.id);
    if (index !== -1) {
      requests[index] = request;
    } else {
      requests.push(request);
    }
    return saveRequests(requests);
  },
  async getGrants(object: any) {
    const grantsKey = `uc_grants_${object.id}`;
    const grants = localStorage.getItem(grantsKey);
    return grants ? JSON.parse(grants) : [];
  }
};