import { ISecretsAdapter } from '../ISecretsAdapter';

/**
 * Static/Environment Secrets Adapter
 * Returns secrets directly from the app config (Plain text).
 */
export const EnvAdapter = {
    ...ISecretsAdapter,
    name: 'Environment/Static',
    type: 'PLAIN',

    async getSecret(_path, _key, _config) {
        console.log(`[Secrets:Env] Fetching ${_key} from static config (No-op)`);
        // In this implementation, the "secret" is already in the config 
        // if we are using PLAIN mode. This adapter is a placeholder/fallback.
        return null;
    }
};
