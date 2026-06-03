package org.example.fullstackpj.Service.ai;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Entity.AssistantConversation;
import org.example.fullstackpj.Entity.AssistantMessage;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.MessageRole;
import org.example.fullstackpj.Repository.AssistantConversationRepository;
import org.example.fullstackpj.Repository.AssistantMessageRepository;
import org.example.fullstackpj.Service.ai.groq.GroqClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Slf4j
public class AiAssistantService {

    private static final int MAX_HISTORY = 10;

    private final ObjectProvider<GroqClient> groqClientProvider;
    private final AssistantConversationRepository convRepo;
    private final AssistantMessageRepository msgRepo;
    private final UserContextBuilder userContextBuilder;
    private final AiMetrics aiMetrics;

    public AiAssistantService(ObjectProvider<GroqClient> groqClientProvider,
                              AssistantConversationRepository convRepo,
                              AssistantMessageRepository msgRepo,
                              UserContextBuilder userContextBuilder,
                              AiMetrics aiMetrics) {
        this.groqClientProvider = groqClientProvider;
        this.convRepo = convRepo;
        this.msgRepo = msgRepo;
        this.userContextBuilder = userContextBuilder;
        this.aiMetrics = aiMetrics;
    }

    public AssistantConversation getOrCreateConversation(User user, Long convId) {
        if (convId != null) {
            AssistantConversation c = convRepo.findById(convId)
                    .orElseThrow(() -> new RuntimeException("Conversation not found: " + convId));
            if (!c.getUser().getId().equals(user.getId())) {
                throw new SecurityException("Not your conversation");
            }
            return c;
        }
        AssistantConversation conv = new AssistantConversation();
        conv.setUser(user);
        conv.setCreatedAt(LocalDateTime.now());
        conv.setLastMessageAt(LocalDateTime.now());
        return convRepo.save(conv);
    }

    @Transactional
    public AssistantMessage sendMessage(User user, Long convId, String message, Locale locale) {
        GroqClient groqClient = groqClientProvider.getIfAvailable();
        if (groqClient == null) {
            throw new AiUnavailableException("AI Assistant requires GROQ_API_KEY to be configured.");
        }

        AssistantConversation conv = getOrCreateConversation(user, convId);

        AssistantMessage userMsg = new AssistantMessage();
        userMsg.setConversation(conv);
        userMsg.setRole(MessageRole.USER);
        userMsg.setContent(message);
        userMsg.setCreatedAt(LocalDateTime.now());
        msgRepo.save(userMsg);
        aiMetrics.recordChatMessage("user");

        String userContext = userContextBuilder.buildContext(user);
        String systemPrompt = buildSystemPrompt(userContext, locale);

        List<AssistantMessage> all = msgRepo.findByConversationOrderByCreatedAtAsc(conv);
        int skip = Math.max(0, all.size() - MAX_HISTORY);
        List<AssistantMessage> recent = all.subList(skip, all.size());

        List<Map<String, String>> history = new ArrayList<>();
        for (AssistantMessage m : recent) {
            if (m.getId().equals(userMsg.getId())) continue;
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("role", m.getRole() == MessageRole.USER ? "user" : "assistant");
            entry.put("content", m.getContent());
            history.add(entry);
        }

        String aiResponse;
        try {
            aiResponse = groqClient.chatWithHistory(systemPrompt, history, message, "chat");
        } catch (Exception e) {
            log.error("AI Assistant Groq error", e);
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }

        AssistantMessage aiMsg = new AssistantMessage();
        aiMsg.setConversation(conv);
        aiMsg.setRole(MessageRole.ASSISTANT);
        aiMsg.setContent(aiResponse);
        aiMsg.setCreatedAt(LocalDateTime.now());
        msgRepo.save(aiMsg);
        aiMetrics.recordChatMessage("assistant");

        if (conv.getTitle() == null && message != null && message.length() > 5) {
            conv.setTitle(message.length() > 50 ? message.substring(0, 50) + "..." : message);
        }
        conv.setLastMessageAt(LocalDateTime.now());
        convRepo.save(conv);

        return aiMsg;
    }

    private String buildSystemPrompt(String userContext, Locale locale) {
        String langInstruction = "en".equals(locale != null ? locale.getLanguage() : "")
                ? "Respond in English."
                : "Отвечай на русском языке.";

        return """
                You are an AI assistant for IT department information system in a Kazakhstan university.
                You help teachers and admins with diploma supervision, KKK preparation, reports, publications,
                templates, deadlines, and general questions about the system.

                %s

                User context (current logged-in user's data):
                %s

                Guidelines:
                - Be concise and helpful. 2-4 sentences usually enough.
                - Use the user's data when relevant (e.g., specific numbers from their profile).
                - If asked about something not in context, say you don't have that info and suggest where to find it.
                - For KKK questions: priority order is publications > DOI > confirmation files > courses > education.
                - Don't make up facts. If unsure, say so.
                - For navigation help, mention page names like "/kkk", "/publications", "/profile".
                """.formatted(langInstruction, userContext);
    }

    public List<AssistantConversation> listConversations(User user) {
        return convRepo.findByUserOrderByLastMessageAtDesc(user, PageRequest.of(0, 20)).getContent();
    }

    public List<AssistantMessage> getMessages(Long convId, User user) {
        AssistantConversation c = convRepo.findById(convId)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + convId));
        if (!c.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not your conversation");
        }
        return msgRepo.findByConversationOrderByCreatedAtAsc(c);
    }

    @Transactional
    public String askKkkTutor(User user, String question, Locale locale) {
        GroqClient groqClient = groqClientProvider.getIfAvailable();
        if (groqClient == null) {
            throw new AiUnavailableException("KKK Tutor requires GROQ_API_KEY to be configured.");
        }

        String userContext = userContextBuilder.buildContext(user);
        String langInstruction = "en".equals(locale != null ? locale.getLanguage() : "")
                ? "Respond in English."
                : "Отвечай на русском языке.";

        String systemPrompt = """
                You are a KKK (Quality Qualification Commission) preparation expert for IT departments in Kazakhstan universities.
                Help teachers understand requirements, prepare documents, and improve their profile.

                %s

                Key KKK requirements:
                - Publications in last 5 years (especially Scopus, Web of Science, KOKSON)
                - DOI links and confirmation files (PDF scans of articles)
                - Qualification courses (last 3 years)
                - Education history
                - Work experience
                - Awards and patents (optional but valuable)
                - English level

                Teacher's current data:
                %s

                Guidelines:
                - Answer specifically about KKK, not general topics.
                - Be precise about requirements. Use numbers from teacher's profile when relevant.
                - 2-4 sentences usually enough.
                - Suggest concrete actions (e.g., "Add 2 more Scopus publications", "Get DOI for these papers").
                - Don't make up requirements. If unsure, say "Check with department admin".
                """.formatted(langInstruction, userContext);

        try {
            return groqClient.chat(systemPrompt, question, "kkk-tutor");
        } catch (Exception e) {
            log.error("KKK Tutor Groq error", e);
            throw new AiUnavailableException("AI is temporarily unavailable. Please try again in a moment.", e);
        }
    }

    @Transactional
    public void deleteConversation(Long convId, User user) {
        AssistantConversation c = convRepo.findById(convId)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + convId));
        if (!c.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not your conversation");
        }
        convRepo.delete(c);
    }
}
