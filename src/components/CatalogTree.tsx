import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Database, Folder, Table, Eye, Brain, Box, Server, ScrollText, HardDrive, Globe, Key, ChevronDown, ChevronRight } from 'lucide-react';
import { VirtualList } from './VirtualList';
import './CatalogTree.css';

export const NodeIcon = ({ type }: { type?: string }) => {
    const iconType = type || 'TABLE';
    switch (iconType) {
        case 'CATALOG': return <Folder size={16} className="node-icon icon-catalog" />;
        case 'SCHEMA': return <Database size={16} className="node-icon icon-schema" />;
        case 'TABLE': return <Table size={16} className="node-icon icon-table" />;
        case 'VIEW': return <Eye size={16} className="node-icon icon-view" />;
        case 'MODEL': return <Brain size={16} className="node-icon icon-model" />;
        case 'FUNCTION': return <ScrollText size={16} className="node-icon icon-function" />;
        case 'VOLUME': return <HardDrive size={16} className="node-icon icon-volume" />;
        case 'LOCATION': return <Globe size={16} className="node-icon icon-location" />;
        case 'CREDENTIAL': return <Key size={16} className="node-icon icon-credential" />;
        case 'COMPUTE': return <Server size={16} className="node-icon icon-compute" />;
        default: return <Table size={16} className="node-icon" />;
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
        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                setContainerHeight(entries[0].contentRect.height);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
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
            <div className="tree-node" style={{ paddingLeft: `${depth * 24}px` }} onClick={handleRowClick}>
                <div className={`node-content ${isSelected ? 'selected' : ''}`}>
                    <button
                        className="node-toggle"
                        onClick={(e) => toggleExpand(node.id, e)}
                        style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleCheckboxChange}
                        className="node-checkbox"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <NodeIcon type={nodeType} />
                    <span className="node-label">{node.name}</span>
                </div>
            </div>
        );
    }, [expandedIds, selectedIds, onToggleSelection, toggleExpand]);

    if (!nodes || nodes.length === 0) return null;

    const renderHeight = Math.max(containerHeight, 400);

    return (
        <div className="tree-container" ref={containerRef} style={{ height: '100%', overflow: 'hidden' }}>
            <VirtualList
                items={flatNodes}
                itemHeight={28}
                containerHeight={renderHeight}
                renderItem={renderItem}
            />
        </div>
    );
};

export default CatalogTree;
