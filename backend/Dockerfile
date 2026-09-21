# ===========================================================================
#  Opsly Backend — multi-stage Dockerfile
#  Target: Render (https://render.com)
#  Build:  Maven + JDK 17  ->  slim JRE runtime
#  Deploy: Spring Boot fat jar, production profile
# ===========================================================================

# ---- Stage 1: Build with Maven + JDK 17 -----------------------------------
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /build

# Cache dependencies first: copy pom.xml and download deps
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Copy source and build the jar (skip tests for faster image builds)
COPY src src
RUN mvn -B -DskipTests package

# ---- Stage 2: Minimal runtime with JRE 17 ---------------------------------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the Spring Boot jar from the build stage
COPY --from=build /build/target/opsly-backend-*.jar app.jar

# Render sets the PORT env var; Spring Boot reads it via server.port=${PORT:8082}
# Default to port 8082 if PORT is not set (e.g. local `docker run`)
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=8082

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
