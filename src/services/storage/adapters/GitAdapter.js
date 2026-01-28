/**
 * Git Storage Adapter with GitOps Workflow
 * 
 * Workflow:
 * 1. New Request -> Create Branch 'req_<id>'
 * 2. Create 'CODEOWNERS' file based on approvers.
 * 3. Commit Request JSON.
 * 4. Open Merge Request.
 * 5. Approvals -> Update MR state.
 * 6. Fully Approved -> Merge MR.
 * 7. Denied -> Close MR.
 */

// We simulate the "Remote Repo" state in localStorage for this demo
const GIT_STATE_KEY = 'acs_git_state_v1';

const getGitState = () => {
    const data = localStorage.getItem(GIT_STATE_KEY);
    return data ? JSON.parse(data) : { branches: {}, merged: [] };
};

const saveGitState = (state) => {
    localStorage.setItem(GIT_STATE_KEY, JSON.stringify(state));
};

export const GitAdapter = {
    name: 'Git Repository (GitOps)',
    type: 'GIT',

    async load(config) {
        // Return all "Merged" requests + active branches
        const state = getGitState();
        const allReqs = [...state.merged];
        Object.values(state.branches).forEach(b => {
            // Only add if not already in merged (to avoid dups during merge transition)
            if (!allReqs.find(r => r.id === b.request.id)) {
                allReqs.push(b.request);
            }
        });
        return allReqs;
    },

    async save(data, config) {
        // Bulk save not supported in GitOps mode usually, but we implement for fallback
        console.warn("[GitAdapter] Bulk save called. This bypasses GitOps workflow.");
        return true;
    },

    async upsertRequest(request, config) {
        const state = getGitState();
        const branchName = `req_${request.id}`;

        console.log(`[GitAdapter] Processing Request ${request.id} on branch ${branchName}`);

        // 1. Check if finalized (Approved/Denied and processed)
        // If status is APPROVED/DENIED/EXPIRED, we handle the Merge/Close lifecycle
        if (['APPROVED', 'DENIED', 'EXPIRED', 'REVOKED'].includes(request.status)) {
            if (state.branches[branchName]) {
                if (request.status === 'APPROVED') {
                    console.log(`[GitOps] Merging MR for ${branchName} to ${config.gitBranch || 'main'}`);
                    state.merged.push(request);
                    delete state.branches[branchName]; // Delete branch after merge
                } else {
                    console.log(`[GitOps] Closing MR for ${branchName} (Status: ${request.status})`);
                    // We keep it in merged list for history, or usually "Closed" MRs are just archive.
                    // For app view, we put in merged list so it shows up in "History"
                    state.merged.push(request);
                    delete state.branches[branchName];
                }
                saveGitState(state);
                return;
            } else {
                // Already merged/closed, just update the record in merged list
                const idx = state.merged.findIndex(r => r.id === request.id);
                if (idx !== -1) {
                    state.merged[idx] = request;
                    saveGitState(state);
                }
                return;
            }
        }

        // 2. Active Request (PENDING)
        if (!state.branches[branchName]) {
            // NEW Request -> Initialize Branch & MR
            console.log(`[GitOps] Creating Branch: ${branchName}`);

            // Generate CODEOWNERS content
            const owners = request.requiredApprovers.map(a => `@${a}`).join(' ');
            const codeownersContent = `/${request.id}.json ${owners}`;
            console.log(`[GitOps] Committing CODEOWNERS: "${codeownersContent}"`);

            // Construct MR Link based on Provider
            let mrLink = '';
            const host = config.gitHost || 'github.com';
            const repo = config.gitRepo;
            const mrId = Math.floor(Math.random() * 1000) + 1;

            if (config.gitProvider === 'GITLAB' || config.gitProvider === 'GITLAB_SELF_HOSTED') {
                mrLink = `https://${host}/${repo}/-/merge_requests/${mrId}`;
            } else {
                // Default GITHUB
                mrLink = `https://${host}/${repo}/pull/${mrId}`;
            }

            console.log(`[GitOps] Committing ${request.id}.json`);
            console.log(`[GitOps] Opening Merge Request: ${branchName} -> ${config.gitBranch || 'main'}`);

            // Store metadata (simulating Git hosting response)
            request.gitMetadata = {
                branch: branchName,
                mrId: mrId,
                mrLink: mrLink,
                status: 'OPEN'
            };
        } else {
            // Existing Branch -> Just update content (e.g. someone commented or partial approval)
            console.log(`[GitOps] Pushing update to ${branchName}`);
            // Preserve metadata
            request.gitMetadata = state.branches[branchName].request.gitMetadata;
        }

        // Save State
        state.branches[branchName] = {
            request: request,
            codeowners: request.requiredApprovers,
            updatedAt: new Date().toISOString()
        };
        saveGitState(state);
        return true;
    },

    async getGrants(object, config) {
        // Similar to Load logic, but specific for Reviewer Tab
        const allReqs = await this.load(config);

        const grants = [];
        allReqs
            .filter(r => ['APPROVED', 'MERGED'].includes(r.status)) // In GitOps, MERGED is equivalent to APPROVED
            .forEach(r => {
                const targetsObject = r.requestedObjects.some(o => o.id === object.id);
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
    }
};
