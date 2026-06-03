package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Friendship;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.FriendshipRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public FriendshipService(FriendshipRepository friendshipRepository, UserRepository userRepository, NotificationService notificationService) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        org.example.fullstackpj.CustomUserDetails userDetails = (org.example.fullstackpj.CustomUserDetails) authentication.getPrincipal();
        return userDetails.getUser();
    }

    public Friendship sendFriendRequest(Long addresseeId) {
        User requester = getCurrentUser();
        User addressee = userRepository.findById(addresseeId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Проверяем, не существует ли уже заявка
        Optional<Friendship> existing = friendshipRepository.findByRequesterAndAddressee(requester, addressee);
        if (existing.isPresent()) {
            throw new RuntimeException("Friend request already sent");
        }

        Optional<Friendship> reverse = friendshipRepository.findByAddresseeAndRequester(requester, addressee);
        if (reverse.isPresent()) {
            throw new RuntimeException("Friend request already exists");
        }

        Friendship friendship = new Friendship();
        friendship.setRequester(requester);
        friendship.setAddressee(addressee);
        friendship.setStatus("PENDING");
        friendship.setCreatedAt(LocalDateTime.now());
        friendship = friendshipRepository.save(friendship);

        // Создаем уведомление для получателя
        notificationService.createNotification(
                addressee,
                "Новая заявка в друзья",
                requester.getUsername() + " отправил вам заявку в друзья",
                "FRIEND_REQUEST",
                friendship.getId(),
                "FRIENDSHIP"
        );

        return friendship;
    }

    public Friendship acceptFriendRequest(Long friendshipId) {
        User currentUser = getCurrentUser();
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friendship not found"));

        if (!friendship.getAddressee().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You can only accept friend requests sent to you");
        }

        if (!"PENDING".equals(friendship.getStatus())) {
            throw new RuntimeException("Friend request is not pending");
        }

        friendship.setStatus("ACCEPTED");
        friendshipRepository.save(friendship);

        // Создаем уведомление для отправителя
        notificationService.createNotification(
                friendship.getRequester(),
                "Заявка в друзья принята",
                currentUser.getUsername() + " принял вашу заявку в друзья",
                "FRIEND_REQUEST",
                friendship.getId(),
                "FRIENDSHIP"
        );

        return friendship;
    }

    public void rejectFriendRequest(Long friendshipId) {
        User currentUser = getCurrentUser();
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friendship not found"));

        if (!friendship.getAddressee().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You can only reject friend requests sent to you");
        }

        friendship.setStatus("REJECTED");
        friendshipRepository.save(friendship);
    }

    public List<Friendship> getPendingFriendRequests() {
        User currentUser = getCurrentUser();
        return friendshipRepository.findByAddresseeAndStatus(currentUser, "PENDING");
    }

    public List<User> getFriends() {
        User currentUser = getCurrentUser();
        List<Friendship> friendships = friendshipRepository.findByRequesterAndStatusOrAddresseeAndStatus(
                currentUser, "ACCEPTED", currentUser, "ACCEPTED"
        );

        return friendships.stream()
                .map(f -> {
                    if (f.getRequester().getId().equals(currentUser.getId())) {
                        return f.getAddressee();
                    } else {
                        return f.getRequester();
                    }
                })
                .collect(Collectors.toList());
    }

    public String getFriendshipStatus(Long otherUserId) {
        User currentUser = getCurrentUser();
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<Friendship> friendship1 = friendshipRepository.findByRequesterAndAddressee(currentUser, otherUser);
        Optional<Friendship> friendship2 = friendshipRepository.findByAddresseeAndRequester(currentUser, otherUser);

        if (friendship1.isPresent()) {
            return friendship1.get().getStatus();
        }
        if (friendship2.isPresent()) {
            String status = friendship2.get().getStatus();
            // Если мы адресат, то статус "PENDING" означает, что нам пришла заявка
            if ("PENDING".equals(status)) {
                return "PENDING_INCOMING";
            }
            return status;
        }
        return "NONE";
    }

    public Friendship getFriendship(Long otherUserId) {
        User currentUser = getCurrentUser();
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<Friendship> friendship1 = friendshipRepository.findByRequesterAndAddressee(currentUser, otherUser);
        if (friendship1.isPresent()) {
            return friendship1.get();
        }
        Optional<Friendship> friendship2 = friendshipRepository.findByAddresseeAndRequester(currentUser, otherUser);
        return friendship2.orElse(null);
    }
}

