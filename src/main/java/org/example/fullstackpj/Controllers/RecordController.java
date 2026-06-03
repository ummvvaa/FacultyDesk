package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Dto.RecordDto;
import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Service.RecordService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final RecordService recordService;

    public RecordController(RecordService recordService) {
        this.recordService = recordService;
    }

    @PostMapping
    public ResponseEntity<?> createRecord(@RequestParam("title") String title,
                                          @RequestParam("description") String description,
                                          @RequestParam("categoryId") Long categoryId,
                                          @RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            Record record = recordService.createRecord(title, description, file, categoryId);
            return ResponseEntity.ok(record);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Ошибка при сохранении файла: " + e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body("Ошибка: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Внутренняя ошибка сервера: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllRecords() {
        try {
            return ResponseEntity.ok(recordService.getAllRecords());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Ошибка при загрузке отчетов: " + e.getMessage());
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getMyRecords() {
        try {
            System.out.println("=== GET /api/records/me called ===");
            List<Record> records = recordService.getMyRecords();
            System.out.println("Found " + records.size() + " records");
            
            // Проверяем каждую запись на наличие проблемных связей
            for (Record record : records) {
                if (record.getAuthor() != null) {
                    System.out.println("Record " + record.getId() + " has author: " + record.getAuthor().getUsername());
                }
                if (record.getCategory() != null) {
                    System.out.println("Record " + record.getId() + " has category: " + record.getCategory().getName());
                }
            }
            
            System.out.println("Returning " + records.size() + " records");
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            System.err.println("ERROR in getMyRecords: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            e.printStackTrace();
            System.err.println("Stack trace:");
            e.printStackTrace();
            return ResponseEntity.status(500).body("Ошибка при загрузке отчетов: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRecord(@PathVariable Long id) {
        return ResponseEntity.ok(recordService.getRecord(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserRecords(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(recordService.getRecordsByUserId(userId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка при загрузке отчетов: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRecord(@PathVariable Long id, @RequestBody RecordDto dto) {
        Record updated = recordService.updateRecord(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRecord(@PathVariable Long id) {
        try {
            recordService.deleteRecord(id);
            return ResponseEntity.ok("Record deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body("Ошибка: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Внутренняя ошибка сервера: " + e.getMessage());
        }
    }

    @GetMapping("/pdf/{filename}")
    public ResponseEntity<?> getPdf(@PathVariable String filename) {
        try {
            Path filePath = Paths.get("src/main/resources/static/pdf").resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .header("Content-Type", "application/octet-stream")
                        .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка при загрузке файла: " + e.getMessage());
        }
    }
}
