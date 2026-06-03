package org.example.fullstackpj.Dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.EnglishLevel;

import java.math.BigDecimal;

@Getter
@Setter
public class UserDto {
    private Long id;
    private String username;
    private String password;
    private String role;
    private String path;

    // Профиль
    private String email;
    private String academicDegree;
    private String academicTitle;
    private String position;
    private String phone;
    private String office;
    private String researchAreas;
    private String publications;
    private EnglishLevel englishLevel;
    private BigDecimal employmentRate;

    @Size(max = 50)
    private String scopusAuthorId;

    @Size(max = 50)
    @Pattern(regexp = "^(\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX])?$",
             message = "ORCID format: XXXX-XXXX-XXXX-XXXX")
    private String orcid;

    @Size(max = 500)
    private String googleScholarUrl;

    private String aiSummary;
    private String firstName;
    private String lastName;

    public static UserDto fromEntity(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setRole(user.getRole());
        dto.setPath(user.getPath());
        dto.setEmail(user.getEmail());
        dto.setAcademicDegree(user.getAcademicDegree());
        dto.setAcademicTitle(user.getAcademicTitle());
        dto.setPosition(user.getPosition());
        dto.setPhone(user.getPhone());
        dto.setOffice(user.getOffice());
        dto.setResearchAreas(user.getResearchAreas());
        dto.setPublications(user.getPublications());
        dto.setEnglishLevel(user.getEnglishLevel());
        dto.setEmploymentRate(user.getEmploymentRate());
        dto.setScopusAuthorId(user.getScopusAuthorId());
        dto.setOrcid(user.getOrcid());
        dto.setGoogleScholarUrl(user.getGoogleScholarUrl());
        dto.setAiSummary(user.getAiSummary());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        return dto;
    }
}
