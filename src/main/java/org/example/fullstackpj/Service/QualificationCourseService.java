package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.QualificationCourse;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.QualificationCourseRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class QualificationCourseService {

    private static final String CERTS_DIR = "src/main/resources/static/certificates";

    private final QualificationCourseRepository courseRepository;

    public QualificationCourseService(QualificationCourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public List<QualificationCourse> getMy(User user) {
        return courseRepository.findByUserOrderByYearDesc(user);
    }

    public List<QualificationCourse> getByUserId(Long userId, User currentUser) {
        if (isAdmin(currentUser) || currentUser.getId().equals(userId)) {
            return courseRepository.findByUserOrderByYearDesc(userRef(userId));
        }
        throw new RuntimeException("Access denied");
    }

    @Transactional
    public QualificationCourse create(QualificationCourse data, User user) {
        data.setUser(user);
        return courseRepository.save(data);
    }

    @Transactional
    public QualificationCourse update(Long id, QualificationCourse data, User currentUser) {
        QualificationCourse existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        existing.setName(data.getName());
        existing.setOrganization(data.getOrganization());
        existing.setYear(data.getYear());
        existing.setHours(data.getHours());
        return courseRepository.save(existing);
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        QualificationCourse existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        if (existing.getCertificateFilePath() != null) {
            try {
                Path fp = Paths.get(CERTS_DIR).toAbsolutePath().normalize()
                        .resolve(existing.getCertificateFilePath());
                Files.deleteIfExists(fp);
            } catch (IOException ignored) {
            }
        }
        courseRepository.delete(existing);
    }

    @Transactional
    public QualificationCourse uploadCertificate(Long id, MultipartFile file, User currentUser) throws IOException {
        QualificationCourse course = findById(id);
        requireOwnerOrAdmin(course, currentUser);

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new RuntimeException("File name is empty");
        }

        Path dir = Paths.get(CERTS_DIR, String.valueOf(currentUser.getId())).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        String storedName = UUID.randomUUID() + "_" + originalName;
        Path dest = dir.resolve(storedName).normalize();

        // Delete old certificate if exists
        if (course.getCertificateFilePath() != null) {
            Path old = Paths.get(CERTS_DIR).toAbsolutePath().normalize()
                    .resolve(course.getCertificateFilePath());
            Files.deleteIfExists(old);
        }

        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        course.setCertificateFilePath(currentUser.getId() + "/" + storedName);
        course.setCertificateOriginalName(originalName);
        return courseRepository.save(course);
    }

    public Resource downloadCertificate(Long id, User currentUser) throws IOException {
        QualificationCourse course = findById(id);
        requireOwnerOrAdmin(course, currentUser);

        if (course.getCertificateFilePath() == null) {
            throw new RuntimeException("No certificate file for course: " + id);
        }
        Path filePath = Paths.get(CERTS_DIR).toAbsolutePath().normalize()
                .resolve(course.getCertificateFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("Certificate file not found");
        }
        return resource;
    }

    private QualificationCourse findById(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("QualificationCourse not found: " + id));
    }

    private User userRef(Long userId) {
        User u = new User();
        u.setId(userId);
        return u;
    }

    private boolean isAdmin(User user) {
        return "ROLE_ADMIN".equals(user.getRole());
    }

    private void requireOwnerOrAdmin(QualificationCourse course, User user) {
        if (!isAdmin(user) && !course.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
    }
}
