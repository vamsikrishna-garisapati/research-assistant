# -------- Build Stage --------
FROM maven:3.9.6-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy project files
COPY pom.xml .
COPY src ./src

# Build JAR (skip tests)
RUN mvn clean install -DskipTests

# -------- Runtime Stage --------
FROM eclipse-temurin:21-jdk

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /app/target/research-assistant-0.0.1-SNAPSHOT.jar app.jar

# Set default environment variable (Render will override it)
ENV GEMINI_KEY=""

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
