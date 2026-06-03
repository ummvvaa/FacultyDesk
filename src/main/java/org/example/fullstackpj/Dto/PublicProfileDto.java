package org.example.fullstackpj.Dto;

import lombok.Builder;
import lombok.Data;
import org.example.fullstackpj.Entity.enums.EnglishLevel;

import java.util.List;

@Data
@Builder
public class PublicProfileDto {

    private String username;
    private String firstName;
    private String lastName;
    private String position;
    private String academicTitle;
    private String academicDegree;
    private String researchAreas;
    private String aiSummary;
    private String profileDescription;
    private String orcid;
    private String scopusAuthorId;
    private String googleScholarUrl;
    private EnglishLevel englishLevel;
    private List<PublicationInfo> publications;
    private List<EducationInfo> educations;
    private Integer kkkReadinessPercentage;
    private String kkkStatus;

    @Data
    @Builder
    public static class PublicationInfo {
        private String title;
        private String authors;
        private Integer publicationYear;
        private String journalName;
        private String doi;
        private String publicationType;
        private String databaseType;
        private String quartile;
    }

    @Data
    @Builder
    public static class EducationInfo {
        private String degree;
        private String institution;
        private String specialty;
        private Integer year;
    }
}
