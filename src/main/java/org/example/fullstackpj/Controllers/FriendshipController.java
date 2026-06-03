package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Entity.Friendship;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Service.FriendshipService;
import org.example.fullstackpj.Service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
public class FriendshipController {

    private final FriendshipService friendshipService;
    private final UserService userService;

    public FriendshipController(FriendshipService friendshipService, UserService userService) {
        this.friendshipService = friendshipService;
        this.userService = userService;
    }

    @PostMapping("/request/{userId}")
    public ResponseEntity<?> sendFriendRequest(@PathVariable Long userId) {
        try {
            Friendship friendship = friendshipService.sendFriendRequest(userId);
            return ResponseEntity.ok(friendship);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/accept/{friendshipId}")
    public ResponseEntity<?> acceptFriendRequest(@PathVariable Long friendshipId) {
        try {
            Friendship friendship = friendshipService.acceptFriendRequest(friendshipId);
            return ResponseEntity.ok(friendship);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/reject/{friendshipId}")
    public ResponseEntity<?> rejectFriendRequest(@PathVariable Long friendshipId) {
        try {
            friendshipService.rejectFriendRequest(friendshipId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Friendship>> getPendingRequests() {
        return ResponseEntity.ok(friendshipService.getPendingFriendRequests());
    }

    @GetMapping
    public ResponseEntity<List<User>> getFriends() {
        return ResponseEntity.ok(friendshipService.getFriends());
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<Map<String, String>> getFriendshipStatus(@PathVariable Long userId) {
        try {
            String status = friendshipService.getFriendshipStatus(userId);
            Map<String, String> response = new HashMap<>();
            response.put("status", status);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/friendship/{userId}")
    public ResponseEntity<?> getFriendship(@PathVariable Long userId) {
        try {
            Friendship friendship = friendshipService.getFriendship(userId);
            return ResponseEntity.ok(friendship != null ? friendship : new HashMap<>());
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}

