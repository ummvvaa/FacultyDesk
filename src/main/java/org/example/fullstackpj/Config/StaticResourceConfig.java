package org.example.fullstackpj.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Раздача статических файлов из src/main/resources/static/img
        // toUri().toString() уже содержит схему "file:", поэтому не добавляем её повторно
        String imgUri = Paths.get("src/main/resources/static/img").toAbsolutePath().toUri().toString();
        if (!imgUri.endsWith("/")) {
            imgUri = imgUri + "/";
        }
        System.out.println("📁 Configuring static resource handler for /img/**");
        System.out.println("📁 Image URI: " + imgUri);
        registry.addResourceHandler("/img/**")
                .addResourceLocations(
                    imgUri,
                    "classpath:/static/img/"
                )
                .setCachePeriod(0);

        // NOTE: /static/generated/ is intentionally NOT exposed as a public static resource.
        // Files are served exclusively through GET /api/generated-documents/{id}/download
        // with authentication and ownership checks in GeneratedDocumentService.
    }
}

