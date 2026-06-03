package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.FileType;
import org.example.fullstackpj.Entity.enums.Semester;
import org.example.fullstackpj.Entity.enums.TemplateCategory;
import org.example.fullstackpj.Entity.enums.TemplateStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "templates")
public class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String version;
    private String description;
    private String filePath;

    // legacy field kept for migration — use status instead
    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastUpdateDate;

    private String academicYear;

    @Enumerated(EnumType.STRING)
    private Semester semester;

    @Enumerated(EnumType.STRING)
    private FileType fileType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'ACTIVE'")
    private TemplateStatus status = TemplateStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    private TemplateCategory templateCategory;

    @Column(columnDefinition = "bigint default 0")
    private Long downloadCount = 0L;

    @ManyToOne
    @JoinColumn(name = "uploaded_by_user_id")
    @JsonIgnore
    private User uploadedBy;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        lastUpdateDate = LocalDateTime.now();
        if (downloadCount == null) downloadCount = 0L;
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdateDate = LocalDateTime.now();
    }
}
