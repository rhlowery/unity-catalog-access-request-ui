package com.guilding.ucaccess.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.guilding.ucaccess.model.AccessRequest;
import com.guilding.ucaccess.model.StorageConfig;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Named;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@Named
@ApplicationScoped
public class StorageService {
    private static final String APP_DIR = System.getProperty("user.home") + "/.ucaccess";
    private static final String CONFIG_FILE = APP_DIR + "/config.json";
    private static final String REQUESTS_FILE = APP_DIR + "/requests.json";

    private final ObjectMapper mapper = new ObjectMapper();
    private StorageConfig config;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(APP_DIR));
            loadConfig();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public StorageConfig getConfig() {
        if (config == null) {
            loadConfig();
        }
        return config;
    }

    public void saveConfig(StorageConfig newConfig) {
        this.config = newConfig;
        try {
            mapper.writeValue(new File(CONFIG_FILE), config);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void loadConfig() {
        File file = new File(CONFIG_FILE);
        if (file.exists()) {
            try {
                config = mapper.readValue(file, StorageConfig.class);
            } catch (IOException e) {
                config = new StorageConfig();
            }
        } else {
            config = new StorageConfig();
        }
    }

    public List<AccessRequest> fetchRequests() {
        File file = new File(REQUESTS_FILE);
        if (file.exists()) {
            try {
                return mapper.readValue(file,
                        mapper.getTypeFactory().constructCollectionType(List.class, AccessRequest.class));
            } catch (IOException e) {
                return new ArrayList<>();
            }
        }
        return new ArrayList<>();
    }

    public void saveRequests(List<AccessRequest> requests) {
        try {
            mapper.writeValue(new File(REQUESTS_FILE), requests);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
