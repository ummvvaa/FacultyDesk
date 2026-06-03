package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.EnglishLevel;

import java.math.BigDecimal;
import java.sql.Date;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;


@Setter
@Getter
@Entity
@Table(name="users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private String username;
    private String password;
    private String email;
    private Date createDate;
    private String role;
    private String path = "default.png";

    // Основные поля преподавателя
    private String academicDegree;
    private String position;
    private String phone;
    private String office;
    private String researchAreas;
    private String publications;

    // Phase 7: расширение профиля
    private String academicTitle;

    @Column(precision = 3, scale = 2)
    private BigDecimal employmentRate;

    @Size(max = 50)
    @Column(length = 50)
    private String scopusAuthorId;

    @Size(max = 50)
    @Column(length = 50)
    @Pattern(regexp = "^\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]$",
             message = "ORCID format: XXXX-XXXX-XXXX-XXXX")
    private String orcid;

    @Size(max = 500)
    @Column(length = 500)
    private String googleScholarUrl;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    // Profile fields (optional, for display)
    private String firstName;
    private String lastName;

    @Column(columnDefinition = "TEXT")
    private String profileDescription;

    // Public profile
    @Column(name = "is_public_profile")
    private boolean publicProfile = false;

    @Column(name = "public_profile_slug", unique = true, length = 100)
    private String publicProfileSlug;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(255) default 'NONE'")
    private EnglishLevel englishLevel = EnglishLevel.NONE;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Record> records = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "favorites",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "record_id")
    )
    @JsonIgnoreProperties("favoritedBy")
    private Set<Record> favorites = new HashSet<>();


    @ManyToMany
    @JoinTable(
            name = "user_allowed_categories",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> allowedCategories = new HashSet<>();

    public User() {
    }

    public User(Date createDate, String username, Long id, String password, String role) {
        this.createDate = createDate;
        this.username = username;
        this.id = id;
        this.password = password;
        this.role = role;
    }

}
