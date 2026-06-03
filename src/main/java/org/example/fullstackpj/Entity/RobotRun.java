package org.example.fullstackpj.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.RobotRunStatus;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Getter
@Setter
@Entity
@Table(name = "robot_runs")
public class RobotRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'RUNNING'")
    private RobotRunStatus status = RobotRunStatus.RUNNING;

    private String sourceFile;

    @Column(columnDefinition = "integer default 0")
    private Integer processedCount = 0;

    @Column(columnDefinition = "integer default 0")
    private Integer errorCount = 0;

    @Column(columnDefinition = "integer default 0")
    private Integer generatedCount = 0;

    @Column(columnDefinition = "TEXT")
    private String errorLog;

    @Column(columnDefinition = "TEXT")
    private String summary;

    private String triggeredBy;

    private LocalDateTime rolledBackAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rolled_back_by_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User rolledBackBy;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) startedAt = LocalDateTime.now();
    }
}
