import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Database, Folder, Table, Eye, Brain, Box, Server, ScrollText, HardDrive, Globe, Key, ChevronDown, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { VirtualList } from './VirtualList';
import { Input } from './ui/input';

export const NodeIcon = ({ type, isLoading }: { type?: string; isLoading?: boolean }) => {
    if (isLoading) return <Loader2 size={16} className="text-primary animate-spin" />;

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

const CatalogTree = ({
    nodes = [],
    selectedIds,
    onToggleSelection,
    hideCheckboxes = false,
    onSelectNode,
    onExpand,
    onSearch
}: any) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
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

    const toggleExpand = useCallback(async (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const id = node.id;

        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                return next;
            } else {
                next.add(id);
                return next;
            }
        });

        // Trigger lazy loading if expanding and no children yet
        if (!expandedIds.has(id) && (!node.children || node.children.length === 0) && node.hasChildren && onExpand) {
            setLoadingIds(prev => new Set(prev).add(id));
            try {
                await onExpand(node);
            } finally {
                setLoadingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }
    }, [expandedIds, onExpand]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (onSearch) onSearch(query);
    };

    const renderItem = useCallback((flatNode: FlatNode, index: number) => {
        const { node, depth } = flatNode;
        const hasChildren = node.hasChildren || (node.children && node.children.length > 0);
        const isSelected = selectedIds.has(node.id);
        const nodeType = node.type || 'TABLE';
        const isExpanded = expandedIds.has(node.id);
        const isLoading = loadingIds.has(node.id);

        const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.stopPropagation();
            if (onToggleSelection) onToggleSelection(node.id, node);
        };

        const handleRowClick = (e: React.MouseEvent) => {
            if (onSelectNode) {
                onSelectNode(node);
            } else if (hasChildren) {
                toggleExpand(node, e);
            } else {
                if (onToggleSelection) onToggleSelection(node.id, node);
            }
        };

        return (
            <div
                className={`group flex items-center h-8 px-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.03] ${isSelected ? 'bg-primary/20' : ''}`}
                style={{ paddingLeft: `${(depth * 16) + 16}px` }}
                onClick={handleRowClick}
            >
                <div className="flex items-center gap-2 w-full">
                    <button
                        className={`w-5 h-5 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors text-muted-foreground ${!hasChildren ? 'invisible' : ''}`}
                        onClick={(e) => toggleExpand(node, e)}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {!hideCheckboxes && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={handleCheckboxChange}
                            className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/50 transition-all cursor-pointer mr-1"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <NodeIcon type={nodeType} isLoading={isLoading} />
                        <span className={`text-[13px] truncate tracking-tight transition-colors ${isSelected ? 'text-primary font-semibold' : 'text-foreground/80 group-hover:text-foreground'}`}>
                            {node.name}
                        </span>
                    </div>
                </div>
            </div>
        );
    }, [expandedIds, loadingIds, selectedIds, onToggleSelection, toggleExpand]);

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            <div className="px-4 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                        placeholder="Search catalog..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="h-8 pl-8 pr-8 bg-white/[0.03] border-white/10 text-xs focus:ring-primary/40 rounded-lg w-full"
                    />
                    {searchQuery && (
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => { setSearchQuery(''); if (onSearch) onSearch(''); }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full overflow-hidden" ref={containerRef}>
                {(!nodes || nodes.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 px-8 text-center gap-3">
                        <Box size={32} />
                        <span className="text-xs uppercase tracking-widest font-bold">No Objects Found</span>
                    </div>
                ) : (
                    <VirtualList
                        items={flatNodes}
                        itemHeight={32}
                        containerHeight={containerHeight || 800}
                        renderItem={renderItem}
                        style={{ height: '100%', width: '100%' }}
                    />
                )}
            </div>
        </div>
    );
};

export default CatalogTree;
