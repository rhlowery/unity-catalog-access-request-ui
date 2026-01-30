
// Mock Data Service for ACS UI (Access Control Requests)

export const MOCK_CATALOGS = [
    {
        id: 'cat_main',
        name: 'main_catalog',
        type: 'CATALOG',
        children: [
            {
                id: 'sch_finance',
                name: 'finance',
                type: 'SCHEMA',
                parentId: 'cat_main',
                children: [
                    { id: 'tbl_transactions', name: 'transactions', type: 'TABLE', parentId: 'sch_finance', owners: ['group_finance_admins', 'user_cfo'] },
                    { id: 'tbl_payroll', name: 'payroll', type: 'TABLE', parentId: 'sch_finance', owners: ['user_cfo'] },
                    { id: 'vw_monthly_summary', name: 'monthly_summary', type: 'VIEW', parentId: 'sch_finance', owners: ['group_finance_analysts'] },
                    { id: 'func_currency_convert', name: 'convert_currency', type: 'FUNCTION', parentId: 'sch_finance', owners: ['group_finance_admins'] },
                ],
            },
            {
                id: 'sch_marketing',
                name: 'marketing',
                type: 'SCHEMA',
                parentId: 'cat_main',
                children: [
                    { id: 'tbl_campaigns', name: 'campaigns', type: 'TABLE', parentId: 'sch_marketing', owners: ['user_marketing_lead'] },
                    { id: 'tbl_leads', name: 'leads', type: 'TABLE', parentId: 'sch_marketing', owners: ['user_marketing_lead', 'group_sales_leads'] },
                    { id: 'model_churn', name: 'customer_churn_predictor', type: 'MODEL', parentId: 'sch_marketing', owners: ['group_data_scientists'] },
                ],
            },
            {
                id: 'sch_ai_governance',
                name: 'ai_governance',
                type: 'SCHEMA',
                parentId: 'cat_main',
                children: [
                    { id: 'vol_training_data', name: 'training_data_images', type: 'VOLUME', parentId: 'sch_ai_governance', owners: ['group_data_scientists', 'group_legal_compliance'] },
                    { id: 'model_genai', name: 'llama_3_finetuned', type: 'MODEL', parentId: 'sch_ai_governance', owners: ['group_data_scientists'] }
                ]
            }
        ],
    },
    {
        id: 'cat_dev',
        name: 'dev_catalog',
        type: 'CATALOG',
        children: [
            {
                id: 'sch_sandbox',
                name: 'sandbox',
                type: 'SCHEMA',
                parentId: 'cat_dev',
                children: [
                    { id: 'tbl_test_data', name: 'test_data', type: 'TABLE', parentId: 'sch_sandbox', owners: ['user_dev'] },
                ]
            }
        ]
    },
    {
        id: 'res_infra',
        name: 'External Locations & Compute',
        type: 'CATALOG', // Logical grouping for UI simple tree
        children: [
            { id: 'loc_s3_bucket', name: 's3://my-datalake-bucket', type: 'LOCATION', owners: ['user_cfo', 'group_cloud_ops'] },
            { id: 'cred_aws_role', name: 'aws_iam_role_limited', type: 'CREDENTIAL', owners: ['group_finance_admins'] },
            { id: 'wh_serverless', name: 'Serverless SQL Warehouse', type: 'COMPUTE', owners: ['group_finance_admins'] },
            { id: 'cluster_gpu', name: 'GPU Cluster (ML)', type: 'COMPUTE', owners: ['group_data_scientists', 'group_cloud_ops'] }
        ]
    }
];

