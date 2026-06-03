package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.WorkExperience;
import org.example.fullstackpj.Repository.WorkExperienceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WorkExperienceService {

    private final WorkExperienceRepository workExperienceRepository;

    public WorkExperienceService(WorkExperienceRepository workExperienceRepository) {
        this.workExperienceRepository = workExperienceRepository;
    }

    public List<WorkExperience> getMy(User user) {
        return workExperienceRepository.findByUserOrderByStartYearDesc(user);
    }

    public List<WorkExperience> getByUserId(Long userId, User currentUser) {
        if (isAdmin(currentUser) || currentUser.getId().equals(userId)) {
            return workExperienceRepository.findByUserOrderByStartYearDesc(userRef(userId));
        }
        throw new RuntimeException("Access denied");
    }

    @Transactional
    public WorkExperience create(WorkExperience data, User user) {
        data.setUser(user);
        return workExperienceRepository.save(data);
    }

    @Transactional
    public WorkExperience update(Long id, WorkExperience data, User currentUser) {
        WorkExperience existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        existing.setPosition(data.getPosition());
        existing.setOrganization(data.getOrganization());
        existing.setStartYear(data.getStartYear());
        existing.setEndYear(data.getEndYear());
        existing.setCurrent(data.isCurrent());
        existing.setDescription(data.getDescription());
        return workExperienceRepository.save(existing);
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        WorkExperience existing = findById(id);
        requireOwnerOrAdmin(existing, currentUser);
        workExperienceRepository.delete(existing);
    }

    private WorkExperience findById(Long id) {
        return workExperienceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("WorkExperience not found: " + id));
    }

    private User userRef(Long userId) {
        User u = new User();
        u.setId(userId);
        return u;
    }

    private boolean isAdmin(User user) {
        return "ROLE_ADMIN".equals(user.getRole());
    }

    private void requireOwnerOrAdmin(WorkExperience we, User user) {
        if (!isAdmin(user) && !we.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
    }
}
