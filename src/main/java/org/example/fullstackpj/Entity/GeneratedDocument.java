package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.DocumentType;
import org.example.fullstackpj.Entity.enums.GeneratedDocStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "generated_documents")
public class GeneratedDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType documentType;

    private String sourceExcelFile;

    private LocalDateTime generationDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GeneratedDocStatus status;

    private String filePath;

    private String originalFileName;

    private Long fileSize;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User teacher;

    private Long robotRunId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User deletedBy;
}
