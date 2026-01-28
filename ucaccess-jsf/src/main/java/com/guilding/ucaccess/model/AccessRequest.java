package com.guilding.ucaccess.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class AccessRequest implements Serializable {
    private String id;
    private String userId;
    private String userName;
    private String objectId;
    private String objectName;
    private String objectType;
    private List<String> permissions = new ArrayList<>();
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED
    private String justification;
    private long timestamp = System.currentTimeMillis();

    public AccessRequest() {
    }

    public AccessRequest(String id, String userId, String userName, String objectId, String objectName,
            String objectType, List<String> permissions, String status, String justification, long timestamp) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.objectId = objectId;
        this.objectName = objectName;
        this.objectType = objectType;
        this.permissions = permissions;
        this.status = status;
        this.justification = justification;
        this.timestamp = timestamp;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getObjectId() {
        return objectId;
    }

    public void setObjectId(String objectId) {
        this.objectId = objectId;
    }

    public String getObjectName() {
        return objectName;
    }

    public void setObjectName(String objectName) {
        this.objectName = objectName;
    }

    public String getObjectType() {
        return objectType;
    }

    public void setObjectType(String objectType) {
        this.objectType = objectType;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
