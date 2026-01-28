package com.guilding.ucaccess.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.guilding.ucaccess.model.CatalogNode;
import com.guilding.ucaccess.model.Identity;
import com.guilding.ucaccess.model.StorageConfig;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class UCService {

    @Inject
    private StorageService storageService;

    private final HttpClient httpClient = HttpClient.newBuilder().build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final ConcurrentHashMap<String, String> tokenCache = new ConcurrentHashMap<>();

    public String getM2MToken() throws IOException, InterruptedException {
        StorageConfig config = storageService.getConfig();
        String cacheKey = config.getUcClientId() + ":" + config.getUcHost();

        if (tokenCache.containsKey(cacheKey)) {
            return tokenCache.get(cacheKey);
        }

        String host = config.getUcHost();
        if (host == null || host.isEmpty())
            host = "accounts.cloud.databricks.com";
        String baseUrl = host.startsWith("http") ? host : "https://" + host;
        String tokenUrl = baseUrl + "/oidc/v1/token";

        if (config.getUcClientId() == null || config.getUcClientId().isEmpty() ||
                config.getUcClientSecret() == null || config.getUcClientSecret().isEmpty()) {
            throw new IOException("M2M Credentials (Client ID/Secret) are missing in settings.");
        }

        String form = "grant_type=client_credentials&client_id=" + config.getUcClientId() +
                "&client_secret=" + config.getUcClientSecret() + "&scope=all-apis";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            JsonNode node = mapper.readTree(response.body());
            String token = node.get("access_token").asText();
            tokenCache.put(cacheKey, token);
            return token;
        } else {
            System.err.println("M2M Token Error (" + response.statusCode() + "): " + response.body());
            throw new IOException("Failed to get token (HTTP " + response.statusCode() + "): " + response.body());
        }
    }

    public void clearTokenCache() {
        tokenCache.clear();
    }

    public List<CatalogNode> fetchCatalogs(String workspaceUrl) throws IOException, InterruptedException {
        String token = getM2MToken();
        String url = workspaceUrl + "/api/2.1/unity-catalog/catalogs";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        List<CatalogNode> nodes = new ArrayList<>();
        if (response.statusCode() == 200) {
            JsonNode root = mapper.readTree(response.body());
            JsonNode catalogs = root.get("catalogs");
            if (catalogs != null && catalogs.isArray()) {
                for (JsonNode cat : catalogs) {
                    nodes.add(new CatalogNode(cat.get("name").asText(), cat.get("name").asText(), "CATALOG"));
                }
            }
        }
        return nodes;
    }

    // Additional methods for identities and workspaces would follow a similar
    // pattern
}
