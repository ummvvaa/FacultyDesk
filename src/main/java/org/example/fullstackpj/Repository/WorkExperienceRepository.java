package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.WorkExperience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkExperienceRepository extends JpaRepository<WorkExperience, Long> {
    List<WorkExperience> findByUserOrderByStartYearDesc(User user);
}
