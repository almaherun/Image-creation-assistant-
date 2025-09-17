# دليل تطوير الواجهة الخلفية (Backend) لتطبيق استوديو القصص

## 1. نظرة عامة

مرحبًا يا مهندس الواجهة الخلفية!

هذا المستند هو دليلك لإنشاء الواجهة الخلفية لتطبيق "استوديو القصص". حاليًا، التطبيق يعمل بالكامل على جانب العميل (Client-Side)، حيث يتم تخزين البيانات في IndexedDB والتواصل مع Gemini API مباشرة من المتصفح.

**الهدف الأساسي:** هو نقل كل هذه العمليات المنطقية إلى الخادم. سيقوم الخادم بإدارة قاعدة البيانات، والتعامل مع طلبات Gemini API بشكل آمن، وتوفير واجهة برمجة تطبيقات (API) لتطبيق الواجهة الأمامية.

---

## 2. الميزات الأساسية المطلوبة

### أ. إعداد قاعدة البيانات

نوصي باستخدام قاعدة بيانات علائقية مثل **PostgreSQL** (للاستفادة من نوع `JSONB`) أو **SQLite** (للبساطة في التطوير المحلي).

**الجداول المطلوبة:**

1.  **`Characters` (الشخصيات):** لتخزين معلومات الشخصيات.
2.  **`Stories` (القصص):** لتخزين معلومات القصص والمشاهد المرتبطة بها.
3.  **`StoryCharacters` (جدول وسيط):** لإنشاء علاقة "متعدد إلى متعدد" (Many-to-Many) بين القصص والشخصيات.

### ب. تكامل آمن مع Gemini API

*   يجب أن تتم جميع استدعاءات Gemini API من خلال الخادم فقط.
*   يجب تخزين مفاتيح API بشكل آمن في متغيرات البيئة (`.env`) على الخادم وعدم كشفها للعميل أبدًا.
*   سيقوم الخادم بدور الوكيل (Proxy) بين الواجهة الأمامية و Gemini API.

### ج. منطق إنشاء القصة (Story Generation)

هذه هي العملية الأكثر تعقيدًا. حاليًا، تتم على العميل في عدة خطوات. يجب تحويلها إلى عملية غير متزامنة على الخادم:

1.  يتلقى الخادم طلبًا لإنشاء قصة جديدة مع كل التفاصيل (النص، الشخصيات المختارة، الإعدادات).
2.  **الخطوة 1 (الخادم):** يستدعي Gemini API لتقسيم النص إلى مشاهد (`splitStoryIntoScenes`).
3.  **الخطوة 2 (الخادم):** لكل مشهد تم إنشاؤه، يقوم الخادم باستدعاء Gemini API مرة أخرى لإنشاء صورة المشهد (`generateSceneImage`).
4.  **تحديث التقدم:** يجب أن يوفر الخادم طريقة للواجهة الأمامية لتتبع تقدم هذه العملية الطويلة. يمكن استخدام:
    *   **WebSockets:** لإرسال تحديثات فورية إلى العميل.
    *   **Long Polling:** حيث يقوم العميل بطلب التحديثات بشكل دوري.
5.  عند اكتمال جميع الخطوات، يقوم الخادم بتجميع كل البيانات وحفظ القصة الكاملة في قاعدة البيانات.

---

## 3. تصميم قاعدة البيانات (Schema)

#### جدول `Characters`

| اسم العمود | النوع | ملاحظات |
| :--- | :--- | :--- |
| `id` | `TEXT` أو `UUID` | مفتاح أساسي (Primary Key) |
| `name` | `TEXT` | لا يمكن أن يكون فارغًا |
| `description` | `TEXT` | لا يمكن أن يكون فارغًا |
| `image_url` | `TEXT` | رابط الصورة (سيتم تخزينها في خدمة مثل S3) |
| `created_at` | `TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | - |

#### جدول `Stories`

| اسم العمود | النوع | ملاحظات |
| :--- | :--- | :--- |
| `id` | `TEXT` أو `UUID` | مفتاح أساسي |
| `name` | `TEXT` | لا يمكن أن يكون فارغًا |
| `original_prompt`| `TEXT` | النص الأصلي للقصة |
| `scenes` | `JSONB` | مصفوفة من كائنات المشاهد (انظر الهيكل أدناه) |
| `aspect_ratio` | `TEXT` | `1:1`, `16:9`, `9:16` |
| `video_duration`| `INTEGER` | مدة الفيديو بالثواني |
| `scene_duration`| `INTEGER` | مدة المشهد بالثواني |
| `created_at` | `TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | - |

