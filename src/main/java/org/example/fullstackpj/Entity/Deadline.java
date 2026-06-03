package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.DeadlineCategory;
import org.example.fullstackpj.Entity.enums.RepeatType;
import org.example.fullstackpj.Entity.enums.TargetRole;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "deadlines")
public class Deadline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime deadlineDate;

    @Enumerated(EnumType.STRING)
    private DeadlineCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'ALL'")
    private TargetRole targetRole = TargetRole.ALL;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "deadline_target_users",
            joinColumns = @JoinColumn(name = "deadline_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories"})
    private Set<User> targetUsers = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'ONE_TIME'")
    private RepeatType repeatType = RepeatType.ONE_TIME;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories"})
    private User createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private LocalDateTime lastNotificationSent;
}
