package org.example.fullstackpj.Dto;

import lombok.Builder;
import lombok.Getter;
import org.example.fullstackpj.Entity.Award;
import org.example.fullstackpj.Entity.Education;
import org.example.fullstackpj.Entity.Patent;
import org.example.fullstackpj.Entity.QualificationCourse;
import org.example.fullstackpj.Entity.WorkExperience;
import org.example.fullstackpj.Entity.enums.KkkStatus;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class KkkProfileDto {
    private Long id;
    private Long teacherId;
    private String teacherUsername;
    private String teacherEmail;
    private KkkStatus status;
    private LocalDateTime submittedAt;
    private LocalDateTime checkedAt;
    private String reviewerComment;
    private Long reviewedById;
    private String reviewedByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private KkkChecklistDto checklist;

    private List<Education> educations;
    private List<WorkExperience> workExperiences;
    private List<QualificationCourse> qualificationCourses;
    private List<Award> awards;
    private List<Patent> patents;
}
