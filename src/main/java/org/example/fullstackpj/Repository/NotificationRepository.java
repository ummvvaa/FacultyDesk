package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Notification;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    List<Notification> findByUserAndReadFalseOrderByCreatedAtDesc(User user);
    long countByUserAndReadFalse(User user);
    boolean existsByUserAndTypeAndRelatedId(User user, String type, Long relatedId);
}

