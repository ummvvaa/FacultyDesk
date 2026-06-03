package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Education;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EducationRepository extends JpaRepository<Education, Long> {
    List<Education> findByUserOrderByYearDesc(User user);
}
