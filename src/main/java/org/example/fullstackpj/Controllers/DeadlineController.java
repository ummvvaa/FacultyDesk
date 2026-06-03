package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Dto.DeadlineDto;
import org.example.fullstackpj.Dto.DeadlineResponseDto;
import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DeadlineCategory;
import org.example.fullstackpj.Entity.enums.RepeatType;
import org.example.fullstackpj.Repository.UserRepository;
import org.example.fullstackpj.Service.DeadlineService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/deadlines")
public class DeadlineController {

    private final DeadlineService deadlineService;
    private final UserRepository userRepository;

    public DeadlineController(DeadlineService deadlineService, UserRepository userRepository) {
        this.deadlineService = deadlineService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<DeadlineResponseDto>> getRelevant(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<DeadlineResponseDto> result = deadlineService.getRelevant(user).stream()
                .map(DeadlineResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/admin")
    public ResponseEntity<Page<DeadlineResponseDto>> getAdmin(
            @RequestParam(required = false) DeadlineCategory category,
            @RequestParam(required = false) RepeatType repeatType,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("deadlineDate").ascending());
        Page<DeadlineResponseDto> result = deadlineService.getAllForAdmin(category, repeatType, active, pageable)
                .map(DeadlineResponseDto::fromEntity);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeadlineResponseDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(DeadlineResponseDto.fromEntity(deadlineService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<DeadlineResponseDto> create(
            @RequestBody DeadlineDto dto,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User creator = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Deadline created = deadlineService.create(dto, creator);
        return ResponseEntity.ok(DeadlineResponseDto.fromEntity(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeadlineResponseDto> update(
            @PathVariable Long id,
            @RequestBody DeadlineDto dto) {
        return ResponseEntity.ok(DeadlineResponseDto.fromEntity(deadlineService.update(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        deadlineService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/notify")
    public ResponseEntity<Void> notifyNow(@PathVariable Long id) {
        deadlineService.notifyUsers(id);
        return ResponseEntity.ok().build();
    }
}
