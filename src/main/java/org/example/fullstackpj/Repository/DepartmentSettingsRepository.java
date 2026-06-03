package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.DepartmentSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentSettingsRepository extends JpaRepository<DepartmentSettings, Long> {
    // Получаем первую (и единственную) запись настроек
    DepartmentSettings findFirstByOrderByIdAsc();
}

