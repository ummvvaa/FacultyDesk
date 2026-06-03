package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.GeneratedDocument;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.GeneratedDocStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeneratedDocumentRepository
        extends JpaRepository<GeneratedDocument, Long>, JpaSpecificationExecutor<GeneratedDocument> {

    List<GeneratedDocument> findByTeacherOrderByGenerationDateDesc(User teacher);

    List<GeneratedDocument> findByTeacherAndStatusNotOrderByGenerationDateDesc(User teacher, GeneratedDocStatus status);

    Page<GeneratedDocument> findAll(Specification<GeneratedDocument> spec, Pageable pageable);

    long countByTeacher(User teacher);

    long countByStatus(GeneratedDocStatus status);

    java.util.Optional<GeneratedDocument> findTopByTeacherOrderByGenerationDateDesc(User teacher);

    List<GeneratedDocument> findByGenerationDateBetween(java.time.LocalDateTime from, java.time.LocalDateTime to);

    List<GeneratedDocument> findByRobotRunId(Long robotRunId);
}
