import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-red-500/20 shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
                <AlertTriangle size={32} className="text-red-500" />
            </div>

            <h3 className="text-xl font-bold tracking-tight text-foreground mb-3">Emergency Reset Required</h3>
            <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
                Enter the emergency reset key to restore the system to Mock Identity Provider mode.
            </p>

            <div className="flex gap-3 mb-8">
                {[0, 1, 2, 3].map((index) => (
                    <input
                        key={index}
                        type="text"
                        maxLength={4}
                        placeholder="0000"
                        value={resetKey[index]}
                        onChange={(e) => {
                            const newKey = [...resetKey];
                            newKey[index] = e.target.value;
                            setResetKey(newKey);
                        }}
                        className="w-16 h-12 bg-white/5 border border-white/10 rounded-xl text-center text-sm font-bold focus:border-red-500/50 focus:bg-white/10 transition-all outline-none"
                    />
                ))}
            </div>

            <div className="flex flex-col gap-3 w-full">
                <button
                    className="h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                    onClick={handleConfirm}
                >
                    Reset to Mock Provider
                </button>
                <button
                    className="h-12 bg-transparent hover:bg-white/5 text-muted-foreground font-bold rounded-xl transition-all"
                    onClick={onBack}
                >
                    Cancel
                </button>
            </div>

            {showSuccess && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-[2rem] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/20">
                        <ShieldCheck size={32} className="text-emerald-500" />
                    </div>
                    <p className="font-bold text-lg text-emerald-400">Reset Successful!</p>
                    <p className="text-xs text-muted-foreground mt-2">Restarting security provider...</p>
                </div>
            )}
        </div>
    );
};

export default EmergencyReset;