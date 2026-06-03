package org.example.fullstackpj.Service.ai.groq;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.example.fullstackpj.Dto.KkkChecklistDto;
import org.example.fullstackpj.Dto.ai.KkkGapAnalysis;
import org.example.fullstackpj.Dto.ai.PublicationFieldSuggestions;
import org.example.fullstackpj.Dto.ai.PublicationMetadata;
import org.example.fullstackpj.Dto.ai.TeacherSearchResult;
import org.example.fullstackpj.Dto.ai.TemplateRecommendation;
import org.example.fullstackpj.Entity.Category;
import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.Template;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.PublicationStatus;
import org.example.fullstackpj.Entity.enums.TemplateStatus;
import org.example.fullstackpj.Repository.PublicationRepository;
import org.example.fullstackpj.Repository.TemplateRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.example.fullstackpj.Service.KkkService;
import org.example.fullstackpj.Service.ai.AiService;
import org.example.fullstackpj.Service.ai.AiUnavailableException;
import org.example.fullstackpj.Service.ai.PdfTextExtractor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;

@Service
@ConditionalOnBean(GroqClient.class)
@Slf4j
public class GroqAiServiceImpl implements AiService {

    private final GroqClient groq;
    private final TemplateRepository templateRepo;
    private final UserRepository userRepo;
    private final PublicationRepository publicationRepo;
    private final KkkService kkkService;
    private final ObjectMapper objectMapper;

