package org.example.fullstackpj.Service;

import jakarta.persistence.criteria.Predicate;
import org.example.fullstackpj.Entity.GeneratedDocument;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DocumentType;
import org.example.fullstackpj.Entity.enums.GeneratedDocStatus;
import org.example.fullstackpj.Repository.GeneratedDocumentRepository;
import org.example.fullstackpj.Repository.RobotRunRepository;
import org.example.fullstackpj.Repository.UserRepository;
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
public class GeneratedDocumentService {

    private static final String GENERATED_DIR = "src/main/resources/static/generated";

    private final GeneratedDocumentRepository generatedDocumentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RobotRunRepository robotRunRepository;

    public GeneratedDocumentService(GeneratedDocumentRepository generatedDocumentRepository,
                                    UserRepository userRepository,
                                    NotificationService notificationService,
                                    RobotRunRepository robotRunRepository) {
        this.generatedDocumentRepository = generatedDocumentRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.robotRunRepository = robotRunRepository;
    }

    public List<GeneratedDocument> getMyDocuments(User user) {
        return generatedDocumentRepository.findByTeacherAndStatusNotOrderByGenerationDateDesc(user, GeneratedDocStatus.DELETED);
    }

    @Transactional(readOnly = true)
    public Page<GeneratedDocument> getAllForAdmin(Long teacherId, DocumentType type,
            LocalDateTime dateFrom, LocalDateTime dateTo, String sourceExcel,
            GeneratedDocStatus status, Pageable pageable) {
        Specification<GeneratedDocument> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (teacherId != null) {
                predicates.add(cb.equal(root.get("teacher").get("id"), teacherId));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("documentType"), type));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("generationDate"), dateFrom));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("generationDate"), dateTo));
            }
            if (sourceExcel != null && !sourceExcel.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("sourceExcelFile")),
                        "%" + sourceExcel.toLowerCase() + "%"));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return generatedDocumentRepository.findAll(spec, pageable);
    }

    public GeneratedDocument getDocument(Long id, User currentUser) {
        return findWithAccessCheck(id, currentUser);
    }

    @Transactional
    public GeneratedDocument uploadFromRobot(MultipartFile file, Long teacherId, DocumentType type,
            String sourceExcel, String title, Long robotRunId) throws IOException {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found: " + teacherId));

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new RuntimeException("File name is empty");
        }

        Path userDir = Paths.get(GENERATED_DIR, String.valueOf(teacherId)).toAbsolutePath().normalize();
        Files.createDirectories(userDir);

        String storedName = UUID.randomUUID() + "_" + originalName;
        Path dest = userDir.resolve(storedName).normalize();
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        GeneratedDocument doc = new GeneratedDocument();
        doc.setTitle(title);
        doc.setDocumentType(type);
        doc.setSourceExcelFile(sourceExcel);
        doc.setGenerationDate(LocalDateTime.now());
        doc.setStatus(GeneratedDocStatus.UPLOADED);
        doc.setFilePath(teacherId + "/" + storedName);
        doc.setOriginalFileName(originalName);
        doc.setFileSize(file.getSize());
        doc.setTeacher(teacher);
        doc.setRobotRunId(robotRunId);
        doc.setCreatedAt(LocalDateTime.now());
        doc.setUpdatedAt(LocalDateTime.now());

        GeneratedDocument saved = generatedDocumentRepository.save(doc);
        notificationService.createGeneratedDocNotification(teacher, saved);

        if (robotRunId != null) {
            robotRunRepository.findById(robotRunId).ifPresent(run -> {
                run.setGeneratedCount((run.getGeneratedCount() == null ? 0 : run.getGeneratedCount()) + 1);
                robotRunRepository.save(run);
            });
        }

        return saved;
    }

    @Transactional
    public GeneratedDocument markAsViewed(Long id, User currentUser) {
        GeneratedDocument doc = findWithAccessCheck(id, currentUser);
        if (doc.getStatus() == GeneratedDocStatus.UPLOADED) {
            doc.setStatus(GeneratedDocStatus.VIEWED);
            doc.setUpdatedAt(LocalDateTime.now());
            generatedDocumentRepository.save(doc);
        }
        return doc;
    }

    @Transactional
    public Resource downloadFile(Long id, User currentUser) throws IOException {
        GeneratedDocument doc = findWithAccessCheck(id, currentUser);

        if (doc.getStatus() == GeneratedDocStatus.UPLOADED
                || doc.getStatus() == GeneratedDocStatus.VIEWED) {
            doc.setStatus(GeneratedDocStatus.DOWNLOADED);
            doc.setUpdatedAt(LocalDateTime.now());
            generatedDocumentRepository.save(doc);
        }

        Path filePath = Paths.get(GENERATED_DIR).toAbsolutePath().normalize()
                .resolve(doc.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("File not found: " + doc.getFilePath());
        }
        return resource;
    }

    @Transactional
    public GeneratedDocument updateStatus(Long id, GeneratedDocStatus newStatus, String comment) {
        GeneratedDocument doc = generatedDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        doc.setStatus(newStatus);
        if (comment != null) {
            doc.setComment(comment);
        }
        doc.setUpdatedAt(LocalDateTime.now());
        return generatedDocumentRepository.save(doc);
    }

    @Transactional
    public void deleteDocument(Long id) throws IOException {
        GeneratedDocument doc = generatedDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        if (doc.getFilePath() != null) {
            Path filePath = Paths.get(GENERATED_DIR).toAbsolutePath().normalize()
                    .resolve(doc.getFilePath());
            Files.deleteIfExists(filePath);
        }
        generatedDocumentRepository.delete(doc);
    }

    private GeneratedDocument findWithAccessCheck(Long id, User currentUser) {
        GeneratedDocument doc = generatedDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        if (!"ROLE_ADMIN".equals(currentUser.getRole())
                && !doc.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }
        return doc;
    }
}
