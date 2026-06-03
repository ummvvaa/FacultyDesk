package org.example.fullstackpj.Repository;

import org.example.fullstackpj.Entity.Friendship;
import org.example.fullstackpj.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    Optional<Friendship> findByRequesterAndAddressee(User requester, User addressee);
    Optional<Friendship> findByAddresseeAndRequester(User addressee, User requester);
    List<Friendship> findByRequesterAndStatus(User requester, String status);
    List<Friendship> findByAddresseeAndStatus(User addressee, String status);
    List<Friendship> findByRequesterOrAddresseeAndStatus(User requester, User addressee, String status);
    List<Friendship> findByRequesterAndStatusOrAddresseeAndStatus(User requester, String status1, User addressee, String status2);
}

