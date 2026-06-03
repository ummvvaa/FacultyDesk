package org.example.fullstackpj.Service;

import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import jakarta.persistence.criteria.Predicate;
import org.example.fullstackpj.Dto.KkkChecklistDto;
import org.example.fullstackpj.Dto.KkkProfileDto;
import org.example.fullstackpj.Entity.*;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.EnglishLevel;
import org.example.fullstackpj.Entity.enums.KkkStatus;
import org.example.fullstackpj.Repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class KkkService {

    @Value("${app.kkk.min-completion:80}")
    private int minCompletion;

    private final KkkProfileRepository kkkProfileRepository;
    private final EducationRepository educationRepository;
    private final WorkExperienceRepository workExperienceRepository;
    private final QualificationCourseRepository courseRepository;
    private final AwardRepository awardRepository;
    private final PatentRepository patentRepository;
    private final PublicationRepository publicationRepository;
    private final PublicationFileRepository publicationFileRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public KkkService(KkkProfileRepository kkkProfileRepository,
                      EducationRepository educationRepository,
                      WorkExperienceRepository workExperienceRepository,
                      QualificationCourseRepository courseRepository,
                      AwardRepository awardRepository,
                      PatentRepository patentRepository,
                      PublicationRepository publicationRepository,
                      PublicationFileRepository publicationFileRepository,
                      UserRepository userRepository,
                      NotificationService notificationService) {
        this.kkkProfileRepository = kkkProfileRepository;
        this.educationRepository = educationRepository;
        this.workExperienceRepository = workExperienceRepository;
        this.courseRepository = courseRepository;
        this.awardRepository = awardRepository;
        this.patentRepository = patentRepository;
        this.publicationRepository = publicationRepository;
        this.publicationFileRepository = publicationFileRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public KkkProfile getOrCreateMyKkk(User teacher) {
        return kkkProfileRepository.findByTeacher(teacher).orElseGet(() -> {
            KkkProfile profile = new KkkProfile();
            profile.setTeacher(teacher);
            profile.setStatus(KkkStatus.NOT_STARTED);
            profile.setCreatedAt(LocalDateTime.now());
            profile.setUpdatedAt(LocalDateTime.now());
            return kkkProfileRepository.save(profile);
        });
    }

    @Transactional
    public KkkProfileDto getMyKkkWithChecklist(User teacher, Locale locale) {
        KkkProfile profile = getOrCreateMyKkk(teacher);
        KkkChecklistDto checklist = calculateChecklist(teacher, locale);
        profile.setCompletionPercentage(checklist.getCompletionPercentage());
        profile.setUpdatedAt(LocalDateTime.now());
        kkkProfileRepository.save(profile);
        return buildDtoWithChecklist(profile, teacher, checklist, locale, true);
    }

    @Transactional
    public KkkProfile submitForReview(User teacher) {
        KkkProfile profile = getOrCreateMyKkk(teacher);
        KkkChecklistDto checklist = calculateChecklist(teacher, Locale.ENGLISH);
        if (checklist.getCompletionPercentage() < minCompletion) {
            throw new RuntimeException("KKK completion is " + checklist.getCompletionPercentage()
                    + "%, minimum required is " + minCompletion + "%. Please complete missing items.");
        }
        profile.setStatus(KkkStatus.SUBMITTED);
        profile.setSubmittedAt(LocalDateTime.now());
        profile.setUpdatedAt(LocalDateTime.now());
        return kkkProfileRepository.save(profile);
    }

    public Page<KkkProfileDto> getAllForAdmin(KkkStatus status, Integer minCompletion,
                                              Integer maxCompletion, Pageable pageable) {
        Specification<KkkProfile> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<KkkProfile> page = kkkProfileRepository.findAll(spec, pageable);
        return page.map(profile -> {
            KkkChecklistDto checklist = calculateChecklist(profile.getTeacher(), Locale.ENGLISH);
            int pct = checklist.getCompletionPercentage();
            if ((minCompletion != null && pct < minCompletion)
                    || (maxCompletion != null && pct > maxCompletion)) {
                return null;
            }
            return buildDto(profile, profile.getTeacher(), Locale.ENGLISH, false);
        }).map(dto -> dto != null ? dto : KkkProfileDto.builder().build());
    }

    public KkkProfileDto getAdminDetail(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found: " + teacherId));
        KkkProfile profile = getOrCreateMyKkk(teacher);
        return buildDto(profile, teacher, Locale.ENGLISH, true);
    }

    public Map<String, Object> getUserCompletion(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found: " + teacherId));
        KkkProfile profile = getOrCreateMyKkk(teacher);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("completionPercentage", profile.getCompletionPercentage() != null ? profile.getCompletionPercentage() : 0);
        result.put("status", profile.getStatus() != null ? profile.getStatus().name() : null);
        return result;
    }

    @Transactional
    public KkkProfile updateStatus(Long kkkId, KkkStatus newStatus, String comment, User admin) {
        KkkProfile profile = kkkProfileRepository.findById(kkkId)
                .orElseThrow(() -> new RuntimeException("KKK profile not found: " + kkkId));
        profile.setStatus(newStatus);
        profile.setReviewerComment(comment);
        profile.setReviewedBy(admin);
        profile.setUpdatedAt(LocalDateTime.now());
        if (newStatus == KkkStatus.CHECKED || newStatus == KkkStatus.READY) {
            profile.setCheckedAt(LocalDateTime.now());
        }
        KkkProfile saved = kkkProfileRepository.save(profile);
        notificationService.createKkkNotification(profile.getTeacher(), saved, newStatus);
        return saved;
    }

    public byte[] exportKkkPackage(Long teacherId) throws IOException {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found: " + teacherId));
        KkkProfile profile = getOrCreateMyKkk(teacher);
        KkkChecklistDto checklist = calculateChecklist(teacher, Locale.ENGLISH);

        List<Education> educations = educationRepository.findByUserOrderByYearDesc(teacher);
        List<WorkExperience> workExperiences = workExperienceRepository.findByUserOrderByStartYearDesc(teacher);
        List<QualificationCourse> courses = courseRepository.findByUserOrderByYearDesc(teacher);
        int currentYear = LocalDate.now().getYear();
        List<Publication> publications = publicationRepository
                .findByAuthorAndPublicationYearGreaterThanEqual(teacher, currentYear - 5);
        List<Award> awards = awardRepository.findByUserOrderByYearDesc(teacher);
        List<Patent> patents = patentRepository.findByUserOrderByYearDesc(teacher);

        // TODO: embed a Cyrillic-capable font (e.g., Arial.ttf) for proper Unicode rendering.
        // Currently using Helvetica which does not support Cyrillic characters.
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos);
             PdfDocument pdf = new PdfDocument(writer);
             Document doc = new Document(pdf)) {

            PdfFont bold = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
            PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

            String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            doc.add(new Paragraph("KKK Profile Package")
                    .setFont(bold).setFontSize(20));
            doc.add(new Paragraph("Teacher: " + teacher.getUsername() + " | Date: " + date)
                    .setFont(regular).setFontSize(11));
            doc.add(new Paragraph("Status: " + profile.getStatus().name()
                    + " | Completion: " + checklist.getCompletionPercentage() + "%")
                    .setFont(regular).setFontSize(11));
            doc.add(new Paragraph(" "));

            // Teacher info
            doc.add(new Paragraph("1. Teacher Information").setFont(bold).setFontSize(14));
            Table infoTable = new Table(UnitValue.createPercentArray(new float[]{30, 70}))
                    .setWidth(UnitValue.createPercentValue(100));
            addRow(infoTable, "Username", teacher.getUsername(), bold, regular);
            addRow(infoTable, "Email", nvl(teacher.getEmail()), bold, regular);
            addRow(infoTable, "Position", nvl(teacher.getPosition()), bold, regular);
            addRow(infoTable, "Academic Degree", nvl(teacher.getAcademicDegree()), bold, regular);
            addRow(infoTable, "Phone", nvl(teacher.getPhone()), bold, regular);
            addRow(infoTable, "Office", nvl(teacher.getOffice()), bold, regular);
            addRow(infoTable, "Research Areas", nvl(teacher.getResearchAreas()), bold, regular);
            addRow(infoTable, "English Level",
                    teacher.getEnglishLevel() != null ? teacher.getEnglishLevel().name() : "NONE",
                    bold, regular);
            doc.add(infoTable);
            doc.add(new Paragraph(" "));

            // Education
            doc.add(new Paragraph("2. Education (" + educations.size() + ")").setFont(bold).setFontSize(14));
            if (!educations.isEmpty()) {
                Table t = new Table(UnitValue.createPercentArray(new float[]{20, 30, 30, 10, 10}))
                        .setWidth(UnitValue.createPercentValue(100));
                addHeader(t, List.of("Degree", "Institution", "Specialty", "Year", ""), bold);
                for (Education e : educations) {
                    t.addCell(cell(nvl(e.getDegree()), regular));
                    t.addCell(cell(nvl(e.getInstitution()), regular));
                    t.addCell(cell(nvl(e.getSpecialty()), regular));
                    t.addCell(cell(nvl(e.getYear()), regular));
                    t.addCell(cell("", regular));
                }
                doc.add(t);
            } else {
                doc.add(new Paragraph("No education records.").setFont(regular).setFontSize(10));
            }
            doc.add(new Paragraph(" "));

            // Work experience
            doc.add(new Paragraph("3. Work Experience (" + workExperiences.size() + ")").setFont(bold).setFontSize(14));
            if (!workExperiences.isEmpty()) {
                Table t = new Table(UnitValue.createPercentArray(new float[]{25, 30, 10, 10, 10, 15}))
                        .setWidth(UnitValue.createPercentValue(100));
                addHeader(t, List.of("Position", "Organization", "Start", "End", "Current", "Description"), bold);
                for (WorkExperience w : workExperiences) {
                    t.addCell(cell(nvl(w.getPosition()), regular));
                    t.addCell(cell(nvl(w.getOrganization()), regular));
                    t.addCell(cell(nvl(w.getStartYear()), regular));
                    t.addCell(cell(w.getEndYear() != null ? w.getEndYear().toString() : "-", regular));
                    t.addCell(cell(w.isCurrent() ? "Yes" : "No", regular));
                    t.addCell(cell(nvl(w.getDescription()), regular));
                }
                doc.add(t);
            } else {
                doc.add(new Paragraph("No work experience records.").setFont(regular).setFontSize(10));
            }
            doc.add(new Paragraph(" "));

            // Qualification courses
            doc.add(new Paragraph("4. Qualification Courses (last 3 years, count: " + courses.size() + ")")
                    .setFont(bold).setFontSize(14));
            if (!courses.isEmpty()) {
                Table t = new Table(UnitValue.createPercentArray(new float[]{35, 30, 10, 10, 15}))
                        .setWidth(UnitValue.createPercentValue(100));
                addHeader(t, List.of("Name", "Organization", "Year", "Hours", "Certificate"), bold);
                for (QualificationCourse c : courses) {
                    t.addCell(cell(nvl(c.getName()), regular));
                    t.addCell(cell(nvl(c.getOrganization()), regular));
                    t.addCell(cell(nvl(c.getYear()), regular));
                    t.addCell(cell(nvl(c.getHours()), regular));
                    t.addCell(cell(c.getCertificateFilePath() != null ? "Yes" : "No", regular));
                }
                doc.add(t);
            } else {
                doc.add(new Paragraph("No qualification courses.").setFont(regular).setFontSize(10));
            }
            doc.add(new Paragraph(" "));

            // Publications
            doc.add(new Paragraph("5. Publications (last 5 years, count: " + publications.size() + ")")
                    .setFont(bold).setFontSize(14));
            if (!publications.isEmpty()) {
                Table t = new Table(UnitValue.createPercentArray(new float[]{30, 20, 8, 12, 15, 15}))
                        .setWidth(UnitValue.createPercentValue(100));
                addHeader(t, List.of("Title", "Journal", "Year", "Database", "DOI", "Status"), bold);
                for (Publication p : publications) {
                    t.addCell(cell(nvl(p.getTitle()), regular));
                    t.addCell(cell(nvl(p.getJournalName()), regular));
                    t.addCell(cell(nvl(p.getPublicationYear()), regular));
                    t.addCell(cell(p.getDatabaseType() != null ? p.getDatabaseType().name() : "-", regular));
                    t.addCell(cell(nvl(p.getDoi()), regular));
                    t.addCell(cell(p.getStatus() != null ? p.getStatus().name() : "-", regular));
                }
                doc.add(t);
            } else {
                doc.add(new Paragraph("No publications in last 5 years.").setFont(regular).setFontSize(10));
            }
            doc.add(new Paragraph(" "));

            // Awards
            doc.add(new Paragraph("6. Awards & Patents (" + (awards.size() + patents.size()) + ")")
                    .setFont(bold).setFontSize(14));
            if (!awards.isEmpty()) {
                doc.add(new Paragraph("Awards:").setFont(bold).setFontSize(11));
                Table t = new Table(UnitValue.createPercentArray(new float[]{35, 30, 10, 25}))
                        .setWidth(UnitValue.createPercentValue(100));
                addHeader(t, List.of("Name", "Organization", "Year", "Description"), bold);
                for (Award a : awards) {
                    t.addCell(cell(nvl(a.getName()), regular));
                    t.addCell(cell(nvl(a.getOrganization()), regular));
                    t.addCell(cell(nvl(a.getYear()), regular));
                    t.addCell(cell(nvl(a.getDescription()), regular));
                }
                doc.add(t);
            }
            if (!patents.isEmpty()) {
                doc.add(new Paragraph("Patents:").setFont(bold).setFontSize(11));
                Table t = new Table(UnitValue.createPercentArray(new float[]{30, 20, 10, 10, 30}))
                        .setWidth(UnitValue.createPercentValue(100));
                addHeader(t, List.of("Title", "Patent Number", "Year", "Country", "Description"), bold);
                for (Patent p : patents) {
                    t.addCell(cell(nvl(p.getTitle()), regular));
                    t.addCell(cell(nvl(p.getPatentNumber()), regular));
                    t.addCell(cell(nvl(p.getYear()), regular));
                    t.addCell(cell(nvl(p.getCountry()), regular));
                    t.addCell(cell(nvl(p.getDescription()), regular));
                }
                doc.add(t);
            }
            if (awards.isEmpty() && patents.isEmpty()) {
                doc.add(new Paragraph("No awards or patents.").setFont(regular).setFontSize(10));
            }
            doc.add(new Paragraph(" "));

            // Checklist summary
            doc.add(new Paragraph("7. KKK Checklist Summary").setFont(bold).setFontSize(14));
            Table cl = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                    .setWidth(UnitValue.createPercentValue(100));
            addChecklistRow(cl, "Profile completed", checklist.isProfileCompleted(), bold, regular);
            addChecklistRow(cl, "Education added (" + checklist.getEducationCount() + ")", checklist.isEducationAdded(), bold, regular);
            addChecklistRow(cl, "Work experience added (" + checklist.getWorkExperienceCount() + ")", checklist.isWorkExperienceAdded(), bold, regular);
            addChecklistRow(cl, "Qualification courses last 3 years (" + checklist.getQualificationCoursesCount() + ")", checklist.isQualificationCoursesLast3Years(), bold, regular);
            addChecklistRow(cl, "Publications last 5 years (" + checklist.getPublicationsCount() + ")", checklist.isPublicationsLast5Years(), bold, regular);
            addChecklistRow(cl, "DOI links added (missing: " + checklist.getMissingDoiCount() + ")", checklist.isDoiLinksAdded(), bold, regular);
            addChecklistRow(cl, "Confirmation files uploaded (missing: " + checklist.getMissingFilesCount() + ")", checklist.isConfirmationFilesUploaded(), bold, regular);
            addChecklistRow(cl, "Awards/Patents added (" + checklist.getAwardsPatentsCount() + ")", checklist.isAwardsPatentsAdded(), bold, regular);
            addChecklistRow(cl, "English level set (" + (teacher.getEnglishLevel() != null ? teacher.getEnglishLevel().name() : "NONE") + ")", checklist.isEnglishLevelAdded(), bold, regular);
            doc.add(cl);
            doc.add(new Paragraph("Overall completion: " + checklist.getCompletionPercentage() + "%")
                    .setFont(bold).setFontSize(13));
        }
        return baos.toByteArray();
    }

    @Transactional
    public void recalculateAndSave(User teacher) {
        KkkProfile profile = getOrCreateMyKkk(teacher);
        KkkChecklistDto checklist = calculateChecklist(teacher, Locale.ENGLISH);
        profile.setCompletionPercentage(checklist.getCompletionPercentage());
        profile.setUpdatedAt(LocalDateTime.now());
        kkkProfileRepository.save(profile);
    }

    // — Checklist calculation —

    public KkkChecklistDto calculateChecklist(User teacher, Locale locale) {
        int currentYear = LocalDate.now().getYear();

        // 1. Profile completeness
        boolean profileCompleted = isNonBlank(teacher.getAcademicDegree())
                && isNonBlank(teacher.getPosition())
                && isNonBlank(teacher.getPhone())
                && isNonBlank(teacher.getEmail())
                && isNonBlank(teacher.getResearchAreas());

        // 2. Education
        List<Education> educations = educationRepository.findByUserOrderByYearDesc(teacher);
        boolean educationAdded = !educations.isEmpty();

        // 3. Work experience
        List<WorkExperience> workExperiences = workExperienceRepository.findByUserOrderByStartYearDesc(teacher);
        boolean workExperienceAdded = !workExperiences.isEmpty();

        // 4. Qualification courses last 3 years
        List<QualificationCourse> recentCourses = courseRepository
                .findByUserAndYearGreaterThanEqual(teacher, currentYear - 3);
        boolean qualificationCoursesLast3Years = !recentCourses.isEmpty();

        // 5 & 6 & 7. Publications last 5 years
        List<Publication> pubsLast5 = publicationRepository
                .findByAuthorAndPublicationYearGreaterThanEqual(teacher, currentYear - 5);
        boolean publicationsLast5Years = !pubsLast5.isEmpty();

        // 6. DOI check: Scopus/WOS publications must have DOI
        List<Publication> scopusWos = pubsLast5.stream()
                .filter(p -> p.getDatabaseType() == DatabaseType.SCOPUS
                        || p.getDatabaseType() == DatabaseType.WEB_OF_SCIENCE)
                .toList();
        long missingDoiCount = scopusWos.stream()
                .filter(p -> p.getDoi() == null || p.getDoi().isBlank())
                .count();
        boolean doiLinksAdded = missingDoiCount == 0;

        // 7. Confirmation files: all publications last 5 years must have >= 1 file
        int missingFilesCount = 0;
        if (!pubsLast5.isEmpty()) {
            Set<Long> pubIdsWithFiles = publicationFileRepository
                    .findPublicationIdsWithFiles(pubsLast5)
                    .stream().collect(Collectors.toSet());
            missingFilesCount = (int) pubsLast5.stream()
                    .filter(p -> !pubIdsWithFiles.contains(p.getId()))
                    .count();
        }
        boolean confirmationFilesUploaded = missingFilesCount == 0;

        // 8. Awards + Patents
        long awardsCount = awardRepository.findByUserOrderByYearDesc(teacher).size();
        long patentsCount = patentRepository.findByUserOrderByYearDesc(teacher).size();
        long awardsPatentsTotal = awardsCount + patentsCount;
        boolean awardsPatentsAdded = awardsPatentsTotal > 0;

        // 9. English level
        boolean englishLevelAdded = teacher.getEnglishLevel() != null
                && teacher.getEnglishLevel() != EnglishLevel.NONE;

        // Compute completion
        boolean[] items = {
                profileCompleted, educationAdded, workExperienceAdded,
                qualificationCoursesLast3Years, publicationsLast5Years,
                doiLinksAdded, confirmationFilesUploaded,
                awardsPatentsAdded, englishLevelAdded
        };
        int checked = 0;
        for (boolean item : items) {
            if (item) checked++;
        }
        int completionPercentage = (checked * 100) / items.length;

        // Missing items messages
        List<String> missingItems = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        if (!profileCompleted) {
            missingItems.add(msg(locale,
                    "Заполните профиль: учёная степень, должность, телефон, email, научные направления",
                    "Complete your profile: academic degree, position, phone, email, research areas"));
        }
        if (!educationAdded) {
            missingItems.add(msg(locale,
                    "Добавьте информацию об образовании",
                    "Add your education information"));
        }
        if (!workExperienceAdded) {
            missingItems.add(msg(locale,
                    "Добавьте опыт работы",
                    "Add your work experience"));
        }
        if (!qualificationCoursesLast3Years) {
            missingItems.add(msg(locale,
                    "Добавьте курсы повышения квалификации за последние 3 года",
                    "Add qualification courses from the last 3 years"));
        }
        if (!publicationsLast5Years) {
            missingItems.add(msg(locale,
                    "Добавьте публикации за последние 5 лет",
                    "Add publications from the last 5 years"));
        }
        if (!doiLinksAdded) {
            missingItems.add(msg(locale,
                    "Укажите DOI для " + missingDoiCount + " публикаций Scopus/WoS",
                    "Add DOI for " + missingDoiCount + " Scopus/WoS publications"));
        }
        if (!confirmationFilesUploaded) {
            missingItems.add(msg(locale,
                    "Загрузите подтверждающие файлы для " + missingFilesCount + " публикаций",
                    "Upload confirmation files for " + missingFilesCount + " publications"));
        }
        if (!awardsPatentsAdded) {
            missingItems.add(msg(locale,
                    "Добавьте награды или патенты (при наличии)",
                    "Add awards or patents (if applicable)"));
        }
        if (!englishLevelAdded) {
            missingItems.add(msg(locale,
                    "Укажите уровень знания английского языка",
                    "Set your English language proficiency level"));
        }

        if (completionPercentage >= 80) {
            recommendations.add(msg(locale,
                    "Профиль заполнен достаточно для подачи на проверку",
                    "Profile is complete enough for submission"));
        } else {
            recommendations.add(msg(locale,
                    "Заполните оставшиеся пункты для достижения минимального порога 80%",
                    "Complete the remaining items to reach the minimum 80% threshold"));
        }

        return KkkChecklistDto.builder()
                .profileCompleted(profileCompleted)
                .educationAdded(educationAdded)
                .educationCount(educations.size())
                .workExperienceAdded(workExperienceAdded)
                .workExperienceCount(workExperiences.size())
                .qualificationCoursesLast3Years(qualificationCoursesLast3Years)
                .qualificationCoursesCount(recentCourses.size())
                .publicationsLast5Years(publicationsLast5Years)
                .publicationsCount(pubsLast5.size())
                .doiLinksAdded(doiLinksAdded)
                .missingDoiCount((int) missingDoiCount)
                .confirmationFilesUploaded(confirmationFilesUploaded)
                .missingFilesCount(missingFilesCount)
                .awardsPatentsAdded(awardsPatentsAdded)
                .awardsPatentsCount((int) awardsPatentsTotal)
                .englishLevelAdded(englishLevelAdded)
                .completionPercentage(completionPercentage)
                .missingItems(missingItems)
                .recommendations(recommendations)
                .build();
    }

    // — Helpers —

    private KkkProfileDto buildDtoWithChecklist(KkkProfile profile, User teacher, KkkChecklistDto checklist, Locale locale, boolean includeLists) {
        KkkProfileDto.KkkProfileDtoBuilder builder = KkkProfileDto.builder()
                .id(profile.getId())
                .teacherId(teacher.getId())
                .teacherUsername(teacher.getUsername())
                .teacherEmail(teacher.getEmail())
                .status(profile.getStatus())
                .submittedAt(profile.getSubmittedAt())
                .checkedAt(profile.getCheckedAt())
                .reviewerComment(profile.getReviewerComment())
                .reviewedById(profile.getReviewedBy() != null ? profile.getReviewedBy().getId() : null)
                .reviewedByUsername(profile.getReviewedBy() != null ? profile.getReviewedBy().getUsername() : null)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .checklist(checklist);

        if (includeLists) {
            builder.educations(educationRepository.findByUserOrderByYearDesc(teacher))
                    .workExperiences(workExperienceRepository.findByUserOrderByStartYearDesc(teacher))
                    .qualificationCourses(courseRepository.findByUserOrderByYearDesc(teacher))
                    .awards(awardRepository.findByUserOrderByYearDesc(teacher))
                    .patents(patentRepository.findByUserOrderByYearDesc(teacher));
        }
        return builder.build();
    }

    private KkkProfileDto buildDto(KkkProfile profile, User teacher, Locale locale, boolean includeLists) {
        KkkChecklistDto checklist = calculateChecklist(teacher, locale);
        KkkProfileDto.KkkProfileDtoBuilder builder = KkkProfileDto.builder()
                .id(profile.getId())
                .teacherId(teacher.getId())
                .teacherUsername(teacher.getUsername())
                .teacherEmail(teacher.getEmail())
                .status(profile.getStatus())
                .submittedAt(profile.getSubmittedAt())
                .checkedAt(profile.getCheckedAt())
                .reviewerComment(profile.getReviewerComment())
                .reviewedById(profile.getReviewedBy() != null ? profile.getReviewedBy().getId() : null)
                .reviewedByUsername(profile.getReviewedBy() != null ? profile.getReviewedBy().getUsername() : null)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .checklist(checklist);

        if (includeLists) {
            builder.educations(educationRepository.findByUserOrderByYearDesc(teacher))
                    .workExperiences(workExperienceRepository.findByUserOrderByStartYearDesc(teacher))
                    .qualificationCourses(courseRepository.findByUserOrderByYearDesc(teacher))
                    .awards(awardRepository.findByUserOrderByYearDesc(teacher))
                    .patents(patentRepository.findByUserOrderByYearDesc(teacher));
        }
        return builder.build();
    }

    private String msg(Locale locale, String ru, String en) {
        return "ru".equals(locale.getLanguage()) ? ru : en;
    }

    private boolean isNonBlank(String s) {
        return s != null && !s.isBlank();
    }

    private String nvl(String s) {
        return s != null ? s : "-";
    }

    private String nvl(Integer i) {
        return i != null ? i.toString() : "-";
    }

    private void addRow(Table t, String label, String value, PdfFont bold, PdfFont regular) {
        t.addCell(new Cell().add(new Paragraph(label).setFont(bold).setFontSize(10)));
        t.addCell(new Cell().add(new Paragraph(value).setFont(regular).setFontSize(10)));
    }

    private void addHeader(Table t, List<String> headers, PdfFont bold) {
        for (String h : headers) {
            t.addCell(new Cell().add(new Paragraph(h).setFont(bold).setFontSize(10)));
        }
    }

    private Cell cell(String text, PdfFont font) {
        return new Cell().add(new Paragraph(text).setFont(font).setFontSize(9));
    }

    private void addChecklistRow(Table t, String label, boolean done, PdfFont bold, PdfFont regular) {
        t.addCell(new Cell().add(new Paragraph(label).setFont(regular).setFontSize(10)));
        t.addCell(new Cell().add(new Paragraph(done ? "✓" : "✗").setFont(bold).setFontSize(10)));
    }
}
