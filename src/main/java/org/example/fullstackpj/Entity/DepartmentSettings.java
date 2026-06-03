package org.example.fullstackpj.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "department_settings")
public class DepartmentSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String departmentName; // Название кафедры
    private String deanery; // Деканат
    private String headOfDepartment; // Руководитель кафедры
    private String postalAddress; // Почтовый адрес
    private String phoneNumbers; // Телефоны (можно несколько через запятую)
}

