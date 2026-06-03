package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Entity.Award;
import org.example.fullstackpj.Service.AwardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/awards")
public class AwardController {

    private final AwardService awardService;

    public AwardController(AwardService awardService) {
        this.awardService = awardService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<Award>> getMy(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(awardService.getMy(principal.getUser()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Award>> getByUser(@PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(awardService.getByUserId(userId, principal.getUser()));
    }

    @PostMapping
    public ResponseEntity<Award> create(@RequestBody Award data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(awardService.create(data, principal.getUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Award> update(@PathVariable Long id, @RequestBody Award data,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(awardService.update(id, data, principal.getUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        awardService.delete(id, principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
