package org.example.fullstackpj.Dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class KkkChecklistDto {
    private boolean profileCompleted;
    private boolean educationAdded;
    private int educationCount;
    private boolean workExperienceAdded;
    private int workExperienceCount;
    private boolean qualificationCoursesLast3Years;
    private int qualificationCoursesCount;
    private boolean publicationsLast5Years;
    private int publicationsCount;
    private boolean doiLinksAdded;
    private int missingDoiCount;
    private boolean confirmationFilesUploaded;
    private int missingFilesCount;
    private boolean awardsPatentsAdded;
    private int awardsPatentsCount;
    private boolean englishLevelAdded;
    private int completionPercentage;
    private List<String> missingItems;
    private List<String> recommendations;
}
