package org.example.fullstackpj.Entity.enums;

public enum NotificationType {
    // KKK
    KKK_COLLECTION_STARTED,
    KKK_STATUS_CHANGED,

    // Scopus / external databases
    SCOPUS_UPDATE_REQUIRED,

    // Deadlines (Phase 6)
    QUARTERLY_DEADLINE,
    SEMESTER_DEADLINE,
    DEADLINE_REMINDER,
    DEADLINE_APPROACHING_WEEK,
    DEADLINE_APPROACHING_3DAYS,
    DEADLINE_TOMORROW,
    DEADLINE_OVERDUE,

    // Templates
    TEMPLATE_UPDATED,
    TEMPLATE_NEW,

    // Generated documents
    GENERATED_DOCUMENT_UPLOADED,

    // Reports (Records)
    REPORT_RETURNED,
    REPORT_ACCEPTED,
    REPORT_REJECTED,
    NEW_ADMIN_COMMENT,

    // Robot
    ROBOT_COMPLETED,
    ROBOT_FAILED,
    DOCUMENT_ROLLED_BACK,

    // Publications
    PUBLICATION_VERIFIED,
    PUBLICATION_REJECTED,
    PUBLICATION_NEEDS_CORRECTION,

    // Messaging / social
    NEW_MESSAGE,
    FRIENDSHIP_REQUEST,
    FRIENDSHIP_ACCEPTED,

    // Password reset
    PASSWORD_RESET_REQUEST,

    // Template requests
    TEMPLATE_REQUEST_CREATED,
    TEMPLATE_REQUEST_RESPONDED,

    // Legacy (kept for backward compatibility with existing DB rows)
    REPORT_APPROVED,
    FRIEND_REQUEST,
    MESSAGE,
    INFO,
    SUCCESS,
    WARNING,
    ERROR
}
