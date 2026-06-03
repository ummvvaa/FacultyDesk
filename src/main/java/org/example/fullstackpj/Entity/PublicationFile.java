package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.PubFileType;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "publication_files")
public class PublicationFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publication_id", nullable = false)
    @JsonIgnoreProperties({"author", "reviewedBy", "hibernateLazyInitializer"})
    private Publication publication;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private String originalName;

    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PubFileType fileType;

    private LocalDateTime uploadedAt;
}
