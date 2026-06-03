package org.example.fullstackpj.Dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KkkGapAnalysis {
    private int completionPercentage;
    private List<MissingItem> missingItems;
    private List<MissingItem> topRecommendations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MissingItem {
        private String key;
        private String priority; // critical | important | niceToHave
        private String recommendation;
    }
}
