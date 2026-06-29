# Use an official OpenJDK runtime as a parent image
FROM openjdk:17-jdk-slim

# Set the working directory to /app
WORKDIR /app

# Copy the mvnw and pom.xml first to cache dependencies
COPY backend/mvnw .
COPY backend/.mvn .mvn
COPY backend/pom.xml .

# Grant execute permission to the wrapper
RUN chmod +x mvnw
# Download dependencies (this caches the layer)
RUN ./mvnw dependency:go-offline

# Copy the rest of the source code
COPY backend/src src

# Build the application
RUN ./mvnw clean package -DskipTests

# Expose the port the app runs on
EXPOSE 8080

# Run the jar file
ENTRYPOINT ["java", "-jar", "target/*.jar"]