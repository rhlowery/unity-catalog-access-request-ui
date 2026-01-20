import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getRequests } from '../services/mockData';
import './AuditLog.css';

import { createPortal } from 'react-dom';

const AuditLog = () => {
    // ... (rest of state/effect logic remains identical, preserving line 6-72)
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        getRequests().then(requests => {
            const allEvents = [];
            requests.forEach(req => {
                // 1. Creation Event
                const objectDetails = req.requestedObjects.map(obj =>
                    `${obj.fullPath || obj.name} (${req.permissions.join(', ')})`
                ).join('; ');

                let timeInfo = "Permanent";
                if (req.timeConstraint) {
                    if (req.timeConstraint.type === 'DURATION') timeInfo = `${req.timeConstraint.value} Hours`;
                    if (req.timeConstraint.type === 'RANGE') timeInfo = `${req.timeConstraint.start} to ${req.timeConstraint.end}`;
                }

                const justificationInfo = req.justification ? ` Justification: "${req.justification}"` : "";

                allEvents.push({
                    id: `${req.id}_created`,
                    timestamp: req.timestamp,
                    type: 'REQUEST_CREATED',
                    actor: req.requesterId,
                    details: `Requested access for ${req.principals.map(p => p.name).join(', ')}. Target: ${objectDetails}. Time: ${timeInfo}.${justificationInfo}`,
                    status: 'PENDING',
                    originalRequest: req // Store full request for modal
                });

                // 2. Approval/Denial Events
                req.approvalData.forEach((approval, idx) => {
                    allEvents.push({
                        id: `${req.id}_decision_${idx}`,
                        timestamp: approval.timestamp,
                        type: `REQUEST_${approval.decision}`, // APPROVED or DENIED or REVOKE
                        actor: approval.approverId,
                        details: `Decision made. Note: "${approval.message}"`,
                        status: approval.decision === 'APPROVE' ? 'APPROVED' : (approval.decision === 'REVOKE' ? 'EXPIRED' : 'DENIED'),
                        originalRequest: req
                    });
                });
            });

            // Sort by newest first
            allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setEvents(allEvents);
        });
    }, []);

    const getEventIcon = (type) => {
        if (type === 'REQUEST_CREATED') return <Clock size={16} className="text-warning" />;
        if (type === 'REQUEST_APPROVED') return <CheckCircle size={16} className="text-success" />;
        if (type === 'REQUEST_DENIED') return <XCircle size={16} className="text-danger" />;
        if (type === 'REQUEST_REVOKE') return <XCircle size={16} className="text-muted" />;
        return <FileText size={16} />;
    };

    const handleRowClick = (event) => {
        setSelectedEvent(event);
    };

    const closeModal = () => {
        setSelectedEvent(null);
    };

    return (
        <div className="audit-log animate-fade-in">
            <h2>System Audit Log</h2>
            <div className="audit-table-container glass-panel">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Event Type</th>
                            <th>Actor</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="text-center">No audit events found.</td>
                            </tr>
                        ) : (
                            events.map(event => (
                                <tr key={event.id} onClick={() => handleRowClick(event)} className="interactive-row">
                                    <td className="text-secondary">{new Date(event.timestamp).toLocaleString()}</td>
                                    <td>
                                        <div className="event-type">
                                            {getEventIcon(event.type)}
                                            <span>{event.type}</span>
                                        </div>
                                    </td>
                                    <td>{event.actor}</td>
                                    <td className="text-secondary">{event.details}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedEvent && createPortal(
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Request Details: {selectedEvent.originalRequest.id}</h3>
                            <button className="btn-close" onClick={closeModal}><XCircle size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h4>Status</h4>
                                <span className={`status-badge status-${selectedEvent.originalRequest.status.toLowerCase()}`}>
                                    {selectedEvent.originalRequest.status}
                                </span>
                            </div>

                            <div className="detail-section">
                                <h4>Requester</h4>
                                <p>{selectedEvent.originalRequest.requesterId}</p>
                            </div>

                            <div className="detail-section">
                                <h4>Principals</h4>
                                <p>{selectedEvent.originalRequest.principals.map(p => p.name).join(', ')}</p>
                            </div>

                            <div className="detail-section">
                                <h4>Access Target</h4>
                                <ul>
                                    {selectedEvent.originalRequest.requestedObjects.map((obj, i) => (
                                        <li key={i}>
                                            {obj.fullPath || obj.name} <br />
                                            <span className="text-secondary text-sm">Permissions: {selectedEvent.originalRequest.permissions.join(', ')}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="detail-section">
                                <h4>Justification</h4>
                                <p className="text-italic">"{selectedEvent.originalRequest.justification || 'No justification provided'}"</p>
                            </div>

                            <div className="detail-section">
                                <h4>Time Constraints</h4>
                                <p>
                                    {selectedEvent.originalRequest.timeConstraint ? (
                                        selectedEvent.originalRequest.timeConstraint.type === 'DURATION' ? `${selectedEvent.originalRequest.timeConstraint.value} Hours` :
                                            selectedEvent.originalRequest.timeConstraint.type === 'RANGE' ? `${selectedEvent.originalRequest.timeConstraint.start} to ${selectedEvent.originalRequest.timeConstraint.end}` : 'Permanent'
                                    ) : 'Permanent'}
                                </p>
                            </div>

                            <div className="detail-section">
                                <h4>Approval Timeline</h4>
                                <div className="timeline">
                                    <div className="timeline-item">
                                        <div className="timeline-dot dot-created"></div>
                                        <div className="timeline-content">
                                            <strong>Request Created</strong>
                                            <span className="text-xs text-secondary">{new Date(selectedEvent.originalRequest.timestamp).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    {selectedEvent.originalRequest.approvalData.map((ad, i) => (
                                        <div key={i} className="timeline-item">
                                            <div className={`timeline-dot dot-${ad.decision.toLowerCase()}`}></div>
                                            <div className="timeline-content">
                                                <strong>{ad.decision} by {ad.approverId}</strong>
                                                <p className="text-sm">"{ad.message}"</p>
                                                <span className="text-xs text-secondary">{new Date(ad.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AuditLog;
