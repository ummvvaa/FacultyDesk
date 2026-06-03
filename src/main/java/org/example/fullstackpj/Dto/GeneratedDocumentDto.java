package org.example.fullstackpj.Dto;

import lombok.Data;
import org.example.fullstackpj.Entity.GeneratedDocument;

import java.time.LocalDateTime;

@Data
public class GeneratedDocumentDto {
    private Long id;
    private String title;
    private String documentType;
    private String sourceExcelFile;
    private LocalDateTime generationDate;
    private String status;
    private String filePath;
    private String originalFileName;
    private Long fileSize;
    private String comment;
    private Long robotRunId;
    private LocalDateTime createdAt;
    private Long teacherId;
    private String teacherUsername;

    public static GeneratedDocumentDto fromEntity(GeneratedDocument doc) {
        GeneratedDocumentDto dto = new GeneratedDocumentDto();
        dto.setId(doc.getId());
        dto.setTitle(doc.getTitle());
        dto.setDocumentType(doc.getDocumentType() != null ? doc.getDocumentType().name() : null);
        dto.setSourceExcelFile(doc.getSourceExcelFile());
        dto.setGenerationDate(doc.getGenerationDate());
        dto.setStatus(doc.getStatus() != null ? doc.getStatus().name() : null);
        dto.setFilePath(doc.getFilePath());
        dto.setOriginalFileName(doc.getOriginalFileName());
        dto.setFileSize(doc.getFileSize());
        dto.setComment(doc.getComment());
        dto.setRobotRunId(doc.getRobotRunId());
        dto.setCreatedAt(doc.getCreatedAt());
        try {
            if (doc.getTeacher() != null) {
                dto.setTeacherId(doc.getTeacher().getId());
                dto.setTeacherUsername(doc.getTeacher().getUsername());
            }
        } catch (Exception ignored) {}
        return dto;
    }
}
