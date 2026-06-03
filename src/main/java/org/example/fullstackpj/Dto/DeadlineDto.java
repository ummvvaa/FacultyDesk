package org.example.fullstackpj.Dto;

import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.DeadlineCategory;
import org.example.fullstackpj.Entity.enums.RepeatType;
import org.example.fullstackpj.Entity.enums.TargetRole;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class DeadlineDto {
    private String title;
    private String description;
    private LocalDateTime deadlineDate;
    private DeadlineCategory category;
    private TargetRole targetRole;
    private List<Long> targetUserIds;
    private RepeatType repeatType;
    private boolean active = true;
}
