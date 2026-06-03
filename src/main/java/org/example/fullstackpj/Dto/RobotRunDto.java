package org.example.fullstackpj.Dto;

import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.RobotRun;
import org.example.fullstackpj.Entity.enums.RobotRunStatus;

import java.time.LocalDateTime;

@Getter
@Setter
public class RobotRunDto {
    private Long id;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private RobotRunStatus status;
    private String sourceFile;
    private Integer processedCount;
    private Integer errorCount;
    private Integer generatedCount;
    private String errorLog;
    private String summary;
    private String triggeredBy;
    private LocalDateTime rolledBackAt;
    private String rolledBackByName;

    public static RobotRunDto fromEntity(RobotRun r) {
        RobotRunDto dto = new RobotRunDto();
        dto.setId(r.getId());
        dto.setStartedAt(r.getStartedAt());
        dto.setFinishedAt(r.getFinishedAt());
        dto.setStatus(r.getStatus());
        dto.setSourceFile(r.getSourceFile());
        dto.setProcessedCount(r.getProcessedCount());
        dto.setErrorCount(r.getErrorCount());
        dto.setGeneratedCount(r.getGeneratedCount());
        dto.setErrorLog(r.getErrorLog());
        dto.setSummary(r.getSummary());
        dto.setTriggeredBy(r.getTriggeredBy());
        dto.setRolledBackAt(r.getRolledBackAt());
        if (r.getRolledBackBy() != null) {
            try {
                dto.setRolledBackByName(r.getRolledBackBy().getFirstName() + " " + r.getRolledBackBy().getLastName());
            } catch (Exception e) {
                dto.setRolledBackByName(null);
            }
        }
        return dto;
    }
}
