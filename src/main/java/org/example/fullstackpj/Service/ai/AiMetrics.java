package org.example.fullstackpj.Service.ai;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiMetrics {

    private final MeterRegistry registry;

    public void recordRequest(String feature, String status, String model) {
        registry.counter("ai.requests.total",
                "feature", feature != null ? feature : "unknown",
                "status", status != null ? status : "unknown",
                "model", model != null ? model : "unknown"
        ).increment();
    }

    public Timer.Sample startTimer() {
        return Timer.start(registry);
    }

    public void stopTimer(Timer.Sample sample, String feature, String status) {
        if (sample == null) return;
        sample.stop(Timer.builder("ai.request.duration")
                .tag("feature", feature != null ? feature : "unknown")
                .tag("status", status != null ? status : "unknown")
                .publishPercentileHistogram()
                .register(registry));
    }

    public void recordTokens(String feature, long inputTokens, long outputTokens) {
        String f = feature != null ? feature : "unknown";
        if (inputTokens > 0) {
            registry.counter("ai.tokens.input.total", "feature", f).increment(inputTokens);
        }
        if (outputTokens > 0) {
            registry.counter("ai.tokens.output.total", "feature", f).increment(outputTokens);
        }
    }

    public void recordChatMessage(String role) {
        registry.counter("ai.chat.messages.total",
                "role", role != null ? role : "unknown"
        ).increment();
    }
}
