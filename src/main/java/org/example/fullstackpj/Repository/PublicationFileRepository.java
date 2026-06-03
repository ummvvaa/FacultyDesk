package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.PublicationFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PublicationFileRepository extends JpaRepository<PublicationFile, Long> {

    List<PublicationFile> findByPublication(Publication publication);

    long countByPublication(Publication publication);

    @Query("SELECT DISTINCT pf.publication.id FROM PublicationFile pf WHERE pf.publication IN :publications")
    List<Long> findPublicationIdsWithFiles(@Param("publications") List<Publication> publications);
}
