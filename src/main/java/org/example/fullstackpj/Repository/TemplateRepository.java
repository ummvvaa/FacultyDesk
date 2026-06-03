package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Template;
import org.example.fullstackpj.Entity.enums.TemplateCategory;
import org.example.fullstackpj.Entity.enums.TemplateStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TemplateRepository extends JpaRepository<Template, Long> {

    List<Template> findByActiveTrue();

    List<Template> findByStatus(TemplateStatus status);

    List<Template> findByTemplateCategory(TemplateCategory category);

    @Query(value = """
            SELECT * FROM templates t
            WHERE (:search IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:year IS NULL OR t.academic_year = :year)
              AND (CAST(:category AS text) IS NULL OR t.template_category = CAST(:category AS text))
              AND (CAST(:type AS text) IS NULL OR t.file_type = CAST(:type AS text))
              AND (CAST(:status AS text) IS NULL OR t.status = CAST(:status AS text))
              AND (:uploadedById IS NULL OR t.uploaded_by_user_id = :uploadedById)
            ORDER BY COALESCE(t.last_update_date, t.created_at) DESC NULLS LAST
            """, nativeQuery = true)
    List<Template> findWithFilters(
            @Param("search") String search,
            @Param("year") String year,
            @Param("category") String category,
            @Param("type") String type,
            @Param("status") String status,
            @Param("uploadedById") Long uploadedById
    );
}
