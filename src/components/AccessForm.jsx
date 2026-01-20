import React, { useState, useEffect } from 'react';
import { User, Users, Shield, CheckCircle, X } from 'lucide-react';
import { getIdentities, PERMISSIONS, submitRequest } from '../services/mockData';
import './AccessForm.css';

const AccessForm = ({ selectedObjects, onClearSelection }) => {
    const [identities, setIdentities] = useState([]);
    const [selectedPrincipals, setSelectedPrincipals] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        getIdentities().then(setIdentities);
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
        if (selectedPrincipals.length === 0 || selectedPermissions.length === 0 || selectedObjects.length === 0) return;

        setIsSubmitting(true);
        const request = {
            requestedObjects: selectedObjects.map(o => ({ id: o.id, name: o.name, type: o.type })),
            principals: identities.filter(i => selectedPrincipals.includes(i.id)),
            permissions: selectedPermissions,
            requesterId: 'currentUser', // Mocked
        };

        await submitRequest(request);

        setIsSubmitting(false);
        setSuccessMessage('Access request submitted successfully!');
        setTimeout(() => {
            setSuccessMessage('');
            onClearSelection();
            setSelectedPrincipals([]);
            setSelectedPermissions([]);
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

            <div className="form-actions">
                {successMessage ? (
                    <div className="success-message animate-fade-in"><CheckCircle size={20} /> {successMessage}</div>
                ) : (
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedPrincipals.length === 0 || selectedPermissions.length === 0}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Access Request'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AccessForm;