    public GroqAiServiceImpl(GroqClient groq,
                             TemplateRepository templateRepo,
                             UserRepository userRepo,
                             PublicationRepository publicationRepo,
                             @Lazy KkkService kkkService,
                             ObjectMapper objectMapper) {
        this.groq = groq;
        this.templateRepo = templateRepo;
        this.userRepo = userRepo;
        this.publicationRepo = publicationRepo;
        this.kkkService = kkkService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Cacheable(value = "templateRecommendations", key = "#query + ':' + #limit")
    public List<TemplateRecommendation> recommendTemplates(String query, User user, int limit) {
        if (query == null || query.isBlank()) return List.of();
        try {
            List<Template> activeTemplates = templateRepo.findByStatus(TemplateStatus.ACTIVE);
            if (activeTemplates.isEmpty()) return List.of();

            String templatesJson = activeTemplates.stream()
                    .map(t -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", t.getId());
                        m.put("name", t.getName() != null ? t.getName() : "");
                        m.put("description", truncate(t.getDescription(), 150));
                        m.put("category", t.getTemplateCategory() != null ? t.getTemplateCategory().name() : "");
                        return m;
                    })
                    .map(this::toJson)
                    .collect(Collectors.joining(",\n"));

            String systemPrompt = """
                    You are an assistant for an IT department. Given a user query and a list of templates,
                    select the top %d most relevant templates and explain why each matches.
                    Return ONLY valid JSON in this exact format (no markdown, no code blocks):
                    {"recommendations":[{"templateId":<id>,"score":<0-1>,"reason":"<short explanation>","matchedKeywords":["kw1","kw2"]}]}
                    """.formatted(limit);

            String userPrompt = """
                    Query: %s

                    Available templates:
                    [%s]
                    """.formatted(query, templatesJson);

            GroqRecommendationsResponse response = groq.chatJson(systemPrompt, userPrompt, GroqRecommendationsResponse.class, "template-search");
            if (response == null || response.getRecommendations() == null) return List.of();

            return response.getRecommendations().stream()
                    .map(r -> {
                        Template t = activeTemplates.stream()
                                .filter(tpl -> tpl.getId().equals(r.getTemplateId()))
                                .findFirst().orElse(null);
                        if (t == null) return null;
                        return TemplateRecommendation.builder()
                                .template(t)
                                .score(r.getScore())
                                .matchedKeywords(r.getMatchedKeywords() != null ? r.getMatchedKeywords() : List.of())
                                .build();
                    })
                    .filter(Objects::nonNull)
                    .limit(limit)
                    .collect(Collectors.toList());
        } catch (GroqException e) {
            log.error("Groq AI unavailable for recommendTemplates: {}", e.getMessage());
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    @Override
    @Cacheable(value = "teacherSearch", key = "#query + ':' + #limit")
    public List<TeacherSearchResult> searchByResearchInterests(String query, int limit) {
        if (query == null || query.isBlank()) return List.of();
        try {
            List<User> teachers = userRepo.findAll().stream()
                    .filter(u -> "ROLE_TEACHER".equals(u.getRole()))
                    .collect(Collectors.toList());

            // Preload publications per teacher so we can send IDs (Groq needs real IDs to return them)
            Map<Long, List<Publication>> teacherPubs = new java.util.HashMap<>();
            for (User t : teachers) {
                List<Publication> pubs = publicationRepo
                        .findByAuthorAndStatusOrderByPublicationYearDesc(t, PublicationStatus.VERIFIED)
                        .stream().limit(20).collect(Collectors.toList());
                teacherPubs.put(t.getId(), pubs);
            }

            String teachersJson = teachers.stream()
                    .map(t -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", t.getId());
                        m.put("name", t.getUsername() != null ? t.getUsername() : "");
                        m.put("position", t.getPosition() != null ? t.getPosition() : "");
                        m.put("researchAreas", t.getResearchAreas() != null ? t.getResearchAreas() : "");
                        m.put("profileDescription", truncate(t.getAiSummary(), 200));
                        List<Map<String, Object>> pubList = teacherPubs.getOrDefault(t.getId(), List.of())
                                .stream()
                                .map(p -> {
                                    Map<String, Object> pm = new LinkedHashMap<>();
                                    pm.put("id", p.getId());
                                    pm.put("title", p.getTitle());
                                    if (p.getJournalName() != null) pm.put("journal", p.getJournalName());
                                    if (p.getPublicationYear() != null) pm.put("year", p.getPublicationYear());
                                    return pm;
                                })
                                .collect(Collectors.toList());
                        m.put("verifiedPublications", pubList);
                        return m;
                    })
                    .map(this::toJson)
                    .collect(Collectors.joining(",\n"));

            String systemPrompt = """
                    Ты — поисковая система научных руководителей. По запросу студента найди преподавателей,
                    чьи научные интересы ИЛИ публикации релевантны запросу.

                    Стратегия поиска (применяй оба критерия):
                    1. Проверь поле researchAreas на семантическое совпадение с запросом.
                    2. Проверь verifiedPublications — если ЛЮБАЯ публикация связана с темой запроса,
                       преподаватель является совпадением. Используй семантическую близость
                       (например, "машинное обучение" совпадает с "нейронные сети").
                       Возвращай id публикаций из поля id в verifiedPublications.

                    Верни ТОЛЬКО валидный JSON без markdown:
                    {"results":[{"teacherId":<id>,"score":<0-1>,"matchedFields":["researchAreas","publications"],"reason":"<1 предложение почему этот преподаватель подходит (на русском)>","relevantPublicationIds":[<id>, ...]}]}
                    Топ %d результатов. Включай только реально релевантных (score > 0.3).
                    """.formatted(limit);

            String userPrompt = "Запрос: " + query + "\n\nПреподаватели: [" + teachersJson + "]";

            GroqTeacherSearchResponse response = groq.chatJson(systemPrompt, userPrompt, GroqTeacherSearchResponse.class, "teacher-search");
            if (response == null || response.getResults() == null) return List.of();

            return response.getResults().stream()
                    .map(r -> {
                        User teacher = teachers.stream()
                                .filter(u -> u.getId().equals(r.getTeacherId()))
                                .findFirst().orElse(null);
                        if (teacher == null) return null;
                        List<Publication> relevantPubs = r.getRelevantPublicationIds() != null && !r.getRelevantPublicationIds().isEmpty()
                                ? publicationRepo.findAllById(r.getRelevantPublicationIds())
                                : List.of();
                        return TeacherSearchResult.builder()
                                .teacher(teacher)
                                .score(r.getScore())
                                .matchedFields(r.getMatchedFields() != null ? r.getMatchedFields() : List.of())
                                .relevantPublications(relevantPubs)
                                .matchReason(r.getReason())
                                .build();
                    })
                    .filter(Objects::nonNull)
                    .limit(limit)
                    .collect(Collectors.toList());
        } catch (GroqException e) {
            log.error("Groq AI unavailable for searchByResearchInterests: {}", e.getMessage());
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    @Override
    @Cacheable(value = "kkkGaps", key = "#user.id + ':' + #locale.language")
    public KkkGapAnalysis analyzeKkkGaps(User user, Locale locale) {
        if (user == null) {
            return KkkGapAnalysis.builder()
                    .completionPercentage(0)
                    .missingItems(new ArrayList<>())
                    .topRecommendations(new ArrayList<>())
                    .build();
        }
        try {
            KkkChecklistDto checklist = kkkService.calculateChecklist(user, locale);

            Map<String, Object> checklistStatus = new LinkedHashMap<>();
            checklistStatus.put("profileCompleted", checklist.isProfileCompleted());
            checklistStatus.put("educationAdded", checklist.isEducationAdded());
            checklistStatus.put("workExperienceAdded", checklist.isWorkExperienceAdded());
            checklistStatus.put("qualificationCoursesLast3Years", checklist.isQualificationCoursesLast3Years());
            checklistStatus.put("publicationsLast5Years", checklist.isPublicationsLast5Years());
            checklistStatus.put("doiLinksAdded", checklist.isDoiLinksAdded());
            checklistStatus.put("confirmationFilesUploaded", checklist.isConfirmationFilesUploaded());
            checklistStatus.put("awardsPatentsAdded", checklist.isAwardsPatentsAdded());
            checklistStatus.put("englishLevelAdded", checklist.isEnglishLevelAdded());

            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("name", user.getUsername() != null ? user.getUsername() : "");
            ctx.put("position", user.getPosition() != null ? user.getPosition() : "");
            ctx.put("academicDegree", user.getAcademicDegree() != null ? user.getAcademicDegree() : "");
            ctx.put("researchAreas", user.getResearchAreas() != null ? user.getResearchAreas() : "");
            ctx.put("completionPercentage", checklist.getCompletionPercentage());
            ctx.put("checklistStatus", checklistStatus);
            ctx.put("publicationsCount", publicationRepo
                    .countByAuthorAndPublicationYearGreaterThanEqual(user, LocalDate.now().getYear() - 5));

            String userContextJson = toJson(ctx);

            String langName = "en".equals(locale != null ? locale.getLanguage() : "") ? "English" : "Russian";
            String systemPrompt = """
                    You are an expert advisor for IT department KKK (academic qualification commission) preparation in Kazakhstan.
                    Given a teacher's profile data, generate personalized recommendations in %s.

                    Priority order: critical (publications, DOI, confirmations) > important (courses, education, work) > niceToHave (awards, english, profile).

                    Return ONLY valid JSON:
                    {
                      "completionPercentage": <int>,
                      "missingItems": [
                        {"key": "<checklist key>", "priority": "critical|important|niceToHave", "recommendation": "<concrete actionable advice, max 200 chars>"}
                      ],
                      "topRecommendations": [<top-3 most critical items, same format>]
                    }
                    """.formatted(langName);

            String userPrompt = "Teacher data:\n" + userContextJson + "\n\nGenerate recommendations.";

            KkkGapAnalysis result = groq.chatJson(systemPrompt, userPrompt, KkkGapAnalysis.class, "kkk-recommendations");
            if (result == null) {
                throw new GroqException("Empty KKK analysis from Groq", null);
            }
            result.setCompletionPercentage(checklist.getCompletionPercentage());
            if (result.getMissingItems() == null) result.setMissingItems(new ArrayList<>());
            if (result.getTopRecommendations() == null) result.setTopRecommendations(new ArrayList<>());
            return result;
        } catch (GroqException e) {
            log.error("Groq AI unavailable for analyzeKkkGaps: {}", e.getMessage());
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    @Override
    @Cacheable(value = "profileSummary", key = "#user.id + ':' + #locale.language")
    public String generateProfileSummary(User user, Locale locale) {
        if (user == null) return "";
        try {
            int currentYear = LocalDate.now().getYear();
            List<Publication> all = publicationRepo.findByAuthorOrderByPublicationYearDesc(user);
            long pubsLast5 = all.stream()
                    .filter(p -> p.getStatus() == PublicationStatus.VERIFIED)
                    .filter(p -> p.getPublicationYear() != null && p.getPublicationYear() >= currentYear - 5)
                    .count();
            long scopusCount = all.stream()
                    .filter(p -> p.getStatus() == PublicationStatus.VERIFIED)
                    .filter(p -> p.getDatabaseType() == DatabaseType.SCOPUS)
                    .count();
            long koksonCount = all.stream()
                    .filter(p -> p.getStatus() == PublicationStatus.VERIFIED)
                    .filter(p -> p.getDatabaseType() == DatabaseType.KOKSON)
                    .count();

            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("fullName", user.getUsername() != null ? user.getUsername() : "");
            ctx.put("position", user.getPosition() != null ? user.getPosition() : "");
            ctx.put("academicDegree", user.getAcademicDegree() != null ? user.getAcademicDegree() : "");
            ctx.put("academicTitle", user.getAcademicTitle() != null ? user.getAcademicTitle() : "");
            ctx.put("researchAreas", user.getResearchAreas() != null ? user.getResearchAreas() : "");
            ctx.put("publicationsLast5", pubsLast5);
            ctx.put("scopusPublications", scopusCount);
            ctx.put("koksonPublications", koksonCount);

            String userContext = toJson(ctx);

            String langName = "en".equals(locale != null ? locale.getLanguage() : "") ? "English" : "Russian";
            String systemPrompt = """
                    Generate a professional academic summary for a teacher's profile in %s.
                    3-4 sentences. Tone: professional, factual, no exaggeration.
                    Include: degree+title, position, research interests, publication count breakdown (Scopus/KOKSON), professional development.
                    Return ONLY the summary text, no JSON, no markdown.
                    """.formatted(langName);

            return groq.chat(systemPrompt, userContext, "profile-summary");
        } catch (GroqException e) {
            log.error("Groq AI unavailable for generateProfileSummary: {}", e.getMessage());
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    @Override
    public PublicationMetadata extractPublicationMetadata(MultipartFile pdf) {
        try {
            String text;
            try {
                text = PdfTextExtractor.extractText(pdf);
            } catch (IOException e) {
                throw new GroqException("PDF read failure", e);
            }
            if (text == null || text.isBlank()) {
                return PublicationMetadata.builder().confidence(0).build();
            }
            if (text.length() > 3000) text = text.substring(0, 3000);

            String systemPrompt = """
                    Extract publication metadata from this PDF text. Return ONLY valid JSON:
                    {
                      "title": "<paper title>",
                      "authors": "<comma-separated authors>",
                      "year": <int>,
                      "doi": "<DOI or null>",
                      "journalName": "<journal>",
                      "publicationType": "SCOPUS_JOURNAL|SCOPUS_CONFERENCE|WOS_ARTICLE|KOKSON_ARTICLE|LOCAL_JOURNAL|CONFERENCE_PAPER|PATENT|CERTIFICATE|OTHER",
                      "databaseType": "SCOPUS|WEB_OF_SCIENCE|KOKSON|OTHER",
                      "confidence": <0-1, how confident are you>
                    }
                    """;

            return groq.chatJson(systemPrompt, "PDF text:\n" + text, PublicationMetadata.class, "pdf-extract");
        } catch (GroqException e) {
            log.error("Groq AI unavailable for extractPublicationMetadata: {}", e.getMessage());
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    @Override
    public User saveProfileSummary(User user, String summary) {
        if (user == null) return null;
        user.setAiSummary(summary);
        return userRepo.save(user);
    }

    @Override
    public String generateRecordDescription(String title, Category category, User user, Locale locale) {
        try {
            String langName = "en".equals(locale.getLanguage()) ? "English" : "Russian";
            String systemPrompt = """
                    You are helping a university teacher write a report description for admin review.
                    Generate a professional 2-3 sentence description in %s based on report title and category.
                    The description will help admin understand what this report is about.
                    Tone: formal, factual, concise.
                    Return ONLY the description text, no JSON.
                    """.formatted(langName);

            String userPrompt = """
                    Report title: %s
                    Category: %s
                    Teacher position: %s
                    Teacher research areas: %s
                    """.formatted(
                    title,
                    category != null ? category.getName() : "General",
                    user.getPosition() != null ? user.getPosition() : "Teacher",
                    user.getResearchAreas() != null ? user.getResearchAreas() : ""
            );

            return groq.chat(systemPrompt, userPrompt, "record-description");
        } catch (GroqException e) {
            log.error("Groq AI unavailable for generateRecordDescription: {}", e.getMessage());
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    @Override
    @Cacheable(value = "publicationSuggestions", key = "#journalName")
    public PublicationFieldSuggestions suggestPublicationFields(String journalName, Locale locale) {
        if (journalName == null || journalName.trim().length() < 3) {
            return PublicationFieldSuggestions.builder().confidence(0.0).build();
        }
        try {
            String systemPrompt = """
                    You are an academic database expert. Given a journal/conference name, provide known metadata.
                    Return ONLY valid JSON (no markdown, no code blocks):
                    {
                      "journalName": "<normalized canonical name>",
                      "issn": "<ISSN if you know it, otherwise null>",
                      "publicationType": "SCOPUS_JOURNAL|SCOPUS_CONFERENCE|WOS_ARTICLE|KOKSON_ARTICLE|LOCAL_JOURNAL|CONFERENCE_PAPER|OTHER",
                      "databaseType": "SCOPUS|WEB_OF_SCIENCE|KOKSON|OTHER",
                      "quartile": "Q1|Q2|Q3|Q4|NONE",
                      "publisher": "<publisher name or null>",
                      "indexedDatabases": ["Scopus","Web of Science"],
                      "confidence": <0.0-1.0, how sure are you>
                    }
                    If you don't know the journal, return confidence=0 and minimal data.
                    Don't make up information. Only return what you're confident about.
                    """;

            String userPrompt = "Journal name: " + journalName;
            return groq.chatJson(systemPrompt, userPrompt, PublicationFieldSuggestions.class, "publication-suggest");
        } catch (GroqException e) {
            log.error("Groq AI unavailable for suggestPublicationFields: {}", e.getMessage());
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    @Data
    public static class GroqRecommendationsResponse {
        private List<Rec> recommendations;

        @Data
        public static class Rec {
            private Long templateId;
            private double score;
            private String reason;
            private List<String> matchedKeywords;
        }
    }

    @Data
    public static class GroqTeacherSearchResponse {
        private List<Result> results;

        @Data
        public static class Result {
            private Long teacherId;
            private double score;
            private List<String> matchedFields;
            private String reason;
            private List<Long> relevantPublicationIds;
        }
    }
}
