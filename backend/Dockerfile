# Build puis exécution (utilisé par Render / Railway / Fly.io…)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseSerialGC", "-Xmx320m", "-Xss512k", "-XX:MaxMetaspaceSize=128m", "-Dspring.main.lazy-initialization=true", "-jar", "app.jar"]
