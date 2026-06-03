package org.example.fullstackpj.Controllers;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.Valid;
import org.example.fullstackpj.Dto.ChangePasswordRequest;
import org.example.fullstackpj.Dto.LoginResponse;
import org.example.fullstackpj.Dto.UserDto;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Security.JwtUtil;
import org.example.fullstackpj.Service.CvGeneratorService;
import org.example.fullstackpj.Service.PasswordResetService;
import org.example.fullstackpj.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final PasswordResetService passwordResetService;
    private final MeterRegistry meterRegistry;
    private final CvGeneratorService cvGeneratorService;

    public UserController(UserService userService, JwtUtil jwtUtil, PasswordResetService passwordResetService,
                          MeterRegistry meterRegistry, CvGeneratorService cvGeneratorService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.passwordResetService = passwordResetService;
        this.meterRegistry = meterRegistry;
        this.cvGeneratorService = cvGeneratorService;
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String reason = body.getOrDefault("reason", "Password forgotten");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email required"));
        }
        passwordResetService.requestReset(email, reason);
        return ResponseEntity.ok(Map.of(
                "message", "If the email exists, an administrator has been notified."
        ));
    }


    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestParam String username,
                                             @RequestParam(required = false) String password,
                                             @RequestParam(required = false) String email) {
        userService.register(username, password != null ? password : "");
        return ResponseEntity.ok().build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestParam String username,
                                             @RequestParam String password) {
        try {
            userService.login(username, password);
            User user = userService.getUserEntity(username);
            String token = jwtUtil.generateToken(user);
            meterRegistry.counter("auth.login.success",
                    "username", username,
                    "role", user.getRole() != null ? user.getRole() : "UNKNOWN"
            ).increment();
            return ResponseEntity.ok(new LoginResponse(token, user));
        } catch (BadCredentialsException e) {
            meterRegistry.counter("auth.login.failed",
                    "username", username,
                    "reason", "bad_credentials"
            ).increment();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Неверное имя пользователя или пароль");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        } catch (Exception e) {
            meterRegistry.counter("auth.login.failed",
                    "username", username,
                    "reason", "error"
            ).increment();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка при входе: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    @GetMapping("/auth/me")
    public ResponseEntity<User> getCurrentUser() {
        User user = userService.getCurrentUser();
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }
    
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) String search) {
        List<User> users = userService.getAllUsers();
        System.out.println("=== GET /api/users called ===");
        System.out.println("Search parameter: " + search);
        System.out.println("Total users: " + users.size());
        
        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase().trim();
            System.out.println("Searching for email containing: " + searchLower);
            
            List<User> filtered = users.stream()
                    .filter(u -> {
                        boolean matches = u.getEmail() != null && !u.getEmail().trim().isEmpty() 
                                && u.getEmail().toLowerCase().contains(searchLower);
                        if (matches) {
                            System.out.println("Found match: " + u.getUsername() + " - " + u.getEmail());
                        }
                        return matches;
                    })
                    .collect(java.util.stream.Collectors.toList());
            
            System.out.println("Filtered users count: " + filtered.size());
            return ResponseEntity.ok(filtered);
        }
        
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsersByEmail(@RequestParam String email) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email parameter is required");
        }
        List<User> users = userService.getAllUsers();
        String searchLower = email.toLowerCase().trim();
        List<User> filtered = users.stream()
                .filter(u -> u.getEmail() != null && u.getEmail().toLowerCase().contains(searchLower))
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(filtered);
    }
    
    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/users/by-email/{email}")
    public ResponseEntity<?> findByEmail(@PathVariable String email) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        return userService.findByEmail(email.trim())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found for email: " + email)));
    }
    
    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User user) {
        return ResponseEntity.ok(userService.updateUser(id, user));
    }
    
    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            User createdUser = userService.createUser(user);
            return ResponseEntity.ok(createdUser);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/users/me")
    public ResponseEntity<UserDto> updateMyProfile(@RequestBody @Valid UserDto dto) {
        User currentUser = userService.getCurrentUser();
        User updated = userService.updateProfile(currentUser.getId(), dto);
        return ResponseEntity.ok(UserDto.fromEntity(updated));
    }

    @PostMapping("/users/me/avatar")
    public ResponseEntity<?> updateAvatar(@RequestParam("file") MultipartFile file) {
        try {
            System.out.println("=== POST /api/users/me/avatar called ===");
            System.out.println("File name: " + (file != null ? file.getOriginalFilename() : "null"));
            System.out.println("File size: " + (file != null ? file.getSize() : 0));
            
            if (file == null || file.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Файл не может быть пустым");
                return ResponseEntity.status(400).body(error);
            }
            
            // Обновляем аватар и получаем обновленного пользователя
            User user = userService.updateAvatar(file);
            
            System.out.println("Avatar updated successfully, user path: " + user.getPath());
            System.out.println("Returning user with path: " + user.getPath());
            return ResponseEntity.ok(user);
        } catch (IOException e) {
            System.err.println("Error updating avatar: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка при сохранении файла: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        } catch (Exception e) {
            System.err.println("Unexpected error updating avatar: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/users/me/public-profile")
    public ResponseEntity<User> togglePublicProfile(@RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.parseBoolean(String.valueOf(body.getOrDefault("enabled", false)));
        String customSlug = body.containsKey("customSlug") ? String.valueOf(body.get("customSlug")) : null;
        if ("null".equals(customSlug) || (customSlug != null && customSlug.isBlank())) customSlug = null;
        return ResponseEntity.ok(userService.togglePublicProfile(enabled, customSlug));
    }

    @GetMapping("/users/me/public-profile-status")
    public ResponseEntity<Map<String, Object>> getPublicProfileStatus() {
        User user = userService.getCurrentUser();
        Map<String, Object> result = new HashMap<>();
        result.put("enabled", user.isPublicProfile());
        result.put("slug", user.getPublicProfileSlug());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/users/me/cv")
    public ResponseEntity<byte[]> exportCv(
            @RequestParam(defaultValue = "ru") String locale,
            Authentication auth) throws IOException {
        User user = userService.getUserEntity(auth.getName());
        byte[] pdf = cvGeneratorService.generateCv(user, Locale.forLanguageTag(locale));
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=CV_" + user.getUsername() + ".pdf")
                .body(pdf);
    }

    @PostMapping("/users/me/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        String username = authentication.getName();
        userService.changePassword(username, request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Пароль успешно изменён"));
    }

    @PostMapping("/forget")
    public ResponseEntity<Void> forget(@RequestParam String username) {
        userService.resetPassword(username);
        return ResponseEntity.ok().build();
    }

}
