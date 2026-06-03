package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.RobotRun;
import org.example.fullstackpj.Entity.enums.RobotRunStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RobotRunRepository extends JpaRepository<RobotRun, Long> {
    Page<RobotRun> findAllByOrderByStartedAtDesc(Pageable pageable);
    Optional<RobotRun> findTopByOrderByStartedAtDesc();
    long countByStatus(RobotRunStatus status);
}