**هيكل كائن `Scene` داخل `JSONB`:**

```json
{
  "id": "string",
  "imagePrompt": "string",
  "animationPrompt": "string",
  "voiceoverPrompt": "string",
  "imageUrl": "string"
}
```

#### جدول `StoryCharacters` (علاقة Many-to-Many)

| اسم العمود | النوع | ملاحظات |
| :--- | :--- | :--- |
| `story_id` | `TEXT` أو `UUID` | مفتاح أجنبي (Foreign Key) يشير إلى `Stories.id` |
| `character_id` | `TEXT` أو `UUID` | مفتاح أجنبي يشير إلى `Characters.id` |

---

## 4. واجهة برمجة التطبيقات (API Endpoints)

يجب أن تتبع الواجهة الخلفية تصميم RESTful.

#### Endpoints للشخصيات (Characters)

*   `GET /api/characters`: جلب جميع الشخصيات.
*   `POST /api/characters`: إنشاء شخصية جديدة. (الخادم هو من يقوم بتوليد الصورة عبر Gemini وحفظ الرابط).
    *   **Body:** `{ name: string, description: string }`
*   `PUT /api/characters/:id`: تحديث شخصية موجودة.
    *   **Body:** `{ name?: string, description?: string, image_url?: string }`
*   `DELETE /api/characters/:id`: حذف شخصية.

#### Endpoints للقصص (Stories)

*   `GET /api/stories`: جلب جميع القصص.
*   `GET /api/stories/:id`: جلب قصة واحدة بتفاصيلها.
*   `POST /api/stories`: بدء عملية إنشاء قصة جديدة (عملية غير متزامنة).
    *   **Body:** `{ name: string, storyPrompt: string, characterIds: string[], aspectRatio: string, videoDuration: number, sceneDuration: number }`
    *   **Response:** `{ "jobId": "some-unique-id" }` لبدء تتبع التقدم.
*   `GET /api/stories/progress/:jobId`: (إذا تم استخدام Long Polling) جلب حالة تقدم إنشاء القصة.
*   `DELETE /api/stories/:id`: حذف قصة.

#### Endpoints مساعدة (Gemini Proxy)

هذه النقاط ستكون وكيلًا (proxy) لخدمات Gemini.

*   `POST /api/gemini/refine-text`: تحسين نص معين.
    *   **Body:** `{ text: string, context: string }`
*   `POST /api/gemini/edit-image`: تعديل صورة موجودة.
    *   **Body:** `{ imageUrl: string, prompt: string }`
*   `GET /api/gemini/character-ideas`: الحصول على أفكار لوصف شخصيات.
*   `GET /api/gemini/story-ideas`: الحصول على أفكار لقصص.

---

## 5. توصيات تقنية

*   **لغة/إطار عمل:** Node.js مع Express أو Fastify.
*   **ORM:** Prisma أو TypeORM لسهولة التعامل مع قاعدة البيانات.
*   **التحقق من المدخلات:** استخدم مكتبة مثل `zod` أو `joi` للتحقق من صحة البيانات القادمة من العميل.
*   **تخزين الصور:** بدلاً من تخزين الصور كـ base64، قم برفعها إلى خدمة تخزين سحابية مثل AWS S3 أو Google Cloud Storage واحفظ فقط الرابط (`URL`) في قاعدة البيانات.

---

## 6. خطوات البدء

1.  اختر إطار العمل وقاعدة البيانات المناسبة.
2.  أنشئ ملف `.env` لتخزين مفاتيح Gemini API ومعلومات الاتصال بقاعدة البيانات.
    ```
    GEMINI_API_KEY="AIza..."
    DATABASE_URL="postgresql://user:password@host:port/database"
    ```
3.  قم بتنفيذ مخطط قاعدة البيانات (Schema) باستخدام migrations.
4.  ابدأ ببناء الـ Endpoints الخاصة بالشخصيات (`Characters`) أولاً لأنها أبسط.
5.  قم ببناء الـ Endpoints الخاصة بالقصص (`Stories`)، مع التركيز على منطق الإنشاء غير المتزامن.
6.  تأكد من وجود معالجة شاملة للأخطاء (Error Handling) في جميع الـ Endpoints.

بالتوفيق في التطوير!
