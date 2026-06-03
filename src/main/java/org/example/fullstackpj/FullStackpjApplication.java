package org.example.fullstackpj;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FullStackpjApplication {

    public static void main(String[] args) {
        SpringApplication.run(FullStackpjApplication.class, args);
    }

}
