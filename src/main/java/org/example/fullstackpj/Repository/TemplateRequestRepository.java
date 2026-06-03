package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.TemplateRequest;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TemplateRequestRepository extends JpaRepository<TemplateRequest, Long> {

    List<TemplateRequest> findByRequestedByOrderByCreatedAtDesc(User user);

    Page<TemplateRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status, Pageable pageable);

    Page<TemplateRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(RequestStatus status);
}
