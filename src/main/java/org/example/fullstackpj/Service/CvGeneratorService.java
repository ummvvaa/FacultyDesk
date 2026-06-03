package org.example.fullstackpj.Service;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import org.example.fullstackpj.Entity.*;
import org.example.fullstackpj.Entity.enums.PublicationStatus;
import org.example.fullstackpj.Repository.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class CvGeneratorService {

    private final EducationRepository educationRepo;
    private final WorkExperienceRepository workRepo;
    private final QualificationCourseRepository courseRepo;
    private final PublicationRepository pubRepo;
    private final AwardRepository awardRepo;
    private final PatentRepository patentRepo;

    public CvGeneratorService(EducationRepository educationRepo,
                               WorkExperienceRepository workRepo,
                               QualificationCourseRepository courseRepo,
                               PublicationRepository pubRepo,
                               AwardRepository awardRepo,
                               PatentRepository patentRepo) {
        this.educationRepo = educationRepo;
        this.workRepo = workRepo;
        this.courseRepo = courseRepo;
        this.pubRepo = pubRepo;
        this.awardRepo = awardRepo;
        this.patentRepo = patentRepo;
    }

    public byte[] generateCv(User user, Locale locale) throws IOException {
        boolean ru = "ru".equals(locale.getLanguage());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf, PageSize.A4);
            doc.setMargins(50, 50, 50, 50);

            PdfFont regular = loadFont("fonts/Roboto-Regular.ttf");
            PdfFont bold = loadFont("fonts/Roboto-Bold.ttf");

            // Optional university logo
            try {
                InputStream logoStream = getClass().getClassLoader().getResourceAsStream("static/img/university_logo.png");
                if (logoStream != null) {
                    Image logo = new Image(ImageDataFactory.create(logoStream.readAllBytes())).setHeight(50);
                    doc.add(logo);
                }
            } catch (Exception ignored) {}

            doc.add(new Paragraph(ru ? "Академическое резюме (CV)" : "Academic Curriculum Vitae")
                    .setFont(bold).setFontSize(18).setTextAlignment(TextAlignment.CENTER).setMarginBottom(4));

            // Name
            String displayName = buildDisplayName(user);
            doc.add(new Paragraph(displayName).setFont(bold).setFontSize(20).setMarginBottom(2));

            if (user.getPosition() != null) {
                doc.add(new Paragraph(user.getPosition()).setFont(regular).setFontSize(13).setMarginBottom(2));
            }

            String degTitle = Stream.of(user.getAcademicDegree(), user.getAcademicTitle())
                    .filter(Objects::nonNull).filter(s -> !s.isBlank()).collect(Collectors.joining(", "));
            if (!degTitle.isBlank()) {
                doc.add(new Paragraph(degTitle).setFont(regular).setFontSize(11).setMarginBottom(2));
            }

            if (user.getEmail() != null) {
                doc.add(new Paragraph(user.getEmail()).setFont(regular).setFontSize(10).setMarginBottom(10));
            }

            // AI Summary
            if (user.getAiSummary() != null && !user.getAiSummary().isBlank()) {
                addSection(doc, ru ? "Краткая информация" : "Summary", bold);
                doc.add(new Paragraph(user.getAiSummary()).setFont(regular).setFontSize(11));
            }

            // Profile description
            if (user.getProfileDescription() != null && !user.getProfileDescription().isBlank()) {
                if (user.getAiSummary() == null || user.getAiSummary().isBlank()) {
                    addSection(doc, ru ? "О себе" : "About", bold);
                }
                doc.add(new Paragraph(user.getProfileDescription()).setFont(regular).setFontSize(11));
            }

            // Research Areas
            if (user.getResearchAreas() != null && !user.getResearchAreas().isBlank()) {
                addSection(doc, ru ? "Научные интересы" : "Research Interests", bold);
                doc.add(new Paragraph(user.getResearchAreas()).setFont(regular).setFontSize(11));
            }

            // Education
            List<Education> educations = educationRepo.findByUserOrderByYearDesc(user);
            if (!educations.isEmpty()) {
                addSection(doc, ru ? "Образование" : "Education", bold);
                for (Education e : educations) {
                    String line = (e.getYear() != null ? e.getYear() : "")
                            + (e.getDegree() != null ? " — " + e.getDegree() : "")
                            + (e.getInstitution() != null ? ", " + e.getInstitution() : "")
                            + (e.getSpecialty() != null ? " (" + e.getSpecialty() + ")" : "");
                    doc.add(new Paragraph("• " + line.trim()).setFont(regular).setFontSize(11));
                }
            }

            // Work Experience
            List<WorkExperience> works = workRepo.findByUserOrderByStartYearDesc(user);
            if (!works.isEmpty()) {
                addSection(doc, ru ? "Опыт работы" : "Work Experience", bold);
                for (WorkExperience w : works) {
                    String endStr = w.isCurrent() ? (ru ? "наст. вр." : "present") : String.valueOf(w.getEndYear());
                    String dates = w.getStartYear() + "–" + endStr;
                    String line = dates + ": " + w.getPosition() + ", " + w.getOrganization();
                    doc.add(new Paragraph("• " + line).setFont(regular).setFontSize(11));
                }
            }

            // Qualification Courses
            List<QualificationCourse> courses = courseRepo.findByUserOrderByYearDesc(user);
            if (!courses.isEmpty()) {
                addSection(doc, ru ? "Повышение квалификации" : "Professional Development", bold);
                for (QualificationCourse c : courses) {
                    String hours = c.getHours() != null ? " (" + c.getHours() + " " + (ru ? "ч." : "hrs") + ")" : "";
                    String line = (c.getYear() != null ? c.getYear() : "") + " — " + c.getName() + ", " + c.getOrganization() + hours;
                    doc.add(new Paragraph("• " + line).setFont(regular).setFontSize(11));
                }
            }

            // Publications (VERIFIED only)
            List<Publication> pubs = pubRepo.findByAuthorAndStatusOrderByPublicationYearDesc(user, PublicationStatus.VERIFIED);
            if (!pubs.isEmpty()) {
                addSection(doc, ru ? "Публикации" : "Publications", bold);
                int idx = 1;
                for (Publication p : pubs) {
                    String doi = p.getDoi() != null ? ". DOI: " + p.getDoi() : "";
                    String journal = p.getJournalName() != null ? ". " + p.getJournalName() : "";
                    String line = idx++ + ". " + p.getAuthors() + " (" + p.getPublicationYear() + "). " + p.getTitle() + journal + doi;
                    doc.add(new Paragraph(line).setFont(regular).setFontSize(10).setMarginBottom(3));
                }
            }

            // Awards
            List<Award> awards = awardRepo.findByUserOrderByYearDesc(user);
            if (!awards.isEmpty()) {
                addSection(doc, ru ? "Награды и достижения" : "Awards", bold);
                for (Award a : awards) {
                    String org = a.getOrganization() != null ? " (" + a.getOrganization() + ")" : "";
                    doc.add(new Paragraph("• " + a.getYear() + " — " + a.getName() + org).setFont(regular).setFontSize(11));
                }
            }

            // Patents
            List<Patent> patents = patentRepo.findByUserOrderByYearDesc(user);
            if (!patents.isEmpty()) {
                addSection(doc, ru ? "Патенты и свидетельства" : "Patents", bold);
                for (Patent pt : patents) {
                    doc.add(new Paragraph("• " + pt.getYear() + " — " + pt.getTitle() + ", № " + pt.getPatentNumber())
                            .setFont(regular).setFontSize(11));
                }
            }

            // Online Profiles
            boolean hasOnline = user.getOrcid() != null || user.getScopusAuthorId() != null || user.getGoogleScholarUrl() != null;
            if (hasOnline) {
                addSection(doc, ru ? "Онлайн-профили" : "Online Profiles", bold);
                if (user.getOrcid() != null)
                    doc.add(new Paragraph("ORCID: https://orcid.org/" + user.getOrcid()).setFont(regular).setFontSize(11));
                if (user.getScopusAuthorId() != null)
                    doc.add(new Paragraph("Scopus Author ID: " + user.getScopusAuthorId()).setFont(regular).setFontSize(11));
                if (user.getGoogleScholarUrl() != null)
                    doc.add(new Paragraph("Google Scholar: " + user.getGoogleScholarUrl()).setFont(regular).setFontSize(11));
            }

            // Footer
            doc.add(new Paragraph((ru ? "Сгенерировано: " : "Generated: ") + LocalDate.now())
                    .setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER).setMarginTop(20));

            doc.close();
            return baos.toByteArray();
        }
    }

    private PdfFont loadFont(String classpathPath) throws IOException {
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(classpathPath)) {
            if (is != null) {
                return PdfFontFactory.createFont(is.readAllBytes(), PdfEncodings.IDENTITY_H,
                        PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);
            }
        } catch (Exception ignored) {}
        // Fallback to built-in font (no Cyrillic, but won't crash)
        return PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
    }

    private void addSection(Document doc, String title, PdfFont bold) throws IOException {
        doc.add(new Paragraph(title).setFont(bold).setFontSize(13).setMarginTop(14).setMarginBottom(4));
        doc.add(new LineSeparator(new SolidLine(0.5f)).setMarginBottom(6));
    }

    private String buildDisplayName(User user) {
        if (user.getFirstName() != null && !user.getFirstName().isBlank()
                && user.getLastName() != null && !user.getLastName().isBlank()) {
            return user.getFirstName() + " " + user.getLastName();
        }
        return user.getUsername();
    }
}
