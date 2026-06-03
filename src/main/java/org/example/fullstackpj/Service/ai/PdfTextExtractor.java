package org.example.fullstackpj.Service.ai;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public final class PdfTextExtractor {

    private static final int MAX_PAGES = 3;

    private PdfTextExtractor() {}

    public static String extractText(MultipartFile pdf) throws IOException {
        if (pdf == null || pdf.isEmpty()) return "";
        try (PDDocument doc = Loader.loadPDF(pdf.getBytes())) {
            int last = Math.min(MAX_PAGES, doc.getNumberOfPages());
            if (last < 1) return "";
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(last);
            String text = stripper.getText(doc);
            return text == null ? "" : text;
        }
    }
}
