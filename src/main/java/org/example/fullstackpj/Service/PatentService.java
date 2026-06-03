package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Patent;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.PatentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PatentService {

    private final PatentRepository patentRepository;

    public PatentService(PatentRepository patentRepository) {
        this.patentRepository = patentRepository;
    }

    public List<Patent> getMy(User user) {
        return patentRepository.findByUserOrderByYearDesc(user);
    }

    public List<Patent> getByUserId(Long userId, User currentUser) {
        if (isAdmin(currentUser) || currentUser.getId().equals(userId)) {
            return patentRepository.findByUserOrderByYearDesc(userRef(userId));
        }
        throw new RuntimeException("Access denied");
    }

    @Transactional
    public Patent create(Patent data, User user) {
        data.setUser(user);
        return patentRepository.save(data);
    }

    @Transactional
    public Patent update(Long id, Patent data, User currentUser) {
        Patent existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        existing.setTitle(data.getTitle());
        existing.setPatentNumber(data.getPatentNumber());
        existing.setYear(data.getYear());
        existing.setCountry(data.getCountry() != null ? data.getCountry() : "KZ");
        existing.setDescription(data.getDescription());
        return patentRepository.save(existing);
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        Patent existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        patentRepository.delete(existing);
    }

    private Patent findById(Long id) {
        return patentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patent not found: " + id));
    }

    private User userRef(Long userId) {
        User u = new User();
        u.setId(userId);
        return u;
    }

    private boolean isAdmin(User user) {
        return "ROLE_ADMIN".equals(user.getRole());
    }

    private void requireOwnerOrAdmin(Patent patent, User user) {
        if (!isAdmin(user) && !patent.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
    }
}
