package org.example.fullstackpj.Controllers;

import org.example.fullstackpj.Entity.Submission;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Service.EventService;
import org.example.fullstackpj.Service.RecordService;
import org.example.fullstackpj.Service.SubmissionService;
import org.example.fullstackpj.Service.UserService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;
    private final UserService userService;
    private final EventService eventService;
    private final RecordService recordService;

    public SubmissionController(SubmissionService submissionService, UserService userService, EventService eventService, RecordService recordService) {
        this.submissionService = submissionService;
        this.userService = userService;
        this.eventService = eventService;
        this.recordService = recordService;
    }

    @PostMapping("/submit/{eventId}")
    public String submitReport(@PathVariable Long eventId,
                               @RequestParam("recordId") Long recordId,
                               @RequestParam(value = "note", required = false) String note,
                               @RequestHeader(value = "referer", required = false) String referer) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserEntity(username);

        Submission submission = new Submission();
        submission.setAuthor(user);
        submission.setEvent(eventService.getEventById(eventId));
        submission.setRecord(recordService.getRecord(recordId));
        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(new java.sql.Date(System.currentTimeMillis()));

        submissionService.submitReport(submission);

        return "redirect:" + (referer != null ? referer : "/events");
    }


    @PostMapping("/delete/{id}")
    public String deleteSubmission(@PathVariable Long id,
                                   @RequestHeader(value = "referer", required = false) String referer) {
        submissionService.deleteSubmission(id);
        return "redirect:" + (referer != null ? referer : "/events");
    }

}
