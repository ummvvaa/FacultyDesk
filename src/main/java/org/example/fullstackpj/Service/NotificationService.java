package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.GeneratedDocument;
import org.example.fullstackpj.Entity.KkkProfile;
import org.example.fullstackpj.Entity.Notification;
import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.KkkStatus;
import org.example.fullstackpj.Entity.enums.NotificationPriority;
import org.example.fullstackpj.Entity.enums.NotificationType;
import org.example.fullstackpj.Repository.NotificationRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // ── Core create (all optional params) ──────────────────────────────────

    public Notification createNotification(User user, String title, String message, String type) {
        return createNotification(user, title, message, type, null, null, NotificationPriority.NORMAL);
    }

    public Notification createNotification(User user, String title, String message, String type,
                                           Long relatedId, String relatedType) {
        return createNotification(user, title, message, type, relatedId, relatedType, NotificationPriority.NORMAL);
    }

    public Notification createNotification(User user, String title, String message, String type,
                                           Long relatedId, String relatedType, NotificationPriority priority) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRelatedId(relatedId);
        notification.setRelatedType(relatedType);
        notification.setPriority(priority != null ? priority : NotificationPriority.NORMAL);
        return notificationRepository.save(notification);
    }

    // Typed overload with NotificationType enum
    public Notification createNotification(User user, String title, String message,
                                           NotificationType type, Long objectId, String objectType,
                                           NotificationPriority priority) {
        return createNotification(user, title, message, type.name(), objectId, objectType, priority);
    }

    // ── Broadcast ──────────────────────────────────────────────────────────

    /**
     * Send the same notification to all users with the given role string (e.g. "ROLE_ADMIN").
     */
    public void broadcastToRole(String role, String title, String message,
                                NotificationType type, Long objectId, String objectType) {
        broadcastToRole(role, title, message, type, objectId, objectType, NotificationPriority.NORMAL);
    }

    public void broadcastToRole(String role, String title, String message,
                                NotificationType type, Long objectId, String objectType,
                                NotificationPriority priority) {
        List<User> targets = userRepository.findAll().stream()
                .filter(u -> role.equals(u.getRole()))
                .toList();
        for (User u : targets) {
            createNotification(u, title, message, type.name(), objectId, objectType, priority);
        }
    }

    // ── Reads ──────────────────────────────────────────────────────────────

    public List<Notification> getUserNotifications(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public List<Notification> getUnreadNotifications(User user) {
        return notificationRepository.findByUserAndReadFalseOrderByCreatedAtDesc(user);
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByUserAndReadFalse(user);
    }

    // ── Mark read / delete ─────────────────────────────────────────────────

    public void markAsRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only mark your own notifications as read");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    public void markAllAsRead(User user) {
        List<Notification> notifications = notificationRepository.findByUserAndReadFalseOrderByCreatedAtDesc(user);
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    public void deleteNotification(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only delete your own notifications");
        }
        notificationRepository.delete(notification);
    }

    // ── Domain-specific convenience methods ────────────────────────────────

    public Notification createGeneratedDocNotification(User teacher, GeneratedDocument doc) {
        return createNotification(teacher,
                "New document generated",
                "Document '" + doc.getTitle() + "' has been generated and is ready for review",
                NotificationType.GENERATED_DOCUMENT_UPLOADED.name(),
                doc.getId(), "GENERATED_DOCUMENT",
                NotificationPriority.NORMAL);
    }

    public Notification createPublicationNotification(User author, Publication pub, String type) {
        String title = switch (type) {
            case "PUBLICATION_VERIFIED" -> "Publication verified";
            case "PUBLICATION_REJECTED" -> "Publication rejected";
            case "PUBLICATION_NEEDS_CORRECTION" -> "Publication needs correction";
            default -> "Publication update";
        };
        NotificationPriority priority = "PUBLICATION_REJECTED".equals(type) || "PUBLICATION_NEEDS_CORRECTION".equals(type)
                ? NotificationPriority.HIGH : NotificationPriority.NORMAL;
        return createNotification(author, title,
                "Publication '" + pub.getTitle() + "': " + title.toLowerCase(),
                type, pub.getId(), "PUBLICATION", priority);
    }

    public Notification createKkkNotification(User teacher, KkkProfile profile, KkkStatus newStatus) {
        String title = switch (newStatus) {
            case CHECKED -> "KKK profile checked";
            case RETURNED_FOR_CORRECTION -> "KKK profile returned for correction";
            case READY -> "KKK profile is ready";
            default -> "KKK status updated";
        };
        String message = "Your KKK profile status changed to: " + newStatus.name()
                + (profile.getReviewerComment() != null ? ". Comment: " + profile.getReviewerComment() : "");
        return createNotification(teacher, title, message,
                NotificationType.KKK_STATUS_CHANGED.name(),
                profile.getId(), "KKK_PROFILE",
                NotificationPriority.NORMAL);
    }

    public boolean deadlineNotificationExists(User user, String type, Long deadlineId) {
        return notificationRepository.existsByUserAndTypeAndRelatedId(user, type, deadlineId);
    }

    public Notification createDeadlineNotification(User user, Deadline deadline, String type) {
        String title = switch (type) {
            case "DEADLINE_REMINDER" -> "Deadline reminder";
            case "DEADLINE_APPROACHING_WEEK" -> "Deadline in 7 days";
            case "DEADLINE_APPROACHING_3DAYS" -> "Deadline in 3 days";
            case "DEADLINE_TOMORROW" -> "Deadline tomorrow";
            case "DEADLINE_OVERDUE" -> "Deadline overdue";
            default -> "Deadline notification";
        };
        NotificationPriority priority = switch (type) {
            case "DEADLINE_TOMORROW", "DEADLINE_OVERDUE" -> NotificationPriority.HIGH;
            case "DEADLINE_APPROACHING_3DAYS" -> NotificationPriority.HIGH;
            case "DEADLINE_APPROACHING_WEEK" -> NotificationPriority.NORMAL;
            default -> NotificationPriority.LOW;
        };
        return createNotification(user, title,
                deadline.getTitle() + ": " + deadline.getDeadlineDate().toLocalDate(),
                type, deadline.getId(), "DEADLINE", priority);
    }
}
