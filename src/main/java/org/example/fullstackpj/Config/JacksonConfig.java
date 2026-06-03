package org.example.fullstackpj.Config;

import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer hibernateModuleCustomizer() {
        return builder -> {
            Hibernate6Module module = new Hibernate6Module();
            module.disable(Hibernate6Module.Feature.FORCE_LAZY_LOADING);
            builder.modulesToInstall(module);
        };
    }
}
