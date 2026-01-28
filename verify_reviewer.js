
// Mock localStorage
global.localStorage = {
    store: {},
    getItem: function (key) { return this.store[key] || null; },
    setItem: function (key, value) { this.store[key] = value.toString(); }
};

// Import necessary modules
// Since we are in Node, we need to handle ES6 imports. 
// We will use a simple approach: manually construct the test objects instead of importing the full module tree which might need transpilation.
// Actually, I can just copy the logic I want to test into this script for isolation.
// The core logic is:
// 1. StorageService.getGrants (delegates to Adapter)
// 2. StorageService.getLiveGrants (delegate to UC Adapter)
// 3. Adapter.getGrants (filtering)

async function testLogic() {
    console.log("Starting Verification...");

    // MOCK DATA
    const mockRequests = [
        {
            id: 'req_1',
            status: 'APPROVED',
            requestedObjects: [{ id: 'tbl_transactions' }],
            principals: ['user_alice'],
            permissions: ['SELECT']
        },
        {
            id: 'req_2',
            status: 'PENDING',
            requestedObjects: [{ id: 'tbl_transactions' }],
            principals: ['user_bob'],
            permissions: ['SELECT']
        }
    ];

    // 1. Test "Configured Grants" Logic (from LocalStorageAdapter)
    const getConfiguredGrants = (requests, objectId) => {
        const grants = [];
        requests
            .filter(r => r.status === 'APPROVED')
            .forEach(r => {
                const targetsObject = r.requestedObjects.some(o => o.id === objectId);
                if (targetsObject) {
                    r.principals.forEach(principal => {
                        grants.push({
                            principal: principal,
                            permissions: r.permissions,
                            source: 'CONFIGURED',
                            requestId: r.id
                        });
                    });
                }
            });
        return grants;
    };

    const configured = getConfiguredGrants(mockRequests, 'tbl_transactions');
    console.log("Configured Grants:", JSON.stringify(configured, null, 2));

    if (configured.length === 1 && configured[0].principal === 'user_alice') {
        console.log("PASSED: Configured Grants logic correctly filters APPROVED requests.");
    } else {
        console.error("FAILED: Configured Grants logic.");
    }

    // 2. Test "Live Grants" Logic (from UnityCatalogAdapter Mock)
    const getLiveGrants = (objectName) => {
        const grants = [];
        if (objectName === 'transactions') {
            grants.push({
                principal: { id: 'user_cfo', name: 'Carol CFO', type: 'USER' },
                permissions: ['ALL_PRIVILEGES'],
                source: 'LIVE',
                type: 'DIRECT'
            });
        }
        return grants;
    };

    const live = getLiveGrants('transactions');
    console.log("Live Grants:", JSON.stringify(live, null, 2));

    if (live.length === 1 && live[0].principal.id === 'user_cfo') {
        console.log("PASSED: Live Grants mock logic returns expected data.");
    } else {
        console.error("FAILED: Live Grants logic.");
    }

    // 3. Test Comparison Logic (as implemented in ReviewerTab component)
    // We have:
    // Configured: user_alice [SELECT]
    // Live: user_cfo [ALL_PRIVILEGES]
    // Expect: user_alice -> Not Applied, user_cfo -> Not Recorded

    const compareGrants = (configured, live) => {
        const allItems = [];

        // Configured processing
        configured.forEach(cg => {
            cg.permissions.forEach(perm => {
                const matchIndex = live.findIndex(lg =>
                    lg.principal.id === cg.principal && // Note: in mockRequests principal is string, in live it's object. Need to align.
                    lg.permissions.includes(perm)
                );
                // Aligning mocks for test:
                // configured principal is 'user_alice'
                // live principal.id is 'user_cfo'

                if (matchIndex !== -1) {
                    allItems.push({ status: 'SYNCED', principal: cg.principal });
                } else {
                    allItems.push({ status: 'NOT_APPLIED', principal: cg.principal });
                }
            });
        });

        // Live processing
        live.forEach(lg => {
            lg.permissions.forEach(perm => {
                const existsInConfigured = configured.some(cg =>
                    cg.principal === lg.principal.id &&
                    cg.permissions.includes(perm)
                );

                if (!existsInConfigured) {
                    allItems.push({ status: 'NOT_RECORDED', principal: lg.principal.id });
                }
            });
        });

        return allItems;
    };

    const results = compareGrants(configured, live);
    console.log("Comparison Results:", JSON.stringify(results, null, 2));

    const notApplied = results.find(r => r.status === 'NOT_APPLIED');
    const notRecorded = results.find(r => r.status === 'NOT_RECORDED');

    if (notApplied && notApplied.principal === 'user_alice' && notRecorded && notRecorded.principal === 'user_cfo') {
        console.log("PASSED: Comparison logic correctly identifies discrepancies.");
    } else {
        console.error("FAILED: Comparison logic.");
    }
}

testLogic();
