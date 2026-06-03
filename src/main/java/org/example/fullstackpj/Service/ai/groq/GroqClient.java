package org.example.fullstackpj.Service.ai.groq;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Service.ai.AiMetrics;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;

@Service
@Slf4j
@ConditionalOnExpression("'${app.ai.groq.api-key:}' != ''")
public class GroqClient {
    private final WebClient webClient;
    private final String model;
    private final int maxTokens;
    private final double temperature;
    private final int timeoutSeconds;
    private final ObjectMapper objectMapper;
    private final AiMetrics aiMetrics;

    public GroqClient(
            @Value("${app.ai.groq.api-key}") String apiKey,
            @Value("${app.ai.groq.base-url}") String baseUrl,
            @Value("${app.ai.groq.model}") String model,
            @Value("${app.ai.groq.max-tokens}") int maxTokens,
            @Value("${app.ai.groq.temperature}") double temperature,
            @Value("${app.ai.groq.timeout-seconds}") int timeoutSeconds,
            ObjectMapper objectMapper,
            AiMetrics aiMetrics
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GROQ_API_KEY not set");
        }
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
        this.model = model;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
        this.timeoutSeconds = timeoutSeconds;
        this.objectMapper = objectMapper;
        this.aiMetrics = aiMetrics;
        log.info("GroqClient initialized with model {}", model);
    }

    public String chat(String systemPrompt, String userPrompt) {
        return chat(systemPrompt, userPrompt, "unknown");
    }

    public String chat(String systemPrompt, String userPrompt, String feature) {
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "max_tokens", maxTokens,
                "temperature", temperature
        );

        Timer.Sample sample = aiMetrics.startTimer();
        String status = "success";
        try {
            JsonNode response = postChat(body);
            if (response == null) throw new GroqException("Groq returned null", null);
            recordUsageTokens(response, feature);
            return response.path("choices").get(0).path("message").path("content").asText();
        } catch (GroqException e) {
            status = classifyStatus(e);
            throw e;
        } catch (Exception e) {
            status = classifyStatus(e);
            log.warn("Groq chat failed: {}", e.getMessage());
            throw new GroqException("Groq AI temporarily unavailable", e);
        } finally {
            aiMetrics.recordRequest(feature, status, model);
            aiMetrics.stopTimer(sample, feature, status);
        }
    }

    public String chatWithHistory(String systemPrompt, List<Map<String, String>> history, String userPrompt) {
        return chatWithHistory(systemPrompt, history, userPrompt, "unknown");
    }

    public String chatWithHistory(String systemPrompt, List<Map<String, String>> history, String userPrompt, String feature) {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        for (Map<String, String> msg : history) {
            messages.add(Map.of("role", msg.get("role"), "content", msg.get("content")));
        }
        messages.add(Map.of("role", "user", "content", userPrompt));

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", messages,
                "max_tokens", maxTokens,
                "temperature", temperature
        );

        Timer.Sample sample = aiMetrics.startTimer();
        String status = "success";
        try {
            JsonNode response = postChat(body);
            if (response == null) throw new GroqException("Groq returned null", null);
            recordUsageTokens(response, feature);
            return response.path("choices").get(0).path("message").path("content").asText();
        } catch (GroqException e) {
            status = classifyStatus(e);
            throw e;
        } catch (Exception e) {
            status = classifyStatus(e);
            log.warn("Groq chat with history failed: {}", e.getMessage());
            throw new GroqException("Groq AI temporarily unavailable", e);
        } finally {
            aiMetrics.recordRequest(feature, status, model);
            aiMetrics.stopTimer(sample, feature, status);
        }
    }

    public <T> T chatJson(String systemPrompt, String userPrompt, Class<T> responseType) {
        return chatJson(systemPrompt, userPrompt, responseType, "unknown");
    }

    public <T> T chatJson(String systemPrompt, String userPrompt, Class<T> responseType, String feature) {
        String text = chat(systemPrompt, userPrompt, feature);

        String cleaned = text == null ? "" : text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        }

        try {
            return objectMapper.readValue(cleaned, responseType);
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse Groq JSON response: {}", cleaned, e);
            throw new GroqException("Invalid JSON from Groq", e);
        }
    }

    private JsonNode postChat(Map<String, Object> body) {
        return webClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    private void recordUsageTokens(JsonNode response, String feature) {
        JsonNode usage = response.path("usage");
        if (usage.isMissingNode() || usage.isNull()) return;
        long inputTokens = usage.path("prompt_tokens").asLong(0);
        long outputTokens = usage.path("completion_tokens").asLong(0);
        aiMetrics.recordTokens(feature, inputTokens, outputTokens);
    }

    private String classifyStatus(Throwable t) {
        Throwable cur = t;
        while (cur != null) {
            if (cur instanceof WebClientResponseException w) {
                return w.getStatusCode().value() == 429 ? "rate_limited" : "error";
            }
            if (cur instanceof TimeoutException) {
                return "timeout";
            }
            cur = cur.getCause();
        }
        return "error";
    }
}
