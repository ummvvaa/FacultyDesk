package org.example.fullstackpj.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Entity.Activity;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.ActivityRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    @Transactional
    public void log(User user, String action, String objectType, String objectName) {
        Activity activity = new Activity();
        activity.setUser(user);
        activity.setAction(action);
        activity.setObjectType(objectType);
        activity.setObjectName(objectName);
        activity.setCreatedAt(LocalDateTime.now());
        activityRepository.save(activity);
    }

    public List<Activity> getUserActivity(Long userId) {
        return activityRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}

