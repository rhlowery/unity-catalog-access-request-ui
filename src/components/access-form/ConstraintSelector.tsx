import React from 'react';
import { Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

interface ConstraintSelectorProps {
    timeConstraint: { type: string; value: number; start: string; end: string };
    onTimeConstraintChange: (updates: any) => void;
    justification: string;
    onJustificationChange: (value: string) => void;
}

export const ConstraintSelector: React.FC<ConstraintSelectorProps> = ({
    timeConstraint,
    onTimeConstraintChange,
    justification,
    onJustificationChange
}) => {
    return (
        <Card className="border-white/5 bg-background/40 backdrop-blur-xl shadow-2xl">
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold tracking-tight">3. Constraints & Justification</CardTitle>
                <CardDescription className="text-xs">Duration and reason for access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-5">
                    <Label className="text-primary/70 uppercase text-[11px] font-bold tracking-[0.2em]">Time Constraint</Label>
                    <RadioGroup
                        value={timeConstraint.type}
                        onValueChange={(val) => onTimeConstraintChange({ ...timeConstraint, type: val })}
                        className="flex flex-wrap gap-8"
                    >
                        <div className="flex items-center space-x-3 group">
                            <RadioGroupItem value="PERMANENT" id="permanent" className="border-white/20 text-primary" />
                            <Label htmlFor="permanent" className="text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">Permanent</Label>
                        </div>
                        <div className="flex items-center space-x-3 group">
                            <RadioGroupItem value="DURATION" id="duration" className="border-white/20 text-primary" />
                            <Label htmlFor="duration" className="text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">Duration (Hours)</Label>
                        </div>
                        <div className="flex items-center space-x-3 group">
                            <RadioGroupItem value="RANGE" id="range" className="border-white/20 text-primary" />
                            <Label htmlFor="range" className="text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">Date Range</Label>
                        </div>
                    </RadioGroup>

                    {timeConstraint.type === 'DURATION' && (
                        <div className="pl-7 animate-in slide-in-from-left-2 duration-500 max-w-[180px]">
                            <Label className="text-[11px] uppercase tracking-widest opacity-50 mb-2 block">Hours</Label>
                            <Input
                                type="number"
                                min="1"
                                value={timeConstraint.value}
                                onChange={(e) => onTimeConstraintChange({ ...timeConstraint, value: parseInt(e.target.value) || 1 })}
                                className="bg-transparent border-white/10 focus:border-primary/50"
                            />
                        </div>
                    )}

                    {timeConstraint.type === 'RANGE' && (
                        <div className="pl-7 animate-in slide-in-from-left-2 duration-500 flex gap-4 max-w-md">
                            <div className="flex-1">
                                <Label className="text-[11px] uppercase tracking-widest opacity-50 mb-2 block">Start Date</Label>
                                <Input
                                    type="date"
                                    value={timeConstraint.start}
                                    onChange={(e) => onTimeConstraintChange({ ...timeConstraint, start: e.target.value })}
                                    className="bg-transparent border-white/10 focus:border-primary/50"
                                />
                            </div>
                            <div className="flex-1">
                                <Label className="text-[11px] uppercase tracking-widest opacity-50 mb-2 block">End Date</Label>
                                <Input
                                    type="date"
                                    value={timeConstraint.end}
                                    onChange={(e) => onTimeConstraintChange({ ...timeConstraint, end: e.target.value })}
                                    className="bg-transparent border-white/10 focus:border-primary/50"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <Separator className="opacity-10" />

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                            <Key size={14} />
                        </div>
                        <Label htmlFor="justification" className="text-foreground/90 uppercase text-[10px] font-black tracking-[0.2em]">Justification & Rational</Label>
                    </div>
                    <Textarea
                        id="justification"
                        data-testid="justification-input"
                        placeholder="Provide details on the business requirement for this access..."
                        className="min-h-[160px] resize-none bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] focus:ring-primary/10 rounded-2xl transition-all duration-500 p-6 text-sm leading-relaxed shadow-inner"
                        value={justification}
                        onChange={(e) => onJustificationChange(e.target.value)}
                    />
                </div>
            </CardContent>
        </Card>
    );
};
