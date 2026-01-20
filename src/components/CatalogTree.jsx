import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Database, Folder, Table, Eye, Brain, ScrollText, HardDrive, Key, Server, Globe } from 'lucide-react';
import './CatalogTree.css';

const NodeIcon = ({ type }) => {
    switch (type) {
        case 'CATALOG': return <Database size={16} className="node-icon icon-catalog" />;
        case 'SCHEMA': return <Folder size={16} className="node-icon icon-schema" />;
        case 'TABLE': return <Table size={16} className="node-icon icon-table" />;
        case 'VIEW': return <Eye size={16} className="node-icon icon-view" />;
        case 'MODEL': return <Brain size={16} className="node-icon icon-model" />;
        case 'FUNCTION': return <ScrollText size={16} className="node-icon icon-function" />;
        case 'VOLUME': return <HardDrive size={16} className="node-icon icon-volume" />;
        case 'LOCATION': return <Globe size={16} className="node-icon icon-location" />;
        case 'CREDENTIAL': return <Key size={16} className="node-icon icon-credential" />;
        case 'COMPUTE': return <Server size={16} className="node-icon icon-compute" />;
        default: return <Folder size={16} className="node-icon" />;
    }
};

const TreeNode = ({ node, selectedIds, toggleSelection }) => {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedIds.has(node.id);

    const handleToggle = (e) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    const handleCheckboxChange = (e) => {
        e.stopPropagation();
        toggleSelection(node.id, node);
    };

    return (
        <div className="tree-node">
            <div className={`node-content ${isSelected ? 'selected' : ''}`} onClick={() => hasChildren && setExpanded(!expanded)}>
                <button className="node-toggle" onClick={handleToggle} style={{ visibility: hasChildren ? 'visible' : 'hidden' }}>
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={handleCheckboxChange}
                    className="node-checkbox"
                    onClick={(e) => e.stopPropagation()}
                />

                <NodeIcon type={node.type} />
                <span className="node-label">{node.name}</span>
            </div>

            {hasChildren && expanded && (
                <div className="node-children animate-fade-in">
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            selectedIds={selectedIds}
                            toggleSelection={toggleSelection}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const CatalogTree = ({ nodes, selectedIds, onToggleSelection }) => {
    return (
        <div className="tree-container">
            {nodes.map(node => (
                <TreeNode
                    key={node.id}
                    node={node}
                    selectedIds={selectedIds}
                    toggleSelection={onToggleSelection}
                />
            ))}
        </div>
    );
};

export default CatalogTree;
