package org.example.fullstackpj.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.fullstackpj.Dto.PinnedItemDto;
import org.example.fullstackpj.Entity.PinnedItem;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.PinnedItemType;
import org.example.fullstackpj.Repository.PinnedItemRepository;
import org.example.fullstackpj.Repository.PublicationRepository;
import org.example.fullstackpj.Repository.RecordRepository;
import org.example.fullstackpj.Repository.TemplateRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PinnedItemService {

    private static final int MAX_PINS = 20;

    private final PinnedItemRepository pinnedRepo;
    private final TemplateRepository templateRepo;
    private final PublicationRepository publicationRepo;
    private final RecordRepository recordRepo;

    public List<PinnedItemDto> listForUser(User user) {
        return pinnedRepo.findByUserOrderBySortOrderAscPinnedAtAsc(user)
                .stream()
                .map(p -> resolvePin(p))
                .filter(d -> d != null)
                .collect(Collectors.toList());
    }

    @Transactional
    public PinnedItemDto pin(User user, PinnedItemType type, Long itemId, String pagePath, String customTitle) {
        if (pinnedRepo.countByUser(user) >= MAX_PINS) {
            throw new IllegalStateException("Max " + MAX_PINS + " pinned items reached");
        }

        if (type == PinnedItemType.PAGE) {
            if (pinnedRepo.existsByUserAndPagePath(user, pagePath)) {
                throw new IllegalStateException("Already pinned");
            }
        } else {
            if (pinnedRepo.existsByUserAndItemTypeAndItemId(user, type, itemId)) {
                throw new IllegalStateException("Already pinned");
            }
        }

        PinnedItem item = new PinnedItem();
        item.setUser(user);
        item.setItemType(type);
        item.setItemId(type != PinnedItemType.PAGE ? itemId : null);
        item.setPagePath(type == PinnedItemType.PAGE ? pagePath : null);
        item.setCustomTitle(customTitle);
        item.setPinnedAt(LocalDateTime.now());
        item.setSortOrder((int) pinnedRepo.countByUser(user));

        PinnedItem saved = pinnedRepo.save(item);
        return resolvePin(saved);
    }

    @Transactional
    public void unpin(User user, Long pinId) {
        PinnedItem item = pinnedRepo.findById(pinId)
                .orElseThrow(() -> new RuntimeException("Pin not found: " + pinId));
        if (!item.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not your pin");
        }
        pinnedRepo.delete(item);
    }

    @Transactional
    public void reorder(User user, List<Long> pinIds) {
        List<PinnedItem> pins = pinnedRepo.findByUserOrderBySortOrderAscPinnedAtAsc(user);
        Map<Long, PinnedItem> pinMap = pins.stream()
                .collect(Collectors.toMap(PinnedItem::getId, p -> p));
        for (int i = 0; i < pinIds.size(); i++) {
            PinnedItem p = pinMap.get(pinIds.get(i));
            if (p != null && p.getUser().getId().equals(user.getId())) {
                p.setSortOrder(i);
                pinnedRepo.save(p);
            }
        }
    }

    public boolean isPinned(User user, PinnedItemType type, Long itemId, String pagePath) {
        if (type == PinnedItemType.PAGE) {
            return pinnedRepo.existsByUserAndPagePath(user, pagePath);
        }
        return pinnedRepo.existsByUserAndItemTypeAndItemId(user, type, itemId);
    }

    public Long getPinId(User user, PinnedItemType type, Long itemId, String pagePath) {
        if (type == PinnedItemType.PAGE) {
            return pinnedRepo.findByUserAndPagePath(user, pagePath)
                    .map(PinnedItem::getId).orElse(null);
        }
        return pinnedRepo.findByUserAndItemTypeAndItemId(user, type, itemId)
                .map(PinnedItem::getId).orElse(null);
    }

    private PinnedItemDto resolvePin(PinnedItem p) {
        String title = p.getCustomTitle();
        String subtitle = null;
        String icon;
        String navigateTo;

        try {
            switch (p.getItemType()) {
                case TEMPLATE -> {
                    icon = "FileText";
                    navigateTo = "/templates-library";
                    if (title == null && p.getItemId() != null) {
                        title = templateRepo.findById(p.getItemId())
                                .map(t -> t.getName()).orElse("Template #" + p.getItemId());
                    }
                }
                case PUBLICATION -> {
                    icon = "BookOpen";
                    navigateTo = "/publications";
                    if (title == null && p.getItemId() != null) {
                        title = publicationRepo.findById(p.getItemId())
                                .map(pub -> pub.getTitle()).orElse("Publication #" + p.getItemId());
                    }
                }
                case RECORD -> {
                    icon = "ClipboardList";
                    navigateTo = "/documents";
                    if (title == null && p.getItemId() != null) {
                        title = recordRepo.findById(p.getItemId())
                                .map(r -> r.getTitle()).orElse("Record #" + p.getItemId());
                    }
                }
                case PAGE -> {
                    icon = "Link";
                    navigateTo = p.getPagePath() != null ? p.getPagePath() : "/";
                    if (title == null) {
                        title = resolvePageTitle(p.getPagePath());
                    }
                }
                default -> {
                    icon = "Bookmark";
                    navigateTo = "/";
                }
            }
        } catch (Exception e) {
            log.warn("Failed to resolve pin {}: {}", p.getId(), e.getMessage());
            return null;
        }

        return PinnedItemDto.builder()
                .id(p.getId())
                .type(p.getItemType())
                .itemId(p.getItemId())
                .pagePath(p.getPagePath())
                .title(title != null ? title : "Pinned item")
                .subtitle(subtitle)
                .icon(icon)
                .navigateTo(navigateTo)
                .customTitle(p.getCustomTitle())
                .sortOrder(p.getSortOrder())
                .pinned(true)
                .build();
    }

    private String resolvePageTitle(String path) {
        if (path == null) return "Page";
        return switch (path) {
            case "/kkk" -> "KKK Profile";
            case "/publications" -> "Publications";
            case "/documents" -> "Documents";
            case "/templates-library" -> "Templates";
            case "/deadlines" -> "Deadlines";
            case "/notifications" -> "Notifications";
            case "/find-supervisor" -> "Find Supervisor";
            case "/profile" -> "My Profile";
            default -> path;
        };
    }
}
