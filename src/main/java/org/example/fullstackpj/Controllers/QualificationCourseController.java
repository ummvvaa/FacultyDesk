package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Entity.QualificationCourse;
import org.example.fullstackpj.Service.QualificationCourseService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/qualification-courses")
public class QualificationCourseController {

    private final QualificationCourseService courseService;

    public QualificationCourseController(QualificationCourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<QualificationCourse>> getMy(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(courseService.getMy(principal.getUser()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<QualificationCourse>> getByUser(@PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(courseService.getByUserId(userId, principal.getUser()));
    }

    @PostMapping
    public ResponseEntity<QualificationCourse> create(@RequestBody QualificationCourse data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(courseService.create(data, principal.getUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<QualificationCourse> update(@PathVariable Long id,
            @RequestBody QualificationCourse data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(courseService.update(id, data, principal.getUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        courseService.delete(id, principal.getUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/certificate")
    public ResponseEntity<QualificationCourse> uploadCertificate(@PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails principal) throws IOException {
        return ResponseEntity.ok(courseService.uploadCertificate(id, file, principal.getUser()));
    }

    @GetMapping("/{id}/certificate/download")
    public ResponseEntity<Resource> downloadCertificate(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) throws IOException {
        QualificationCourse course = courseService.getMy(principal.getUser()).stream()
                .filter(c -> c.getId().equals(id))
                .findFirst()
                .orElse(null);
        Resource resource = courseService.downloadCertificate(id, principal.getUser());
        String filename = course != null && course.getCertificateOriginalName() != null
                ? course.getCertificateOriginalName()
                : "certificate";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
