package games.arcade;

import com.fasterxml.jackson.core.StreamReadConstraints;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ArcadeApplication {
    public static void main(String[] args) {
        SpringApplication.run(ArcadeApplication.class, args);
    }

    @Bean
    Jackson2ObjectMapperBuilderCustomizer boundedJson() {
        // Bound parsing even when a streamed request has no Content-Length header.
        return builder -> builder.postConfigurer(mapper -> mapper.getFactory().setStreamReadConstraints(
                StreamReadConstraints.builder().maxDocumentLength(512 * 1024).maxStringLength(4096)
                        .maxNameLength(128).maxNumberLength(64).maxNestingDepth(32).build()));
    }
}
