package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "friendships")
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "requester_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories"})
    private User requester; // Тот, кто отправил заявку

    @ManyToOne
    @JoinColumn(name = "addressee_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories"})
    private User addressee; // Тот, кому отправили заявку

    private String status = "PENDING"; // PENDING, ACCEPTED, REJECTED
    private LocalDateTime createdAt;
}

