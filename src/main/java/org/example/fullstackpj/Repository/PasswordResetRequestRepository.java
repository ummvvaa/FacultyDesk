package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.PasswordResetRequest;
import org.example.fullstackpj.Entity.enums.PasswordResetStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    Page<PasswordResetRequest> findByStatusOrderByCreatedAtDesc(PasswordResetStatus status, Pageable pageable);
    long countByStatus(PasswordResetStatus status);
}