export const MOCK_IDENTITIES = {
    users: [
        { id: 'user_alice', name: 'Alice Johnson', email: 'alice@example.com', type: 'USER' },
        { id: 'user_bob', name: 'Bob Smith', email: 'bob@example.com', type: 'USER' },
        { id: 'user_cfo', name: 'Carol CFO', email: 'cfo@example.com', type: 'USER' },
        { id: 'user_marketing_lead', name: 'Mike Marketing', email: 'mike@example.com', type: 'USER' },
        { id: 'user_dev', name: 'Dave Developer', email: 'dave@example.com', type: 'USER' },
    ],
    groups: [
        { id: 'group_finance_admins', name: 'Finance Admins', type: 'GROUP' },
        { id: 'group_finance_analysts', name: 'Finance Analysts', type: 'GROUP' },
        { id: 'group_data_scientists', name: 'Data Scientists', type: 'GROUP' },
    ],
    servicePrincipals: [
        { id: 'sp_etl_job', name: 'ETL Job Runner', type: 'SERVICE_PRINCIPAL' },
        { id: 'sp_bi_tool', name: 'BI Tool Connector', type: 'SERVICE_PRINCIPAL' },
    ],
};

export const PERMISSIONS = [
    'SELECT', 'MODIFY', 'USE_SCHEMA', 'USE_CATALOG', 'ALL_PRIVILEGES',
    'EXECUTE', 'READ_VOLUME', 'WRITE_VOLUME', 'CREATE_MODEL', 'USE_COMPUTE', 'ACCESS_STORAGE'
];

import { StorageService } from './storage/StorageService';

// Storage Helper
const _loadRequests = async () => {
    return await StorageService.loadRequests();
};
const _saveRequests = async (data) => {
    return await StorageService.saveRequests(data);
};

// Mock Data for different modes
const MOCK_ACCOUNT_CATALOGS = [
    {
        id: 'acc_root',
        name: 'Databricks Account',
        type: 'ACCOUNT_ROOT',
        children: [
            { id: 'ws_prod', name: 'Prod Workspace', type: 'WORKSPACE' },
            { id: 'ws_dev', name: 'Dev Workspace', type: 'WORKSPACE' },
            { id: 'ws_staging', name: 'Staging Workspace', type: 'WORKSPACE' },
        ]
    }
];

const MOCK_WORKSPACE_CATALOGS = [
    {
        id: 'cat_hive',
        name: 'hive_metastore',
        type: 'CATALOG',
        children: [
            { id: 'sch_legacy', name: 'default', type: 'SCHEMA', children: [{ id: 'tbl_legacy', name: 'sample_data', type: 'TABLE' }] }
        ]
    },
    ...MOCK_CATALOGS // Include regular catalogs too
];

export const getCatalogs = async () => {
    const config = StorageService.getConfig();

    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 600));

    if (config.ucAuthType === 'ACCOUNT') {
        return MOCK_ACCOUNT_CATALOGS;
    } else if (config.ucAuthType === 'WORKSPACE') {
        return MOCK_WORKSPACE_CATALOGS;
    }

    // Default or ucAuthType === 'MOCK'
    return MOCK_CATALOGS;
};

import { fetchUCIdentities } from './UCIdentityService';

export const getIdentities = async () => {
    const config = StorageService.getConfig();
    let shouldUseUC = false;

    // Only try to fetch Real UC data if Identity Type is NOT MOCK
    if (config.identityType !== 'MOCK') {
        if (config.identityType === 'DATABRICKS' || config.scimEnabled) {
            shouldUseUC = true;
        }
    }

    if (shouldUseUC) {
        // 1. Try to fetch real data from Unity Catalog
        const realData = await fetchUCIdentities();

        if (realData) {
            return [
                ...realData.users,
                ...realData.groups,
                ...realData.servicePrincipals
            ];
        }
    }

    // 2. Fallback to Mock Data
    console.warn("Using Mock Identity Data (API fetch failed or not configured)");
    return Promise.resolve([
        ...MOCK_IDENTITIES.users,
        ...MOCK_IDENTITIES.groups,
        ...MOCK_IDENTITIES.servicePrincipals,
    ]);
};

// Helper to get all owners for a list of objects
const getRequiredApprovers = (objects) => {
    const approvers = new Set();
    // 1. Add asset owners
    objects.forEach(obj => {
        if (obj.owners) {
            obj.owners.forEach(owner => approvers.add(owner));
        }
    });
    // 2. Add Mandatory Governance Group
    approvers.add('group_governance');

    return Array.from(approvers);
};

