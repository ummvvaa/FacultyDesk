package org.example.fullstackpj.Service;

import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Entity.PasswordResetRequest;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.NotificationPriority;
import org.example.fullstackpj.Entity.enums.NotificationType;
import org.example.fullstackpj.Entity.enums.PasswordResetStatus;
import org.example.fullstackpj.Repository.PasswordResetRequestRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetRequestRepository requestRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public void requestReset(String email, String reason) {
        // Silent return if user not found — do not leak account existence
        userRepo.findByEmail(email).ifPresent(user -> {
            PasswordResetRequest req = new PasswordResetRequest();
            req.setUser(user);
            req.setReason(reason);
            requestRepo.save(req);

            notificationService.broadcastToRole(
                    "ROLE_ADMIN",
                    "Password reset request",
                    "User " + user.getUsername() + " requested password reset",
                    NotificationType.PASSWORD_RESET_REQUEST,
                    req.getId(),
                    "PASSWORD_RESET_REQUEST",
                    NotificationPriority.HIGH
            );
        });
    }

    public Page<PasswordResetRequest> listByStatus(PasswordResetStatus status, Pageable pageable) {
        return requestRepo.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    public long countPending() {
        return requestRepo.countByStatus(PasswordResetStatus.PENDING);
    }

    @Transactional
    public String approve(Long requestId, User admin, String customPassword) {
        PasswordResetRequest req = requestRepo.findById(requestId).orElseThrow();
        if (req.getStatus() != PasswordResetStatus.PENDING) {
            throw new RuntimeException("Request already processed");
        }

        String newPassword = (customPassword != null && !customPassword.isBlank())
                ? customPassword
                : generateRandomPassword();

        User user = req.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepo.save(user);

        req.setStatus(PasswordResetStatus.APPROVED);
        req.setProcessedAt(LocalDateTime.now());
        req.setProcessedBy(admin);
        requestRepo.save(req);

        return newPassword;
    }

    @Transactional
    public void reject(Long requestId, User admin, String reason) {
        PasswordResetRequest req = requestRepo.findById(requestId).orElseThrow();
        if (req.getStatus() != PasswordResetStatus.PENDING) {
            throw new RuntimeException("Request already processed");
        }
        req.setStatus(PasswordResetStatus.REJECTED);
        req.setProcessedAt(LocalDateTime.now());
        req.setProcessedBy(admin);
        req.setAdminNote(reason);
        requestRepo.save(req);
    }

    @Transactional
    public String adminResetPassword(Long userId, String customPassword) {
        User user = userRepo.findById(userId).orElseThrow();
        String newPassword = (customPassword != null && !customPassword.isBlank())
                ? customPassword
                : generateRandomPassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepo.save(user);
        return newPassword;
    }

    private String generateRandomPassword() {
        // 12 chars: a-z, A-Z, 0-9, exclude ambiguous (0/O, 1/l/I)
        String chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
