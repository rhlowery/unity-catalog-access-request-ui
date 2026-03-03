import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Database, Folder, Table, Eye, Brain, Box, Server, ScrollText, HardDrive, Globe, Key, ChevronDown, ChevronRight } from 'lucide-react';
import { VirtualList } from './VirtualList';

export const NodeIcon = ({ type }: { type?: string }) => {
    const iconType = type || 'TABLE';
    switch (iconType) {
        case 'CATALOG': return <Folder size={16} className="text-red-400/80" />;
        case 'SCHEMA': return <Database size={16} className="text-amber-400/80" />;
        case 'TABLE': return <Table size={16} className="text-blue-400/80" />;
        case 'VIEW': return <Eye size={16} className="text-emerald-400/80" />;
        case 'MODEL': return <Brain size={16} className="text-purple-400/80" />;
        case 'FUNCTION': return <ScrollText size={16} className="text-orange-400/80" />;
        case 'VOLUME': return <HardDrive size={16} className="text-sky-400/80" />;
        case 'LOCATION': return <Globe size={16} className="text-green-400/80" />;
        case 'CREDENTIAL': return <Key size={16} className="text-rose-400/80" />;
        case 'COMPUTE': return <Server size={16} className="text-pink-400/80" />;
        default: return <Table size={16} className="text-muted-foreground" />;
    }
};

interface FlatNode {
    node: any;
    depth: number;
}

const CatalogTree = ({ nodes = [], selectedIds, onToggleSelection }: any) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [containerHeight, setContainerHeight] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.getBoundingClientRect().height);
            }
        };

        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                setContainerHeight(entries[0].contentRect.height);
            }
        });

        observer.observe(containerRef.current);
        updateHeight();

        window.addEventListener('resize', updateHeight);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const flatNodes = useMemo(() => {
        const result: FlatNode[] = [];
        const traverse = (nodeList: any[], depth: number) => {
            for (const node of nodeList) {
                result.push({ node, depth });
                if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
                    traverse(node.children, depth + 1);
                }
            }
        };
        if (nodes && nodes.length > 0) {
            traverse(nodes, 0);
        }
        return result;
    }, [nodes, expandedIds]);

    const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const renderItem = useCallback((flatNode: FlatNode, index: number) => {
        const { node, depth } = flatNode;
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedIds.has(node.id);
        const nodeType = node.type || 'TABLE';
        const isExpanded = expandedIds.has(node.id);

        const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.stopPropagation();
            onToggleSelection(node.id, node);
        };

        const handleRowClick = (e: React.MouseEvent) => {
            if (hasChildren) {
                toggleExpand(node.id, e);
            } else {
                onToggleSelection(node.id, node);
            }
        };

        return (
            <div
                className={`group flex items-center h-8 px-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.03] ${isSelected ? 'bg-primary/10' : ''}`}
                style={{ paddingLeft: `${(depth * 16) + 16}px` }}
                onClick={handleRowClick}
            >
                <div className="flex items-center gap-2 w-full">
                    <button
                        className={`w-5 h-5 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors text-muted-foreground ${!hasChildren ? 'invisible' : ''}`}
                        onClick={(e) => toggleExpand(node.id, e)}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/50 transition-all cursor-pointer mr-1"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <NodeIcon type={nodeType} />
                        <span className={`text-[13px] truncate tracking-tight transition-colors ${isSelected ? 'text-primary font-semibold' : 'text-foreground/80 group-hover:text-foreground'}`}>
                            {node.name}
                        </span>
                    </div>
                </div>
            </div>
        );
    }, [expandedIds, selectedIds, onToggleSelection, toggleExpand]);

    if (!nodes || nodes.length === 0) return null;

    const renderHeight = containerHeight || 800;

    return (
        <div className="flex-1 w-full bg-transparent overflow-hidden" ref={containerRef}>
            <VirtualList
                items={flatNodes}
                itemHeight={32}
                containerHeight={renderHeight}
                renderItem={renderItem}
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
};

export default CatalogTree;
