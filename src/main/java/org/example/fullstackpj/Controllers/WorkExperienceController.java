package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Entity.WorkExperience;
import org.example.fullstackpj.Service.WorkExperienceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/work-experience")
public class WorkExperienceController {

    private final WorkExperienceService workExperienceService;

    public WorkExperienceController(WorkExperienceService workExperienceService) {
        this.workExperienceService = workExperienceService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<WorkExperience>> getMy(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(workExperienceService.getMy(principal.getUser()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WorkExperience>> getByUser(@PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(workExperienceService.getByUserId(userId, principal.getUser()));
    }

    @PostMapping
    public ResponseEntity<WorkExperience> create(@RequestBody WorkExperience data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(workExperienceService.create(data, principal.getUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkExperience> update(@PathVariable Long id, @RequestBody WorkExperience data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(workExperienceService.update(id, data, principal.getUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        workExperienceService.delete(id, principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
