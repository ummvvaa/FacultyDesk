package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Dto.PublicationDto;
import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.PublicationFile;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.PubFileType;
import org.example.fullstackpj.Entity.enums.PublicationStatus;
import org.example.fullstackpj.Entity.enums.Quartile;
import org.example.fullstackpj.Service.PublicationService;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications")
public class PublicationController {

    private final PublicationService publicationService;

    public PublicationController(PublicationService publicationService) {
        this.publicationService = publicationService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<Publication>> getMyPublications(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(publicationService.getMyPublications(principal.getUser()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Publication>> getByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(publicationService.getByUserId(userId, principal.getUser()));
    }

    @GetMapping("/admin")
    public ResponseEntity<Page<Publication>> getAllForAdmin(
            @RequestParam(required = false) String databaseType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String quartile,
            @RequestParam(required = false) Long authorId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        DatabaseType db = parseEnum(DatabaseType.class, databaseType);
        PublicationStatus st = parseEnum(PublicationStatus.class, status);
        Quartile q = parseEnum(Quartile.class, quartile);
        return ResponseEntity.ok(publicationService.getAllForAdmin(db, st, year, q, authorId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            return ResponseEntity.ok(publicationService.getById(id, principal.getUser()));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PublicationDto dto,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            return ResponseEntity.ok(publicationService.create(dto, principal.getUser()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
            @RequestBody PublicationDto dto,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            return ResponseEntity.ok(publicationService.update(id, dto, principal.getUser()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            publicationService.delete(id, principal.getUser());
            return ResponseEntity.ok(Map.of("message", "Publication deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submit(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            return ResponseEntity.ok(publicationService.submitForReview(id, principal.getUser()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/verify")
    public ResponseEntity<?> verify(@PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            String comment = body != null ? body.get("comment") : null;
            return ResponseEntity.ok(publicationService.verify(id, principal.getUser(), comment));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            String comment = body != null ? body.get("comment") : null;
            return ResponseEntity.ok(publicationService.reject(id, principal.getUser(), comment));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/needs-correction")
    public ResponseEntity<?> needsCorrection(@PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            String comment = body != null ? body.get("comment") : null;
            return ResponseEntity.ok(publicationService.needsCorrection(id, principal.getUser(), comment));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/files")
    public ResponseEntity<?> addFile(@PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("fileType") String fileType,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            PubFileType type = parseEnum(PubFileType.class, fileType);
            if (type == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid fileType: " + fileType));
            }
            return ResponseEntity.ok(publicationService.addFile(id, file, type, principal.getUser()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/files")
    public ResponseEntity<?> getFiles(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            List<PublicationFile> files = publicationService.getFiles(id, principal.getUser());
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<?> downloadFile(@PathVariable Long fileId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            Resource resource = publicationService.downloadFile(fileId, principal.getUser());
            String filename = resource.getFilename();
            return ResponseEntity.ok()
                    .header("Content-Type", "application/octet-stream")
                    .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable Long fileId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            publicationService.deleteFile(fileId, principal.getUser());
            return ResponseEntity.ok(Map.of("message", "File deleted"));
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
