package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.KkkProfile;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.KkkStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface KkkProfileRepository extends JpaRepository<KkkProfile, Long>, JpaSpecificationExecutor<KkkProfile> {
    Optional<KkkProfile> findByTeacher(User teacher);
}
