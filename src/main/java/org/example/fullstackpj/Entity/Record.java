package org.example.fullstackpj.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.sql.Date;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "records")
public class Record {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;
    private Date createdAt;
    private String pdf;
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, RETURNED
    private String semester; // Семестр
    private String type; // Тип отчёта
    private String comments; // Комментарии от администратора


    @ManyToOne
    @JoinColumn(name = "author_id")
    @JsonIgnoreProperties({"records", "password", "favorites", "allowedCategories"})
    private User author;

    @ManyToOne
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties("records")
    private Category category;

    @ManyToMany(mappedBy = "favorites")
    @JsonIgnoreProperties("favorites")
    private Set<User> favoritedBy = new HashSet<>();


}

