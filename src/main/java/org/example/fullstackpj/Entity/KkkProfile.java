package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.KkkStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "kkk_profiles")
public class KkkProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", unique = true, nullable = false)
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User teacher;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(255) default 'NOT_STARTED'")
    private KkkStatus status = KkkStatus.NOT_STARTED;

    private LocalDateTime submittedAt;
    private LocalDateTime checkedAt;

    @Column(columnDefinition = "TEXT")
    private String reviewerComment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User reviewedBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Column(columnDefinition = "integer default 0")
    private Integer completionPercentage = 0;
}
