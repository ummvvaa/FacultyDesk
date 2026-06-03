package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Entity.Category;
import org.example.fullstackpj.Entity.Event;
import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Entity.Submission;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.sql.Date;
import java.time.LocalDate;
import java.util.*;


@Controller
public class PageController {

    private final RecordService recordService;
    private final UserService userService;
    private final CategoryService categoryService;
    private final StatsService statsService;
    private final ActivityService activityService;
    private final EventService eventService;
    private final SubmissionService submissionService;

    public PageController(RecordService recordService, UserService userService, CategoryService categoryService, StatsService statsService, ActivityService activityService, EventService eventService, SubmissionService submissionService) {
        this.recordService = recordService;
        this.userService = userService;
        this.categoryService = categoryService;
        this.statsService = statsService;
        this.activityService = activityService;
        this.eventService = eventService;
        this.submissionService = submissionService;
    }


    @GetMapping("/login")
    public String loginPage() {
        return "loginPage";
    }

    @GetMapping("/register")
    public String registerPage() {
        return "registerPage";
    }

    @GetMapping("/record")
    public String recordPage(Model model) {
        model.addAttribute("categories", categoryService.getAllCategories());
        return "recordPage";
    }


    @GetMapping("/item")
    public String itemPage(
            @RequestParam(required = false) Integer min,
            @RequestParam(name = "updated_after", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate updatedAfter,
            Model model
    ) {
        java.sql.Date sqlDate = (updatedAfter != null)
                ? java.sql.Date.valueOf(updatedAfter)
                : null;

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserEntity(username);

        Set<Category> categories = categoryService.getAllowedCategories(user);
        List<Category> categoriesList = new ArrayList<>(categories);

        Map<Long, Integer> recordsCountMap = categoryService.getRecordsCount(categoriesList);
        Map<Long, Date> lastUpdatedMap = categoryService.getLastUpdatedDate(categoriesList);

        List<Category> filtered = categoriesList.stream()
                .filter(c -> min == null || recordsCountMap.getOrDefault(c.getId(), 0) >= min)
                .filter(c -> sqlDate == null ||
                        (lastUpdatedMap.get(c.getId()) != null &&
                                lastUpdatedMap.get(c.getId()).after(sqlDate)))
                .toList();

        model.addAttribute("categories", filtered);
        model.addAttribute("recordsCountMap", recordsCountMap);
        model.addAttribute("lastUpdatedMap", lastUpdatedMap);

        model.addAttribute("min", min);
        model.addAttribute("updated_after", updatedAfter);

        return "categoryPage";
    }




    @GetMapping("/forget")
    public String forgetPage(){
        return "forgetPage";
    }


    @GetMapping("/categories/{id}")
    public String categoryRecordsPage(@PathVariable Long id, Model model) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserEntity(username);
        boolean allowed = user.getAllowedCategories()
                .stream()
                .anyMatch(cat -> cat.getId().equals(id));

        if (!allowed) {
            return "redirect:/forbidden";
        }
        activityService.log(user, "VIEW", "Category", categoryService.getCategoryById(id).getName());

        model.addAttribute("category", categoryService.getCategoryById(id));
        model.addAttribute("records", recordService.getRecordsByCategory(id));
        model.addAttribute("favoriteIds", userService.getFavoriteRecordIds(user));

        return "categoryRecordsPage";
    }



    @GetMapping("/me")
    public String mePage(Model model) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserEntity(username);
        model.addAttribute("user", user);
        return "mePage";
    }

    @GetMapping("/favorites")
    public String viewFavorites(Model model) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        model.addAttribute("favorites", userService.getFavorites(username));
        return "favoritesPage";
    }

    @GetMapping("/search")
    public String searchPage(@RequestParam(required = false) String q, Model model) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (q != null && !q.isBlank()) {
            model.addAttribute("records", recordService.searchAllowedRecords(username,q));
            model.addAttribute("query", q);
        }

        return "searchPage";
    }

    @GetMapping("/stats")
    public String globalStats(Model model) {
        model.addAttribute("stats", statsService.getGlobalStats());
        return "globalStatsPage";
    }

    @GetMapping("/stats/{id}")
    public String userStats(@PathVariable Long id, Model model) {
        model.addAttribute("stats", statsService.getUserStats(id));
        return "userStatsPage";
    }


    @GetMapping("/events")
    public String allEventsPage(@RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                Model model) {
        List<Event> events;
        if (date != null) {
            events = eventService.getEventsAfterDate(Date.valueOf(date));
        } else {
            events = eventService.getAllEvents();
        }
        model.addAttribute("events", events);
        model.addAttribute("date", date);
        return "eventsPage";
    }

    @GetMapping("/events/{id}")
    public String eventPage(@PathVariable Long id, Model model) {
        Event event = eventService.getEventById(id);

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserEntity(username);

        List<Record> userRecords = recordService.getRecordsByUser(user);

        List<Submission> submissions = submissionService.getSubmissionsForEvent(user.getId(), id);

        model.addAttribute("event", event);
        model.addAttribute("submissions", submissions);
        model.addAttribute("userRecords", userRecords);

        return "eventPage";
    }

}

