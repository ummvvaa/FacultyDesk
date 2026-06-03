package org.example.fullstackpj.Service;

import jakarta.persistence.criteria.Predicate;
import org.example.fullstackpj.Dto.PublicationDto;
import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.PublicationFile;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.PubFileType;
import org.example.fullstackpj.Entity.enums.PublicationStatus;
import org.example.fullstackpj.Entity.enums.Quartile;
import org.example.fullstackpj.Repository.PublicationFileRepository;
import org.example.fullstackpj.Repository.PublicationRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PublicationService {

    private static final String PUBLICATIONS_DIR = "src/main/resources/static/publications";

    private final PublicationRepository publicationRepository;
    private final PublicationFileRepository publicationFileRepository;
    private final NotificationService notificationService;

    public PublicationService(PublicationRepository publicationRepository,
                              PublicationFileRepository publicationFileRepository,
                              NotificationService notificationService) {
        this.publicationRepository = publicationRepository;
        this.publicationFileRepository = publicationFileRepository;
        this.notificationService = notificationService;
    }

    public List<Publication> getMyPublications(User user) {
        return publicationRepository.findByAuthorOrderByPublicationYearDesc(user);
    }

    public List<Publication> getByUserId(Long userId, User currentUser) {
        List<Publication> all = publicationRepository.findByAuthorOrderByPublicationYearDesc(
                userRef(userId));
        if (isAdmin(currentUser)) {
            return all;
        }
        return all.stream()
                .filter(p -> p.getStatus() == PublicationStatus.VERIFIED)
                .toList();
    }

    public Page<Publication> getAllForAdmin(DatabaseType databaseType, PublicationStatus status,
            Integer year, Quartile quartile, Long authorId, Pageable pageable) {
        Specification<Publication> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (databaseType != null) {
                predicates.add(cb.equal(root.get("databaseType"), databaseType));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (year != null) {
                predicates.add(cb.equal(root.get("publicationYear"), year));
            }
            if (quartile != null) {
                predicates.add(cb.equal(root.get("quartile"), quartile));
            }
            if (authorId != null) {
                predicates.add(cb.equal(root.get("author").get("id"), authorId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return publicationRepository.findAll(spec, pageable);
    }

    public Publication getById(Long id, User currentUser) {
        Publication pub = findById(id);
        if (!isAdmin(currentUser) && !pub.getAuthor().getId().equals(currentUser.getId())) {
            if (pub.getStatus() != PublicationStatus.VERIFIED) {
                throw new RuntimeException("Access denied");
            }
        }
        return pub;
    }

    @Transactional
    public Publication create(PublicationDto dto, User author) {
        Publication pub = new Publication();
        applyDto(pub, dto);
        pub.setAuthor(author);
        pub.setStatus(PublicationStatus.DRAFT);
        pub.setQuartile(dto.getQuartile() != null ? dto.getQuartile() : Quartile.NONE);
        pub.setCreatedAt(LocalDateTime.now());
        pub.setUpdatedAt(LocalDateTime.now());
        return publicationRepository.save(pub);
    }

    @Transactional
    public Publication update(Long id, PublicationDto dto, User currentUser) {
        Publication pub = findById(id);
        requireOwnerOrAdmin(pub, currentUser);
        if (pub.getStatus() == PublicationStatus.VERIFIED) {
            throw new RuntimeException("Cannot edit a verified publication");
        }
        applyDto(pub, dto);
        if (pub.getStatus() == PublicationStatus.REJECTED
                || pub.getStatus() == PublicationStatus.NEEDS_CORRECTION) {
            pub.setStatus(PublicationStatus.SUBMITTED);
        }
        pub.setUpdatedAt(LocalDateTime.now());
        return publicationRepository.save(pub);
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        Publication pub = findById(id);
        if (!isAdmin(currentUser)) {
            requireOwner(pub, currentUser);
            if (pub.getStatus() == PublicationStatus.VERIFIED) {
                throw new RuntimeException("Cannot delete a verified publication");
            }
        }
        deleteAllFiles(pub);
        publicationRepository.delete(pub);
    }

    @Transactional
    public Publication submitForReview(Long id, User currentUser) {
        Publication pub = findById(id);
        requireOwner(pub, currentUser);
        pub.setStatus(PublicationStatus.SUBMITTED);
        pub.setUpdatedAt(LocalDateTime.now());
        return publicationRepository.save(pub);
    }

    @Transactional
    public Publication verify(Long id, User admin, String comment) {
        Publication pub = findById(id);
        pub.setStatus(PublicationStatus.VERIFIED);
        pub.setReviewerComment(comment);
        pub.setReviewedBy(admin);
        pub.setReviewedAt(LocalDateTime.now());
        pub.setUpdatedAt(LocalDateTime.now());
        Publication saved = publicationRepository.save(pub);
        notificationService.createPublicationNotification(pub.getAuthor(), saved, "PUBLICATION_VERIFIED");
        return saved;
    }

    @Transactional
    public Publication reject(Long id, User admin, String comment) {
        Publication pub = findById(id);
        pub.setStatus(PublicationStatus.REJECTED);
        pub.setReviewerComment(comment);
        pub.setReviewedBy(admin);
        pub.setReviewedAt(LocalDateTime.now());
        pub.setUpdatedAt(LocalDateTime.now());
        Publication saved = publicationRepository.save(pub);
        notificationService.createPublicationNotification(pub.getAuthor(), saved, "PUBLICATION_REJECTED");
        return saved;
    }

    @Transactional
    public Publication needsCorrection(Long id, User admin, String comment) {
        Publication pub = findById(id);
        pub.setStatus(PublicationStatus.NEEDS_CORRECTION);
        pub.setReviewerComment(comment);
        pub.setReviewedBy(admin);
        pub.setReviewedAt(LocalDateTime.now());
        pub.setUpdatedAt(LocalDateTime.now());
        Publication saved = publicationRepository.save(pub);
        notificationService.createPublicationNotification(pub.getAuthor(), saved, "PUBLICATION_NEEDS_CORRECTION");
        return saved;
    }

    @Transactional
    public PublicationFile addFile(Long pubId, MultipartFile file, PubFileType fileType, User currentUser)
            throws IOException {
        Publication pub = findById(pubId);
        requireOwner(pub, currentUser);

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new RuntimeException("File name is empty");
        }

        Path dir = Paths.get(PUBLICATIONS_DIR,
                String.valueOf(currentUser.getId()),
                String.valueOf(pubId)).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        String storedName = UUID.randomUUID() + "_" + originalName;
        Path dest = dir.resolve(storedName).normalize();
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        PublicationFile pf = new PublicationFile();
        pf.setPublication(pub);
        pf.setFilePath(currentUser.getId() + "/" + pubId + "/" + storedName);
        pf.setOriginalName(originalName);
        pf.setFileSize(file.getSize());
        pf.setFileType(fileType);
        pf.setUploadedAt(LocalDateTime.now());
        return publicationFileRepository.save(pf);
    }

    public List<PublicationFile> getFiles(Long pubId, User currentUser) {
        Publication pub = findById(pubId);
        if (!isAdmin(currentUser) && !pub.getAuthor().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }
        return publicationFileRepository.findByPublication(pub);
    }

    @Transactional
    public Resource downloadFile(Long fileId, User currentUser) throws IOException {
        PublicationFile pf = findFileById(fileId);
        Publication pub = pf.getPublication();
        if (!isAdmin(currentUser) && !pub.getAuthor().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }
        Path filePath = Paths.get(PUBLICATIONS_DIR).toAbsolutePath().normalize()
                .resolve(pf.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("File not found: " + pf.getFilePath());
        }
        return resource;
    }

    @Transactional
    public void deleteFile(Long fileId, User currentUser) throws IOException {
        PublicationFile pf = findFileById(fileId);
        Publication pub = pf.getPublication();
        if (!isAdmin(currentUser) && !pub.getAuthor().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }
        Path filePath = Paths.get(PUBLICATIONS_DIR).toAbsolutePath().normalize()
                .resolve(pf.getFilePath());
        Files.deleteIfExists(filePath);
        publicationFileRepository.delete(pf);
    }

    // — KKK helpers (used by Phase 5)
    public long countByAuthorSince(User author, Integer year) {
        return publicationRepository.countByAuthorAndPublicationYearGreaterThanEqual(author, year);
    }

    public List<Publication> getByAuthorSince(User author, Integer year) {
        return publicationRepository.findByAuthorAndPublicationYearGreaterThanEqual(author, year);
    }

    public long countByAuthorAndDatabase(User author, DatabaseType databaseType) {
        return publicationRepository.countByAuthorAndDatabaseType(author, databaseType);
    }

    // — private helpers

    private void applyDto(Publication pub, PublicationDto dto) {
        pub.setTitle(dto.getTitle());
        pub.setAuthors(dto.getAuthors());
        pub.setPublicationYear(dto.getPublicationYear());
        pub.setJournalName(dto.getJournalName());
        pub.setPublicationType(dto.getPublicationType());
        pub.setDatabaseType(dto.getDatabaseType());
        pub.setDoi(dto.getDoi());
        pub.setUrl(dto.getUrl());
        pub.setQuartile(dto.getQuartile() != null ? dto.getQuartile() : Quartile.NONE);
        pub.setPercentile(dto.getPercentile());
        pub.setIndexingStatus(dto.getIndexingStatus());
    }

    private void deleteAllFiles(Publication pub) {
        List<PublicationFile> files = publicationFileRepository.findByPublication(pub);
        for (PublicationFile pf : files) {
            try {
                Path fp = Paths.get(PUBLICATIONS_DIR).toAbsolutePath().normalize()
                        .resolve(pf.getFilePath());
                Files.deleteIfExists(fp);
            } catch (IOException ignored) {
            }
        }
    }

    private Publication findById(Long id) {
        return publicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Publication not found: " + id));
    }

    private PublicationFile findFileById(Long id) {
        return publicationFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PublicationFile not found: " + id));
    }

    private User userRef(Long userId) {
        User u = new User();
        u.setId(userId);
        return u;
    }

    private boolean isAdmin(User user) {
        return "ROLE_ADMIN".equals(user.getRole());
    }

    private void requireOwner(Publication pub, User user) {
        if (!pub.getAuthor().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
    }

    private void requireOwnerOrAdmin(Publication pub, User user) {
        if (!isAdmin(user) && !pub.getAuthor().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
    }
}
