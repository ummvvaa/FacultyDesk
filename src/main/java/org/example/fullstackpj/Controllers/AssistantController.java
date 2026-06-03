package org.example.fullstackpj.Controllers;

import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Entity.AssistantMessage;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.UserRepository;
import org.example.fullstackpj.Service.ai.AiAssistantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AiAssistantService service;
    private final UserRepository userRepo;

    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = userRepo.findByUsername(auth.getName()).orElseThrow();
        String message = (String) body.get("message");
        Long conversationId = body.get("conversationId") != null
                ? Long.valueOf(body.get("conversationId").toString())
                : null;
        String localeStr = (String) body.getOrDefault("locale", "ru");
        Locale locale = Locale.forLanguageTag(localeStr);

        AssistantMessage response = service.sendMessage(user, conversationId, message, locale);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("messageId", response.getId());
        out.put("conversationId", response.getConversation().getId());
        out.put("response", response.getContent());
        out.put("createdAt", response.getCreatedAt());
        return out;
    }

    @GetMapping("/conversations")
    public List<Map<String, Object>> listConversations(Authentication auth) {
        User user = userRepo.findByUsername(auth.getName()).orElseThrow();
        return service.listConversations(user).stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("title", c.getTitle() != null ? c.getTitle() : "Untitled");
            m.put("lastMessageAt", c.getLastMessageAt());
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/conversations/{id}/messages")
    public List<Map<String, Object>> messages(@PathVariable Long id, Authentication auth) {
        User user = userRepo.findByUsername(auth.getName()).orElseThrow();
        return service.getMessages(id, user).stream().map(m -> {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("id", m.getId());
            out.put("role", m.getRole().name().toLowerCase());
            out.put("content", m.getContent());
            out.put("createdAt", m.getCreatedAt());
            return out;
        }).collect(Collectors.toList());
    }

    @PostMapping("/kkk-tutor/ask")
    public Map<String, String> askKkkTutor(
            @RequestBody Map<String, String> body,
            @RequestParam(defaultValue = "ru") String locale,
            Authentication auth
    ) {
        User user = userRepo.findByUsername(auth.getName()).orElseThrow();
        String question = body.get("question");
        String answer = service.askKkkTutor(user, question, Locale.forLanguageTag(locale));
        return Map.of("answer", answer);
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id, Authentication auth) {
        User user = userRepo.findByUsername(auth.getName()).orElseThrow();
        service.deleteConversation(id, user);
        return ResponseEntity.noContent().build();
    }
}
