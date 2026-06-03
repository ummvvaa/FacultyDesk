package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.PublicationStatus;
import org.example.fullstackpj.Entity.enums.PublicationType;
import org.example.fullstackpj.Entity.enums.Quartile;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "publications")
public class Publication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String authors;

    private Integer publicationYear;

    private String journalName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PublicationType publicationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DatabaseType databaseType;

    @Column(length = 255)
    private String doi;

    @Column(length = 500)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'NONE'")
    private Quartile quartile = Quartile.NONE;

    private Integer percentile;

    private String indexingStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'DRAFT'")
    private PublicationStatus status = PublicationStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String reviewerComment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User reviewedBy;

    private LocalDateTime reviewedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
