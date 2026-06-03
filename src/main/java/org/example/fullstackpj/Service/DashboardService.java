package org.example.fullstackpj.Service;

import org.example.fullstackpj.Dto.dashboard.AdminDashboardDto;
import org.example.fullstackpj.Dto.dashboard.TeacherDashboardDto;
import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.GeneratedDocument;
import org.example.fullstackpj.Entity.KkkProfile;
import org.example.fullstackpj.Entity.Notification;
import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.RobotRun;
import org.example.fullstackpj.Entity.Template;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.PublicationStatus;
import org.example.fullstackpj.Entity.enums.RobotRunStatus;
import org.example.fullstackpj.Entity.enums.TemplateStatus;
import org.example.fullstackpj.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Autowired private PublicationRepository publicationRepository;
    @Autowired private GeneratedDocumentRepository generatedDocumentRepository;
    @Autowired private RecordRepository recordRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private TemplateRepository templateRepository;
    @Autowired private DeadlineRepository deadlineRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private KkkProfileRepository kkkProfileRepository;
    @Autowired private RobotRunRepository robotRunRepository;
    @Autowired private ActivityRepository activityRepository;
    @Autowired private KkkService kkkService;

    // ---- Teacher dashboard ----

    public TeacherDashboardDto buildTeacherDashboard(User teacher) {
        int currentYear = LocalDate.now().getYear();

        // KKK completion — use persistent field (updated on each KKK page visit)
        KkkProfile kkkProfile = kkkProfileRepository.findByTeacher(teacher).orElse(null);
        int kkkCompletion = kkkProfile != null && kkkProfile.getCompletionPercentage() != null
                ? kkkProfile.getCompletionPercentage() : 0;

        // Publications
        List<Publication> allPubs = publicationRepository.findByAuthorOrderByPublicationYearDesc(teacher);
        long pubScopus = allPubs.stream().filter(p -> p.getDatabaseType() == DatabaseType.SCOPUS).count();
        long pubKokson = allPubs.stream().filter(p -> p.getDatabaseType() == DatabaseType.KOKSON).count();
        long pubOther = allPubs.size() - pubScopus - pubKokson;

        Map<Integer, Long> pubsByYear = new LinkedHashMap<>();
        for (int y = currentYear - 4; y <= currentYear; y++) {
            final int yr = y;
            pubsByYear.put(yr, allPubs.stream().filter(p -> Objects.equals(p.getPublicationYear(), yr)).count());
        }

        // Generated docs
        long genDocsCount = generatedDocumentRepository.countByTeacher(teacher);
        Optional<GeneratedDocument> lastDoc = generatedDocumentRepository.findTopByTeacherOrderByGenerationDateDesc(teacher);
        String lastDocDate = lastDoc.map(d -> d.getGenerationDate() != null ? d.getGenerationDate().format(DT_FMT) : null).orElse(null);

        // Reports by status
        List<org.example.fullstackpj.Entity.Record> myRecords = recordRepository.findByAuthorId(teacher.getId());
        Map<String, Long> reportsByStatus = myRecords.stream()
                .collect(Collectors.groupingBy(r -> r.getStatus() != null ? r.getStatus() : "PENDING", Collectors.counting()));

        // Reports by month (last 6 months)
        Map<String, Long> reportsByMonth = new LinkedHashMap<>();
        LocalDate sixMonthsAgo = LocalDate.now().minusMonths(5);
        for (int i = 0; i < 6; i++) {
            LocalDate m = sixMonthsAgo.plusMonths(i);
            String key = m.format(MONTH_FMT);
            reportsByMonth.put(key, 0L);
        }
        for (org.example.fullstackpj.Entity.Record r : myRecords) {
            if (r.getCreatedAt() == null) continue;
            LocalDate d = r.getCreatedAt().toLocalDate();
            if (!d.isBefore(sixMonthsAgo.withDayOfMonth(1))) {
                String key = d.format(MONTH_FMT);
                reportsByMonth.merge(key, 1L, Long::sum);
            }
        }

        // Upcoming deadlines (top 5, future only)
        List<Deadline> deadlines = deadlineRepository.findRelevantForUser(teacher, teacher.getRole(), false);
        LocalDateTime now = LocalDateTime.now();
        List<TeacherDashboardDto.DeadlineInfo> upcomingDeadlines = deadlines.stream()
                .filter(d -> d.getDeadlineDate() != null && d.getDeadlineDate().isAfter(now))
                .sorted(Comparator.comparing(Deadline::getDeadlineDate))
                .limit(5)
                .map(d -> TeacherDashboardDto.DeadlineInfo.builder()
                        .id(d.getId())
                        .title(d.getTitle())
                        .deadlineDate(d.getDeadlineDate().format(DT_FMT))
                        .category(d.getCategory() != null ? d.getCategory().name() : null)
                        .build())
                .collect(Collectors.toList());

        // Recent notifications (top 5)
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(teacher);
        List<TeacherDashboardDto.NotificationInfo> recentNotifications = notifications.stream()
                .limit(5)
                .map(n -> TeacherDashboardDto.NotificationInfo.builder()
                        .id(n.getId())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .type(n.getType())
                        .read(n.isRead())
                        .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().format(DT_FMT) : null)
                        .build())
                .collect(Collectors.toList());

        // Template updates: ACTIVE templates updated in last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<TeacherDashboardDto.TemplateInfo> templateUpdates = templateRepository
                .findByStatus(TemplateStatus.ACTIVE).stream()
                .filter(t -> t.getUpdatedAt() != null && t.getUpdatedAt().isAfter(thirtyDaysAgo)
                        || t.getLastUpdateDate() != null && t.getLastUpdateDate().isAfter(thirtyDaysAgo))
                .sorted(Comparator.comparing(
                        t -> t.getLastUpdateDate() != null ? t.getLastUpdateDate() : t.getUpdatedAt(),
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(t -> TeacherDashboardDto.TemplateInfo.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .description(t.getDescription())
                        .category(t.getTemplateCategory() != null ? t.getTemplateCategory().name() : null)
                        .updatedAt(t.getLastUpdateDate() != null ? t.getLastUpdateDate().format(DT_FMT)
                                : t.getUpdatedAt() != null ? t.getUpdatedAt().format(DT_FMT) : null)
                        .build())
                .collect(Collectors.toList());

        return TeacherDashboardDto.builder()
                .kkkCompletion(kkkCompletion)
                .publicationsTotal(allPubs.size())
                .publicationsScopus(pubScopus)
                .publicationsKokson(pubKokson)
                .publicationsOther(pubOther)
                .publicationsByYear(pubsByYear)
                .generatedDocsCount(genDocsCount)
                .lastGeneratedDocDate(lastDocDate)
                .reportsByStatus(reportsByStatus)
                .reportsByMonth(reportsByMonth)
                .upcomingDeadlines(upcomingDeadlines)
                .recentNotifications(recentNotifications)
                .templateUpdates(templateUpdates)
                .build();
    }

    // ---- Admin dashboard ----

    public AdminDashboardDto buildAdminDashboard() {
        // Teachers
        List<User> allUsers = userRepository.findAll();
        List<User> teachers = allUsers.stream()
                .filter(u -> "ROLE_TEACHER".equals(u.getRole()))
                .collect(Collectors.toList());
        long totalTeachers = teachers.size();
        long incompleteProfiles = teachers.stream()
                .filter(u -> isBlank(u.getAcademicDegree()) || isBlank(u.getPosition()))
                .count();

        // Publications
        long totalPublications = publicationRepository.count();
        long pendingPublications = publicationRepository.countByStatus(PublicationStatus.SUBMITTED);

        // Reports
        long totalReports = recordRepository.count();
        List<org.example.fullstackpj.Entity.Record> allRecords = recordRepository.findAll();
        long pendingReports = allRecords.stream().filter(r -> "PENDING".equals(r.getStatus())).count();

        // Generated docs this month
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = monthStart.plusMonths(1);
        long generatedDocsThisMonth = generatedDocumentRepository.findByGenerationDateBetween(monthStart, monthEnd).size();

        // Last robot run
        Optional<RobotRun> latestRun = robotRunRepository.findTopByOrderByStartedAtDesc();
        String lastRobotRunStatus = latestRun.map(r -> r.getStatus().name()).orElse("NONE");
        AdminDashboardDto.RobotRunInfo robotRunInfo = latestRun.map(r -> AdminDashboardDto.RobotRunInfo.builder()
                .id(r.getId())
                .status(r.getStatus().name())
                .startedAt(r.getStartedAt() != null ? r.getStartedAt().format(DT_FMT) : null)
                .processedCount(r.getProcessedCount())
                .errorCount(r.getErrorCount())
                .generatedCount(r.getGeneratedCount())
                .build()).orElse(null);

        // Publications by database
        Map<String, Long> pubsByDb = new LinkedHashMap<>();
        publicationRepository.countGroupByDatabaseType()
                .forEach(row -> pubsByDb.put(row[0].toString(), (Long) row[1]));

        // Publications by type
        Map<String, Long> pubsByType = new LinkedHashMap<>();
        publicationRepository.countGroupByPublicationType()
                .forEach(row -> pubsByType.put(row[0].toString(), (Long) row[1]));

        // KKK readiness: top 20 by completionPercentage (persistent field)
        List<AdminDashboardDto.KkkTeacherInfo> kkkReadiness = kkkProfileRepository.findAll().stream()
                .filter(p -> p.getTeacher() != null)
                .sorted(Comparator.comparingInt(p -> -safeCompletion(p)))
                .limit(20)
                .map(p -> AdminDashboardDto.KkkTeacherInfo.builder()
                        .teacherId(p.getTeacher().getId())
                        .username(p.getTeacher().getUsername())
                        .completionPercentage(safeCompletion(p))
                        .build())
                .collect(Collectors.toList());

        // Reports by status
        Map<String, Long> reportsByStatus = allRecords.stream()
                .collect(Collectors.groupingBy((org.example.fullstackpj.Entity.Record r) -> r.getStatus() != null ? r.getStatus() : "PENDING", Collectors.counting()));

        // Generated docs by month (last 12 months)
        Map<String, Long> genDocsByMonth = new LinkedHashMap<>();
        LocalDate twelveMonthsAgo = LocalDate.now().minusMonths(11);
        for (int i = 0; i < 12; i++) {
            genDocsByMonth.put(twelveMonthsAgo.plusMonths(i).format(MONTH_FMT), 0L);
        }
        generatedDocumentRepository.findAll().stream()
                .filter(d -> d.getGenerationDate() != null)
                .forEach(d -> {
                    String key = d.getGenerationDate().format(MONTH_FMT);
                    if (genDocsByMonth.containsKey(key)) {
                        genDocsByMonth.merge(key, 1L, Long::sum);
                    }
                });

        // Top active teachers (last month)
        LocalDateTime sinceLastMonth = LocalDateTime.now().minusDays(30);
        List<AdminDashboardDto.TeacherActivityInfo> topActive = activityRepository
                .findTopActiveUsersSince(sinceLastMonth).stream()
                .limit(5)
                .map(row -> AdminDashboardDto.TeacherActivityInfo.builder()
                        .userId((Long) row[0])
                        .username((String) row[1])
                        .activityCount((Long) row[2])
                        .build())
                .collect(Collectors.toList());

        return AdminDashboardDto.builder()
                .totalTeachers(totalTeachers)
                .incompleteProfiles(incompleteProfiles)
                .totalPublications(totalPublications)
                .pendingPublications(pendingPublications)
                .totalReports(totalReports)
                .pendingReports(pendingReports)
                .generatedDocsThisMonth(generatedDocsThisMonth)
                .lastRobotRunStatus(lastRobotRunStatus)
                .publicationsByDatabase(pubsByDb)
                .publicationsByType(pubsByType)
                .kkkReadinessByTeacher(kkkReadiness)
                .reportsByStatus(reportsByStatus)
                .generatedDocsByMonth(genDocsByMonth)
                .lastRobotRun(robotRunInfo)
                .topActiveTeachers(topActive)
                .build();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private int safeCompletion(KkkProfile p) {
        return p.getCompletionPercentage() != null ? p.getCompletionPercentage() : 0;
    }
}
