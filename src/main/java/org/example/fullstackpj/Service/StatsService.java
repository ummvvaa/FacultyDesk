package org.example.fullstackpj.Service;

import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Repository.CategoryRepository;
import org.example.fullstackpj.Repository.RecordRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final RecordRepository recordRepository;

    public Map<String, Object> getGlobalStats() {

        Map<String, Object> stats = new HashMap<>();

        stats.put("usersCount", userRepository.count());
        stats.put("categoriesCount", categoryRepository.count());
        stats.put("recordsCount", recordRepository.countAllRecords());

        stats.put("topAuthors", recordRepository.findTopAuthors());
        stats.put("topCategories", recordRepository.findTopCategories());
        stats.put("activityByDay", recordRepository.findActivityByDay());

        return stats;
    }

    public Map<String, Object> getUserStats(Long userId) {

        Map<String, Object> stats = new HashMap<>();

        User user = userRepository.findById(userId).orElseThrow();
        List<Record> records = recordRepository.findByAuthorId(userId);

        stats.put("username", user.getUsername()); // <-- ключ username
        stats.put("recordsCount", records.size()); // <-- ключ recordsCount

        if (!records.isEmpty()) {
            stats.put("firstRecordDate", records.stream()
                    .min(Comparator.comparing(Record::getCreatedAt)).get().getCreatedAt());
            stats.put("lastRecordDate", records.stream()
                    .max(Comparator.comparing(Record::getCreatedAt)).get().getCreatedAt());
        }

        Map<String, Long> byCategory = records.stream()
                .collect(Collectors.groupingBy(r -> r.getCategory().getName(), Collectors.counting()));
        stats.put("recordsByCategory", byCategory);

        Map<Date, Long> byDay = records.stream()
                .collect(Collectors.groupingBy(
                        r -> java.sql.Date.valueOf(r.getCreatedAt().toLocalDate()),
                        Collectors.counting()
                ));
        stats.put("recordsByDay", byDay);



        return stats;
    }

}
