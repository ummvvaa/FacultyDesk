package org.example.fullstackpj.Service;

import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Entity.GeneratedDocument;
import org.example.fullstackpj.Entity.RobotRun;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.GeneratedDocStatus;
import org.example.fullstackpj.Entity.enums.NotificationPriority;
import org.example.fullstackpj.Entity.enums.NotificationType;
import org.example.fullstackpj.Entity.enums.RobotRunStatus;
import org.example.fullstackpj.Repository.GeneratedDocumentRepository;
import org.example.fullstackpj.Repository.RobotRunRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class RobotRunService {

    private static final String GENERATED_DIR = "src/main/resources/static/generated";

    private final RobotRunRepository robotRunRepository;
    private final GeneratedDocumentRepository generatedDocRepo;
    private final NotificationService notificationService;

    public RobotRunService(RobotRunRepository robotRunRepository,
                           GeneratedDocumentRepository generatedDocRepo,
                           NotificationService notificationService) {
        this.robotRunRepository = robotRunRepository;
        this.generatedDocRepo = generatedDocRepo;
        this.notificationService = notificationService;
    }

    @Transactional
    public RobotRun startRun(String sourceFile, String triggeredBy) {
        RobotRun run = new RobotRun();
        run.setSourceFile(sourceFile);
        run.setTriggeredBy(triggeredBy != null ? triggeredBy : "robot");
        run.setStatus(RobotRunStatus.RUNNING);
        return robotRunRepository.save(run);
    }

    @Transactional
    public RobotRun finishRun(Long id, RobotRunStatus status, Integer processedCount,
            Integer errorCount, Integer generatedCount, String errorLog, String summary) {
        RobotRun run = robotRunRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("RobotRun not found: " + id));
        run.setStatus(status);
        run.setFinishedAt(LocalDateTime.now());
        if (processedCount != null) run.setProcessedCount(processedCount);
        if (errorCount != null) run.setErrorCount(errorCount);
        if (generatedCount != null) run.setGeneratedCount(generatedCount);
        if (errorLog != null) run.setErrorLog(errorLog);
        if (summary != null) run.setSummary(summary);
        RobotRun saved = robotRunRepository.save(run);

        // Trigger notifications for admins
        if (status == RobotRunStatus.SUCCESS) {
            String msg = "Robot run completed successfully. Generated: "
                    + (generatedCount != null ? generatedCount : 0) + " documents.";
            notificationService.broadcastToRole(
                    "ROLE_ADMIN",
                    "Robot run completed",
                    msg,
                    NotificationType.ROBOT_COMPLETED,
                    saved.getId(), "ROBOT_RUN",
                    NotificationPriority.NORMAL);
        } else if (status == RobotRunStatus.FAILED || status == RobotRunStatus.PARTIAL) {
            String msg = "Robot run finished with status " + status.name()
                    + ". Errors: " + (errorCount != null ? errorCount : 0) + ".";
            notificationService.broadcastToRole(
                    "ROLE_ADMIN",
                    "Robot run failed",
                    msg,
                    NotificationType.ROBOT_FAILED,
                    saved.getId(), "ROBOT_RUN",
                    NotificationPriority.HIGH);
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<RobotRun> getAll(Pageable pageable) {
        return robotRunRepository.findAllByOrderByStartedAtDesc(pageable);
    }

    @Transactional(readOnly = true)
    public RobotRun getById(Long id) {
        return robotRunRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("RobotRun not found: " + id));
    }

    @Transactional(readOnly = true)
    public Optional<RobotRun> getLatest() {
        return robotRunRepository.findTopByOrderByStartedAtDesc();
    }

    @Transactional
    public void incrementGeneratedCount(Long robotRunId) {
        robotRunRepository.findById(robotRunId).ifPresent(run -> {
            run.setGeneratedCount((run.getGeneratedCount() == null ? 0 : run.getGeneratedCount()) + 1);
            robotRunRepository.save(run);
        });
    }

    @Transactional
    public void rollback(Long runId, User admin) {
        RobotRun run = robotRunRepository.findById(runId)
                .orElseThrow(() -> new RuntimeException("RobotRun not found: " + runId));

        if (run.getStatus() == RobotRunStatus.ROLLED_BACK) {
            throw new RuntimeException("Already rolled back");
        }
        if (run.getStatus() == RobotRunStatus.RUNNING) {
            throw new RuntimeException("Cannot rollback a running execution");
        }

        List<GeneratedDocument> docs = generatedDocRepo.findByRobotRunId(runId);
        log.info("Rolling back run {} — soft-deleting {} documents", runId, docs.size());

        for (GeneratedDocument doc : docs) {
            if (doc.getStatus() == GeneratedDocStatus.DELETED) continue;

            doc.setStatus(GeneratedDocStatus.DELETED);
            doc.setDeletedAt(LocalDateTime.now());
            doc.setDeletedBy(admin);
            generatedDocRepo.save(doc);

            try {
                if (doc.getFilePath() != null) {
                    Path filePath = Paths.get(GENERATED_DIR, doc.getFilePath()).toAbsolutePath().normalize();
                    if (Files.exists(filePath)) {
                        Files.delete(filePath);
                    }
                }
            } catch (IOException e) {
                log.warn("Could not delete file for doc {}: {}", doc.getId(), e.getMessage());
            }

            notificationService.createNotification(
                    doc.getTeacher(),
                    "Document rolled back",
                    "Document '" + doc.getTitle() + "' was rolled back by admin",
                    NotificationType.DOCUMENT_ROLLED_BACK,
                    doc.getId(), "GENERATED_DOCUMENT",
                    NotificationPriority.NORMAL
            );
        }

        run.setStatus(RobotRunStatus.ROLLED_BACK);
        run.setRolledBackAt(LocalDateTime.now());
        run.setRolledBackBy(admin);
        robotRunRepository.save(run);
    }
}
