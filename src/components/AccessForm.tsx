import React, { useState, useEffect } from 'react';
import { Shield, X, User, Users, CheckCircle } from 'lucide-react';
import { IdentityService } from '../services/identity/IdentityService';
import { PERMISSIONS, submitRequest } from '../services/mockData';
import { useAuth } from '../context/AuthProvider';
import './AccessForm.css';

const AccessForm = ({ selectedObjects, onClearSelection }) => {
    const { user } = useAuth();
    const [identities, setIdentities] = useState([]);
    const [selectedPrincipals, setSelectedPrincipals] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [timeConstraint, setTimeConstraint] = useState({ type: 'PERMANENT', value: 24, start: '', end: '' });
    const [justification, setJustification] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const loadIdentities = async () => {
            const data = await IdentityService.fetchIdentities();
            setIdentities([
                ...data.users,
                ...data.groups,
                ...data.servicePrincipals
            ]);
        };
        loadIdentities();
    }, []);

    const handlePrincipalToggle = (id) => {
        if (selectedPrincipals.includes(id)) {
            setSelectedPrincipals(selectedPrincipals.filter(p => p !== id));
        } else {
            setSelectedPrincipals([...selectedPrincipals, id]);
        }
    };

    const handlePermissionToggle = (perm) => {
        if (selectedPermissions.includes(perm)) {
            setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
        } else {
            setSelectedPermissions([...selectedPermissions, perm]);
        }
    };

    const handleSubmit = async () => {
        if (selectedPrincipals.length === 0 || selectedPermissions.length === 0 || selectedObjects.length === 0 || !justification.trim()) return;

        setIsSubmitting(true);
        const request = {
            requestedObjects: selectedObjects.map(o => ({ id: o.id, name: o.name, type: o.type })),
            principals: identities.filter(i => selectedPrincipals.includes(i.id)),
            permissions: selectedPermissions,
            timeConstraint: timeConstraint,
            justification: justification,
            requesterId: user ? user.name : 'Unknown User', // Use real user name
        };

        await submitRequest(request);

        setIsSubmitting(false);
        setSuccessMessage('Access request submitted successfully!');
        setTimeout(() => {
            setSuccessMessage('');
            onClearSelection();
            setSelectedPrincipals([]);
            setSelectedPermissions([]);
            setJustification('');
        }, 3000);
    };

    if (selectedObjects.length === 0) {
        return (
            <div className="empty-state">
                <Shield size={48} className="text-secondary" />
                <h3>No Data Objects Selected</h3>
                <p className="text-secondary">Select schemas, tables, or views from the catalog tree on the left.</p>
            </div>
        );
    }

    return (
        <div className="access-form animate-fade-in">
            <div className="form-section">
                <h3>Selected Objects ({selectedObjects.length})</h3>
                <div className="tags-container">
                    {selectedObjects.map(obj => (
                        <span key={obj.id} className="tag object-tag">
                            {obj.type}: {obj.name}
                        </span>
                    ))}
                    <button onClick={onClearSelection} className="btn-text">Clear All</button>
                </div>
            </div>

            <div className="form-section">
                <h3>1. Select Principals</h3>
                <div className="principals-list glass-panel">
                    {identities.map(principal => (
                        <div
                            key={principal.id}
                            className={`principal-item ${selectedPrincipals.includes(principal.id) ? 'selected' : ''}`}
                            onClick={() => handlePrincipalToggle(principal.id)}
                        >
                            {principal.type === 'USER' && <User size={16} />}
                            {principal.type === 'GROUP' && <Users size={16} />}
                            {principal.type === 'SERVICE_PRINCIPAL' && <Shield size={16} />}
                            <span>{principal.name}</span>
                            {selectedPrincipals.includes(principal.id) && <CheckCircle size={16} className="check-icon" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="form-section">
                <h3>2. Select Permissions</h3>
                <div className="permissions-grid">
                    {PERMISSIONS.map(perm => (
                        <label key={perm} className={`permission-card glass-panel ${selectedPermissions.includes(perm) ? 'selected' : ''}`}>
                            <input
                                type="checkbox"
                                checked={selectedPermissions.includes(perm)}
                                onChange={() => handlePermissionToggle(perm)}
                            />
                            <span>{perm}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-section">
                <h3>3. Time Constraints (Optional)</h3>
                <div className="time-constraints glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="timeType"
                                value="PERMANENT"
                                checked={timeConstraint.type === 'PERMANENT'}
                                onChange={(e) => setTimeConstraint({ ...timeConstraint, type: e.target.value })}
                            />
                            Permanent
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="timeType"
                                value="DURATION"
                                checked={timeConstraint.type === 'DURATION'}
                                onChange={(e) => setTimeConstraint({ ...timeConstraint, type: e.target.value })}
                            />
                            Duration (Hours)
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="timeType"
                                value="RANGE"
                                checked={timeConstraint.type === 'RANGE'}
                                onChange={(e) => setTimeConstraint({ ...timeConstraint, type: e.target.value })}
                            />
                            Date Range
                        </label>
                    </div>

                    {timeConstraint.type === 'DURATION' && (
                        <div className="animate-fade-in">
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Duration in Hours:</label>
                            <input
                                type="number"
                                min="1"
                                className="input-text"
                                style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                                value={timeConstraint.value}
                                onChange={(e) => setTimeConstraint({ ...timeConstraint, value: parseInt(e.target.value as string) || 1 })}
                            />
                        </div>
                    )}

                    {timeConstraint.type === 'RANGE' && (
                        <div className="animate-fade-in" style={{ display: 'flex', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Start Date:</label>
                                <input
                                    type="date"
                                    className="input-text"
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                                    value={timeConstraint.start}
                                    onChange={(e) => setTimeConstraint({ ...timeConstraint, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>End Date:</label>
                                <input
                                    type="date"
                                    className="input-text"
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                                    value={timeConstraint.end}
                                    onChange={(e) => setTimeConstraint({ ...timeConstraint, end: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="form-section">
                <h3>4. Justification (Required)</h3>
                <textarea
                    className="input-text"
                    style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '4px', resize: 'vertical' }}
                    placeholder="Please explain why this access is required..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                />
            </div>

            <div className="form-actions">
                {successMessage ? (
                    <div className="success-message animate-fade-in"><CheckCircle size={20} /> {successMessage}</div>
                ) : (
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedPrincipals.length === 0 || selectedPermissions.length === 0 || !justification.trim()}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Access Request'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AccessForm;
