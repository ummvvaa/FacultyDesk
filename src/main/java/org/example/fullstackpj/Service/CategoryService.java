package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Category;
import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.CategoryRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.sql.Date;


@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private static final List<String> DEFAULT_CATEGORIES = List.of(
            "Учебная работа",
            "Научная работа",
            "Отчет за семестр",
            "Годовой отчет"
    );

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> getAllCategories() {
        ensureDefaultCategories();
        return categoryRepository.findAll();
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id).orElse(null);
    }

    public Category createCategory(String name) {
        Category category = new Category();
        category.setName(name != null ? name.trim() : "");
        return categoryRepository.save(category);
    }

    public Category updateCategory(Category category) {
        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id){
        categoryRepository.deleteById(id);
    }

    public Set<Category> getAllowedCategories(User user) {
        return user.getAllowedCategories();
    }

    public Map<Long, Integer> getRecordsCount(List<Category> categories) {
        Map<Long, Integer> map = new HashMap<>();
        for (Category cat : categories) {
            map.put(cat.getId(), cat.getRecords().size());
        }
        return map;
    }

    public Map<Long, Date> getLastUpdatedDate(List<Category> categories) {
        Map<Long, Date> map = new HashMap<>();
        for (Category cat : categories) {
            Date lastDate = cat.getRecords().stream()
                    .map(Record::getCreatedAt)
                    .max(Date::compareTo)
                    .orElse(null);
            map.put(cat.getId(), lastDate);
        }
        return map;
    }

    private void ensureDefaultCategories() {
        // Если категорий нет, создаём дефолтные
        if (categoryRepository.count() == 0) {
            int created = 0;
            for (String name : DEFAULT_CATEGORIES) {
                Category category = new Category();
                category.setName(name);
                categoryRepository.save(category);
                created++;
            }
            System.out.println("📊 Категории инициализированы автоматически: создано " + created);
        }
    }

}
