package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByCategoryId(Long categoryId);
    List<Event> findByDeadlineAfter(Date date);
}