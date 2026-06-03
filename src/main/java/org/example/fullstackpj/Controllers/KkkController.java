package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Dto.KkkProfileDto;
import org.example.fullstackpj.Entity.KkkProfile;
import org.example.fullstackpj.Entity.enums.KkkStatus;
import org.example.fullstackpj.Service.KkkService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/kkk")
public class KkkController {

    private final KkkService kkkService;

    public KkkController(KkkService kkkService) {
        this.kkkService = kkkService;
    }

    @GetMapping("/me")
    public ResponseEntity<KkkProfileDto> getMyKkk(
            @RequestParam(defaultValue = "ru") String locale,
            @AuthenticationPrincipal CustomUserDetails principal) {
        Locale loc = "en".equals(locale) ? Locale.ENGLISH : new Locale("ru");
        return ResponseEntity.ok(kkkService.getMyKkkWithChecklist(principal.getUser(), loc));
    }

    @PostMapping("/submit")
    public ResponseEntity<KkkProfile> submit(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(kkkService.submitForReview(principal.getUser()));
    }

    @GetMapping("/admin")
    public ResponseEntity<Page<KkkProfileDto>> getAllForAdmin(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer minCompletion,
            @RequestParam(required = false) Integer maxCompletion,
            @PageableDefault(size = 20) Pageable pageable) {
        KkkStatus kkkStatus = status != null ? KkkStatus.valueOf(status) : null;
        return ResponseEntity.ok(kkkService.getAllForAdmin(kkkStatus, minCompletion, maxCompletion, pageable));
    }

    @GetMapping("/admin/{teacherId}")
    public ResponseEntity<KkkProfileDto> getAdminDetail(@PathVariable Long teacherId) {
        return ResponseEntity.ok(kkkService.getAdminDetail(teacherId));
    }

    @GetMapping("/user/{teacherId}/completion")
    public ResponseEntity<Map<String, Object>> getUserCompletion(@PathVariable Long teacherId) {
        return ResponseEntity.ok(kkkService.getUserCompletion(teacherId));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<KkkProfile> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails principal) {
        KkkStatus newStatus = KkkStatus.valueOf(body.get("status"));
        String comment = body.getOrDefault("comment", null);
        return ResponseEntity.ok(kkkService.updateStatus(id, newStatus, comment, principal.getUser()));
    }

    @GetMapping("/{teacherId}/export")
    public ResponseEntity<byte[]> exportKkkPackage(@PathVariable Long teacherId,
            @AuthenticationPrincipal CustomUserDetails principal) throws IOException {
        byte[] pdfBytes = kkkService.exportKkkPackage(teacherId);
        String username = principal.getUsername();
        String date = LocalDate.now().toString();
        String filename = "kkk_" + username + "_" + date + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
