package org.example.fullstackpj;

import org.example.fullstackpj.Security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests((requests) -> requests
                        .requestMatchers("/api/register", "/api/login", "/api/auth/**", "/forget").permitAll()
                        // Public profile — no auth needed
                        .requestMatchers("/api/public/**").permitAll()
                        // Actuator: health probe доступен без auth
                        // PROD TODO: ограничить /actuator/* IP whitelist (см. progress.md Известные проблемы)
                        .requestMatchers("/actuator/health").permitAll()
                        // Статические ресурсы (изображения) доступны всем
                        .requestMatchers("/img/**", "/static/**").permitAll()
                        // Публичный доступ к категориям для фронтенда
                        .requestMatchers("/api/categories", "/api/categories/**").permitAll()
                        // Более специфичные пути должны идти первыми
                        // Preview и скачивание шаблонов доступно всем аутентифицированным
                        .requestMatchers("/api/templates/*/preview").authenticated()
                        .requestMatchers("/api/templates/*/download").authenticated()
                        // Получение списка шаблонов доступно всем аутентифицированным (но вернутся только активные для не-админов)
                        .requestMatchers(HttpMethod.GET, "/api/templates").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/templates/{id}").authenticated()
                        // Управление шаблонами (создание, обновление, удаление) - только админ
                        .requestMatchers(HttpMethod.POST, "/api/templates").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/templates/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/templates/**").hasRole("ADMIN")
                        // API для уведомлений, сообщений и друзей - доступно всем аутентифицированным
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/messages/**").authenticated()
                        .requestMatchers("/api/friends/**").authenticated()
                        .requestMatchers("/api/settings/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Получение списка пользователей с поиском доступно всем аутентифицированным
                        .requestMatchers(HttpMethod.GET, "/api/users").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/search").authenticated()
                        // Поиск пользователя по email — для админа и робота (нужен роботу для маппинга email→userId)
                        .requestMatchers(HttpMethod.GET, "/api/users/by-email/**").hasAnyRole("ADMIN", "ROBOT")
                        // Получение информации о конкретном пользователе доступно всем аутентифицированным
                        .requestMatchers(HttpMethod.GET, "/api/users/{id}").authenticated()
                        // Загрузка аватара - доступно всем аутентифицированным
                        .requestMatchers(HttpMethod.POST, "/api/users/me/avatar").authenticated()
                        // Public profile toggle + CV export
                        .requestMatchers(HttpMethod.PUT, "/api/users/me/public-profile").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/me/public-profile-status").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/me/cv").authenticated()
                        // Self-service смена пароля - доступно всем аутентифицированным
                        .requestMatchers(HttpMethod.POST, "/api/users/me/change-password").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/me").authenticated()
                        // Управление пользователями - только админ
                        .requestMatchers(HttpMethod.POST, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("ADMIN")
                        // API для отчетов - доступно всем аутентифицированным
                        .requestMatchers("/api/records/**").authenticated()
                        // Generated Documents — robot+admin upload; admin-only write/admin; read with service-level check
                        .requestMatchers(HttpMethod.GET, "/api/generated-documents/admin").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/generated-documents/upload").hasAnyRole("ADMIN", "ROBOT")
                        .requestMatchers(HttpMethod.POST, "/api/generated-documents/upload-bulk").hasAnyRole("ADMIN", "ROBOT")
                        .requestMatchers(HttpMethod.PUT, "/api/generated-documents/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/generated-documents/**").hasRole("ADMIN")
                        .requestMatchers("/api/generated-documents/**").authenticated()
                        // Robot runs — start/finish: ROBOT+ADMIN; list/get: ADMIN only
                        .requestMatchers(HttpMethod.POST, "/api/robot/runs/start").hasAnyRole("ADMIN", "ROBOT")
                        .requestMatchers(HttpMethod.PUT, "/api/robot/runs/*/finish").hasAnyRole("ADMIN", "ROBOT")
                        .requestMatchers("/api/robot/**").hasRole("ADMIN")
                        // Publications — admin review actions
                        .requestMatchers(HttpMethod.GET, "/api/publications/admin").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/publications/*/verify").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/publications/*/reject").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/publications/*/needs-correction").hasRole("ADMIN")
                        // Publications — all other actions for authenticated users (service enforces ownership)
                        .requestMatchers("/api/publications/**").authenticated()
                        // Education / Work Experience / Qualification Courses / Awards / Patents — authenticated, ownership in service
                        .requestMatchers("/api/education/**").authenticated()
                        .requestMatchers("/api/work-experience/**").authenticated()
                        .requestMatchers("/api/qualification-courses/**").authenticated()
                        .requestMatchers("/api/awards/**").authenticated()
                        .requestMatchers("/api/patents/**").authenticated()
                        // KKK — admin-only actions
                        .requestMatchers(HttpMethod.GET, "/api/kkk/admin").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/kkk/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/kkk/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/kkk/*/export").hasRole("ADMIN")
                        // KKK — authenticated users
                        .requestMatchers("/api/kkk/**").authenticated()
                        // Deadlines — admin write actions
                        .requestMatchers(HttpMethod.GET, "/api/deadlines/admin").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/deadlines").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/deadlines/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/deadlines/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/deadlines/*/notify").hasRole("ADMIN")
                        // Deadlines — read for authenticated users
                        .requestMatchers("/api/deadlines/**").authenticated()
                        // Dashboard endpoints
                        .requestMatchers("/api/dashboard/admin").hasRole("ADMIN")
                        .requestMatchers("/api/dashboard/teacher").authenticated()
                        .requestMatchers("/api/dashboard/today-focus").authenticated()
                        // Pinned items — all authenticated users
                        .requestMatchers("/api/pins/**").authenticated()
                        // Template requests — admin actions
                        .requestMatchers(HttpMethod.GET, "/api/template-requests/admin").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/template-requests/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/template-requests/admin/**").hasRole("ADMIN")
                        // Template requests — teacher actions (own)
                        .requestMatchers("/api/template-requests/**").authenticated()
                        // AI endpoints — all authenticated users
                        .requestMatchers("/api/ai/**").authenticated()
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
