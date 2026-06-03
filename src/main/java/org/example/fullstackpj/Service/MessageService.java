package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Message;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.MessageRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository, NotificationService notificationService) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        org.example.fullstackpj.CustomUserDetails userDetails = (org.example.fullstackpj.CustomUserDetails) authentication.getPrincipal();
        return userDetails.getUser();
    }

    public Message sendMessage(Long receiverId, String content) {
        User sender = getCurrentUser();
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content);
        message.setRead(false);
        message.setCreatedAt(LocalDateTime.now());
        message = messageRepository.save(message);

        // Создаем уведомление для получателя
        notificationService.createNotification(
                receiver,
                "Новое сообщение",
                sender.getUsername() + " отправил вам сообщение: " + content.substring(0, Math.min(50, content.length())) + (content.length() > 50 ? "..." : ""),
                "MESSAGE",
                message.getId(),
                "MESSAGE"
        );

        return message;
    }

    public List<Message> getConversation(Long otherUserId) {
        User currentUser = getCurrentUser();
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return messageRepository.findBySenderAndReceiverOrReceiverAndSenderOrderByCreatedAtAsc(
                currentUser, otherUser, currentUser, otherUser
        );
    }

    public List<User> getChatList() {
        User currentUser = getCurrentUser();
        List<Message> messages = messageRepository.findBySenderOrReceiverOrderByCreatedAtDesc(currentUser, currentUser);
        // Получаем уникальных собеседников
        return messages.stream()
                .map(m -> m.getSender().getId().equals(currentUser.getId()) ? m.getReceiver() : m.getSender())
                .distinct()
                .limit(50) // Ограничиваем количество
                .collect(java.util.stream.Collectors.toList());
    }

    public void markAsRead(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        User currentUser = getCurrentUser();
        if (!message.getReceiver().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You can only mark your own received messages as read");
        }
        message.setRead(true);
        messageRepository.save(message);
    }

    public long getUnreadMessageCount() {
        User currentUser = getCurrentUser();
        List<Message> unread = messageRepository.findByReceiverAndReadFalse(currentUser);
        return unread.size();
    }
}

