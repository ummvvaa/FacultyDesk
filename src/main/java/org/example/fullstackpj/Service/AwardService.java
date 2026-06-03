package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Award;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.AwardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AwardService {

    private final AwardRepository awardRepository;

    public AwardService(AwardRepository awardRepository) {
        this.awardRepository = awardRepository;
    }

    public List<Award> getMy(User user) {
        return awardRepository.findByUserOrderByYearDesc(user);
    }

    public List<Award> getByUserId(Long userId, User currentUser) {
        if (isAdmin(currentUser) || currentUser.getId().equals(userId)) {
            return awardRepository.findByUserOrderByYearDesc(userRef(userId));
        }
        throw new RuntimeException("Access denied");
    }

    @Transactional
    public Award create(Award data, User user) {
        data.setUser(user);
        return awardRepository.save(data);
    }

    @Transactional
    public Award update(Long id, Award data, User currentUser) {
        Award existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        existing.setName(data.getName());
        existing.setOrganization(data.getOrganization());
        existing.setYear(data.getYear());
        existing.setDescription(data.getDescription());
        return awardRepository.save(existing);
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        Award existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        awardRepository.delete(existing);
    }

    private Award findById(Long id) {
        return awardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Award not found: " + id));
    }

    private User userRef(Long userId) {
        User u = new User();
        u.setId(userId);
        return u;
    }

    private boolean isAdmin(User user) {
        return "ROLE_ADMIN".equals(user.getRole());
    }

    private void requireOwnerOrAdmin(Award award, User user) {
        if (!isAdmin(user) && !award.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
    }
}
