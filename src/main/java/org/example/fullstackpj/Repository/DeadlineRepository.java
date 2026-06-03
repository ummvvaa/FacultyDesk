package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DeadlineRepository extends JpaRepository<Deadline, Long>, JpaSpecificationExecutor<Deadline> {

    @Query("SELECT DISTINCT d FROM Deadline d LEFT JOIN d.targetUsers tu WHERE " +
           "(:includeInactive = true OR d.active = true) AND " +
           "(d.targetRole = org.example.fullstackpj.Entity.enums.TargetRole.ALL OR " +
           "(d.targetRole = org.example.fullstackpj.Entity.enums.TargetRole.TEACHERS_ONLY AND :role = 'ROLE_TEACHER') OR " +
           "(d.targetRole = org.example.fullstackpj.Entity.enums.TargetRole.ADMINS_ONLY AND :role = 'ROLE_ADMIN') OR " +
           "(d.targetRole = org.example.fullstackpj.Entity.enums.TargetRole.SPECIFIC_USERS AND tu = :user)) " +
           "ORDER BY d.deadlineDate ASC")
    List<Deadline> findRelevantForUser(@Param("user") User user,
                                       @Param("role") String role,
                                       @Param("includeInactive") boolean includeInactive);

    List<Deadline> findByActiveTrueAndDeadlineDateBetween(LocalDateTime start, LocalDateTime end);

    List<Deadline> findByActiveTrueAndDeadlineDateBefore(LocalDateTime cutoff);
}
