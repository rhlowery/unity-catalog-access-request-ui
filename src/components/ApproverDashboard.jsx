import React, { useState, useEffect } from 'react';
import { Check, X, MessageSquare, Clock, AlertCircle, Users, ChevronDown } from 'lucide-react';
import { getRequests, approveRequest, MOCK_IDENTITIES } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import './ApproverDashboard.css';

const ApproverDashboard = () => {
    const { user } = useAuth(); // Real logged in user (usually acting as Requester)
    const [requests, setRequests] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [denialState, setDenialState] = useState({ reqId: null, reason: '' });

    // Persona Switching State
    const [activePersona, setActivePersona] = useState('group_governance'); // Default to Governance

    const personas = [
        { id: 'group_governance', name: 'Governance Team' },
        { id: 'user_marketing_lead', name: 'Marketing Lead' },
        { id: 'group_finance_admins', name: 'Finance Admins' },
        { id: 'group_data_scientists', name: 'Data Scientists' },
        { id: 'group_legal_compliance', name: 'Legal Compliance' },
    ];

    useEffect(() => {
        getRequests().then(setRequests);
    }, [refreshTrigger]);

    const handleApprove = async (reqId) => {
        await approveRequest(reqId, activePersona, 'Approved via Dashboard', 'APPROVE');
        setRefreshTrigger(prev => prev + 1);
    };

    const confirmDenial = async () => {
        if (!denialState.reason.trim()) return;
        await approveRequest(denialState.reqId, activePersona, denialState.reason, 'DENY');
        setDenialState({ reqId: null, reason: '' });
        setRefreshTrigger(prev => prev + 1);
    };

    // 1. Action Required: I need to approve, and global status is PENDING
    const pendingForMe = requests.filter(r =>
        r.status === 'PENDING' &&
        r.approvalState &&
        r.approvalState[activePersona] === 'PENDING'
    );

    // 2. Pending Others: I have approved, but global status is still PENDING (waiting on others)
    const otherPending = requests.filter(r =>
        r.status === 'PENDING' &&
        r.approvalState &&
        r.approvalState[activePersona] === 'APPROVED'
    );

    // 3. History: Global status is DONE (Approved/Denied), AND I was an approver
    const completedRequests = requests.filter(r =>
        r.status !== 'PENDING' &&
        r.approvalState &&
        Object.keys(r.approvalState).includes(activePersona)
    );

    const getProgress = (req) => {
        const states = Object.values(req.approvalState || {});
        const approved = states.filter(s => s === 'APPROVED').length;
        const total = states.length;
        return { approved, total };
    };

    return (
        <div className="approver-dashboard animate-fade-in">

            {/* Persona Switcher Header */}
            <div className="persona-header glass-panel">
                <div className="persona-label">
                    <Users size={20} className="text-secondary" />
                    <span>Viewing Dashboard as:</span>
                </div>
                <select
                    className="persona-select"
                    value={activePersona}
                    onChange={(e) => setActivePersona(e.target.value)}
                >
                    {personas.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="persona-info text-xs text-secondary">
                    (Simulates this user's view)
                </div>
            </div>

            <h2>Action Required ({pendingForMe.length})</h2>

            {pendingForMe.length === 0 && (
                <div className="empty-dashboard glass-panel">
                    <Check size={32} className="text-success" style={{ opacity: 0.5 }} />
                    <p>You're all caught up!</p>
                </div>
            )}

            <div className="requests-list">
                {pendingForMe.map(req => (
                    <RequestCard
                        key={req.id}
                        req={req}
                        isActionable={true}
                        onApprove={() => handleApprove(req.id)}
                        onDeny={() => setDenialState({ reqId: req.id, reason: '' })}
                        denialState={denialState}
                        setDenialState={setDenialState}
                        confirmDenial={confirmDenial}
                    />
                ))}
            </div>

            {otherPending.length > 0 && (
                <>
                    <h2 style={{ marginTop: '2rem' }}>Pending Others ({otherPending.length})</h2>
                    <div className="requests-list opacity-75">
                        {otherPending.map(req => (
                            <RequestCard key={req.id} req={req} isActionable={false} />
                        ))}
                    </div>
                </>
            )}

            {completedRequests.length > 0 && (
                <>
                    <h2 style={{ marginTop: '2rem' }}>History</h2>
                    <div className="requests-list history-list">
                        {completedRequests.map(req => (
                            <RequestCard key={req.id} req={req} isActionable={false} isHistory={true} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const RequestCard = ({ req, isActionable, onApprove, onDeny, denialState, setDenialState, confirmDenial, isHistory }) => {
    const { approved, total } = getProgress(req);
    const progressPercent = (approved / total) * 100;

    return (
        <div className={`request-card glass-panel ${isHistory ? 'history-card' : ''}`}>
            <div className="req-header">
                <span className="req-time">{new Date(req.timestamp).toLocaleString()}</span>
                {isHistory ? (
                    <span className={`req-status status-${req.status.toLowerCase()}`}>{req.status}</span>
                ) : (
                    <div className="progress-container">
                        <div className="progress-text">{approved}/{total} Approvals</div>
                        <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="req-body">
                <div className="req-section">
                    <label>Resources:</label>
                    <div className="req-tags">
                        {req.requestedObjects.map(obj => (
                            <span key={obj.id} className="tag">{obj.name}</span>
                        ))}
                    </div>
                </div>

                <div className="req-section">
                    <label>For:</label>
                    <div className="req-tags">
                        {req.principals.map(p => (
                            <span key={p.id} className="tag tag-principal">{p.name}</span>
                        ))}
                    </div>
                </div>

                {/* Detailed Approval Status List */}
                {!isHistory && (
                    <div className="approval-status-list">
                        {Object.entries(req.approvalState || {}).map(([approver, status]) => (
                            <div key={approver} className="approval-item">
                                <div className={`status-dot dot-${status.toLowerCase()}`}></div>
                                <span className="approver-name">{approver}</span>
                                <span className="approver-status">{status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isActionable && (
                denialState && denialState.reqId === req.id ? (
                    <div className="denial-form animate-fade-in">
                        <div className="denial-input-wrapper">
                            <AlertCircle size={16} className="text-danger" />
                            <span className="text-danger" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Reason required:</span>
                        </div>
                        <input
                            type="text"
                            className="input-reason"
                            placeholder="Reason for denial..."
                            value={denialState.reason}
                            onChange={(e) => setDenialState({ ...denialState, reason: e.target.value })}
                            autoFocus
                        />
                        <div className="denial-actions">
                            <button className="btn btn-secondary" onClick={onDeny}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmDenial} disabled={!denialState.reason.trim()}>Confirm</button>
                        </div>
                    </div>
                ) : (
                    <div className="req-actions">
                        <button className="btn btn-secondary" onClick={onDeny}><X size={16} /> Deny</button>
                        <button className="btn btn-primary" onClick={onApprove}><Check size={16} /> Approve</button>
                    </div>
                )
            )}
        </div>
    );
};

const getProgress = (req) => {
    const states = Object.values(req.approvalState || {});
    const approved = states.filter(s => s === 'APPROVED').length;
    const total = states.length;
    return { approved, total };
};

export default ApproverDashboard;
