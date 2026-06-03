package org.example.fullstackpj.Exception;

import org.example.fullstackpj.Service.ai.AiUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AiUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleAiUnavailable(AiUnavailableException ex) {
        logger.warn("AI Unavailable: {}", ex.getMessage());
        Map<String, Object> body = new HashMap<>();
        body.put("error", "AiUnavailable");
        body.put("message", ex.getMessage());
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<Map<String, String>> handleHttpMessageNotWritableException(HttpMessageNotWritableException e) {
        logger.error("Error serializing response to JSON", e);
        Map<String, String> error = new HashMap<>();
        error.put("message", "Ошибка при сериализации данных. Возможна циклическая ссылка в данных.");
        Throwable rootCause = e.getRootCause();
        error.put("error", rootCause != null && rootCause.getMessage() != null ? rootCause.getMessage() : e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException e) {
        logger.warn("File upload size exceeded limit", e);
        Map<String, String> error = new HashMap<>();
        error.put("message", "Размер файла превышает максимально допустимый размер (10MB). Пожалуйста, выберите файл меньшего размера.");
        error.put("error", "MAX_UPLOAD_SIZE_EXCEEDED");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        logger.warn("Bad request: {}", ex.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "BadRequest");
        error.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGenericException(Exception e) {
        logger.error("Unexpected error occurred", e);
        Map<String, String> error = new HashMap<>();
        error.put("message", "Внутренняя ошибка сервера: " + e.getMessage());
        if (e.getCause() != null) {
            error.put("cause", e.getCause().getMessage());
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

