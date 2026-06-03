package org.example.fullstackpj.Service;

import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Dto.RecordDto;
import org.example.fullstackpj.Entity.Category;
import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.CategoryRepository;
import org.example.fullstackpj.Repository.RecordRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class RecordService {

    private final RecordRepository recordRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ActivityService activityService;
    private final NotificationService notificationService;

    public RecordService(RecordRepository recordRepository, UserRepository userRepository, CategoryRepository categoryRepository, ActivityService activityService, NotificationService notificationService) {
        this.recordRepository = recordRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.activityService = activityService;
        this.notificationService = notificationService;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getUser();
    }

    public Record createRecord(String title, String description, MultipartFile file, Long categoryId) throws IOException {
        User author = getCurrentUser();
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        Record record = new Record();
        record.setTitle(title);
        record.setDescription(description);
        record.setCreatedAt(new Date(System.currentTimeMillis()));
        record.setAuthor(author);
        record.setCategory(category);

        if (file != null && !file.isEmpty()) {
            String filename = file.getOriginalFilename();
            Path path = Paths.get("src/main/resources/static/pdf").resolve(filename).toAbsolutePath().normalize();
            Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
            record.setPdf(filename);
        }

        record = recordRepository.save(record);
        activityService.log(author, "CREATE", "Record", record.getTitle());
        return record;
    }



    public Record getRecord(Long id){
        return recordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
    }

    public List<Record> getAllRecords() {
        try {
            List<Record> records = recordRepository.findAll();
            System.out.println("Found " + records.size() + " total records");
            return records;
        } catch (Exception e) {
            System.err.println("Error in getAllRecords: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Не удалось загрузить все отчеты: " + e.getMessage(), e);
        }
    }


    public Record updateRecord(Long id, RecordDto dto) {
        User user = getCurrentUser();
        Record record = recordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Record not found"));

        // Проверка прав: автор может менять только свои записи, админ может менять статус и комментарии
        boolean isAdmin = user.getRole().equals("ROLE_ADMIN");
        boolean isAuthor = record.getAuthor().getId().equals(user.getId());

        if (!isAdmin && !isAuthor) {
            throw new RuntimeException("You can update only your own records");
        }

        // Автор может менять только название, описание и категорию
        if (isAuthor) {
            if (dto.getTitle() != null) record.setTitle(dto.getTitle());
            if (dto.getDescription() != null) record.setDescription(dto.getDescription());
            if (dto.getCategoryId() != null) {
                Category category = categoryRepository.findById(dto.getCategoryId())
                        .orElseThrow(() -> new RuntimeException("Category not found"));
                record.setCategory(category);
            }
        }

        // Админ может менять статус и комментарии
        if (isAdmin) {
            if (dto.getStatus() != null) record.setStatus(dto.getStatus());
            if (dto.getComments() != null) record.setComments(dto.getComments());
            // Админ также может менять всё остальное
            if (dto.getTitle() != null) record.setTitle(dto.getTitle());
            if (dto.getDescription() != null) record.setDescription(dto.getDescription());
            if (dto.getCategoryId() != null) {
                Category category = categoryRepository.findById(dto.getCategoryId())
                        .orElseThrow(() -> new RuntimeException("Category not found"));
                record.setCategory(category);
            }
        }
        
        String oldStatus = record.getStatus();
        String oldComments = record.getComments();
        record = recordRepository.save(record);

        if (isAdmin) {
            boolean statusChanged = dto.getStatus() != null && !dto.getStatus().equals(oldStatus);
            boolean commentAdded = dto.getComments() != null
                    && !dto.getComments().equals(oldComments)
                    && !user.getId().equals(record.getAuthor().getId());

            if (statusChanged) {
                activityService.log(user, "UPDATE_STATUS", "Record", record.getTitle() + " -> " + dto.getStatus());
                User author = record.getAuthor();
                String notificationType;
                String title;
                String message;

                switch (dto.getStatus()) {
                    case "APPROVED", "ACCEPTED" -> {
                        notificationType = "REPORT_ACCEPTED";
                        title = "Отчёт принят";
                        message = "Ваш отчёт \"" + record.getTitle() + "\" был принят администратором.";
                    }
                    case "REJECTED" -> {
                        notificationType = "REPORT_REJECTED";
                        title = "Отчёт отклонён";
                        message = "Ваш отчёт \"" + record.getTitle() + "\" был отклонён администратором.";
                        if (record.getComments() != null && !record.getComments().isEmpty()) {
                            message += " Комментарий: " + record.getComments();
                        }
                    }
                    case "RETURNED" -> {
                        notificationType = "REPORT_RETURNED";
                        title = "Отчёт отправлен на исправление";
                        message = "Ваш отчёт \"" + record.getTitle() + "\" отправлен на исправление.";
                        if (record.getComments() != null && !record.getComments().isEmpty()) {
                            message += " Комментарий: " + record.getComments();
                        }
                    }
                    default -> {
                        return record;
                    }
                }
                notificationService.createNotification(author, title, message, notificationType, record.getId(), "RECORD");
            } else if (commentAdded) {
                // Admin left a new comment without changing status
                User author = record.getAuthor();
                notificationService.createNotification(
                        author,
                        "Новый комментарий администратора",
                        "К вашему отчёту \"" + record.getTitle() + "\" добавлен комментарий: " + dto.getComments(),
                        "NEW_ADMIN_COMMENT",
                        record.getId(), "RECORD");
            }
        }
        return record;
    }

    public void deleteRecord(Long id) {
        User user = getCurrentUser();
        Record record = recordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Record not found"));

        if (!record.getAuthor().getId().equals(user.getId())) {
            throw new RuntimeException("You can delete only your own records");
        }

        recordRepository.delete(record);
    }

    public List<Record> getRecordsByCategory(Long categoryId) {
        return recordRepository.findByCategoryId(categoryId);
    }

    public List<Record> getRecordsByUserId(Long userId) {
        return recordRepository.findByAuthorId(userId);
    }

    public List<Record> getRecordsByUser(User user){
        return recordRepository.findByAuthorId(user.getId());
    }
    
    public List<Record> getMyRecords() {
        try {
            User user = getCurrentUser();
            System.out.println("Getting records for user: " + user.getUsername() + " (ID: " + user.getId() + ")");
            List<Record> records = getRecordsByUser(user);
            System.out.println("Found " + records.size() + " records");
            return records;
        } catch (Exception e) {
            System.err.println("Error in getMyRecords: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Не удалось загрузить отчеты: " + e.getMessage(), e);
        }
    }

    public List<Record> searchAllowedRecords(String username, String query) {

        Optional<User> user = userRepository.findByUsername(username);

        Set<Category> allowed = user.get().getAllowedCategories();

        List<Record> all = recordRepository.findByTitleContainingIgnoreCase(query);

        return all.stream()
                .filter(r -> allowed.contains(r.getCategory()))
                .toList();
    }

}

