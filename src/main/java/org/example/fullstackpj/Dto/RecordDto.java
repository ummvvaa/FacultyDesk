package org.example.fullstackpj.Dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RecordDto {
    private String title;
    private String description;
    private Long categoryId;
    private String status;
    private String comments;
}

