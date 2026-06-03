package org.example.fullstackpj.Service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Dto.KkkChecklistDto;
import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Repository.DeadlineRepository;
import org.example.fullstackpj.Repository.GeneratedDocumentRepository;
import org.example.fullstackpj.Repository.NotificationRepository;
import org.example.fullstackpj.Repository.PublicationRepository;
import org.example.fullstackpj.Repository.RecordRepository;
import org.example.fullstackpj.Service.KkkService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Slf4j
public class UserContextBuilder {

    private final KkkService kkkService;
    private final PublicationRepository publicationRepo;
    private final DeadlineRepository deadlineRepo;
    private final NotificationRepository notificationRepo;
    private final GeneratedDocumentRepository genDocRepo;
    private final RecordRepository recordRepo;
    private final ObjectMapper objectMapper;

    public UserContextBuilder(@Lazy KkkService kkkService,
                              PublicationRepository publicationRepo,
                              DeadlineRepository deadlineRepo,
                              NotificationRepository notificationRepo,
                              GeneratedDocumentRepository genDocRepo,
                              RecordRepository recordRepo,
                              ObjectMapper objectMapper) {
        this.kkkService = kkkService;
        this.publicationRepo = publicationRepo;
        this.deadlineRepo = deadlineRepo;
        this.notificationRepo = notificationRepo;
        this.genDocRepo = genDocRepo;
        this.recordRepo = recordRepo;
        this.objectMapper = objectMapper;
    }

    public String buildContext(User user) {
        try {
            Map<String, Object> ctx = new LinkedHashMap<>();

            ctx.put("name", user.getUsername());
            ctx.put("username", user.getUsername());
            ctx.put("role", user.getRole());
            ctx.put("position", user.getPosition());
            ctx.put("academicDegree", user.getAcademicDegree());
            ctx.put("academicTitle", user.getAcademicTitle());
            ctx.put("researchAreas", user.getResearchAreas());

            if ("ROLE_TEACHER".equals(user.getRole())) {
                try {
                    KkkChecklistDto checklist = kkkService.calculateChecklist(user, Locale.getDefault());
                    ctx.put("kkkCompletion", checklist.getCompletionPercentage() + "%");
                    Map<String, Object> kkk = new LinkedHashMap<>();
                    kkk.put("profileCompleted", checklist.isProfileCompleted());
                    kkk.put("educationAdded", checklist.isEducationAdded());
                    kkk.put("publicationsLast5Years", checklist.isPublicationsLast5Years());
                    kkk.put("doiLinksAdded", checklist.isDoiLinksAdded());
                    kkk.put("confirmationFilesUploaded", checklist.isConfirmationFilesUploaded());
                    kkk.put("qualificationCoursesLast3Years", checklist.isQualificationCoursesLast3Years());
                    kkk.put("awardsPatentsAdded", checklist.isAwardsPatentsAdded());
                    kkk.put("englishLevelAdded", checklist.isEnglishLevelAdded());
                    ctx.put("kkkChecklist", kkk);
                } catch (Exception e) {
                    log.warn("KKK checklist build failed for {}: {}", user.getUsername(), e.getMessage());
                }

                int currentYear = LocalDate.now().getYear();
                ctx.put("publicationsLast5Years",
                        publicationRepo.countByAuthorAndPublicationYearGreaterThanEqual(user, currentYear - 5));
                ctx.put("scopusPublications",
                        publicationRepo.countByAuthorAndDatabaseType(user, DatabaseType.SCOPUS));
                ctx.put("koksonPublications",
                        publicationRepo.countByAuthorAndDatabaseType(user, DatabaseType.KOKSON));

                List<Deadline> deadlines = deadlineRepo
                        .findRelevantForUser(user, user.getRole(), false).stream()
                        .filter(d -> d.getDeadlineDate() != null && d.getDeadlineDate().isAfter(LocalDateTime.now()))
                        .limit(5)
                        .collect(Collectors.toList());
                ctx.put("upcomingDeadlines", deadlines.stream().map(d -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("title", d.getTitle());
                    m.put("date", d.getDeadlineDate().toLocalDate().toString());
                    m.put("category", d.getCategory() != null ? d.getCategory().name() : null);
                    return m;
                }).collect(Collectors.toList()));

                ctx.put("recentReportsCount", recordRepo.countByAuthor(user));
                ctx.put("generatedDocumentsCount", genDocRepo.countByTeacher(user));
            }

            ctx.put("unreadNotificationsCount", notificationRepo.countByUserAndReadFalse(user));

            return objectMapper.writeValueAsString(ctx);
        } catch (Exception e) {
            log.warn("UserContextBuilder failed for {}: {}", user.getUsername(), e.getMessage());
            return "{}";
        }
    }
}
