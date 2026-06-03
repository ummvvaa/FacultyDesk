package org.example.fullstackpj.Controllers;

import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Entity.PasswordResetRequest;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.PasswordResetStatus;
import org.example.fullstackpj.Repository.UserRepository;
import org.example.fullstackpj.Service.PasswordResetService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/password-resets")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class PasswordResetAdminController {

    private final PasswordResetService passwordResetService;
    private final UserRepository userRepository;

    @GetMapping
    public Page<PasswordResetRequest> list(
            @RequestParam(defaultValue = "PENDING") PasswordResetStatus status,
            Pageable pageable
    ) {
        return passwordResetService.listByStatus(status, pageable);
    }

    @GetMapping("/pending-count")
    public Map<String, Long> pendingCount() {
        return Map.of("count", passwordResetService.countPending());
    }

    @PostMapping("/{id}/approve")
    public Map<String, String> approve(@PathVariable Long id,
                                       @RequestBody(required = false) Map<String, String> body,
                                       Authentication auth) {
        User admin = userRepository.findByUsername(auth.getName()).orElseThrow();
        String customPassword = body != null ? body.get("password") : null;
        String newPassword = passwordResetService.approve(id, admin, customPassword);
        return Map.of(
                "message", "Password reset approved",
                "newPassword", newPassword
        );
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable Long id,
                                       @RequestBody(required = false) Map<String, String> body,
                                       Authentication auth) {
        User admin = userRepository.findByUsername(auth.getName()).orElseThrow();
        String reason = body != null ? body.getOrDefault("reason", "") : "";
        passwordResetService.reject(id, admin, reason);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/user/{userId}/reset")
    public Map<String, String> adminReset(@PathVariable Long userId,
                                          @RequestBody(required = false) Map<String, String> body) {
        String customPassword = body != null ? body.get("password") : null;
        String newPassword = passwordResetService.adminResetPassword(userId, customPassword);
        return Map.of("newPassword", newPassword);
    }
}
