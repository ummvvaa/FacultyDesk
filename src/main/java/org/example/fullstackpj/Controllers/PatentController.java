package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Entity.Patent;
import org.example.fullstackpj.Service.PatentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patents")
public class PatentController {

    private final PatentService patentService;

    public PatentController(PatentService patentService) {
        this.patentService = patentService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<Patent>> getMy(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(patentService.getMy(principal.getUser()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Patent>> getByUser(@PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(patentService.getByUserId(userId, principal.getUser()));
    }

    @PostMapping
    public ResponseEntity<Patent> create(@RequestBody Patent data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(patentService.create(data, principal.getUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patent> update(@PathVariable Long id, @RequestBody Patent data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(patentService.update(id, data, principal.getUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        patentService.delete(id, principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