const getInitialApprovalState = (approvers) => {
    const state = {};
    approvers.forEach(approver => {
        state[approver] = 'PENDING';
    });
    return state;
};

 // Helper to find object path
const findObjectPath = (id: string, catalogs: any = MOCK_CATALOGS, currentPath: string[] = []): string | null => {
    for (const node of catalogs) {
        const newPath = [...currentPath, node.name];
        if (node.id === id) {
            return newPath.join('.');
        }
        if (node.children) {
            const found = findObjectPath(id, node.children, newPath);
            if (found) return found;
        }
    }
    return null;
};

// Helper to check for expired requests
const checkExpirations = (requests) => {
    const now = new Date();
    let _hasChanges = false;

    requests.forEach(req => {
        if (req.status === 'APPROVED' && req.expirationTime) {
            const expDate = new Date(req.expirationTime);
            if (now > expDate) {
                // EXPIRE IT
                req.status = 'EXPIRED';
                req.approvalData.push({
                    approverId: 'SYSTEM',
                    message: 'Access window expired. Access automatically revoked.',
                    decision: 'REVOKE',
                    timestamp: now.toISOString()
                });
                _hasChanges = true;
                // Upsert the revocation
                StorageService.upsertRequest(req);
            }
        }
    });

    return requests;
};

export const submitRequest = async (request) => {
    // Enrich requested objects with full path
    const enrichedObjects = request.requestedObjects.map(obj => ({
        ...obj,
        fullPath: findObjectPath(obj.id) || obj.name
    }));

    const requiredApprovers = getRequiredApprovers(enrichedObjects);

    // Calculate Expiration Time if applicable
    let expirationTime = null;
    if (request.timeConstraint) {
        if (request.timeConstraint.type === 'DURATION') {
            const hours = parseInt(request.timeConstraint.value);
            expirationTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        } else if (request.timeConstraint.type === 'RANGE' && request.timeConstraint.end) {
            // Set to end of the day of the end date
            const end = new Date(request.timeConstraint.end);
            end.setHours(23, 59, 59, 999);
            expirationTime = end.toISOString();
        }
    }

    const newRequest = {
        id: `req_${Date.now()}`,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        expirationTime: expirationTime, // Set calculated expiration
        approvalData: [],
        approvalState: getInitialApprovalState(requiredApprovers),
        requiredApprovers: requiredApprovers,
        ...request,
        requestedObjects: enrichedObjects, // Store enriched objects
    };

    // Save via Storage Service (Upsert)
    await StorageService.upsertRequest(newRequest);
    return newRequest;
};

export const getRequests = async () => {
    const requests = await StorageService.loadRequests();
    checkExpirations(requests); // Check for expirations every fetch
    return requests.sort((a: any, b: any) => Number(new Date(b.timestamp || 0)) - Number(new Date(a.timestamp || 0)));
};

export const approveRequest = async (requestId, approverId, message, decision) => {
    const requests = await StorageService.loadRequests();
    const req = requests.find((r) => r.id === requestId);

    if (req) {
        // 1. Log the action
        req.approvalData.push({
            approverId,
            message,
            decision,
            timestamp: new Date().toISOString()
        });

        // 2. Update specific approver state
        if (req.approvalState && req.approvalState[approverId]) {
            req.approvalState[approverId] = decision === 'APPROVE' ? 'APPROVED' : 'DENIED';
        }

        // 3. Determine Overall Status
        const states = Object.values(req.approvalState || {});

        if (states.includes('DENIED')) {
            req.status = 'DENIED';
        } else if (states.every(s => s === 'APPROVED')) {
            req.status = 'APPROVED';
        } else {
            req.status = 'PENDING';
        }

        // Update via Storage Service (Upsert)
        await StorageService.upsertRequest(req);
        return req;
    }
    return Promise.reject('Request not found');
};
