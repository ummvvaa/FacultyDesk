package org.example.fullstackpj.Dto;

import lombok.Builder;
import lombok.Data;
import org.example.fullstackpj.Entity.enums.PinnedItemType;

@Data
@Builder
public class PinnedItemDto {
    private Long id;
    private PinnedItemType type;
    private Long itemId;
    private String pagePath;
    private String title;
    private String subtitle;
    private String icon;
    private String navigateTo;
    private String customTitle;
    private Integer sortOrder;
    private boolean pinned;
}
