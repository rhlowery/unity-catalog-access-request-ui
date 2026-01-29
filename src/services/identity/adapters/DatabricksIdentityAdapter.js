import { IIdentityAdapter } from '../IIdentityAdapter';
import { fetchUCIdentities } from '../../UCIdentityService';

/**
 * Databricks Unity Catalog Identity Adapter
 * Fetches data via SCIM APIs.
 */
export const DatabricksIdentityAdapter = {
    ...IIdentityAdapter,
    name: 'Databricks UC',
    type: 'DATABRICKS',

    async fetchIdentities(config) {
        const realData = await fetchUCIdentities();
        if (realData) {
            return realData;
        }
        throw new Error('Failed to fetch identities from Databricks');
    }
};
