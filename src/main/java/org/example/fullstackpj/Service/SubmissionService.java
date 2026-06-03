package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Submission;
import org.example.fullstackpj.Repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.util.List;
import java.util.Optional;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;

    public SubmissionService(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public Submission submitReport(Submission submission) {
        submission.setSubmittedAt(new Date(System.currentTimeMillis()));
        submission.setStatus("SUBMITTED");
        return submissionRepository.save(submission);
    }

    public Optional<Submission> getSubmissionById(Long id) {
        return submissionRepository.findById(id);
    }

    public List<Submission> getSubmissionsByUser(Long userId) {
        return submissionRepository.findByAuthorId(userId);
    }

    public List<Submission> getSubmissionsByEvent(Long eventId) {
        return submissionRepository.findByEventId(eventId);
    }

    public List<Submission> getSubmissionsByUserAndDate(Long userId, Date date) {
        return submissionRepository.findByAuthorIdAndEvent_Deadline(userId, date);
    }

    public void deleteSubmission(Long id) {
        submissionRepository.deleteById(id);
    }

    public List<Submission> getSubmissionsForEvent(Long userId, Long eventId) {
        return submissionRepository.findByAuthorIdAndEventId(userId, eventId);
    }
}
