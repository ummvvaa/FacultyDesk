package org.example.fullstackpj.Dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.fullstackpj.Entity.Template;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateRecommendation {
    private Template template;
    private double score;
    private List<String> matchedKeywords;
}
