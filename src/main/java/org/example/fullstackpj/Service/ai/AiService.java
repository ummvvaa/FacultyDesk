package org.example.fullstackpj.Service.ai;

import org.example.fullstackpj.Dto.ai.KkkGapAnalysis;
import org.example.fullstackpj.Dto.ai.PublicationFieldSuggestions;
import org.example.fullstackpj.Dto.ai.PublicationMetadata;
import org.example.fullstackpj.Dto.ai.TeacherSearchResult;
import org.example.fullstackpj.Dto.ai.TemplateRecommendation;
import org.example.fullstackpj.Entity.Category;
import org.example.fullstackpj.Entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;

public interface AiService {
    List<TemplateRecommendation> recommendTemplates(String query, User user, int limit);

    PublicationMetadata extractPublicationMetadata(MultipartFile pdf); // Phase 8b

    KkkGapAnalysis analyzeKkkGaps(User user, Locale locale); // Phase 8c

    String generateProfileSummary(User user, Locale locale); // Phase 8c

    User saveProfileSummary(User user, String summary); // Phase 8c

    List<TeacherSearchResult> searchByResearchInterests(String query, int limit);

    String generateRecordDescription(String title, Category category, User user, Locale locale); // Phase D

    PublicationFieldSuggestions suggestPublicationFields(String journalName, Locale locale); // Phase D
}
