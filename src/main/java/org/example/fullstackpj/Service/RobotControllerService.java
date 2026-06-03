package org.example.fullstackpj.Service;

import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class RobotControllerService {

    @Value("${app.robot.input-dir:./robot/input}")
    private String inputDir;

    @Value("${app.robot.python-script:./robot/main.py}")
    private String pythonScript;

    @Value("${app.robot.python-bin:python3}")
    private String pythonBin;

    @Value("${app.robot.execution-timeout-seconds:600}")
    private long executionTimeoutSeconds;

    public Path uploadExcel(MultipartFile file, User uploadedBy) throws IOException {
        if (file.isEmpty()) throw new RuntimeException("Empty file");
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase().endsWith(".xlsx")) {
            throw new RuntimeException("Only .xlsx files are allowed");
        }
        if (file.getSize() > 25L * 1024 * 1024) {
            throw new RuntimeException("File too large (max 25 MB)");
        }

        Path inputPath = Paths.get(inputDir).toAbsolutePath().normalize();
        Files.createDirectories(inputPath);

        String safeName = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
                + "_" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path target = inputPath.resolve(safeName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        log.info("Excel uploaded by {}: {}", uploadedBy.getUsername(), target);
        return target;
    }

    public CompletableFuture<Void> triggerRobotRun(Path excelPath) {
        return CompletableFuture.runAsync(() -> {
            try {
                log.info("Starting robot for file: {}", excelPath);

                Path scriptPath = Paths.get(pythonScript).toAbsolutePath().normalize();
                ProcessBuilder pb = new ProcessBuilder(
                        pythonBin, scriptPath.toString(), "--input", excelPath.toString()
                );
                pb.redirectErrorStream(true);
                pb.directory(scriptPath.getParent().toFile());

                Process process = pb.start();

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        log.info("[robot] {}", line);
                    }
                }

                boolean finished = process.waitFor(executionTimeoutSeconds, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    log.error("Robot timeout after {} seconds", executionTimeoutSeconds);
                    throw new RuntimeException("Robot execution timeout");
                }

                int exitCode = process.exitValue();
                log.info("Robot finished with exit code {}", exitCode);
                if (exitCode != 0) {
                    throw new RuntimeException("Robot failed with exit code " + exitCode);
                }
            } catch (Exception e) {
                log.error("Robot execution error: {}", e.getMessage(), e);
                throw new RuntimeException("Robot error: " + e.getMessage(), e);
            }
        });
    }
}
