package org.example.fullstackpj.Service;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Entity.Template;
import org.example.fullstackpj.Entity.TemplateRequest;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.NotificationPriority;
import org.example.fullstackpj.Entity.enums.NotificationType;
import org.example.fullstackpj.Entity.enums.RequestStatus;
import org.example.fullstackpj.Entity.enums.TemplateCategory;
import org.example.fullstackpj.Repository.TemplateRepository;
import org.example.fullstackpj.Repository.TemplateRequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class TemplateRequestService {

    private final TemplateRequestRepository requestRepository;
    private final TemplateRepository templateRepository;
    private final NotificationService notificationService;

    public TemplateRequestService(TemplateRequestRepository requestRepository,
                                  TemplateRepository templateRepository,
                                  NotificationService notificationService) {
        this.requestRepository = requestRepository;
        this.templateRepository = templateRepository;
        this.notificationService = notificationService;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((CustomUserDetails) auth.getPrincipal()).getUser();
    }

    @Transactional
    public TemplateRequest createRequest(String title, String description, String suggestedCategoryStr) {
        User user = getCurrentUser();

        TemplateRequest req = new TemplateRequest();
        req.setRequestedBy(user);
        req.setTitle(title);
        req.setDescription(description);
        if (suggestedCategoryStr != null && !suggestedCategoryStr.isBlank()) {
            try {
                req.setSuggestedCategory(TemplateCategory.valueOf(suggestedCategoryStr.toUpperCase()));
            } catch (IllegalArgumentException ignored) { }
        }
        req.setStatus(RequestStatus.PENDING);

        TemplateRequest saved = requestRepository.save(req);

        notificationService.broadcastToRole(
                "ROLE_ADMIN",
                "New template request: " + title,
                user.getUsername() + " requested a new template",
                NotificationType.TEMPLATE_REQUEST_CREATED,
                saved.getId(), "TEMPLATE_REQUEST",
                NotificationPriority.HIGH
        );

        return saved;
    }

    public List<TemplateRequest> getMyRequests() {
        return requestRepository.findByRequestedByOrderByCreatedAtDesc(getCurrentUser());
    }

    public Page<TemplateRequest> getAdminAll(Pageable pageable) {
        return requestRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<TemplateRequest> getAdminByStatus(RequestStatus status, Pageable pageable) {
        return requestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    public long countPending() {
        return requestRepository.countByStatus(RequestStatus.PENDING);
    }

    @Transactional
    public TemplateRequest adminUpdate(Long id, Map<String, Object> body) {
        TemplateRequest req = requestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template request not found"));
        User admin = getCurrentUser();

        if (body.containsKey("status")) {
            try {
                req.setStatus(RequestStatus.valueOf(body.get("status").toString().toUpperCase()));
            } catch (IllegalArgumentException ignored) { }
        }
        if (body.containsKey("adminResponse")) {
            req.setAdminResponse(body.get("adminResponse") != null ? body.get("adminResponse").toString() : null);
        }
        if (body.containsKey("linkToTemplateId") && body.get("linkToTemplateId") != null) {
            Long templateId = Long.parseLong(body.get("linkToTemplateId").toString());
            Template tmpl = templateRepository.findById(templateId).orElse(null);
            req.setCreatedTemplate(tmpl);
        }

        req.setRespondedBy(admin);
        req.setRespondedAt(LocalDateTime.now());

        TemplateRequest saved = requestRepository.save(req);

        // Notify requester
        String statusLabel = saved.getStatus().name().toLowerCase().replace("_", " ");
        notificationService.createNotification(
                saved.getRequestedBy(),
                "Template request update",
                "Your template request '" + saved.getTitle() + "' was " + statusLabel,
                NotificationType.TEMPLATE_REQUEST_RESPONDED,
                saved.getId(), "TEMPLATE_REQUEST",
                NotificationPriority.NORMAL
        );

        return saved;
    }

    @Transactional
    public void cancelRequest(Long id) {
        User user = getCurrentUser();
        TemplateRequest req = requestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template request not found"));
        if (!req.getRequestedBy().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        if (req.getStatus() != RequestStatus.PENDING && req.getStatus() != RequestStatus.CANCELLED) {
            throw new RuntimeException("Only PENDING requests can be cancelled");
        }
        req.setStatus(RequestStatus.CANCELLED);
        requestRepository.save(req);
    }
}
