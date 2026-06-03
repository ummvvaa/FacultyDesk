package org.example.fullstackpj.Controllers;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Dto.GeneratedDocumentDto;
import org.example.fullstackpj.Entity.GeneratedDocument;
import org.example.fullstackpj.Entity.enums.DocumentType;
import org.example.fullstackpj.Entity.enums.GeneratedDocStatus;
import org.example.fullstackpj.Service.GeneratedDocumentService;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/generated-documents")
public class GeneratedDocumentController {

    private final GeneratedDocumentService generatedDocumentService;
    private final ObjectMapper objectMapper;

    public GeneratedDocumentController(GeneratedDocumentService generatedDocumentService,
                                       ObjectMapper objectMapper) {
        this.generatedDocumentService = generatedDocumentService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/me")
    public ResponseEntity<List<GeneratedDocument>> getMyDocuments(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(generatedDocumentService.getMyDocuments(principal.getUser()));
    }

    @GetMapping("/admin")
    public ResponseEntity<Page<GeneratedDocumentDto>> getAllForAdmin(
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            @RequestParam(required = false) String sourceExcel,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "generationDate") Pageable pageable) {
        DocumentType type = parseEnum(DocumentType.class, documentType);
        GeneratedDocStatus docStatus = parseEnum(GeneratedDocStatus.class, status);
        return ResponseEntity.ok(generatedDocumentService.getAllForAdmin(
                teacherId, type, dateFrom, dateTo, sourceExcel, docStatus, pageable)
                .map(GeneratedDocumentDto::fromEntity));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDocument(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            return ResponseEntity.ok(generatedDocumentService.markAsViewed(id, principal.getUser()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadDocument(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            GeneratedDocument doc = generatedDocumentService.getDocument(id, principal.getUser());
            Resource resource = generatedDocumentService.downloadFile(id, principal.getUser());
            return ResponseEntity.ok()
                    .header("Content-Type", "application/octet-stream")
                    .header("Content-Disposition",
                            "attachment; filename=\"" + doc.getOriginalFileName() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadSingle(
            @RequestParam("file") MultipartFile file,
            @RequestParam("teacherId") Long teacherId,
            @RequestParam("documentType") String documentType,
            @RequestParam(value = "sourceExcelFile", required = false) String sourceExcelFile,
            @RequestParam("title") String title,
            @RequestParam(value = "robotRunId", required = false) Long robotRunId) {
        try {
            DocumentType type = parseEnum(DocumentType.class, documentType);
            if (type == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid documentType: " + documentType));
            }
            GeneratedDocument doc = generatedDocumentService.uploadFromRobot(
                    file, teacherId, type, sourceExcelFile, title, robotRunId);
            return ResponseEntity.ok(doc);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/upload-bulk")
    public ResponseEntity<?> uploadBulk(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam("metadata") String metadataJson) {
        try {
            List<Map<String, Object>> metaList = objectMapper.readValue(
                    metadataJson, new TypeReference<>() {});
            if (files.length != metaList.size()) {
                return ResponseEntity.badRequest().body(
                        Map.of("message", "files count does not match metadata count"));
            }
            List<GeneratedDocument> results = new ArrayList<>();
            for (int i = 0; i < files.length; i++) {
                Map<String, Object> meta = metaList.get(i);
                Long teacherId = Long.valueOf(meta.get("teacherId").toString());
                DocumentType type = parseEnum(DocumentType.class,
                        meta.getOrDefault("documentType", "OTHER").toString());
                String sourceExcel = meta.getOrDefault("sourceExcelFile", "").toString();
                String title = meta.getOrDefault("title", files[i].getOriginalFilename()).toString();
                Long robotRunId = meta.get("robotRunId") != null
                        ? Long.valueOf(meta.get("robotRunId").toString()) : null;
                results.add(generatedDocumentService.uploadFromRobot(
                        files[i], teacherId, type, sourceExcel, title, robotRunId));
            }
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            GeneratedDocStatus newStatus = parseEnum(GeneratedDocStatus.class, body.get("status"));
            if (newStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid status: " + body.get("status")));
            }
            return ResponseEntity.ok(
                    generatedDocumentService.updateStatus(id, newStatus, body.get("comment")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        try {
            generatedDocumentService.deleteDocument(id);
            return ResponseEntity.ok(Map.of("message", "Document deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    private <E extends Enum<E>> E parseEnum(Class<E> clazz, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(clazz, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
