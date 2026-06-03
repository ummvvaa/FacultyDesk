package org.example.fullstackpj.Service.ai;

import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Dto.ai.TodayFocusDto;
import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Entity.KkkProfile;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.KkkStatus;
import org.example.fullstackpj.Repository.DeadlineRepository;
import org.example.fullstackpj.Repository.KkkProfileRepository;
import org.example.fullstackpj.Repository.NotificationRepository;
import org.example.fullstackpj.Repository.RecordRepository;
import org.example.fullstackpj.Service.ai.groq.GroqClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TodayFocusService {

    private final DeadlineRepository deadlineRepo;
    private final NotificationRepository notificationRepo;
    private final RecordRepository recordRepo;
    private final KkkProfileRepository kkkRepo;
    private final ObjectProvider<GroqClient> groqClientProvider;
    private final AiMetrics aiMetrics;

    public TodayFocusService(DeadlineRepository deadlineRepo,
                              NotificationRepository notificationRepo,
                              RecordRepository recordRepo,
                              KkkProfileRepository kkkRepo,
                              ObjectProvider<GroqClient> groqClientProvider,
                              AiMetrics aiMetrics) {
        this.deadlineRepo = deadlineRepo;
        this.notificationRepo = notificationRepo;
        this.recordRepo = recordRepo;
        this.kkkRepo = kkkRepo;
        this.groqClientProvider = groqClientProvider;
        this.aiMetrics = aiMetrics;
    }

    public TodayFocusDto generateFocus(User user, Locale locale) {
        LocalDate today = LocalDate.now();

        List<Deadline> allDeadlines = deadlineRepo.findRelevantForUser(user, user.getRole(), false);

        List<Deadline> todayDeadlines = allDeadlines.stream()
                .filter(d -> d.getDeadlineDate().toLocalDate().equals(today))
                .collect(Collectors.toList());

        List<Deadline> approachingDeadlines = allDeadlines.stream()
                .filter(d -> {
                    LocalDate dd = d.getDeadlineDate().toLocalDate();
                    return dd.isAfter(today) && dd.isBefore(today.plusDays(4));
                })
                .collect(Collectors.toList());

        long unreadNotifs = notificationRepo.countByUserAndReadFalse(user);

        List<Record> returnedReports = recordRepo.findByAuthorAndStatus(user, "RETURNED");

        KkkProfile kkk = kkkRepo.findByTeacher(user).orElse(null);
        int kkkCompletion = kkk != null ? (kkk.getCompletionPercentage() != null ? kkk.getCompletionPercentage() : 0) : 0;
        boolean kkkReturned = kkk != null && kkk.getStatus() == KkkStatus.RETURNED_FOR_CORRECTION;

        List<TodayFocusDto.PriorityAction> actions = buildPriorityActions(
                todayDeadlines, returnedReports, kkkReturned, (int) unreadNotifs, locale);

        TodayFocusDto partial = TodayFocusDto.builder()
                .greeting(buildGreeting(user, locale))
                .deadlinesToday(todayDeadlines.size())
                .deadlinesApproaching(approachingDeadlines.size())
                .unreadNotifications((int) unreadNotifs)
                .returnedReports(returnedReports.size())
                .kkkCompletion(kkkCompletion)
                .kkkReturned(kkkReturned)
                .priorityActions(actions)
                .build();

        String aiMessage;
        GroqClient groqClient = groqClientProvider.getIfAvailable();
        if (groqClient != null) {
            try {
                aiMessage = generateAiMessage(groqClient, partial, locale);
            } catch (Exception e) {
                log.warn("Today's Focus AI generation failed: {}", e.getMessage());
                aiMessage = buildFallbackMessage(partial, locale);
            }
        } else {
            aiMessage = buildFallbackMessage(partial, locale);
        }

        return TodayFocusDto.builder()
                .greeting(partial.getGreeting())
                .aiMessage(aiMessage)
                .deadlinesToday(partial.getDeadlinesToday())
                .deadlinesApproaching(partial.getDeadlinesApproaching())
                .unreadNotifications(partial.getUnreadNotifications())
                .returnedReports(partial.getReturnedReports())
                .kkkCompletion(partial.getKkkCompletion())
                .kkkReturned(partial.isKkkReturned())
                .priorityActions(actions)
                .build();
    }

    private String generateAiMessage(GroqClient groqClient, TodayFocusDto context, Locale locale) {
        String langName = "en".equals(locale.getLanguage()) ? "English" : "Russian";
        String systemPrompt = """
                You are a personal assistant for an academic. Generate a SHORT, encouraging
                "today's focus" message based on user data. 1-3 sentences max. Be specific.
                Mention concrete numbers from context. Respond in %s.
                Tone: warm, motivating, action-oriented. Don't list everything — pick what's most important.
                Examples:
                - "Доброе утро! Сегодня deadline по квартальному отчёту — успевайте до конца дня. Также 2 уведомления ждут внимания."
                - "У вас 3 дня до подачи KKK, прогресс 67%%. Сосредоточьтесь на добавлении DOI к публикациям."
                Return ONLY the message, no JSON, no markdown.
                """.formatted(langName);

        String contextJson = String.format("""
                {
                  "deadlinesToday": %d,
                  "deadlinesApproaching": %d,
                  "unreadNotifications": %d,
                  "returnedReports": %d,
                  "kkkCompletion": %d,
                  "kkkReturned": %s,
                  "hour": %d
                }""",
                context.getDeadlinesToday(),
                context.getDeadlinesApproaching(),
                context.getUnreadNotifications(),
                context.getReturnedReports(),
                context.getKkkCompletion(),
                context.isKkkReturned(),
                LocalTime.now().getHour()
        );

        return groqClient.chat(systemPrompt, contextJson, "today-focus");
    }

    private String buildGreeting(User user, Locale locale) {
        int hour = LocalTime.now().getHour();
        boolean ru = "ru".equals(locale.getLanguage());
        String name = user.getUsername();
        if (hour < 12) return ru ? "Доброе утро, " + name : "Good morning, " + name;
        if (hour < 18) return ru ? "Добрый день, " + name : "Good afternoon, " + name;
        return ru ? "Добрый вечер, " + name : "Good evening, " + name;
    }

    private String buildFallbackMessage(TodayFocusDto context, Locale locale) {
        boolean ru = "ru".equals(locale.getLanguage());
        if (context.getDeadlinesToday() > 0) {
            return ru
                    ? "У вас " + context.getDeadlinesToday() + " дедлайн(ов) сегодня!"
                    : "You have " + context.getDeadlinesToday() + " deadline(s) today!";
        }
        if (context.getReturnedReports() > 0) {
            return ru
                    ? "Есть отчёты на доработку — посмотрите комментарии администратора."
                    : "Reports need fixes — check admin comments.";
        }
        if (context.isKkkReturned()) {
            return ru
                    ? "Ваше КПД возвращено на доработку. Проверьте комментарии."
                    : "Your KKK was returned for correction. Check comments.";
        }
        if (context.getDeadlinesApproaching() > 0) {
            return ru
                    ? "Приближается " + context.getDeadlinesApproaching() + " дедлайн(ов) в ближайшие 3 дня."
                    : context.getDeadlinesApproaching() + " deadline(s) approaching in the next 3 days.";
        }
        return ru ? "Всё под контролем. Хорошего дня!" : "All under control. Have a great day!";
    }

    private List<TodayFocusDto.PriorityAction> buildPriorityActions(
            List<Deadline> todayDeadlines,
            List<Record> returnedReports,
            boolean kkkReturned,
            int unreadNotifs,
            Locale locale) {

        boolean ru = "ru".equals(locale.getLanguage());
        List<TodayFocusDto.PriorityAction> actions = new ArrayList<>();

        if (!todayDeadlines.isEmpty()) {
            actions.add(TodayFocusDto.PriorityAction.builder()
                    .label(ru ? "Дедлайны сегодня" : "Today's Deadlines")
                    .path("/deadlines")
                    .icon("Calendar")
                    .urgency("high")
                    .build());
        }
        if (!returnedReports.isEmpty()) {
            actions.add(TodayFocusDto.PriorityAction.builder()
                    .label(ru ? "Исправить отчёты" : "Fix Reports")
                    .path("/documents")
                    .icon("FileText")
                    .urgency("high")
                    .build());
        }
        if (kkkReturned) {
            actions.add(TodayFocusDto.PriorityAction.builder()
                    .label(ru ? "Доработать КПД" : "Fix KKK")
                    .path("/kkk")
                    .icon("GraduationCap")
                    .urgency("high")
                    .build());
        }
        if (unreadNotifs > 0) {
            actions.add(TodayFocusDto.PriorityAction.builder()
                    .label(ru ? "Уведомления" : "Notifications")
                    .path("/notifications")
                    .icon("Bell")
                    .urgency("medium")
                    .build());
        }
        if (actions.size() < 2) {
            actions.add(TodayFocusDto.PriorityAction.builder()
                    .label(ru ? "Мой профиль KKK" : "KKK Profile")
                    .path("/kkk")
                    .icon("GraduationCap")
                    .urgency("low")
                    .build());
        }
        return actions;
    }
}
