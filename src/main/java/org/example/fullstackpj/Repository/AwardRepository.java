package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Award;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AwardRepository extends JpaRepository<Award, Long> {
    List<Award> findByUserOrderByYearDesc(User user);
}
