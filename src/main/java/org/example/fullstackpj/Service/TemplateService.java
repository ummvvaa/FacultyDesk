package org.example.fullstackpj.Service;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Entity.Template;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.FileType;
import org.example.fullstackpj.Entity.enums.NotificationPriority;
import org.example.fullstackpj.Entity.enums.NotificationType;
import org.example.fullstackpj.Entity.enums.Semester;
import org.example.fullstackpj.Entity.enums.TemplateCategory;
import org.example.fullstackpj.Entity.enums.TemplateStatus;
import org.example.fullstackpj.Repository.TemplateRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public TemplateService(TemplateRepository templateRepository,
                           NotificationService notificationService,
                           UserRepository userRepository) {
        this.templateRepository = templateRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getUser();
    }

    private boolean currentUserIsAdmin() {
        return "ROLE_ADMIN".equals(getCurrentUser().getRole());
    }

    private FileType detectFileType(String filename) {
        if (filename == null) return FileType.OTHER;
        String lower = filename.toLowerCase();
        if (lower.endsWith(".docx")) return FileType.DOCX;
        if (lower.endsWith(".pdf")) return FileType.PDF;
        if (lower.endsWith(".xlsx")) return FileType.XLSX;
        return FileType.OTHER;
    }

    public List<Template> getAllTemplates(String search, String year, String category, String type, String status, Long uploadedById) {
        boolean isAdmin = currentUserIsAdmin();
        String effectiveStatus = isAdmin ? (status != null && !status.isBlank() ? status : null)
                                         : TemplateStatus.ACTIVE.name();
        String searchParam = (search != null && !search.isBlank()) ? search : null;
        String yearParam = (year != null && !year.isBlank()) ? year : null;
        String categoryParam = (category != null && !category.isBlank()) ? category : null;
        String typeParam = (type != null && !type.isBlank()) ? type : null;

        return templateRepository.findWithFilters(searchParam, yearParam, categoryParam, typeParam, effectiveStatus, uploadedById);
    }

    public List<Template> getActiveTemplates() {
        return templateRepository.findByStatus(TemplateStatus.ACTIVE);
    }

    public Template getTemplateById(Long id) {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        if (!currentUserIsAdmin() && template.getStatus() != TemplateStatus.ACTIVE) {
            throw new RuntimeException("Template not found or not available");
        }
        return template;
    }

    @Transactional
    public Resource downloadTemplate(Long id) throws IOException {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        if (!currentUserIsAdmin() && template.getStatus() != TemplateStatus.ACTIVE) {
            throw new RuntimeException("Template not available");
        }
        template.setDownloadCount(template.getDownloadCount() == null ? 1L : template.getDownloadCount() + 1L);
        templateRepository.save(template);
        return getResource(template);
    }

    public Resource getResource(Template template) throws IOException {
        Path filePath = Paths.get("src/main/resources/static/templates")
                .toAbsolutePath().normalize()
                .resolve(template.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("File not found: " + template.getFilePath());
        }
        return resource;
    }

    public Template getById(Long id) {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        if (!currentUserIsAdmin() && template.getStatus() != TemplateStatus.ACTIVE) {
            throw new RuntimeException("Template not found or not available");
        }
        return template;
    }

    public Template createTemplate(String name, String description, String version,
                                   String academicYear, String semesterStr, String templateCategoryStr,
                                   String statusStr, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Файл не был загружен");
        }
        User currentUser = getCurrentUser();

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isEmpty()) {
            throw new RuntimeException("Имя файла не может быть пустым");
        }

        Path uploadDir = Paths.get("src/main/resources/static/templates").toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }
        Path filePath = uploadDir.resolve(filename).normalize();
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        Template template = new Template();
        template.setName(name);
        template.setDescription(description != null ? description : "");
        template.setVersion(version != null ? version : "1.0");
        template.setFilePath(filename);
        template.setFileType(detectFileType(filename));
        template.setAcademicYear(academicYear);
        template.setSemester(parseSemester(semesterStr));
        template.setTemplateCategory(parseCategory(templateCategoryStr));
        TemplateStatus resolvedStatus = parseStatus(statusStr, TemplateStatus.ACTIVE);
        template.setStatus(resolvedStatus);
        template.setDownloadCount(0L);
        template.setCreatedAt(LocalDateTime.now());
        template.setUpdatedAt(LocalDateTime.now());
        template.setUploadedBy(currentUser);
        template.setActive(true);

        Template saved = templateRepository.save(template);

        // Trigger: new template goes ACTIVE → notify all teachers
        if (resolvedStatus == TemplateStatus.ACTIVE) {
            notifyTeachersTemplateNew(saved);
        }
        return saved;
    }

    @Transactional
    public Template updateTemplate(Long id, String name, String description, String version,
                                   String statusStr, String academicYear, String semesterStr,
                                   String templateCategoryStr, MultipartFile file) throws IOException {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        TemplateStatus oldStatus = template.getStatus();

        if (template.getCreatedAt() == null) template.setCreatedAt(LocalDateTime.now());
        if (template.getUploadedBy() == null) template.setUploadedBy(getCurrentUser());
        if (template.getDownloadCount() == null) template.setDownloadCount(0L);

        if (name != null && !name.trim().isEmpty()) template.setName(name);
        if (description != null) template.setDescription(description);
        if (version != null && !version.trim().isEmpty()) template.setVersion(version);
        if (academicYear != null && !academicYear.isBlank()) template.setAcademicYear(academicYear);
        if (semesterStr != null && !semesterStr.isBlank()) template.setSemester(parseSemester(semesterStr));
        if (templateCategoryStr != null && !templateCategoryStr.isBlank()) template.setTemplateCategory(parseCategory(templateCategoryStr));

        TemplateStatus newStatus = null;
        if (statusStr != null && !statusStr.isBlank()) {
            newStatus = parseStatus(statusStr, null);
            if (newStatus != null) {
                template.setStatus(newStatus);
                template.setActive(newStatus == TemplateStatus.ACTIVE);
            }
        }

        if (file != null && !file.isEmpty()) {
            String filename = file.getOriginalFilename();
            if (filename != null && !filename.isEmpty()) {
                Path uploadDir = Paths.get("src/main/resources/static/templates").toAbsolutePath().normalize();
                Path dest = uploadDir.resolve(filename).normalize();
                Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
                template.setFilePath(filename);
                template.setFileType(detectFileType(filename));
            }
        }

        template.setUpdatedAt(LocalDateTime.now());
        Template saved = templateRepository.save(template);

        TemplateStatus effectiveStatus = newStatus != null ? newStatus : oldStatus;

        if (effectiveStatus == TemplateStatus.ACTIVE) {
            if (oldStatus != TemplateStatus.ACTIVE) {
                // Was inactive, now active → treat as new
                notifyTeachersTemplateNew(saved);
            } else {
                // Still active → updated
                notifyTeachersTemplateUpdated(saved);
            }
        }
        return saved;
    }

    public void deleteTemplate(Long id) {
        templateRepository.deleteById(id);
    }

    // ── Notification helpers ────────────────────────────────────────────────

    private void notifyTeachersTemplateNew(Template template) {
        List<User> teachers = userRepository.findAll().stream()
                .filter(u -> "ROLE_TEACHER".equals(u.getRole()))
                .toList();
        for (User teacher : teachers) {
            notificationService.createNotification(
                    teacher,
                    "New template available",
                    "Template '" + template.getName() + "' is now available",
                    NotificationType.TEMPLATE_NEW.name(),
                    template.getId(), "TEMPLATE",
                    NotificationPriority.NORMAL);
        }
    }

    private void notifyTeachersTemplateUpdated(Template template) {
        List<User> teachers = userRepository.findAll().stream()
                .filter(u -> "ROLE_TEACHER".equals(u.getRole()))
                .toList();
        for (User teacher : teachers) {
            notificationService.createNotification(
                    teacher,
                    "Template updated",
                    "Template '" + template.getName() + "' has been updated",
                    NotificationType.TEMPLATE_UPDATED.name(),
                    template.getId(), "TEMPLATE",
                    NotificationPriority.LOW);
        }
    }

    // ── Parsers ─────────────────────────────────────────────────────────────

    private Semester parseSemester(String val) {
        if (val == null || val.isBlank()) return null;
        try { return Semester.valueOf(val.toUpperCase()); } catch (Exception e) { return null; }
    }

    private TemplateCategory parseCategory(String val) {
        if (val == null || val.isBlank()) return null;
        try { return TemplateCategory.valueOf(val.toUpperCase()); } catch (Exception e) { return null; }
    }

    private TemplateStatus parseStatus(String val, TemplateStatus defaultVal) {
        if (val == null || val.isBlank()) return defaultVal;
        try { return TemplateStatus.valueOf(val.toUpperCase()); } catch (Exception e) { return defaultVal; }
    }
}
