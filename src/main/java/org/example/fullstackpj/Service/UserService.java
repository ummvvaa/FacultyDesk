package org.example.fullstackpj.Service;

import org.apache.commons.lang3.RandomStringUtils;
import org.example.fullstackpj.CustomUserDetails;
import org.example.fullstackpj.Dto.KkkChecklistDto;
import org.example.fullstackpj.Dto.PublicProfileDto;
import org.example.fullstackpj.Entity.Education;
import org.example.fullstackpj.Entity.KkkProfile;
import org.example.fullstackpj.Entity.Publication;
import org.example.fullstackpj.Entity.Record;
import org.example.fullstackpj.Entity.User;
import org.example.fullstackpj.Entity.enums.PublicationStatus;
import org.example.fullstackpj.Repository.EducationRepository;
import org.example.fullstackpj.Repository.KkkProfileRepository;
import org.example.fullstackpj.Repository.PublicationRepository;
import org.example.fullstackpj.Repository.RecordRepository;
import org.example.fullstackpj.Repository.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Date;
import java.text.Normalizer;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class UserService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final RecordRepository recordRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JavaMailSender mailSender;
    private final ActivityService activityService;
    private final PublicationRepository publicationRepository;
    private final EducationRepository educationRepository;
    private final KkkProfileRepository kkkProfileRepository;
    private final KkkService kkkService;

    public UserService(UserRepository userRepository, RecordRepository recordRepository, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, JavaMailSender mailSender, ActivityService activityService, PublicationRepository publicationRepository, EducationRepository educationRepository, KkkProfileRepository kkkProfileRepository, @Lazy KkkService kkkService) {
        this.userRepository = userRepository;
        this.recordRepository = recordRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.mailSender = mailSender;
        this.activityService = activityService;
        this.publicationRepository = publicationRepository;
        this.educationRepository = educationRepository;
        this.kkkProfileRepository = kkkProfileRepository;
        this.kkkService = kkkService;
    }

    public String register(String username, String password){
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("ROLE_USER");
        user.setCreateDate(new Date(System.currentTimeMillis()));
        userRepository.save(user);
        return "Успешная регистрация";
    }

    public User createUser(User newUser) {
        // Проверка на существование пользователя с таким username
        if (userRepository.findByUsername(newUser.getUsername()).isPresent()) {
            throw new RuntimeException("Пользователь с таким именем уже существует");
        }
        
        User user = new User();
        user.setUsername(newUser.getUsername());
        // Если пароль не указан, генерируем случайный
        String password = newUser.getPassword() != null && !newUser.getPassword().isEmpty() 
            ? newUser.getPassword() 
            : RandomStringUtils.randomAlphanumeric(10);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(newUser.getRole() != null ? newUser.getRole() : "ROLE_USER");
        user.setEmail(newUser.getEmail());
        user.setAcademicDegree(newUser.getAcademicDegree());
        user.setPosition(newUser.getPosition());
        user.setPhone(newUser.getPhone());
        user.setOffice(newUser.getOffice());
        user.setResearchAreas(newUser.getResearchAreas());
        user.setPublications(newUser.getPublications());
        user.setCreateDate(new Date(System.currentTimeMillis()));
        
        return userRepository.save(user);
    }

    public String login(String username, String password){
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username,password)
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        return "Успешная авторизация";
    }
    
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() 
                && !authentication.getPrincipal().equals("anonymousUser")) {
            String username = authentication.getName();
            // Всегда загружаем пользователя из базы данных, чтобы получить актуальные данные
            return userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }
        return null;
    }


    public String getUser() {
        User user = getCurrentUser();
        if (user == null) {
            return "Anonymous user";
        }
        return "Username: " + user.getUsername() + "\n Create date: " + user.getCreateDate();
    }

    private final Path rootLocation = Paths.get("src/main/resources/static/img");

    public User getUserEntity(String username) {
        return userRepository.findByUsername(username).orElseThrow();
    }
    
    public User getUserById(Long id) {
        return userRepository.findById(id).orElseThrow();
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User updateAvatar(MultipartFile file) throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = getUserEntity(username);

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Файл не может быть пустым");
        }

        // Создаем уникальное имя файла
        String originalFilename = file.getOriginalFilename();
        String fileExtension = originalFilename != null && originalFilename.contains(".") 
            ? originalFilename.substring(originalFilename.lastIndexOf(".")) 
            : "";
        String uniqueFileName = username + "_" + System.currentTimeMillis() + fileExtension;
        
        // Убеждаемся, что директория существует
        if (!Files.exists(rootLocation)) {
            Files.createDirectories(rootLocation);
        }
        
        Path destinationFile = rootLocation.resolve(uniqueFileName).normalize().toAbsolutePath();

        // Копируем файл
        Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);

        // Обновляем путь в базе данных
        user.setPath(uniqueFileName);
        User savedUser = userRepository.saveAndFlush(user); // Используем saveAndFlush для немедленного сохранения
        
        System.out.println("Avatar updated for user: " + username + ", new path: " + uniqueFileName);
        System.out.println("Saved user path: " + savedUser.getPath());
        System.out.println("User ID: " + savedUser.getId());
        
        // Возвращаем сохраненного пользователя
        return savedUser;
    }
    
    public User updateUser(Long id, User updatedUser) {
        User user = userRepository.findById(id).orElseThrow();
        
        // Username можно обновить, но нужно проверить уникальность
        if (updatedUser.getUsername() != null && !updatedUser.getUsername().equals(user.getUsername())) {
            if (userRepository.findByUsername(updatedUser.getUsername()).isPresent()) {
                throw new RuntimeException("Пользователь с таким именем уже существует");
            }
            user.setUsername(updatedUser.getUsername());
        }
        
        if (updatedUser.getEmail() != null) user.setEmail(updatedUser.getEmail());
        if (updatedUser.getAcademicDegree() != null) user.setAcademicDegree(updatedUser.getAcademicDegree());
        if (updatedUser.getPosition() != null) user.setPosition(updatedUser.getPosition());
        if (updatedUser.getPhone() != null) user.setPhone(updatedUser.getPhone());
        if (updatedUser.getOffice() != null) user.setOffice(updatedUser.getOffice());
        if (updatedUser.getResearchAreas() != null) user.setResearchAreas(updatedUser.getResearchAreas());
        if (updatedUser.getPublications() != null) user.setPublications(updatedUser.getPublications());
        if (updatedUser.getRole() != null) user.setRole(updatedUser.getRole());
        if (updatedUser.getAcademicTitle() != null) user.setAcademicTitle(updatedUser.getAcademicTitle());
        if (updatedUser.getEmploymentRate() != null) user.setEmploymentRate(updatedUser.getEmploymentRate());
        if (updatedUser.getScopusAuthorId() != null) user.setScopusAuthorId(updatedUser.getScopusAuthorId());
        if (updatedUser.getOrcid() != null) user.setOrcid(updatedUser.getOrcid());
        if (updatedUser.getGoogleScholarUrl() != null) user.setGoogleScholarUrl(updatedUser.getGoogleScholarUrl());
        if (updatedUser.getAiSummary() != null) user.setAiSummary(updatedUser.getAiSummary());
        if (updatedUser.getEnglishLevel() != null) user.setEnglishLevel(updatedUser.getEnglishLevel());
        if (updatedUser.getFirstName() != null) user.setFirstName(updatedUser.getFirstName());
        if (updatedUser.getLastName() != null) user.setLastName(updatedUser.getLastName());

        // Если пароль указан, обновляем его
        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        }

        return userRepository.save(user);
    }
    
    public User updateProfile(Long userId, org.example.fullstackpj.Dto.UserDto dto) {
        User user = userRepository.findById(userId).orElseThrow();
        if (dto.getEmail() != null) user.setEmail(dto.getEmail());
        if (dto.getAcademicDegree() != null) user.setAcademicDegree(dto.getAcademicDegree());
        if (dto.getAcademicTitle() != null) user.setAcademicTitle(dto.getAcademicTitle());
        if (dto.getPosition() != null) user.setPosition(dto.getPosition());
        if (dto.getPhone() != null) user.setPhone(dto.getPhone());
        if (dto.getOffice() != null) user.setOffice(dto.getOffice());
        if (dto.getResearchAreas() != null) user.setResearchAreas(dto.getResearchAreas());
        if (dto.getPublications() != null) user.setPublications(dto.getPublications());
        if (dto.getEnglishLevel() != null) user.setEnglishLevel(dto.getEnglishLevel());
        if (dto.getEmploymentRate() != null) user.setEmploymentRate(dto.getEmploymentRate());
        if (dto.getScopusAuthorId() != null) user.setScopusAuthorId(dto.getScopusAuthorId());
        if (dto.getOrcid() != null) user.setOrcid(dto.getOrcid());
        if (dto.getGoogleScholarUrl() != null) user.setGoogleScholarUrl(dto.getGoogleScholarUrl());
        if (dto.getAiSummary() != null) user.setAiSummary(dto.getAiSummary());
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public void addFavorite(String username, Long recordId) {
        User user = userRepository.findByUsername(username).orElseThrow();
        Record record = recordRepository.findById(recordId).orElseThrow();
        user.getFavorites().add(record);
        userRepository.save(user);
    }

    public void removeFavorite(String username, Long recordId) {
        User user = userRepository.findByUsername(username).orElseThrow();
        Record record = recordRepository.findById(recordId).orElseThrow();
        user.getFavorites().remove(record);
        userRepository.save(user);
    }

    public Set<Record> getFavorites(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        return user.getFavorites();
    }

    public List<Long> getFavoriteRecordIds(User user) {
        return user.getFavorites().stream()
                .map(record -> record.getId())
                .toList();
    }

    public User togglePublicProfile(boolean enabled, String customSlug) {
        User user = getCurrentUser();
        user.setPublicProfile(enabled);
        if (enabled) {
            String slug = resolveSlug(user, customSlug);
            user.setPublicProfileSlug(slug);
        }
        return userRepository.save(user);
    }

    private String resolveSlug(User user, String customSlug) {
        if (customSlug != null && !customSlug.isBlank()) {
            String normalized = customSlug.toLowerCase().trim();
            if (!normalized.matches("^[a-z0-9-]{3,50}$")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid slug format. Use 3-50 lowercase letters, numbers, hyphens.");
            }
            if (userRepository.findByPublicProfileSlug(normalized)
                    .filter(u -> !u.getId().equals(user.getId())).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug already taken.");
            }
            return normalized;
        }
        // Auto-generate from firstName.lastName or username
        String base = generateBaseSlug(user);
        String candidate = base;
        int suffix = 2;
        while (userRepository.findByPublicProfileSlug(candidate)
                .filter(u -> !u.getId().equals(user.getId())).isPresent()) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    private String generateBaseSlug(User user) {
        String raw;
        if (user.getFirstName() != null && !user.getFirstName().isBlank()
                && user.getLastName() != null && !user.getLastName().isBlank()) {
            raw = user.getFirstName().trim() + "." + user.getLastName().trim();
        } else {
            raw = user.getUsername();
        }
        // Transliterate / normalize to ASCII-safe slug
        String normalized = Normalizer.normalize(raw.toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", "")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (normalized.length() < 3) normalized = "user-" + user.getId();
        if (normalized.length() > 50) normalized = normalized.substring(0, 50);
        return normalized;
    }

    public PublicProfileDto getPublicProfile(String slug) {
        User user = userRepository.findByPublicProfileSlug(slug)
                .filter(User::isPublicProfile)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        List<Publication> pubs = publicationRepository
                .findByAuthorAndStatusOrderByPublicationYearDesc(user, PublicationStatus.VERIFIED)
                .stream().limit(10).toList();

        List<Education> educations = educationRepository.findByUserOrderByYearDesc(user);

        Integer kkkPct = null;
        String kkkStatusStr = null;
        try {
            KkkProfile kkkProfile = kkkProfileRepository.findByTeacher(user).orElse(null);
            if (kkkProfile != null) {
                KkkChecklistDto checklist = kkkService.calculateChecklist(user, java.util.Locale.ENGLISH);
                kkkPct = checklist.getCompletionPercentage();
                kkkStatusStr = kkkProfile.getStatus() != null ? kkkProfile.getStatus().name() : null;
            }
        } catch (Exception ignored) {}

        return PublicProfileDto.builder()
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .position(user.getPosition())
                .academicTitle(user.getAcademicTitle())
                .academicDegree(user.getAcademicDegree())
                .researchAreas(user.getResearchAreas())
                .aiSummary(user.getAiSummary())
                .profileDescription(user.getProfileDescription())
                .orcid(user.getOrcid())
                .scopusAuthorId(user.getScopusAuthorId())
                .googleScholarUrl(user.getGoogleScholarUrl())
                .englishLevel(user.getEnglishLevel())
                .kkkReadinessPercentage(kkkPct)
                .kkkStatus(kkkStatusStr)
                .publications(pubs.stream().map(p -> PublicProfileDto.PublicationInfo.builder()
                        .title(p.getTitle())
                        .authors(p.getAuthors())
                        .publicationYear(p.getPublicationYear())
                        .journalName(p.getJournalName())
                        .doi(p.getDoi())
                        .publicationType(p.getPublicationType() != null ? p.getPublicationType().name() : null)
                        .databaseType(p.getDatabaseType() != null ? p.getDatabaseType().name() : null)
                        .quartile(p.getQuartile() != null ? p.getQuartile().name() : null)
                        .build()).toList())
                .educations(educations.stream().map(e -> PublicProfileDto.EducationInfo.builder()
                        .degree(e.getDegree())
                        .institution(e.getInstitution())
                        .specialty(e.getSpecialty())
                        .year(e.getYear())
                        .build()).toList())
                .build();
    }

    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Текущий пароль неверен");
        }

        if (currentPassword.equals(newPassword)) {
            throw new IllegalArgumentException("Новый пароль должен отличаться от текущего");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        log.info("Password changed for user: {}", username);
    }

    public void resetPassword(String username) {
        Optional<User> optionalUser = userRepository.findByUsername(username);
        if(optionalUser.isPresent()) {
            User user=optionalUser.get();
            String password = RandomStringUtils.randomAlphanumeric(5);
            user.setPassword(passwordEncoder.encode(password));
            userRepository.save(user);
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("temapernebaev@mail.ru");
            message.setTo(user.getUsername());
            message.setSubject("Востановление пароля");
            message.setText("Здравствуйте, " + user.getUsername() +
                    "\nВаш пароль был изменен на " + password);
            mailSender.send(message);
        }
    }

}
