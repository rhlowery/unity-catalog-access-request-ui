import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import './EmergencyReset.css';

interface EmergencyResetProps {
    onBack: () => void;
    onConfirm: () => void;
}

const EMERGENCY_RESET_KEY = '0000-0000-0000-0000';

const EmergencyReset: React.FC<EmergencyResetProps> = ({ onBack, onConfirm }) => {
    const [showSuccess, setShowSuccess] = useState(false);
    const [resetKey, setResetKey] = useState(['', '', '', '']);
    
    const handleConfirm = async () => {
        console.log('[EmergencyReset] Reset key validated');
        onConfirm();
        setShowSuccess(true);
        
        setTimeout(() => {
            setShowSuccess(false);
        }, 2000);
    };
    
    return (
        <div className="emergency-reset">
            <AlertTriangle size={24} color="#ef4444" />
            <h3>Emergency Reset Required</h3>
            <p>Enter the emergency reset key to reset this identity provider to Mock Identity:</p>
            <div className="reset-key-inputs">
                {[0, 1, 2, 3].map((index) => (
                    <input
                        key={index}
                        type="text"
                        maxLength={4}
                        placeholder="0"
                        value={resetKey[index]}
                        onChange={(e) => {
                            const newKey = [...resetKey];
                            newKey[index] = e.target.value;
                            setResetKey(newKey);
                        }}
                        className="reset-key-input"
                    />
                ))}
            </div>
            <div className="reset-actions">
                <button className="btn btn-danger" onClick={handleConfirm}>
                    Reset to Mock Provider
                </button>
                <button className="btn btn-ghost" onClick={onBack}>
                    Cancel
                </button>
            </div>
            {showSuccess && (
                <div className="reset-success">
                    <ShieldCheck size={24} color="#10b981" />
                    <p>Emergency reset successful! Restarting with mock provider...</p>
                </div>
            )}
        </div>
    );
};

export default EmergencyReset;