package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.AssistantConversation;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssistantConversationRepository extends JpaRepository<AssistantConversation, Long> {
    Page<AssistantConversation> findByUserOrderByLastMessageAtDesc(User user, Pageable pageable);
}
