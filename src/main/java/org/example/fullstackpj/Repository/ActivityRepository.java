package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT a.user.id, a.user.username, COUNT(a) FROM Activity a WHERE a.createdAt >= :since GROUP BY a.user.id, a.user.username ORDER BY COUNT(a) DESC")
    List<Object[]> findTopActiveUsersSince(@Param("since") LocalDateTime since);
}

