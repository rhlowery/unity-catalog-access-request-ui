# Use the official Payara Micro image
FROM payara/micro:6.2023.10-jdk17

# Copy the application WAR file to the deployment folder
COPY target/ucaccess.war ${DEPLOY_DIR}

# Expose the default Payara Micro port
EXPOSE 8080

# The default entrypoint for the payara/micro image is:
# ENTRYPOINT ["java", "-jar", "/opt/payara/payara-micro.jar", "--deploymentDir", "/opt/payara/deployments"]
# We can add additional options if needed, but the default is usually sufficient for simple WAR deployments.
