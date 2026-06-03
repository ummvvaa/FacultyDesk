package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "work_experiences")
public class WorkExperience {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User user;

    private String position;
    private String organization;
    private Integer startYear;
    private Integer endYear;
    private boolean current;

    @Column(columnDefinition = "TEXT")
    private String description;
}
