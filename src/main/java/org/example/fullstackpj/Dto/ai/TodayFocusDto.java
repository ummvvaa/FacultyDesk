package org.example.fullstackpj.Dto.ai;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TodayFocusDto {

    private String greeting;
    private String aiMessage;
    private int deadlinesToday;
    private int deadlinesApproaching;
    private int unreadNotifications;
    private int returnedReports;
    private int kkkCompletion;
    private boolean kkkReturned;
    private List<PriorityAction> priorityActions;

    @Data
    @Builder
    public static class PriorityAction {
        private String label;
        private String path;
        private String icon;
        private String urgency; // "high", "medium", "low"
    }
}
