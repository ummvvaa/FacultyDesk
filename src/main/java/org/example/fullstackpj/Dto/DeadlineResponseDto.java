package org.example.fullstackpj.Dto;

import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.enums.DeadlineCategory;
import org.example.fullstackpj.Entity.enums.RepeatType;
import org.example.fullstackpj.Entity.enums.TargetRole;

import java.time.LocalDateTime;

@Getter
@Setter
public class DeadlineResponseDto {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime deadlineDate;
    private DeadlineCategory category;
    private TargetRole targetRole;
    private RepeatType repeatType;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdByName;
    private LocalDateTime lastNotificationSent;

    public static DeadlineResponseDto fromEntity(Deadline d) {
        DeadlineResponseDto dto = new DeadlineResponseDto();
        dto.setId(d.getId());
        dto.setTitle(d.getTitle());
        dto.setDescription(d.getDescription());
        dto.setDeadlineDate(d.getDeadlineDate());
        dto.setCategory(d.getCategory());
        dto.setTargetRole(d.getTargetRole());
        dto.setRepeatType(d.getRepeatType());
        dto.setActive(d.isActive());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());
        dto.setLastNotificationSent(d.getLastNotificationSent());
        if (d.getCreatedBy() != null) {
            try {
                dto.setCreatedByName(d.getCreatedBy().getFirstName() + " " + d.getCreatedBy().getLastName());
            } catch (Exception e) {
                dto.setCreatedByName(null);
            }
        }
        return dto;
    }
}
