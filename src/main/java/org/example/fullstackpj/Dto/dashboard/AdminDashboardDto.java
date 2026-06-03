package org.example.fullstackpj.Dto.dashboard;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AdminDashboardDto {

    private long totalTeachers;
    private long incompleteProfiles;

    private long totalPublications;
    private long pendingPublications;

    private long totalReports;
    private long pendingReports;

    private long generatedDocsThisMonth;
    private String lastRobotRunStatus;

    private Map<String, Long> publicationsByDatabase;
    private Map<String, Long> publicationsByType;

    private List<KkkTeacherInfo> kkkReadinessByTeacher;

    private Map<String, Long> reportsByStatus;
    private Map<String, Long> generatedDocsByMonth;

    private RobotRunInfo lastRobotRun;
    private List<TeacherActivityInfo> topActiveTeachers;

    @Data
    @Builder
    public static class KkkTeacherInfo {
        private Long teacherId;
        private String username;
        private int completionPercentage;
    }

    @Data
    @Builder
    public static class RobotRunInfo {
        private Long id;
        private String status;
        private String startedAt;
        private Integer processedCount;
        private Integer errorCount;
        private Integer generatedCount;
    }

    @Data
    @Builder
    public static class TeacherActivityInfo {
        private Long userId;
        private String username;
        private long activityCount;
    }
}
