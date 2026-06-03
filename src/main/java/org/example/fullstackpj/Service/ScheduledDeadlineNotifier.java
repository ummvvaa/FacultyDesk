package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.RepeatType;
import org.example.fullstackpj.Repository.DeadlineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Component
public class ScheduledDeadlineNotifier {

    private static final Logger log = LoggerFactory.getLogger(ScheduledDeadlineNotifier.class);

    private final DeadlineRepository deadlineRepository;
    private final DeadlineService deadlineService;
    private final NotificationService notificationService;

    public ScheduledDeadlineNotifier(DeadlineRepository deadlineRepository,
                                     DeadlineService deadlineService,
                                     NotificationService notificationService) {
        this.deadlineRepository = deadlineRepository;
        this.deadlineService = deadlineService;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkDeadlines() {
        log.info("Running scheduled deadline notifier");
        LocalDate today = LocalDate.now();

        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(8).atStartOfDay();

        List<Deadline> upcoming = deadlineRepository.findByActiveTrueAndDeadlineDateBetween(start, end);

        for (Deadline deadline : upcoming) {
            LocalDate deadlineDay = deadline.getDeadlineDate().toLocalDate();
            long daysLeft = today.until(deadlineDay, java.time.temporal.ChronoUnit.DAYS);

            String type;
            if (daysLeft == 7) {
                type = "DEADLINE_APPROACHING_WEEK";
            } else if (daysLeft == 3) {
                type = "DEADLINE_APPROACHING_3DAYS";
            } else if (daysLeft == 1) {
                type = "DEADLINE_TOMORROW";
            } else {
                continue;
            }

            List<User> recipients = deadlineService.resolveTargetUsers(deadline);
            for (User user : recipients) {
                if (!notificationService.deadlineNotificationExists(user, type, deadline.getId())) {
                    notificationService.createDeadlineNotification(user, deadline, type);
                }
            }
            deadline.setLastNotificationSent(LocalDateTime.now());
            deadlineRepository.save(deadline);
        }

        // Handle overdue repeating deadlines
        List<Deadline> overdue = deadlineRepository.findByActiveTrueAndDeadlineDateBefore(
                LocalDateTime.now().minusDays(1));
        for (Deadline deadline : overdue) {
            if (deadline.getRepeatType() == RepeatType.ONE_TIME) continue;

            // Notify OVERDUE
            List<User> recipients = deadlineService.resolveTargetUsers(deadline);
            String overdueType = "DEADLINE_OVERDUE";
            for (User user : recipients) {
                if (!notificationService.deadlineNotificationExists(user, overdueType, deadline.getId())) {
                    notificationService.createDeadlineNotification(user, deadline, overdueType);
                }
            }

            // Create next occurrence
            Deadline next = cloneForNextPeriod(deadline);
            deadlineRepository.save(next);
            deadline.setActive(false);
            deadlineRepository.save(deadline);
            log.info("Rolled over deadline '{}' to {}", deadline.getTitle(), next.getDeadlineDate());
        }
    }

    private Deadline cloneForNextPeriod(Deadline original) {
        Deadline next = new Deadline();
        next.setTitle(original.getTitle());
        next.setDescription(original.getDescription());
        next.setCategory(original.getCategory());
        next.setTargetRole(original.getTargetRole());
        next.setTargetUsers(original.getTargetUsers());
        next.setRepeatType(original.getRepeatType());
        next.setActive(true);
        next.setCreatedBy(original.getCreatedBy());
        next.setCreatedAt(LocalDateTime.now());
        next.setUpdatedAt(LocalDateTime.now());

        LocalDateTime nextDate = switch (original.getRepeatType()) {
            case MONTHLY -> original.getDeadlineDate().plusMonths(1);
            case QUARTERLY -> original.getDeadlineDate().plusMonths(3);
            case SEMESTER -> original.getDeadlineDate().plusMonths(6);
            case ANNUAL -> original.getDeadlineDate().plusYears(1);
            default -> original.getDeadlineDate();
        };
        next.setDeadlineDate(nextDate);
        return next;
    }
}
