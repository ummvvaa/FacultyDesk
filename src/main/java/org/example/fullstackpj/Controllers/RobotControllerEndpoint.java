package org.example.fullstackpj.Controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.UserRepository;
import org.example.fullstackpj.Service.RobotControllerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/robot")
@RequiredArgsConstructor
@Slf4j
public class RobotControllerEndpoint {

    private final RobotControllerService robotService;
    private final UserRepository userRepository;

    @PostMapping("/upload-and-run")
    public ResponseEntity<Map<String, Object>> uploadAndRun(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        try {
            User admin = userRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            Path savedFile = robotService.uploadExcel(file, admin);

            robotService.triggerRobotRun(savedFile);

            return ResponseEntity.ok(Map.of(
                    "message", "Robot started",
                    "filename", savedFile.getFileName().toString(),
                    "status", "RUNNING"
            ));
        } catch (Exception e) {
            log.error("Upload+run failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "RobotStartFailed",
                    "message", e.getMessage()
            ));
        }
    }
}
