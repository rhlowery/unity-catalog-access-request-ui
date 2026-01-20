
// Mock Data Service for Unity Catalog Access Request UI

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

// LocalStorage Helper
const STORAGE_KEY = 'uc_access_requests_v1';
const loadRequests = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};
const saveRequests = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getCatalogs = () => Promise.resolve(MOCK_CATALOGS);

export const getIdentities = () => Promise.resolve([
    ...MOCK_IDENTITIES.users,
    ...MOCK_IDENTITIES.groups,
    ...MOCK_IDENTITIES.servicePrincipals,
]);

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

export const submitRequest = (request) => {
    const requests = loadRequests();
    const requiredApprovers = getRequiredApprovers(request.requestedObjects);

    const newRequest = {
        id: `req_${Date.now()}`,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        approvalData: [],
        approvalState: getInitialApprovalState(requiredApprovers),
        requiredApprovers: requiredApprovers,
        ...request,
    };
    requests.push(newRequest);
    saveRequests(requests);
    return Promise.resolve(newRequest);
};

export const getRequests = () => {
    return Promise.resolve(loadRequests().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
};

export const approveRequest = (requestId, approverId, message, decision) => {
    const requests = loadRequests();
    const reqIndex = requests.findIndex((r) => r.id === requestId);

    if (reqIndex !== -1) {
        const req = requests[reqIndex];

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

        // Update the array
        requests[reqIndex] = req;
        saveRequests(requests);
        return Promise.resolve(req);
    }
    return Promise.reject('Request not found');
};
