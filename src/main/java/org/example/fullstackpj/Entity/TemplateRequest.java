package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.RequestStatus;
import org.example.fullstackpj.Entity.enums.TemplateCategory;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "template_requests")
public class TemplateRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id", nullable = false)
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "notifications", "hibernateLazyInitializer"})
    private User requestedBy;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private TemplateCategory suggestedCategory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(32) default 'PENDING'")
    private RequestStatus status = RequestStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String adminResponse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responded_by_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "notifications", "hibernateLazyInitializer"})
    private User respondedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_template_id")
    @JsonIgnoreProperties({"uploadedBy"})
    private Template createdTemplate;

    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = RequestStatus.PENDING;
    }
}
