package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.DepartmentSettings;
import org.example.fullstackpj.Repository.DepartmentSettingsRepository;
import org.springframework.stereotype.Service;

@Service
public class DepartmentSettingsService {

    private final DepartmentSettingsRepository settingsRepository;

    public DepartmentSettingsService(DepartmentSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    public DepartmentSettings getSettings() {
        DepartmentSettings settings = settingsRepository.findFirstByOrderByIdAsc();
        if (settings == null) {
            // Создаем дефолтные настройки если их нет
            settings = new DepartmentSettings();
            settings.setDepartmentName("");
            settings.setDeanery("");
            settings.setHeadOfDepartment("");
            settings.setPostalAddress("");
            settings.setPhoneNumbers("");
            settings = settingsRepository.save(settings);
        }
        return settings;
    }

    public DepartmentSettings updateSettings(String departmentName, String deanery, String headOfDepartment, 
                                              String postalAddress, String phoneNumbers) {
        DepartmentSettings settings = getSettings();
        
        // Обновляем поля только если они переданы (не null и не пустые)
        if (departmentName != null && !departmentName.isEmpty()) {
            settings.setDepartmentName(departmentName);
        }
        if (deanery != null && !deanery.isEmpty()) {
            settings.setDeanery(deanery);
        }
        if (headOfDepartment != null && !headOfDepartment.isEmpty()) {
            settings.setHeadOfDepartment(headOfDepartment);
        }
        if (postalAddress != null && !postalAddress.isEmpty()) {
            settings.setPostalAddress(postalAddress);
        }
        if (phoneNumbers != null && !phoneNumbers.isEmpty()) {
            settings.setPhoneNumbers(phoneNumbers);
        }

        return settingsRepository.save(settings);
    }
}

