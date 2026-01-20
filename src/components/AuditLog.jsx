import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getRequests } from '../services/mockData';
import './AuditLog.css';

const AuditLog = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        getRequests().then(requests => {
            const allEvents = [];
            requests.forEach(req => {
                // 1. Creation Event
                allEvents.push({
                    id: `${req.id}_created`,
                    timestamp: req.timestamp,
                    type: 'REQUEST_CREATED',
                    actor: req.requesterId,
                    details: `Requested access for ${req.principals.length} principals to ${req.requestedObjects.length} objects`,
                    status: 'PENDING'
                });

                // 2. Approval/Denial Events
                req.approvalData.forEach((approval, idx) => {
                    allEvents.push({
                        id: `${req.id}_decision_${idx}`,
                        timestamp: approval.timestamp,
                        type: `REQUEST_${approval.decision}`, // APPROVED or DENIED
                        actor: approval.approverId,
                        details: `Decision made. Note: "${approval.message}"`,
                        status: approval.decision === 'APPROVE' ? 'APPROVED' : 'DENIED'
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
        return <FileText size={16} />;
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
                                <tr key={event.id}>
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
        </div>
    );
};

export default AuditLog;
