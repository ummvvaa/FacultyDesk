package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Dto.ai.TodayFocusDto;
import org.example.fullstackpj.Dto.dashboard.AdminDashboardDto;
import org.example.fullstackpj.Dto.dashboard.TeacherDashboardDto;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Service.DashboardService;
import org.example.fullstackpj.Service.UserService;
import org.example.fullstackpj.Service.ai.TodayFocusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Locale;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserService userService;
    private final TodayFocusService todayFocusService;

    public DashboardController(DashboardService dashboardService,
                               UserService userService,
                               TodayFocusService todayFocusService) {
        this.dashboardService = dashboardService;
        this.userService = userService;
        this.todayFocusService = todayFocusService;
    }

    @GetMapping("/teacher")
    public ResponseEntity<TeacherDashboardDto> teacherDashboard(Principal principal) {
        User teacher = userService.getUserEntity(principal.getName());
        return ResponseEntity.ok(dashboardService.buildTeacherDashboard(teacher));
    }

    @GetMapping("/admin")
    public ResponseEntity<AdminDashboardDto> adminDashboard() {
        return ResponseEntity.ok(dashboardService.buildAdminDashboard());
    }

    @GetMapping("/today-focus")
    public ResponseEntity<TodayFocusDto> todayFocus(
            @RequestParam(defaultValue = "ru") String locale,
            Principal principal) {
        User user = userService.getUserEntity(principal.getName());
        Locale loc = "en".equalsIgnoreCase(locale) ? Locale.ENGLISH : new Locale("ru");
        return ResponseEntity.ok(todayFocusService.generateFocus(user, loc));
    }
}
