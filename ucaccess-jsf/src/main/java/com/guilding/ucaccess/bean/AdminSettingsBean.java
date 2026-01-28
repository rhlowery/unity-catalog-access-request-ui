package com.guilding.ucaccess.bean;

import com.guilding.ucaccess.model.StorageConfig;
import com.guilding.ucaccess.service.StorageService;
import com.guilding.ucaccess.service.UCService;
import jakarta.annotation.PostConstruct;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.faces.view.ViewScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import java.io.Serializable;

@Named
@ViewScoped
public class AdminSettingsBean implements Serializable {

    @Inject
    private StorageService storageService;

    @Inject
    private UCService ucService;

    private StorageConfig config;
    private String activeTab = "STORAGE";

    @PostConstruct
    public void init() {
        config = storageService.getConfig();
    }

    public void save() {
        storageService.saveConfig(config);
        ucService.clearTokenCache();
        FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_INFO, "Success",
                        "Settings saved successfully. Token cache cleared."));
    }

    public StorageConfig getConfig() {
        return config;
    }

    public void setConfig(StorageConfig config) {
        this.config = config;
    }

    public String getActiveTab() {
        return activeTab;
    }

    public void setActiveTab(String activeTab) {
        this.activeTab = activeTab;
    }

    public void setTab(String tab) {
        this.activeTab = tab;
    }
}
