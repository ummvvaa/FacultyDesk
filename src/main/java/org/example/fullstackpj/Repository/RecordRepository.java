package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {
    List<Record> findByCategoryId(Long categoryId);
    List<Record> findByTitleContainingIgnoreCase(String title);

    int countByAuthor(User user);

    List<Record> findByAuthorAndStatus(User author, String status);

    @Query("SELECT COUNT(r) FROM Record r")
    int countAllRecords();

    @Query("SELECT r.author.username, COUNT(r) FROM Record r GROUP BY r.author.username ORDER BY COUNT(r) DESC")
    List<Object[]> findTopAuthors();

    @Query("SELECT r.category.name, COUNT(r) FROM Record r GROUP BY r.category.name ORDER BY COUNT(r) DESC")
    List<Object[]> findTopCategories();

    @Query("SELECT DATE(r.createdAt), COUNT(r) FROM Record r GROUP BY DATE(r.createdAt)")
    List<Object[]> findActivityByDay();

    @Query("SELECT r FROM Record r WHERE r.author.id = :userId")
    List<Record> findByAuthorId(Long userId);
}

