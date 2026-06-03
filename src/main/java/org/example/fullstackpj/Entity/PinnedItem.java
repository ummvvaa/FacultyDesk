package org.example.fullstackpj.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.PinnedItemType;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "pinned_items", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "item_type", "item_id"}),
        @UniqueConstraint(columnNames = {"user_id", "page_path"})
})
public class PinnedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private PinnedItemType itemType;

    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "page_path", length = 500)
    private String pagePath;

    @Column(name = "custom_title", length = 200)
    private String customTitle;

    @Column(name = "pinned_at")
    private LocalDateTime pinnedAt;

    @Column(name = "sort_order")
    private Integer sortOrder;
}
