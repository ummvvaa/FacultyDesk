package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.PinnedItem;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.PinnedItemType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PinnedItemRepository extends JpaRepository<PinnedItem, Long> {

    List<PinnedItem> findByUserOrderBySortOrderAscPinnedAtAsc(User user);

    boolean existsByUserAndItemTypeAndItemId(User user, PinnedItemType itemType, Long itemId);

    boolean existsByUserAndPagePath(User user, String pagePath);

    Optional<PinnedItem> findByUserAndItemTypeAndItemId(User user, PinnedItemType itemType, Long itemId);

    Optional<PinnedItem> findByUserAndPagePath(User user, String pagePath);

    void deleteByUserAndItemTypeAndItemId(User user, PinnedItemType itemType, Long itemId);

    long countByUser(User user);
}
