package org.example.fullstackpj.Dto;

import lombok.Getter;
import lombok.Setter;
import org.example.fullstackpj.Entity.enums.DatabaseType;
import org.example.fullstackpj.Entity.enums.PublicationType;
import org.example.fullstackpj.Entity.enums.Quartile;

@Getter
@Setter
public class PublicationDto {

    private String title;
    private String authors;
    private Integer publicationYear;
    private String journalName;
    private PublicationType publicationType;
    private DatabaseType databaseType;
    private String doi;
    private String url;
    private Quartile quartile;
    private Integer percentile;
    private String indexingStatus;
}
