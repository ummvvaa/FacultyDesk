package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface PublicationRepository extends JpaRepository<Publication, Long>, JpaSpecificationExecutor<Publication> {

    List<Publication> findByAuthorOrderByPublicationYearDesc(User author);

    List<Publication> findByAuthorAndStatusOrderByPublicationYearDesc(User author, org.example.fullstackpj.Entity.enums.PublicationStatus status);

    Page<Publication> findAll(Specification<Publication> spec, Pageable pageable);

    long countByAuthorAndPublicationYearGreaterThanEqual(User author, Integer year);

    List<Publication> findByAuthorAndPublicationYearGreaterThanEqual(User author, Integer year);

    long countByAuthorAndDatabaseType(User author, DatabaseType databaseType);

    @org.springframework.data.jpa.repository.Query("SELECT p.databaseType, COUNT(p) FROM Publication p GROUP BY p.databaseType")
    java.util.List<Object[]> countGroupByDatabaseType();

    @org.springframework.data.jpa.repository.Query("SELECT p.publicationType, COUNT(p) FROM Publication p GROUP BY p.publicationType")
    java.util.List<Object[]> countGroupByPublicationType();

    long countByStatus(org.example.fullstackpj.Entity.enums.PublicationStatus status);
}
