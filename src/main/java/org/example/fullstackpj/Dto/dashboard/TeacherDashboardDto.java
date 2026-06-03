package org.example.fullstackpj.Dto.dashboard;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class TeacherDashboardDto {

    private int kkkCompletion;

    private long publicationsTotal;
    private long publicationsScopus;
    private long publicationsKokson;
    private long publicationsOther;
    private Map<Integer, Long> publicationsByYear;

    private long generatedDocsCount;
    private String lastGeneratedDocDate;

    private Map<String, Long> reportsByStatus;
    private Map<String, Long> reportsByMonth;

    private List<DeadlineInfo> upcomingDeadlines;
    private List<NotificationInfo> recentNotifications;
    private List<TemplateInfo> templateUpdates;

    @Data
    @Builder
    public static class DeadlineInfo {
        private Long id;
        private String title;
        private String deadlineDate;
        private String category;
    }

    @Data
    @Builder
    public static class NotificationInfo {
        private Long id;
        private String title;
        private String message;
        private String type;
        private boolean read;
        private String createdAt;
    }

    @Data
    @Builder
    public static class TemplateInfo {
        private Long id;
        private String name;
        private String description;
        private String category;
        private String updatedAt;
    }
}
