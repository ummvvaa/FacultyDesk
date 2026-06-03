package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.PasswordResetStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "password_reset_requests")
public class PasswordResetRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "notifications"})
    private User user;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(32) default 'PENDING'")
    private PasswordResetStatus status = PasswordResetStatus.PENDING;

    private LocalDateTime createdAt;

    private LocalDateTime processedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "notifications"})
    private User processedBy;

    @Column(columnDefinition = "TEXT")
    private String adminNote;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = PasswordResetStatus.PENDING;
    }
}
