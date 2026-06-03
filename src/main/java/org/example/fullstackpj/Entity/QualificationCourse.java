package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "qualification_courses")
public class QualificationCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User user;

    private String name;
    private String organization;
    private Integer year;
    private Integer hours;
    private String certificateFilePath;
    private String certificateOriginalName;
}
