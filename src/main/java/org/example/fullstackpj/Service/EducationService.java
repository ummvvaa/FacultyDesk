package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Education;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Repository.EducationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EducationService {

    private final EducationRepository educationRepository;

    public EducationService(EducationRepository educationRepository) {
        this.educationRepository = educationRepository;
    }

    public List<Education> getMyEducations(User user) {
        return educationRepository.findByUserOrderByYearDesc(user);
    }

    public List<Education> getByUserId(Long userId, User currentUser) {
        User target = userRef(userId);
        if (isAdmin(currentUser) || currentUser.getId().equals(userId)) {
            return educationRepository.findByUserOrderByYearDesc(target);
        }
        throw new RuntimeException("Access denied");
    }

    @Transactional
    public Education create(Education data, User user) {
        data.setUser(user);
        data.setCreatedAt(LocalDateTime.now());
        return educationRepository.save(data);
    }

    @Transactional
    public Education update(Long id, Education data, User currentUser) {
        Education existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        existing.setDegree(data.getDegree());
        existing.setInstitution(data.getInstitution());
        existing.setSpecialty(data.getSpecialty());
        existing.setYear(data.getYear());
        return educationRepository.save(existing);
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        Education existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        educationRepository.delete(existing);
    }

    private Education findById(Long id) {
        return educationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Education not found: " + id));
    }

    private User userRef(Long userId) {
        User u = new User();
        u.setId(userId);
        return u;
    }

    private boolean isAdmin(User user) {
        return "ROLE_ADMIN".equals(user.getRole());
    }

    private void requireOwnerOrAdmin(Education edu, User user) {
        if (!isAdmin(user) && !edu.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
    }
}
