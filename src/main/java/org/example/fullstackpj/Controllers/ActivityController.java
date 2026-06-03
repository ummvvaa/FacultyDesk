package org.example.fullstackpj.Controllers;

import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Entity.Activity;
import org.example.fullstackpj.Service.ActivityService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/activity")
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/{id}")
    public List<Activity> getActivity(@PathVariable Long id) {
        return activityService.getUserActivity(id);
    }
}

