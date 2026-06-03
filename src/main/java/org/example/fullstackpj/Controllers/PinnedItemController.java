package org.example.fullstackpj.Controllers;

import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Dto.PinnedItemDto;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.PinnedItemType;
import org.example.fullstackpj.Service.PinnedItemService;
import org.example.fullstackpj.Service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pins")
@RequiredArgsConstructor
public class PinnedItemController {

    private final PinnedItemService pinnedItemService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<PinnedItemDto>> listPins(Principal principal) {
        User user = userService.getUserEntity(principal.getName());
        return ResponseEntity.ok(pinnedItemService.listForUser(user));
    }

    @PostMapping
    public ResponseEntity<PinnedItemDto> pin(
            @RequestBody Map<String, Object> body,
            Principal principal) {
        User user = userService.getUserEntity(principal.getName());

        String typeStr = body.getOrDefault("type", "PAGE").toString();
        PinnedItemType type = PinnedItemType.valueOf(typeStr);

        Long itemId = null;
        if (body.get("itemId") != null) {
            itemId = Long.valueOf(body.get("itemId").toString());
        }
        String pagePath = body.get("pagePath") != null ? body.get("pagePath").toString() : null;
        String customTitle = body.get("customTitle") != null ? body.get("customTitle").toString() : null;

        PinnedItemDto dto = pinnedItemService.pin(user, type, itemId, pagePath, customTitle);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> unpin(@PathVariable Long id, Principal principal) {
        User user = userService.getUserEntity(principal.getName());
        pinnedItemService.unpin(user, id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorder(
            @RequestBody Map<String, List<Long>> body,
            Principal principal) {
        User user = userService.getUserEntity(principal.getName());
        List<Long> pinIds = body.get("pinIds");
        if (pinIds != null) {
            pinnedItemService.reorder(user, pinIds);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkPin(
            @RequestParam String type,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) String pagePath,
            Principal principal) {
        User user = userService.getUserEntity(principal.getName());
        PinnedItemType itemType = PinnedItemType.valueOf(type);
        boolean pinned = pinnedItemService.isPinned(user, itemType, itemId, pagePath);
        Long pinId = pinned ? pinnedItemService.getPinId(user, itemType, itemId, pagePath) : null;
        return ResponseEntity.ok(Map.of("pinned", pinned, "pinId", pinId != null ? pinId : 0));
    }
}
