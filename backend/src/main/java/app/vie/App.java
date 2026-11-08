package app.vie;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class App {
    public static void main(String[] args) {
        // Heures et dates (dernière activité, échéances du jour…) en heure du Luxembourg, même sur un serveur en UTC
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Europe/Luxembourg"));
        SpringApplication.run(App.class, args);
    }
}
