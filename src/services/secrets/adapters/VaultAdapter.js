import { ISecretsAdapter } from '../ISecretsAdapter';
import { VaultService } from '../../VaultService';

/**
 * HashiCorp Vault Secrets Adapter
 */
export const VaultAdapter = {
    ...ISecretsAdapter,
    name: 'HashiCorp Vault',
    type: 'VAULT',

    async getSecret(path, key, config) {
        return await VaultService.fetchSecret(path, key);
    }
};
