package org.example.fullstackpj.Dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.PublicationType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicationMetadata {
    private String title;
    private String authors;
    private Integer year;
    private String doi;
    private String journalName;
    private PublicationType publicationType;
    private DatabaseType databaseType;
    private double confidence;
}
