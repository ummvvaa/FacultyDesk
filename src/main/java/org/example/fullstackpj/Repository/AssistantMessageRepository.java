package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.AssistantConversation;
import org.example.fullstackpj.Entity.AssistantMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssistantMessageRepository extends JpaRepository<AssistantMessage, Long> {
    List<AssistantMessage> findByConversationOrderByCreatedAtAsc(AssistantConversation conversation);
}
