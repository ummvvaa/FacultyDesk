package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    List<Submission> findByAuthorId(Long userId);

    List<Submission> findByEventId(Long eventId);

    List<Submission> findByAuthorIdAndEventId(Long authorId, Long eventId);

    List<Submission> findByAuthorIdAndEvent_Deadline(Long userId, Date date);
}
