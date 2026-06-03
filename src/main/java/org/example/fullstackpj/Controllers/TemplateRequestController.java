package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Entity.TemplateRequest;
import org.example.fullstackpj.Entity.enums.RequestStatus;
import org.example.fullstackpj.Service.TemplateRequestService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/template-requests")
public class TemplateRequestController {

    private final TemplateRequestService templateRequestService;

    public TemplateRequestController(TemplateRequestService templateRequestService) {
        this.templateRequestService = templateRequestService;
    }

    // Teacher: create request
    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody Map<String, Object> body) {
        try {
            String title = body.get("title") != null ? body.get("title").toString() : null;
            if (title == null || title.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Title is required"));
            }
            String description = body.containsKey("description") ? (body.get("description") != null ? body.get("description").toString() : null) : null;
            String category = body.containsKey("suggestedCategory") ? (body.get("suggestedCategory") != null ? body.get("suggestedCategory").toString() : null) : null;
            TemplateRequest req = templateRequestService.createRequest(title, description, category);
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    // Teacher: get my requests
    @GetMapping("/me")
    public ResponseEntity<List<TemplateRequest>> getMyRequests() {
        return ResponseEntity.ok(templateRequestService.getMyRequests());
    }

    // Teacher: cancel own PENDING request
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelRequest(@PathVariable Long id) {
        try {
            templateRequestService.cancelRequest(id);
            return ResponseEntity.ok(Map.of("message", "Cancelled"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    // Admin: get all requests (pageable, optional status filter)
    @GetMapping("/admin")
    public ResponseEntity<Page<TemplateRequest>> getAdminAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        Pageable pageable = PageRequest.of(page, size);
        if (status != null && !status.isBlank()) {
            try {
                RequestStatus rs = RequestStatus.valueOf(status.toUpperCase());
                return ResponseEntity.ok(templateRequestService.getAdminByStatus(rs, pageable));
            } catch (IllegalArgumentException ignored) { }
        }
        return ResponseEntity.ok(templateRequestService.getAdminAll(pageable));
    }

    // Admin: get pending count
    @GetMapping("/admin/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount() {
        return ResponseEntity.ok(Map.of("count", templateRequestService.countPending()));
    }

    // Admin: update status/response
    @PutMapping("/admin/{id}")
    public ResponseEntity<?> adminUpdate(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            TemplateRequest updated = templateRequestService.adminUpdate(id, body);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(400).body(error);
        }
    }
}
