package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Entity.Template;
import org.example.fullstackpj.Entity.enums.FileType;
import org.example.fullstackpj.Service.TemplateService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<List<Template>> getAllTemplates(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long uploadedBy) {
        return ResponseEntity.ok(templateService.getAllTemplates(search, year, category, type, status, uploadedBy));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Template> getTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(templateService.getTemplateById(id));
    }

    @PostMapping
    public ResponseEntity<?> createTemplate(
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "version", required = false) String version,
            @RequestParam(value = "academicYear", required = false) String academicYear,
            @RequestParam(value = "semester", required = false) String semester,
            @RequestParam(value = "templateCategory", required = false) String templateCategory,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam("file") MultipartFile file) {
        try {
            Template template = templateService.createTemplate(name, description, version,
                    academicYear, semester, templateCategory, status, file);
            return ResponseEntity.ok(template);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTemplate(
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "version", required = false) String version,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "academicYear", required = false) String academicYear,
            @RequestParam(value = "semester", required = false) String semester,
            @RequestParam(value = "templateCategory", required = false) String templateCategory,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            Template template = templateService.updateTemplate(id, name, description, version,
                    status, academicYear, semester, templateCategory, file);
            return ResponseEntity.ok(template);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable Long id) {
        try {
            templateService.deleteTemplate(id);
            return ResponseEntity.ok("Template deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body("Ошибка: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<?> previewTemplate(@PathVariable Long id) {
        try {
            Template template = templateService.getById(id);
            Resource resource = templateService.getResource(template);
            String contentType = resolveContentType(template.getFileType());
            String filename = template.getFilePath() != null ? template.getFilePath() : "preview";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка при предпросмотре: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadTemplate(@PathVariable Long id) {
        try {
            Template template = templateService.getTemplateById(id);
            Resource resource = templateService.downloadTemplate(id);
            String contentType = resolveContentType(template.getFileType());
            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Content-Disposition", "attachment; filename=\"" + template.getFilePath() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка при загрузке файла: " + e.getMessage());
        }
    }

    private String resolveContentType(FileType fileType) {
        if (fileType == null) return "application/octet-stream";
        return switch (fileType) {
            case DOCX -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case PDF -> "application/pdf";
            case XLSX -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default -> "application/octet-stream";
        };
    }
}
