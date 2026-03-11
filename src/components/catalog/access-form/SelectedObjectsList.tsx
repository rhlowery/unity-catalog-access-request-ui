import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NodeIcon } from '../CatalogTree';

interface SelectedObjectsListProps {
    selectedObjects: any[];
    onClearSelection: () => void;
}

export const SelectedObjectsList: React.FC<SelectedObjectsListProps> = ({ selectedObjects, onClearSelection }) => {
    return (
        <Card className="border-white/5 bg-background/40 backdrop-blur-xl overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 py-4 px-6">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight text-primary/90">Selected Objects</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-widest opacity-60">
                            Requesting access to {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive">
                        Clear Selection
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                    {selectedObjects.map(obj => (
                        <Badge key={obj.id} variant="secondary" className="pl-1.5 pr-2.5 py-1.5 gap-2 flex items-center bg-white/5 border-white/5 text-[11px] font-medium hover:bg-white/10 transition-colors">
                            <NodeIcon type={obj.type} />
                            <span className="opacity-50 font-normal uppercase tracking-tighter">{obj.type}:</span>
                            <span className="text-foreground/90">{obj.name}</span>
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
