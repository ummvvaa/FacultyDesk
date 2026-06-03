package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Message;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderAndReceiverOrReceiverAndSenderOrderByCreatedAtAsc(User user1, User user2, User user3, User user4);
    List<Message> findByReceiverAndReadFalse(User receiver);
    List<Message> findBySenderOrReceiverOrderByCreatedAtDesc(User sender, User receiver);
}

