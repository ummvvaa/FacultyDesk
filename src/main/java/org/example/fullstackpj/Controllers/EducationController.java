package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Entity.Education;
import org.example.fullstackpj.Service.EducationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/education")
public class EducationController {

    private final EducationService educationService;

    public EducationController(EducationService educationService) {
        this.educationService = educationService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<Education>> getMy(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(educationService.getMyEducations(principal.getUser()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Education>> getByUser(@PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(educationService.getByUserId(userId, principal.getUser()));
    }

    @PostMapping
    public ResponseEntity<Education> create(@RequestBody Education data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(educationService.create(data, principal.getUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Education> update(@PathVariable Long id, @RequestBody Education data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(educationService.update(id, data, principal.getUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        educationService.delete(id, principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
