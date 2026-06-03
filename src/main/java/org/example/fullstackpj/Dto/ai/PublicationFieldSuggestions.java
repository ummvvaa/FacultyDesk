package org.example.fullstackpj.Dto.ai;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PublicationFieldSuggestions {
    private String journalName;
    private String issn;
    private String publicationType;
    private String databaseType;
    private String quartile;
    private String publisher;
    private List<String> indexedDatabases;
    private double confidence;
}
