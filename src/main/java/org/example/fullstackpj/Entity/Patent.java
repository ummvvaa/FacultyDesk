package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "patents")
public class Patent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "records", "favorites", "allowedCategories", "hibernateLazyInitializer"})
    private User user;

    private String title;
    private String patentNumber;
    private Integer year;

    @Column(columnDefinition = "varchar(255) default 'KZ'")
    private String country = "KZ";

    @Column(columnDefinition = "TEXT")
    private String description;
}
