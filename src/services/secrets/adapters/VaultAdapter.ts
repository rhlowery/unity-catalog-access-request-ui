import { ISecretsAdapter } from '../ISecretsAdapter';
import { VaultService } from '../../VaultService';

/**
 * HashiCorp Vault Secrets Adapter
 */
export const VaultAdapter: ISecretsAdapter = {
    name: 'HashiCorp Vault',
    type: 'VAULT',

    async getSecret(path: string, key: string, _config: any): Promise<string | null> {
        return await VaultService.fetchSecret(path, key);
    }
};
