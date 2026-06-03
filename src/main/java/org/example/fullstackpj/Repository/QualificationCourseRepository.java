package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.QualificationCourse;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QualificationCourseRepository extends JpaRepository<QualificationCourse, Long> {
    List<QualificationCourse> findByUserOrderByYearDesc(User user);
    List<QualificationCourse> findByUserAndYearGreaterThanEqual(User user, Integer year);
}
