package com.guilding.ucaccess.model;

public class StorageConfig {
    private String type = "LOCAL"; // LOCAL, RDBMS, GIT, MOCK
    private String path = System.getProperty("user.home") + "/.ucaccess";
    private String ucAuthType = "MOCK"; // MOCK, WORKSPACE, ACCOUNT
    private String ucClientId;
    private String ucClientSecret;
    private String ucHost;
    private String ucAccountId;
    private String idpType = "SAML"; // SAML, OIDC
    private String vaultType = "LOCAL"; // LOCAL, HASHICORP, AZURE_KEY_VAULT

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getUcAuthType() {
        return ucAuthType;
    }

    public void setUcAuthType(String ucAuthType) {
        this.ucAuthType = ucAuthType;
    }

    public String getUcClientId() {
        return ucClientId;
    }

    public void setUcClientId(String ucClientId) {
        this.ucClientId = ucClientId;
    }

    public String getUcClientSecret() {
        return ucClientSecret;
    }

    public void setUcClientSecret(String ucClientSecret) {
        this.ucClientSecret = ucClientSecret;
    }

    public String getUcHost() {
        return ucHost;
    }

    public void setUcHost(String ucHost) {
        this.ucHost = ucHost;
    }

    public String getUcAccountId() {
        return ucAccountId;
    }

    public void setUcAccountId(String ucAccountId) {
        this.ucAccountId = ucAccountId;
    }

    public String getIdpType() {
        return idpType;
    }

    public void setIdpType(String idpType) {
        this.idpType = idpType;
    }

    public String getVaultType() {
        return vaultType;
    }

    public void setVaultType(String vaultType) {
        this.vaultType = vaultType;
    }
}
