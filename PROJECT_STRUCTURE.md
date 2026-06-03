# 📂 Структура проекта

Полное описание всех файлов и папок проекта IT Department Management System.

> **TL;DR**: Если ты ищешь только команды запуска — прыгай в раздел [🚀 Команды запуска всех сервисов](#-команды-запуска-всех-сервисов) в самом низу.

## 🗂️ Корневая структура

```
fullStackpj/
├── src/                    # Backend (Spring Boot)
├── frontend/               # Frontend (React)
├── robot/                  # Python робот
├── monitoring/             # Grafana + Prometheus stack
├── pom.xml                 # Maven конфигурация
├── README.md               # Главный README
├── PROJECT_STRUCTURE.md    # Этот файл
├── progress.md             # Лог изменений по фазам
├── .env.example            # Шаблон environment variables
└── .gitignore              # Игнорируемые git файлы
```

## 📦 Backend (Spring Boot) — `src/`

### Структура

```
src/main/java/org/example/fullstackpj/
├── FullStackpjApplication.java         # Главный entry point Spring Boot
├── SecurityConfig.java                 # JWT auth, CORS, role-based access
├── CustomUserDetails.java              # UserDetails wrapper
│
├── Config/                             # Spring конфигурация
│   ├── CacheConfig.java                # Caffeine кэш (4 кэша: templateRecommendations, teacherSearch, kkkGaps, profileSummary)
│   ├── CorsConfig.java                 # CORS настройки
│   ├── DataInitializer.java            # Default users при старте (admin/admin123, robot/robot123)
│   └── StaticResourceConfig.java       # Static resource handlers для uploaded files
│
├── Controllers/                        # REST API endpoints
│   ├── ActivityController.java         # /api/activity — лента активности
│   ├── AiController.java               # /api/ai/* — AI endpoints (шаблоны, поиск, KKK, публикации)
│   ├── AssistantController.java        # /api/ai/assistant/* — AI Chat + KKK Tutor
│   ├── AwardController.java            # /api/awards/* — награды
│   ├── CategoryController.java         # /api/categories/* — категории отчётов
│   ├── DashboardController.java        # /api/dashboard/* — статистика + Today's Focus
│   ├── DeadlineController.java         # /api/deadlines/* — дедлайны
│   ├── EducationController.java        # /api/education/* — образование
│   ├── EventController.java            # /api/events/* — события
│   ├── FavoriteController.java         # /api/favorites/*
│   ├── FriendshipController.java       # /api/friends/* — коллеги/связи
│   ├── GeneratedDocumentController.java # /api/generated-documents/* — документы от робота
│   ├── KkkController.java              # /api/kkk/* — KKK preparation чеклист
│   ├── MessageController.java          # /api/messages/* — чат между пользователями
│   ├── NotificationController.java     # /api/notifications/* — уведомления
│   ├── PageController.java             # SPA fallback (index.html)
│   ├── PasswordResetAdminController.java # /api/admin/password-resets/* — admin reset паролей
│   ├── PatentController.java           # /api/patents/* — патенты
│   ├── PinnedItemController.java       # /api/pins/* — закреплённые элементы
│   ├── PublicProfileController.java    # /api/public/profiles/* — публичные профили (без auth)
│   ├── PublicationController.java      # /api/publications/* — научные публикации
│   ├── QualificationCourseController.java # /api/qualification-courses/* — курсы повышения квалификации
│   ├── RecordController.java           # /api/records/* — отчёты
│   ├── RobotControllerEndpoint.java    # /api/admin/robot/* — upload Excel + trigger robot run
│   ├── RobotRunController.java         # /api/robot-runs/* — история запусков робота
│   ├── SettingsController.java         # /api/settings/* — настройки кафедры
│   ├── SubmissionController.java       # /api/submissions/*
│   ├── TemplateController.java         # /api/templates/* — библиотека шаблонов
│   ├── TemplateRequestController.java  # /api/template-requests/* — запросы шаблонов
│   ├── UserController.java             # /api/users/* — CRUD пользователей, CV export
│   └── WorkExperienceController.java   # /api/work-experience/* — опыт работы
│
├── Service/                            # Бизнес-логика
│   ├── ActivityService.java
│   ├── AwardService.java
│   ├── CategoryService.java
│   ├── CustomUserDetailsService.java   # Spring Security UserDetailsService
│   ├── CvGeneratorService.java         # Генерация CV в PDF через iText 8 (Roboto font, трёхъязычный)
│   ├── DashboardService.java           # Агрегация статистики для Dashboard
│   ├── DeadlineService.java
│   ├── DepartmentSettingsService.java
│   ├── EducationService.java
│   ├── EventService.java
│   ├── FriendshipService.java
│   ├── GeneratedDocumentService.java   # Управление Word-файлами от робота (фильтрует DELETED)
│   ├── KkkService.java                 # KKK чеклист, completion %, gap analysis
│   ├── MessageService.java
│   ├── NotificationService.java        # 26 типов уведомлений, WebSocket broadcast
│   ├── PasswordResetService.java       # Сброс паролей через запрос к admin
│   ├── PatentService.java
│   ├── PinnedItemService.java          # Закреплённые items (pin/unpin/reorder, max 20)
│   ├── PublicationService.java
│   ├── QualificationCourseService.java
│   ├── RecordService.java
│   ├── RobotControllerService.java     # Upload Excel + ProcessBuilder запуск Python async
│   ├── RobotRunService.java            # История runs + Rollback (soft delete)
│   ├── ScheduledDeadlineNotifier.java  # @Scheduled — напоминания о дедлайнах
│   ├── StatsService.java               # Power BI SQL views, статистика
│   ├── SubmissionService.java
│   ├── TemplateRequestService.java     # Запросы шаблонов (PENDING → COMPLETED/REJECTED)
│   ├── TemplateService.java
│   ├── UserService.java                # CRUD пользователей, public profile, slug генерация
│   ├── WorkExperienceService.java
│   │
│   └── ai/                             # AI слой
│       ├── AiService.java              # Интерфейс (5 методов)
│       ├── AiAssistantService.java     # AI Chat (history, context) + KKK Tutor
│       ├── AiMetrics.java              # Micrometer метрики: ai_requests_total, ai_request_duration, tokens
│       ├── AiUnavailableException.java # 503 когда Groq недоступен
│       ├── PdfTextExtractor.java       # PDFBox 3.0.3 — text extraction из PDF для AI
│       ├── SimpleAiServiceImpl.java    # Fallback (keyword matching) — активен без GROQ_API_KEY
│       ├── TodayFocusService.java      # AI-генерация Today's Focus карточки (warm/motivating tone)
│       ├── UserContextBuilder.java     # Сборка user context snapshot для system prompt
│       └── groq/
│           ├── GroqClient.java         # WebClient для Groq API (@ConditionalOnExpression если GROQ_API_KEY задан)
│           ├── GroqAiServiceImpl.java  # @Primary реализация AiService через Groq Llama 3.3 70B
│           └── GroqException.java      # Runtime exception для Groq ошибок
│
├── Entity/                             # JPA entities (БД таблицы)
│   ├── Activity.java                   # Лента активности (audit events)
│   ├── AssistantConversation.java      # AI Chat сессии (title, lastMessageAt)
│   ├── AssistantMessage.java           # Сообщения в AI чате (role USER/ASSISTANT, content TEXT)
│   ├── Award.java                      # Награды преподавателя
│   ├── Category.java                   # Категории отчётов
│   ├── Deadline.java                   # Дедлайны с категориями (KKK/PUBLICATIONS/REPORTS/etc.)
│   ├── DepartmentSettings.java         # Настройки кафедры
│   ├── Education.java                  # Образование преподавателя
│   ├── Event.java                      # Академические события/конференции
│   ├── Friendship.java                 # Связи между пользователями
│   ├── GeneratedDocument.java          # Word файлы от робота (статус UPLOADED/DELETED)
│   ├── KkkProfile.java                 # KKK профиль (чеклист 9 пунктов, completion %)
│   ├── Message.java                    # Чат сообщения
│   ├── Notification.java               # Уведомления (26 типов, 3 приоритета)
│   ├── PasswordResetRequest.java       # Запросы сброса пароля (через admin)
│   ├── Patent.java                     # Патенты преподавателя
│   ├── PinnedItem.java                 # Закреплённые элементы (TEMPLATE/PUBLICATION/RECORD)
│   ├── Publication.java                # Научные публикации (Scopus/KOKSON/WOS/etc.)
│   ├── PublicationFile.java            # PDF файлы публикаций
│   ├── QualificationCourse.java        # Курсы повышения квалификации
│   ├── Record.java                     # Отчёты (DRAFT → SUBMITTED → APPROVED)
│   ├── RobotRun.java                   # История robot runs (status, rolledBackAt)
│   ├── Submission.java
│   ├── Template.java                   # Шаблоны (DOCX/PDF, категории, downloadCount)
│   ├── TemplateRequest.java            # Запросы новых шаблонов (PENDING/IN_PROGRESS/COMPLETED/REJECTED)
│   ├── User.java                       # Пользователи (role, firstName, lastName, publicProfile, slug, aiSummary)
│   ├── WorkExperience.java             # Опыт работы
│   └── enums/                          # Enum types
│       ├── DatabaseType.java           # SCOPUS, WOS, KOKSON,РИНЦ, etc.
│       ├── DeadlineCategory.java
│       ├── DocumentType.java
│       ├── EnglishLevel.java
│       ├── FileType.java
│       ├── GeneratedDocStatus.java     # UPLOADED, DELETED
│       ├── KkkStatus.java              # NOT_STARTED, IN_PROGRESS, SUBMITTED, APPROVED
│       ├── MessageRole.java            # USER, ASSISTANT
│       ├── NotificationPriority.java   # LOW, NORMAL, HIGH
│       ├── NotificationType.java       # 26 типов (DEADLINE_APPROACHING, DOCUMENT_ROLLED_BACK, etc.)
│       ├── PasswordResetStatus.java
│       ├── PinnedItemType.java         # TEMPLATE, PUBLICATION, RECORD
│       ├── PubFileType.java
│       ├── PublicationStatus.java      # PENDING, VERIFIED, REJECTED
│       ├── PublicationType.java        # ARTICLE, CONFERENCE, BOOK, etc.
│       ├── Quartile.java               # Q1, Q2, Q3, Q4
│       ├── RepeatType.java
│       ├── RequestStatus.java          # PENDING, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
│       ├── RobotRunStatus.java         # RUNNING, SUCCESS, PARTIAL, FAILED, ROLLED_BACK
│       ├── Semester.java
│       ├── TargetRole.java
│       ├── TemplateCategory.java
│       └── TemplateStatus.java
│
├── Repository/                         # Spring Data JPA репозитории
│   ├── ActivityRepository.java
│   ├── AssistantConversationRepository.java
│   ├── AssistantMessageRepository.java
│   ├── AwardRepository.java
│   ├── CategoryRepository.java
│   ├── DeadlineRepository.java         # findRelevantForUser(user, role, includeInactive)
│   ├── DepartmentSettingsRepository.java
│   ├── EducationRepository.java
│   ├── EventRepository.java
│   ├── FriendshipRepository.java
│   ├── GeneratedDocumentRepository.java # findByRobotRunId, findByTeacherAndStatusNot
│   ├── KkkProfileRepository.java
│   ├── MessageRepository.java
│   ├── NotificationRepository.java     # countByUserAndReadFalse
│   ├── PasswordResetRequestRepository.java
│   ├── PatentRepository.java
│   ├── PinnedItemRepository.java
│   ├── PublicationFileRepository.java
│   ├── PublicationRepository.java      # countByAuthorAndDatabaseType, findByAuthorOrderByYear
│   ├── QualificationCourseRepository.java
│   ├── RecordRepository.java           # countByAuthor
│   ├── RobotRunRepository.java
│   ├── SubmissionRepository.java
│   ├── TemplateRepository.java
│   ├── TemplateRequestRepository.java  # findByRequestedBy, countByStatus
│   ├── UserRepository.java
│   └── WorkExperienceRepository.java
│
├── Dto/                                # Data Transfer Objects
│   ├── DeadlineDto.java
│   ├── KkkChecklistDto.java
│   ├── KkkProfileDto.java
│   ├── LoginResponse.java
│   ├── PinnedItemDto.java
│   ├── PublicProfileDto.java           # Только public-safe поля (без email, паролей)
│   ├── PublicationDto.java
│   ├── RecordDto.java
│   ├── UserDto.java
│   ├── ai/
│   │   ├── KkkGapAnalysis.java         # AI Gap Analysis результат
│   │   ├── PublicationFieldSuggestions.java # AI suggestions (publicationType, quartile, confidence)
│   │   ├── PublicationMetadata.java    # Извлечённые из PDF поля
│   │   ├── TeacherSearchResult.java    # AI поиск преподавателей
│   │   ├── TemplateRecommendation.java # AI рекомендации шаблонов
│   │   └── TodayFocusDto.java          # Today's Focus (greeting, message, priorities, stats)
│   └── dashboard/
│       ├── AdminDashboardDto.java
│       └── TeacherDashboardDto.java
│
├── Security/                           # JWT фильтры
│   ├── JwtAuthenticationFilter.java    # Per-request JWT проверка
│   └── JwtUtil.java                    # Генерация и парсинг JWT токенов
│
└── Exception/
    └── GlobalExceptionHandler.java     # @ControllerAdvice — 503 для AiUnavailableException, 404, 400
```

### Resources — `src/main/resources/`

```
src/main/resources/
├── application.yaml                    # Главный конфиг (БД, JWT, Groq AI, cache, robot paths)
├── fonts/                              # Cyrillic-capable шрифты для PDF
│   ├── Roboto-Regular.ttf              # Google OFL license
│   └── Roboto-Bold.ttf
├── static/
│   ├── img/                            # Логотип университета для CV PDF
│   └── files/                          # Загруженные файлы (gitignored контент)
└── db/
    └── views/                          # Power BI SQL views (5 views для BI аналитики)
```

## 🎨 Frontend (React + TypeScript) — `frontend/`

```
frontend/
├── public/                             # Static assets (favicon, index.html)
├── package.json                        # NPM зависимости + scripts
├── tsconfig.json                       # TypeScript config
├── tailwind.config.js                  # Tailwind конфиг (dark/light/corporate/high-contrast themes)
└── src/
    ├── index.tsx                       # Entry point (ReactDOM.render)
    ├── App.tsx                         # Все routes (ProtectedRoute + Admin routes)
    ├── App.test.tsx
    ├── react-app-env.d.ts
    ├── reportWebVitals.ts
    ├── setupTests.ts
    │
    ├── pages/                          # Page components (один файл = один route)
    │   ├── Login.tsx                   # /login — форма входа + forgot password
    │   ├── Dashboard.tsx               # / — Today's Focus + Bento Grid + Pinned Items
    │   ├── Profile.tsx                 # /profile — личная инфа, QR, CV export, public profile toggle
    │   ├── PublicProfile.tsx           # /p/:slug — публичный профиль без auth
    │   ├── KkkPreparation.tsx          # /kkk — чеклист + AI Tutor + Gap Analysis
    │   ├── Publications.tsx            # /publications — CRUD публикаций + AI PDF extract
    │   ├── Documents.tsx               # /documents — отчёты (DRAFT→SUBMITTED→APPROVED)
    │   ├── GeneratedDocuments.tsx      # /generated-documents — Word файлы от робота
    │   ├── Deadlines.tsx               # /deadlines — calendar + list view
    │   ├── Messages.tsx                # /messages — чат
    │   ├── Notifications.tsx           # /notifications — список уведомлений
    │   ├── TemplatesLibrary.tsx        # /templates — шаблоны + preview + AI поиск + запросы
    │   ├── FindSupervisor.tsx          # /find-supervisor — AI поиск преподавателей
    │   ├── UserProfile.tsx             # /users/:id — профиль другого пользователя
    │   ├── UsersSearch.tsx             # /users — поиск пользователей
    │   ├── ActivityLog.tsx             # /activity-log — audit log
    │   ├── ProtectedRoute.tsx          # HOC — redirect на /login если нет токена
    │   ├── NotFound.tsx                # 404
    │   ├── Unauthorized.tsx            # 403
    │   └── Admin/                      # Admin-only страницы (/admin/*)
    │       ├── AdminDashboard.tsx      # stat cards + last Robot Run + Alerts + Top teachers
    │       ├── AllGeneratedDocuments.tsx # все Word документы от всех robot runs
    │       ├── Categories.tsx          # управление категориями отчётов
    │       ├── DeadlinesManagement.tsx # создание и управление дедлайнами
    │       ├── KkkSubmissions.tsx      # обзор KKK статусов всех преподавателей
    │       ├── PasswordResetRequests.tsx # обработка запросов на сброс пароля
    │       ├── PublicationsReview.tsx  # модерация публикаций (PENDING→VERIFIED/REJECTED)
    │       ├── RobotRuns.tsx           # Upload Excel + таблица runs + Rollback
    │       ├── Settings.tsx            # настройки кафедры
    │       ├── Statistics.tsx          # Power BI views + 8 stat cards + 4 charts
    │       ├── Teachers.tsx            # CRUD преподавателей + reset password
    │       ├── TemplateRequests.tsx    # обработка запросов шаблонов
    │       └── Templates.tsx           # управление библиотекой шаблонов
    │
    ├── components/                     # Переиспользуемые компоненты
    │   ├── CommandPalette.tsx          # Cmd+K глобальная палитра (страницы + преподаватели + шаблоны)
    │   ├── EmptyState.tsx              # Пустое состояние с иконкой и текстом
    │   ├── Toaster.tsx                 # Toast уведомления
    │   ├── admin/
    │   │   └── RobotUploadCard.tsx     # Drag-n-drop .xlsx upload (25MB limit, loading state)
    │   ├── ai/
    │   │   ├── AiChatButton.tsx        # Floating кнопка (fixed bottom-right, ping animation)
    │   │   └── AiChatPanel.tsx         # Slide-out chat (history, markdown rendering, Cmd+Enter)
    │   ├── dashboard/
    │   │   ├── PinButton.tsx           # Hover-revealed bookmark icon на карточках
    │   │   ├── PinnedItemsWidget.tsx   # Drag-n-drop список закреплённых (dnd-kit)
    │   │   └── TodayFocusCard.tsx      # AI-generated карточка приоритетов дня
    │   ├── kkk/
    │   │   └── KkkTutorPanel.tsx       # AI KKK консультант (suggested questions, markdown)
    │   ├── layout/
    │   │   ├── Breadcrumbs.tsx
    │   │   ├── Header.tsx              # Top bar (тема, язык, уведомления)
    │   │   ├── MainLayout.tsx          # Wrapper Header + Sidebar + AiChatButton
    │   │   ├── PageHeader.tsx          # Заголовок страницы с action кнопками
    │   │   └── Sidebar.tsx             # Navigation с badge (pending template requests count)
    │   ├── skeletons/                  # Loading skeleton компоненты
    │   │   ├── CardSkeleton.tsx
    │   │   ├── DashboardSkeleton.tsx
    │   │   ├── ListSkeleton.tsx
    │   │   └── TableRowSkeleton.tsx
    │   ├── templates/
    │   │   └── TemplatePreviewModal.tsx # PDF (iframe+blob) и DOCX (mammoth.js→HTML) preview
    │   └── ui/                         # shadcn/ui компоненты (Radix UI based)
    │       ├── NumberTicker.tsx        # Animated number counter
    │       ├── ShimmerButton.tsx       # Shimmer effect button
    │       ├── alert.tsx
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── collapsible.tsx
    │       ├── dialog.tsx
    │       ├── dropdown-menu.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── popover.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── scroll-area.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── skeleton.tsx
    │       ├── switch.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       ├── toast.tsx
    │       └── tooltip.tsx
    │
    ├── api/                            # Axios клиенты (JWT interceptor в client.ts)
    │   ├── client.ts                   # Axios instance с Bearer token interceptor
    │   ├── activity.ts
    │   ├── ai.ts                       # AI endpoints (recommend, search, extract, suggest)
    │   ├── assistant.ts                # AI Chat (chat, conversations, messages)
    │   ├── auth.ts                     # login, register, forgot-password
    │   ├── awards.ts
    │   ├── categories.ts
    │   ├── dashboard.ts                # today-focus, stats
    │   ├── deadlines.ts
    │   ├── education.ts
    │   ├── friends.ts
    │   ├── generatedDocuments.ts
    │   ├── kkk.ts
    │   ├── messages.ts
    │   ├── notifications.ts
    │   ├── patents.ts
    │   ├── pins.ts                     # pin, unpin, reorder
    │   ├── publications.ts
    │   ├── qualificationCourses.ts
    │   ├── records.ts
    │   ├── robotRuns.ts                # uploadAndRun, rollback
    │   ├── settings.ts
    │   ├── templateRequests.ts         # create, getMyRequests, adminUpdate
    │   ├── templates.ts
    │   ├── users.ts                    # CRUD, exportCv (blob download)
    │   └── workExperience.ts
    │
    ├── contexts/                       # React Context
    │   ├── AuthContext.tsx             # JWT токен, user info, login/logout
    │   └── ThemeContext.tsx            # dark/light/corporate/high-contrast темы
    │
    ├── hooks/                          # Custom React hooks
    │   ├── useGeneratedDocuments.ts
    │   ├── usePinnedItems.ts           # pin/unpin/reorder mutations + optimistic updates
    │   ├── usePublications.ts
    │   ├── useRobotRuns.ts
    │   └── useToast.tsx
    │
    ├── i18n/                           # Локализация (react-i18next)
    │   ├── config.ts                   # i18next инициализация (RU default)
    │   └── locales/
    │       ├── ru.json                 # Русские переводы (все ключи)
    │       └── en.json                 # English translations
    │
    ├── types/
    │   └── index.ts                    # Все TypeScript интерфейсы и типы
    │
    ├── lib/
    │   └── utils.ts                    # cn() (clsx + tailwind-merge)
    │
    └── utils/                          # Утилиты
```

## 🤖 Python Robot — `robot/`

```
robot/
├── main.py                             # CLI entrypoint — argparse --input, orchestration
├── excel_parser.py                     # Парсинг реального 34-колоночного формата кафедры
│                                       # (openpyxl, пропуск 3 строк заголовков, LoadRow dataclass,
│                                       #  агрегаты: total_hours/sem1/sem2/lecture/practical/lab)
├── word_generator.py                   # Positional cell-replacement в шаблоне F-28_I-05
│                                       # (Таблица 0: ФИО/должность, Таблица 2: нагрузка 5x14,
│                                       #  Таблица 9: итоги, замена "20__-20__" на год)
├── api_client.py                       # REST client: login → find_teacher_by_full_name → upload
├── config.py                           # Загрузка .env (ROBOT_USERNAME, ROBOT_PASSWORD, API_URL)
├── logger.py                           # Логирование robot runs
├── requirements.txt                    # openpyxl, python-docx, requests
├── README.md                           # Setup инструкция
├── .env.example                        # ROBOT_USERNAME, ROBOT_PASSWORD, API_URL, TEMPLATE_PATH
├── .env                                # Реальный конфиг (gitignored)
├── templates/
│   └── teacher_workload_template.docx  # Реальный шаблон F-28_I-05 кафедры (трёхъязычный kk/ru/en)
├── input/                              # Входные Excel файлы (загружаются через UI или CLI)
│   ├── .gitkeep
│   └── processed/                      # Обработанные файлы (auto-moved после успеха)
└── output/                             # Сгенерированные Word файлы F-28_I-05_{Date}_{LastName}.docx
    └── .gitkeep
```

## 📊 Monitoring Stack — `monitoring/`

```
monitoring/
├── docker-compose.yml                  # Prometheus 2.51 + Grafana 10.4 контейнеры
├── prometheus/
│   └── prometheus.yml                  # Scrape config: backend :8080/actuator/prometheus каждые 15s
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   ├── prometheus.yml          # Auto-connect к Prometheus (localhost:9090)
    │   │   └── postgres.yml            # Auto-connect к PostgreSQL (task_app)
    │   └── dashboards/
    │       └── dashboards.yml          # Auto-loading config (path: /dashboards)
    └── dashboards/
        ├── system-overview.json        # 7 панелей: requests/sec, p95 latency, 5xx errors,
        │                               # JVM memory, CPU, Login activity, Robot Runs Timeline
        └── ai-monitoring.json          # 9 панелей: AI requests/min, feature pie, status bar,
                                        # response p50/p95/p99, rate limit gauge, tokens, chat activity
```

## 🔑 Корневые конфиг файлы

| Файл | Описание |
|------|----------|
| `pom.xml` | Maven: Java 17+, Spring Boot 3.5.6, все зависимости (iText 8, PDFBox, ZXing, WebFlux, Caffeine) |
| `.env.example` | Шаблон: GROQ_API_KEY, AI_PROVIDER, ROBOT_PASSWORD |
| `.env` | **gitignored** — реальные секреты |
| `.gitignore` | target/, node_modules/, venv/, .env, robot input/output, static uploads |
| `README.md` | Главное описание: badges, архитектура, стек, AI endpoints, порты |
| `PROJECT_STRUCTURE.md` | Этот файл — детальная структура всех файлов |
| `progress.md` | Детальный лог всех фаз разработки с ключевыми решениями |

## 🚀 Команды запуска всех сервисов

> **Важно:** запускай каждый сервис в **отдельном терминале** чтобы видеть логи.

### 1️⃣ PostgreSQL (база данных)

Обычно запущена как системный сервис. Проверить:

```bash
# Mac (Homebrew)
brew services list | grep postgres

# Запустить если остановлена
brew services start postgresql@17

# Проверить подключение
psql -U postgres -d task_app -c "SELECT version();"
```

### 2️⃣ Backend (Spring Boot)

**Терминал 1:**

```bash
cd ~/IdeaProjects/fullStackpj
mvn spring-boot:run
```

Ждать пока появится: `Started FullStackpjApplication in X seconds`

**Доступ:** http://localhost:8080  
**Health check:** http://localhost:8080/actuator/health

### 3️⃣ Frontend (React)

**Терминал 2:**

```bash
cd ~/IdeaProjects/fullStackpj/frontend
npm start
```

Автоматически откроет браузер на http://localhost:3000

**Default login:**
- Admin: `admin` / `admin123`
- Robot: `robot` / `robot123`

### 4️⃣ Python Robot (опционально)

**Терминал 3** (только если нужно запустить вручную):

```bash
cd ~/IdeaProjects/fullStackpj/robot
source venv/bin/activate
python3 main.py --input input/your_workload.xlsx
```

Или загрузи Excel через UI: Admin → `/admin/robot-runs` → Upload & Run.

### 5️⃣ Metabase (бизнес-аналитика)

**Терминал 4:**

```bash
cd ~/metabase
java -Dmb.jetty.port=3002 -jar metabase.jar
```

Ждать пока появится: `Metabase Initialization COMPLETE`

**Доступ:** http://localhost:3002  
**Login:** admin email который задал при первом запуске

### 6️⃣ Monitoring stack (Grafana + Prometheus)

**Один раз — стартани Docker контейнеры:**

```bash
cd ~/IdeaProjects/fullStackpj/monitoring
docker compose up -d
```

Проверить:

```bash
docker compose ps
# Должно быть 2 контейнера UP
```

**Доступ:**
- Grafana: http://localhost:3001 (admin / admin)
- Prometheus: http://localhost:9090

**Дашборды:**
- Grafana → Dashboards → Diploma → System Overview
- Grafana → Dashboards → Diploma → AI Monitoring

**Остановить мониторинг:**

```bash
cd ~/IdeaProjects/fullStackpj/monitoring
docker compose down
```

### 📋 Все сервисы — резюме портов

| Сервис | Порт | URL | Команда запуска |
|--------|------|-----|-----------------|
| PostgreSQL | 5432 | localhost:5432 | `brew services start postgresql@17` |
| Backend | 8080 | http://localhost:8080 | `mvn spring-boot:run` (из корня) |
| Frontend | 3000 | http://localhost:3000 | `npm start` (из frontend/) |
| Grafana | 3001 | http://localhost:3001 | `docker compose up -d` (из monitoring/) |
| Metabase | 3002 | http://localhost:3002 | `java -Dmb.jetty.port=3002 -jar metabase.jar` |
| Prometheus | 9090 | http://localhost:9090 | `docker compose up -d` (из monitoring/) |

### 🛠️ Полезные команды

```bash
# Узнать что занимает порт
lsof -i :8080
lsof -ti :3000 | xargs kill -9  # убить процесс на порту 3000

# Логи Docker контейнеров
cd monitoring && docker compose logs -f grafana
cd monitoring && docker compose logs -f prometheus

# Перезапустить только Grafana (после изменения конфига)
cd monitoring && docker compose restart grafana

# Подключиться к БД
psql -U postgres -d task_app

# Список таблиц
psql -U postgres -d task_app -c "\dt"

# Запустить frontend в production mode
cd frontend && npm run build && npx serve -s build

# Проверка backend metrics
curl http://localhost:8080/actuator/prometheus | head -20

# Тест AI chat endpoint напрямую
curl -X POST http://localhost:8080/api/ai/assistant/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","locale":"ru"}'

# Пересоздать БД с нуля (осторожно!)
psql -U postgres -c "DROP DATABASE task_app; CREATE DATABASE task_app;"
mvn spring-boot:run  # DataInitializer создаст таблицы и default users
```

### 🎯 Минимум для демонстрации на защите

Перед защитой запусти **в таком порядке**:

```bash
# Терминал 1: Backend
cd ~/IdeaProjects/fullStackpj && mvn spring-boot:run

# Терминал 2: Frontend (ждать пока backend стартанёт)
cd ~/IdeaProjects/fullStackpj/frontend && npm start

# Терминал 3: Monitoring
cd ~/IdeaProjects/fullStackpj/monitoring && docker compose up -d

# Терминал 4: Metabase
cd ~/metabase && java -Dmb.jetty.port=3002 -jar metabase.jar
```

**Открой в браузере:**
- Tab 1: http://localhost:3000 (приложение — логин admin/admin123)
- Tab 2: http://localhost:3001 (Grafana — admin/admin)
- Tab 3: http://localhost:3002 (Metabase)
- Tab 4: http://localhost:9090/targets (Prometheus — проверить что backend UP)

Готово! 🚀
