package org.example.fullstackpj.Service;

import jakarta.persistence.criteria.Predicate;
import org.example.fullstackpj.Dto.DeadlineDto;
import org.example.fullstackpj.Entity.Deadline;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.DeadlineCategory;
import org.example.fullstackpj.Entity.enums.RepeatType;
import org.example.fullstackpj.Entity.enums.TargetRole;
import org.example.fullstackpj.Repository.DeadlineRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class DeadlineService {

    private final DeadlineRepository deadlineRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public DeadlineService(DeadlineRepository deadlineRepository,
                           UserRepository userRepository,
                           NotificationService notificationService) {
        this.deadlineRepository = deadlineRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<Deadline> getRelevant(User user) {
        return deadlineRepository.findRelevantForUser(user, user.getRole(), false);
    }

    @Transactional(readOnly = true)
    public Page<Deadline> getAllForAdmin(DeadlineCategory category, RepeatType repeatType,
                                        Boolean active, Pageable pageable) {
        Specification<Deadline> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (category != null) predicates.add(cb.equal(root.get("category"), category));
            if (repeatType != null) predicates.add(cb.equal(root.get("repeatType"), repeatType));
            if (active != null) predicates.add(cb.equal(root.get("active"), active));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return deadlineRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Deadline getById(Long id) {
        return deadlineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deadline not found: " + id));
    }

    @Transactional
    public Deadline create(DeadlineDto dto, User creator) {
        Deadline d = new Deadline();
        applyDto(d, dto);
        d.setCreatedBy(creator);
        d.setCreatedAt(LocalDateTime.now());
        d.setUpdatedAt(LocalDateTime.now());
        return deadlineRepository.save(d);
    }

    @Transactional
    public Deadline update(Long id, DeadlineDto dto) {
        Deadline d = getById(id);
        applyDto(d, dto);
        d.setUpdatedAt(LocalDateTime.now());
        return deadlineRepository.save(d);
    }

    @Transactional
    public void delete(Long id) {
        deadlineRepository.deleteById(id);
    }

    @Transactional
    public void notifyUsers(Long id) {
        Deadline deadline = getById(id);
        List<User> recipients = resolveTargetUsers(deadline);
        for (User u : recipients) {
            notificationService.createDeadlineNotification(u, deadline, "DEADLINE_REMINDER");
        }
        deadline.setLastNotificationSent(LocalDateTime.now());
        deadlineRepository.save(deadline);
    }

    public List<User> resolveTargetUsers(Deadline deadline) {
        return switch (deadline.getTargetRole()) {
            case ALL -> userRepository.findAll();
            case TEACHERS_ONLY -> userRepository.findAll().stream()
                    .filter(u -> "ROLE_TEACHER".equals(u.getRole())).toList();
            case ADMINS_ONLY -> userRepository.findAll().stream()
                    .filter(u -> "ROLE_ADMIN".equals(u.getRole())).toList();
            case SPECIFIC_USERS -> new ArrayList<>(deadline.getTargetUsers());
        };
    }

    private void applyDto(Deadline d, DeadlineDto dto) {
        d.setTitle(dto.getTitle());
        d.setDescription(dto.getDescription());
        d.setDeadlineDate(dto.getDeadlineDate());
        d.setCategory(dto.getCategory());
        d.setTargetRole(dto.getTargetRole() != null ? dto.getTargetRole() : TargetRole.ALL);
        d.setRepeatType(dto.getRepeatType() != null ? dto.getRepeatType() : RepeatType.ONE_TIME);
        d.setActive(dto.isActive());
        if (dto.getTargetUserIds() != null && !dto.getTargetUserIds().isEmpty()) {
            Set<User> users = new HashSet<>(userRepository.findAllById(dto.getTargetUserIds()));
            d.setTargetUsers(users);
        } else {
            d.setTargetUsers(new HashSet<>());
        }
    }
}
