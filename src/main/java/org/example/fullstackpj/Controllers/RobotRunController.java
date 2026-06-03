package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Dto.RobotRunDto;
import org.example.fullstackpj.Entity.RobotRun;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.RobotRunStatus;
import org.example.fullstackpj.Repository.UserRepository;
import org.example.fullstackpj.Service.RobotRunService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/robot/runs")
public class RobotRunController {

    private final RobotRunService robotRunService;
    private final UserRepository userRepository;

    public RobotRunController(RobotRunService robotRunService, UserRepository userRepository) {
        this.robotRunService = robotRunService;
        this.userRepository = userRepository;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startRun(@RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails principal) {
        try {
            String sourceFile = body.getOrDefault("sourceFile", "unknown");
            String triggeredBy = principal != null ? principal.getUsername() : "robot";
            RobotRun run = robotRunService.startRun(sourceFile, triggeredBy);
            return ResponseEntity.ok(Map.of(
                    "id", run.getId(),
                    "startedAt", run.getStartedAt().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/finish")
    public ResponseEntity<?> finishRun(@PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            RobotRunStatus status = parseStatus(body.getOrDefault("status", "SUCCESS").toString());
            Integer processedCount = parseInteger(body.get("processedCount"));
            Integer errorCount = parseInteger(body.get("errorCount"));
            Integer generatedCount = parseInteger(body.get("generatedCount"));
            String errorLog = body.get("errorLog") != null ? body.get("errorLog").toString() : null;
            String summary = body.get("summary") != null ? body.get("summary").toString() : null;
            RobotRun run = robotRunService.finishRun(id, status, processedCount,
                    errorCount, generatedCount, errorLog, summary);
            return ResponseEntity.ok(RobotRunDto.fromEntity(run));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<Page<RobotRunDto>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        Page<RobotRunDto> result = robotRunService.getAll(pageable).map(RobotRunDto::fromEntity);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatest() {
        return robotRunService.getLatest()
                .<ResponseEntity<?>>map(run -> ResponseEntity.ok(RobotRunDto.fromEntity(run)))
                .orElseGet(() -> ResponseEntity.ok(Map.of("message", "No runs yet")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(RobotRunDto.fromEntity(robotRunService.getById(id)));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/rollback")
    public ResponseEntity<?> rollbackRun(@PathVariable Long id, Authentication auth) {
        try {
            User admin = userRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            robotRunService.rollback(id, admin);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    private RobotRunStatus parseStatus(String value) {
        try {
            return RobotRunStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return RobotRunStatus.SUCCESS;
        }
    }

    private Integer parseInteger(Object value) {
        if (value == null) return null;
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
