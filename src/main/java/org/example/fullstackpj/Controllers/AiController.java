package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Dto.ai.KkkGapAnalysis;
import org.example.fullstackpj.Dto.ai.PublicationFieldSuggestions;
import org.example.fullstackpj.Dto.ai.PublicationMetadata;
import org.example.fullstackpj.Dto.ai.TeacherSearchResult;
import org.example.fullstackpj.Dto.ai.TemplateRecommendation;
import org.example.fullstackpj.Entity.Category;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.CategoryRepository;
import org.example.fullstackpj.Service.UserService;
import org.example.fullstackpj.Service.ai.AiService;
import org.example.fullstackpj.Service.ai.AiUnavailableException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ObjectProvider<AiService> aiServiceProvider;
    private final UserService userService;
    private final CategoryRepository categoryRepo;

    public AiController(ObjectProvider<AiService> aiServiceProvider, UserService userService, CategoryRepository categoryRepo) {
        this.aiServiceProvider = aiServiceProvider;
        this.userService = userService;
        this.categoryRepo = categoryRepo;
    }

    private AiService getAiService() {
        AiService svc = aiServiceProvider.getIfAvailable();
        if (svc == null) {
            throw new AiUnavailableException("AI временно недоступен. GROQ_API_KEY не настроен или Groq API недоступен.");
        }
        return svc;
    }

    @PostMapping("/templates/recommend")
    public ResponseEntity<List<TemplateRecommendation>> recommendTemplates(
            @RequestBody Map<String, Object> body) {
        String query = body.get("query") != null ? body.get("query").toString() : "";
        int limit = 5;
        Object limitVal = body.get("limit");
        if (limitVal instanceof Number) {
            limit = ((Number) limitVal).intValue();
        } else if (limitVal != null) {
            try { limit = Integer.parseInt(limitVal.toString()); } catch (NumberFormatException ignored) {}
        }
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(getAiService().recommendTemplates(query, user, limit));
    }

    @GetMapping("/teachers/search")
    public ResponseEntity<List<TeacherSearchResult>> searchTeachers(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "10") int limit) {
        return ResponseEntity.ok(getAiService().searchByResearchInterests(query, limit));
    }

    @PostMapping("/publications/extract")
    public ResponseEntity<PublicationMetadata> extractPublicationMetadata(
            @RequestParam("pdf") MultipartFile pdf) {
        return ResponseEntity.ok(getAiService().extractPublicationMetadata(pdf));
    }

    @GetMapping("/profile/check")
    public ResponseEntity<KkkGapAnalysis> checkProfileGaps(
            @RequestParam(required = false, defaultValue = "ru") String locale) {
        User user = userService.getCurrentUser();
        Locale loc = "en".equalsIgnoreCase(locale) ? Locale.ENGLISH : new Locale("ru");
        return ResponseEntity.ok(getAiService().analyzeKkkGaps(user, loc));
    }

    @GetMapping("/profile/summary")
    public ResponseEntity<Map<String, String>> generateProfileSummary(
            @RequestParam(required = false, defaultValue = "ru") String locale) {
        User user = userService.getCurrentUser();
        Locale loc = "en".equalsIgnoreCase(locale) ? Locale.ENGLISH : new Locale("ru");
        String summary = getAiService().generateProfileSummary(user, loc);
        return ResponseEntity.ok(Map.of("summary", summary == null ? "" : summary));
    }

    @PostMapping("/profile/summary/save")
    public ResponseEntity<Map<String, String>> saveProfileSummary(
            @RequestBody Map<String, String> body) {
        User user = userService.getCurrentUser();
        String summary = body.getOrDefault("summary", "");
        getAiService().saveProfileSummary(user, summary);
        return ResponseEntity.ok(Map.of("summary", summary));
    }

    @PostMapping("/records/generate-description")
    public ResponseEntity<Map<String, String>> generateRecordDescription(
            @RequestBody Map<String, Object> body,
            @RequestParam(defaultValue = "ru") String locale) {
        String title = body.get("title") != null ? body.get("title").toString() : "";
        Long categoryId = body.get("categoryId") != null
                ? Long.valueOf(body.get("categoryId").toString())
                : null;
        Category category = categoryId != null
                ? categoryRepo.findById(categoryId).orElse(null)
                : null;
        User user = userService.getCurrentUser();
        Locale loc = "en".equalsIgnoreCase(locale) ? Locale.ENGLISH : new Locale("ru");
        String description = getAiService().generateRecordDescription(title, category, user, loc);
        return ResponseEntity.ok(Map.of("description", description));
    }

    @GetMapping("/publications/suggest-fields")
    public ResponseEntity<PublicationFieldSuggestions> suggestPublicationFields(
            @RequestParam String journalName,
            @RequestParam(defaultValue = "ru") String locale) {
        Locale loc = "en".equalsIgnoreCase(locale) ? Locale.ENGLISH : new Locale("ru");
        return ResponseEntity.ok(getAiService().suggestPublicationFields(journalName, loc));
    }
}
