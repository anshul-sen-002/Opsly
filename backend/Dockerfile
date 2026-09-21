# ===========================================================================
# Opsly Backend — multi-stage Dockerfile
# Target: Render
# Build: Maven + JDK 17 -> slim JRE runtime
# ===========================================================================

# ---- Stage 1: Build with Maven + JDK 17 -----------------------------------
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /build

# Copy Maven configuration first for Docker layer caching
COPY pom.xml .

# Copy source and build the jar
COPY src src

# Build the jar without running tests
RUN mvn -B -DskipTests package

# ---- Stage 2: Minimal runtime with JRE 17 -------------------------------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /build/target/opsly-backend-*.jar app.jar

# Render sets PORT; Spring Boot uses server.port=${PORT:8082}
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=8082

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/app/app.jar"]