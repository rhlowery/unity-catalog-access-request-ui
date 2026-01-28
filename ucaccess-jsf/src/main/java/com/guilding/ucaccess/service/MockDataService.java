package com.guilding.ucaccess.service;

import com.guilding.ucaccess.model.CatalogNode;
import com.guilding.ucaccess.model.Identity;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@ApplicationScoped
public class MockDataService {

    public List<CatalogNode> getMockCatalogs() {
        List<CatalogNode> catalogs = new ArrayList<>();

        CatalogNode main = new CatalogNode("cat_main", "main_catalog", "CATALOG");
        CatalogNode finance = new CatalogNode("sch_finance", "finance", "SCHEMA");
        finance.setParentId("cat_main");

        finance.getChildren().add(new CatalogNode("tbl_transactions", "transactions", "TABLE"));
        finance.getChildren().add(new CatalogNode("tbl_budget", "budget", "TABLE"));

        main.getChildren().add(finance);
        catalogs.add(main);

        return catalogs;
    }

    public List<Identity> getMockIdentities() {
        return Arrays.asList(
                new Identity("user_alice", "Alice Admin", "alice@example.com", "USER"),
                new Identity("user_bob", "Bob Buyer", "bob@example.com", "USER"),
                new Identity("group_finance", "Finance Team", null, "GROUP"));
    }
}
