package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Patent;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatentRepository extends JpaRepository<Patent, Long> {
    List<Patent> findByUserOrderByYearDesc(User user);
}
