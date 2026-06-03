package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Entity.DepartmentSettings;
import org.example.fullstackpj.Service.DepartmentSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final DepartmentSettingsService settingsService;

    public SettingsController(DepartmentSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ResponseEntity<DepartmentSettings> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping
    public ResponseEntity<?> updateSettings(
            @RequestParam(value = "departmentName", required = false) String departmentName,
            @RequestParam(value = "deanery", required = false) String deanery,
            @RequestParam(value = "headOfDepartment", required = false) String headOfDepartment,
            @RequestParam(value = "postalAddress", required = false) String postalAddress,
            @RequestParam(value = "phoneNumbers", required = false) String phoneNumbers) {
        try {
            DepartmentSettings settings = settingsService.updateSettings(
                    departmentName, deanery, headOfDepartment, postalAddress, phoneNumbers);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка при обновлении настроек: " + e.getMessage());
        }
    }
}

