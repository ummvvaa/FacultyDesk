package org.example.fullstackpj.Dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.User;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherSearchResult {
    private User teacher;
    private double score;
    private List<String> matchedFields;
    private List<Publication> relevantPublications;
    private String matchReason;
}
