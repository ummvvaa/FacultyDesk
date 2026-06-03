package org.example.fullstackpj.Config;

import org.example.fullstackpj.Entity.Category;
import org.example.fullstackpj.Entity.Template;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.TemplateStatus;
import org.example.fullstackpj.Repository.CategoryRepository;
import org.example.fullstackpj.Repository.TemplateRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TemplateRepository templateRepository;

    @Value("${app.robot.password}")
    private String robotPassword;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Создаём админа, если его нет
        Optional<User> adminOptional = userRepository.findByUsername("admin");
        if (adminOptional.isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ROLE_ADMIN");
            admin.setCreateDate(new Date(System.currentTimeMillis()));
            admin.setPath("default.png");
            admin.setEmail("admin@university.edu");
            admin.setPosition("Администратор");
            userRepository.save(admin);
            System.out.println("✅ Администратор создан: username=admin, password=admin123");
        } else {
            System.out.println("ℹ️ Администратор уже существует");
        }

        // Создаём технического пользователя-робота, если не существует
        Optional<User> robotOptional = userRepository.findByUsername("robot");
        if (robotOptional.isEmpty()) {
            User robot = new User();
            robot.setUsername("robot");
            robot.setPassword(passwordEncoder.encode(robotPassword));
            robot.setRole("ROLE_ROBOT");
            robot.setCreateDate(new Date(System.currentTimeMillis()));
            robot.setPath("default.png");
            robot.setEmail("robot@system.local");
            robot.setPosition("Automation Robot");
            userRepository.save(robot);
            System.out.println("✅ Робот создан: username=robot, role=ROLE_ROBOT");
        } else {
            System.out.println("ℹ️ Пользователь-робот уже существует");
        }

        // Опционально: создаём тестового преподавателя
        Optional<User> teacherOptional = userRepository.findByUsername("teacher");
        if (teacherOptional.isEmpty()) {
            User teacher = new User();
            teacher.setUsername("teacher");
            teacher.setPassword(passwordEncoder.encode("teacher123"));
            teacher.setRole("ROLE_TEACHER");
            teacher.setCreateDate(new Date(System.currentTimeMillis()));
            teacher.setPath("default.png");
            teacher.setEmail("teacher@university.edu");
            teacher.setPosition("Старший преподаватель");
            teacher.setAcademicDegree("Кандидат технических наук");
            teacher.setPhone("+7 (XXX) XXX-XX-XX");
            teacher.setOffice("Кабинет 101");
            teacher.setResearchAreas("Информационные технологии, Программирование");
            userRepository.save(teacher);
            System.out.println("✅ Преподаватель создан: username=teacher, password=teacher123");
        }

        // Создаём категории, если их нет
        List<String> categoryNames = Arrays.asList(
            "Учебная работа",
            "Научная работа",
            "Отчет за семестр",
            "Годовой отчет"
        );
        
        // Удаляем категории "Методическая работа" и "Воспитательная работа", если они существуют
        Optional<Category> metodCategory = categoryRepository.findByName("Методическая работа");
        if (metodCategory.isPresent()) {
            categoryRepository.delete(metodCategory.get());
            System.out.println("✅ Категория удалена: Методическая работа");
        }
        
        Optional<Category> vospCategory = categoryRepository.findByName("Воспитательная работа");
        if (vospCategory.isPresent()) {
            categoryRepository.delete(vospCategory.get());
            System.out.println("✅ Категория удалена: Воспитательная работа");
        }

        int createdCount = 0;
        int existingCount = 0;
        
        for (String categoryName : categoryNames) {
            Optional<Category> categoryOptional = categoryRepository.findByName(categoryName);
            if (categoryOptional.isEmpty()) {
                Category category = new Category();
                category.setName(categoryName);
                categoryRepository.save(category);
                System.out.println("✅ Категория создана: " + categoryName);
                createdCount++;
            } else {
                existingCount++;
            }
        }
        
        System.out.println("📊 Итого категорий: создано " + createdCount + ", уже существует " + existingCount + ", всего в базе: " + categoryRepository.count());

        if (categoryRepository.count() == 0) {
            System.out.println("⚠️ ВНИМАНИЕ: В базе данных нет категорий! Возможно, произошла ошибка при создании.");
        }

        // Migrate templates: set status from legacy active field where status is null
        int migrated = 0;
        for (Template t : templateRepository.findAll()) {
            if (t.getStatus() == null) {
                t.setStatus(t.isActive() ? TemplateStatus.ACTIVE : TemplateStatus.ARCHIVED);
                if (t.getDownloadCount() == null) t.setDownloadCount(0L);
                templateRepository.save(t);
                migrated++;
            }
        }
        if (migrated > 0) {
            System.out.println("✅ Мигрировано шаблонов (active → status): " + migrated);
        }

        executePowerBiViews();
    }

    private void executePowerBiViews() {
        try {
            ClassPathResource resource = new ClassPathResource("db/views/power_bi_views.sql");
            String sql = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            // Split on statement boundaries and execute each CREATE OR REPLACE VIEW separately
            for (String statement : sql.split(";")) {
                String trimmed = statement.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                    jdbcTemplate.execute(trimmed);
                }
            }
            System.out.println("✅ Power BI views created/updated");
        } catch (IOException e) {
            System.out.println("⚠️ Could not read power_bi_views.sql: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("⚠️ Could not create Power BI views: " + e.getMessage());
        }
    }
}

