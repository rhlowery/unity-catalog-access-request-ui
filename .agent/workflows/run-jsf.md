---
description: Build and Run the JSF application using Payara Micro
---

// turbo-all
This workflow builds the `ucaccess-jsf` project and starts it using the Payara Micro Maven plugin.

1.  Compile and Package the application:
    ```bash
    mvn clean package -f /Users/loweryr/git/gitlab.guilding.com/ucaccess/ucaccess-jsf/pom.xml
    ```

2.  Start the Payara Micro server:
    ```bash
    mvn payara-micro:start -f /Users/loweryr/git/gitlab.guilding.com/ucaccess/ucaccess-jsf/pom.xml
    ```

The application will be available at `http://localhost:8080/ucaccess`.
