package com.guilding.ucaccess.bean;

import com.guilding.ucaccess.model.AccessRequest;
import com.guilding.ucaccess.model.CatalogNode;
import com.guilding.ucaccess.service.MockDataService;
import com.guilding.ucaccess.service.StorageService;
import com.guilding.ucaccess.service.UCService;
import jakarta.annotation.PostConstruct;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.faces.view.ViewScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Named
@ViewScoped
public class DashboardBean implements Serializable {

    @Inject
    private StorageService storageService;

    @Inject
    private MockDataService mockDataService;

    @Inject
    private UCService ucService;

    private List<CatalogNode> catalogs = new ArrayList<>();
    private List<AccessRequest> requests = new ArrayList<>();
    private String selectedWorkspaceId;

    private List<CatalogNode> selectedNodes = new ArrayList<>();
    private List<String> selectedPermissions = new ArrayList<>();
    private String justification;
    private String viewMode = "REQUESTER"; // REQUESTER, APPROVER

    @PostConstruct
    public void init() {
        refreshData();
    }

    public void refreshData() {
        var config = storageService.getConfig();
        if ("MOCK".equals(config.getUcAuthType())) {
            catalogs = mockDataService.getMockCatalogs();
        } else {
            try {
                // Determine workspace URL - for simplicity using ucHost as the workspace URL if
                // present
                String workspaceUrl = config.getUcHost();
                if (workspaceUrl != null && !workspaceUrl.isEmpty()) {
                    if (!workspaceUrl.startsWith("http")) {
                        workspaceUrl = "https://" + workspaceUrl;
                    }
                    catalogs = ucService.fetchCatalogs(workspaceUrl);
                } else {
                    addMessage(FacesMessage.SEVERITY_WARN, "Config Missing",
                            "Workspace URL (UC Host) is not configured.");
                    catalogs = new ArrayList<>();
                }
            } catch (Exception e) {
                addMessage(FacesMessage.SEVERITY_ERROR, "Sync Error", e.getMessage());
                catalogs = new ArrayList<>();
            }
        }
        requests = storageService.fetchRequests();
    }

    public void submitRequest() {
        if (selectedNodes.isEmpty()) {
            addMessage(FacesMessage.SEVERITY_WARN, "Selection Required", "Please select at least one data object.");
            return;
        }

        for (CatalogNode node : selectedNodes) {
            AccessRequest req = new AccessRequest();
            req.setId("REQ-" + System.currentTimeMillis());
            req.setUserId("user_current"); // Placeholder for actual logged-in user
            req.setUserName("Current User");
            req.setObjectId(node.getId());
            req.setObjectName(node.getName());
            req.setObjectType(node.getType());
            req.setPermissions(new ArrayList<>(selectedPermissions));
            req.setJustification(justification);
            req.setStatus("PENDING");
            req.setTimestamp(System.currentTimeMillis());

            requests.add(0, req);
        }

        storageService.saveRequests(requests);
        addMessage(FacesMessage.SEVERITY_INFO, "Request Submitted", "Your access request has been sent for approval.");

        // Reset form
        selectedNodes.clear();
        selectedPermissions.clear();
        justification = "";
    }

    public void approveRequest(AccessRequest req) {
        req.setStatus("APPROVED");
        storageService.saveRequests(requests);
        addMessage(FacesMessage.SEVERITY_INFO, "Approved", "Request " + req.getId() + " approved.");
    }

    public void rejectRequest(AccessRequest req) {
        req.setStatus("REJECTED");
        storageService.saveRequests(requests);
        addMessage(FacesMessage.SEVERITY_INFO, "Rejected", "Request " + req.getId() + " rejected.");
    }

    private void addMessage(FacesMessage.Severity severity, String summary, String detail) {
        FacesContext.getCurrentInstance().addMessage(null, new FacesMessage(severity, summary, detail));
    }

    public long getPendingCount() {
        return requests.stream().filter(r -> "PENDING".equals(r.getStatus())).count();
    }

    // Getters and Seters
    public List<CatalogNode> getCatalogs() {
        return catalogs;
    }

    public void setCatalogs(List<CatalogNode> catalogs) {
        this.catalogs = catalogs;
    }

    public List<AccessRequest> getRequests() {
        return requests;
    }

    public void setRequests(List<AccessRequest> requests) {
        this.requests = requests;
    }

    public String getSelectedWorkspaceId() {
        return selectedWorkspaceId;
    }

    public void setSelectedWorkspaceId(String selectedWorkspaceId) {
        this.selectedWorkspaceId = selectedWorkspaceId;
    }

    public List<CatalogNode> getSelectedNodes() {
        return selectedNodes;
    }

    public void setSelectedNodes(List<CatalogNode> selectedNodes) {
        this.selectedNodes = selectedNodes;
    }

    public List<String> getSelectedPermissions() {
        return selectedPermissions;
    }

    public void setSelectedPermissions(List<String> selectedPermissions) {
        this.selectedPermissions = selectedPermissions;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public String getViewMode() {
        return viewMode;
    }

    public void setViewMode(String viewMode) {
        this.viewMode = viewMode;
    }
}
