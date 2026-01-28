package com.guilding.ucaccess.model;

import java.util.ArrayList;
import java.util.List;

public class CatalogNode {
    private String id;
    private String name;
    private String type; // CATALOG, SCHEMA, TABLE, VIEW
    private String parentId;
    private List<String> owners = new ArrayList<>();
    private List<CatalogNode> children = new ArrayList<>();

    public CatalogNode() {
    }

    public CatalogNode(String id, String name, String type) {
        this.id = id;
        this.name = name;
        this.type = type;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public List<String> getOwners() {
        return owners;
    }

    public void setOwners(List<String> owners) {
        this.owners = owners;
    }

    public List<CatalogNode> getChildren() {
        return children;
    }

    public void setChildren(List<CatalogNode> children) {
        this.children = children;
    }
}
