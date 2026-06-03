package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String content;
    private LocalDateTime createdAt;
    private boolean read = false;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories"})
    private User sender;

    @ManyToOne
    @JoinColumn(name = "receiver_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories"})
    private User receiver;
}

