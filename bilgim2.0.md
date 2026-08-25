# Bilgim — 0-dan to‘liq qayta qurish uchun master-spetsifikatsiya

> Hujjat holati: **implementatsiyaga tayyor, majburiy qarorlar**.  
> Auditoriya: Claude Code yoki boshqa mustaqil kodlash agenti.  
> Til: o‘zbekcha; UI matnlari default o‘zbekcha, `uz`, `ru`, `en` i18n majburiy.  
> Arxitektura qoidasi: agar ushbu hujjatdagi qaror bilan eski kod ziddiyatga
> kirsa, **ushbu hujjat ustun**. Eski kod faqat migratsiya manbasi.

---

## 0. Bajarish buyrug‘i va o‘zgarmas cheklovlar

Bilgimni mavjud monoreponi patch qilish orqali emas, yangi, toza kodbaza sifatida
qur. Eski PostgreSQL ma’lumotlari faqat import qilinadi; eski route, model yoki UI
qarorlari yangi tizimga avtomatik ko‘chirilmaydi.

Quyidagi qarorlar yakuniy:

1. Bilgim marketplace emas; u o‘qituvchi uchun white-labelga yaqin **online school
   SaaS**.
2. Har bir maktab `slug.bilgim.uz`da yashaydi. O‘qituvchi, staff va talaba kundalik
   ishni faqat shu maktab subdomenida bajaradi.
3. `bilgim.uz` faqat platforma marketingi, autentifikatsiyaga kirish, “maktab
   ochish” oqimi va authenticated **Mening maktablarim** switcher sahifasi uchun.
   Unga course marketplace, teacher directory, student dashboard yoki umumiy
   course search qurilmaydi.
4. Barcha tenant ma’lumotlari `school_id` bilan qat’iy scope qilinadi. Klientdan
   kelgan `schoolId` hech qachon authority emas.
5. O‘qituvchi yakuniy akademik baho egasi. AI yordamchi, server esa ball va
   entitlement uchun yagona ishonch manbai.
6. Live video productionda **LiveKit Cloud** bilan ishga tushadi. Bu birinchi
   relizda self-hosted SFU/TURN operatsion murakkabligini va natijadagi past
   ulanish sifatini kamaytiradi.
7. Recording `OFF` holatida yaratiladi: u dars bilan avtomatik yozilmaydi va
   Egress faqat teacher yoki studentning aniq so‘rovi tasdiqlanganidan keyin
   ishga tushadi.
8. Maktab entitlementsi `FREE`, `PRO`, `MAX` yoki to‘liq materiallashtirilgan
   `CUSTOM` subscription bilan belgilanadi. Backend feature yoki limitni aniq
   entitlement yo‘q bo‘lsa **fail-closed** rad etadi; rol hech qachon plan
   imtiyozini oshirmaydi.
9. UI ikki alohida, ammo bitta token bazasiga ega tema bilan quriladi: tenant
   mahsuloti dark-purple; root landing dark lime-purple.

---

## 1. Vizyon, foydalanuvchilar va mahsulot chegarasi

### 1.1 Bilgim nima

Bilgim O‘zbekistondagi mustaqil ingliz tili o‘qituvchisi yoki kichik o‘quv markaziga
bir necha daqiqada o‘z online maktabini ochishga yordam beradi. Maktab o‘z nomi,
subdomeni, brendi, kurslari, guruhlari, to‘lovlari, jonli darslari va o‘quvchi
kommunikatsiyasiga ega bo‘ladi. Platforma o‘qituvchining auditoriyasini egallamaydi;
u o‘qituvchiga boshqaruv va monetizatsiya vositasini beradi.

Asosiy muammo: hozir o‘qituvchi Telegram, Google Meet/Zoom, Google Drive, Excel,
Click/Payme va qo‘lda yozilgan ro‘yxatlar orasida bo‘lingan ishlaydi. Bilgim buni
bir tenant ichidagi boshqariladigan o‘quv tajribasiga birlashtiradi.

### 1.2 Rollar

| Rol | Kim | Majburiy imkoniyat |
|---|---|---|
| `PLATFORM_ADMIN` | Bilgim operatori | Maktablar, planlar, abuse, global billing/reconciliation, support; tenant kontentini sababsiz ko‘rmaydi |
| `OWNER` | Maktabni ochgan o‘qituvchi | Maktab, brend, staff, kurs, to‘lov, analytics va barcha tenant sozlamalari |
| `TEACHER` | Owner qo‘shgan o‘qituvchi | Biriktirilgan kurs/guruh/dars, baholash va live hostlik |
| `ASSISTANT` | Administrator yordamchisi | Student, enrollment, schedule, kommunikatsiya; moliyaviy/ownership huquqi yo‘q |
| `MODERATOR` | Community/live moderator | Post, chat va live moderation; ta’lim yoki billing huquqi yo‘q |
| `STUDENT` | Maktab o‘quvchisi | O‘z enrollments, dars, homework, live, community, payment va profil |
| `GUEST` | Login qilmagan tashrifchi | Faqat public school/storefront va ochiq event RSVP |

Bir `User` bir nechta maktabda bo‘lishi mumkin; roli maktabga (`SchoolMember`) tegishli,
global `User.role`ga emas.

### 1.3 Muvaffaqiyat mezonlari

- Verifikatsiyadan o‘tgan o‘qituvchi 10 daqiqadan kam vaqtda maktab ochib, nom va
  subdomenini tanlaydi, birinchi kurs/guruhini publish qiladi.
- Talaba tenant linki orqali ro‘yxatdan o‘tadi, to‘laydi, enrollment oladi, darsni
  ko‘radi va homework yuboradi; bu oqim Playwright E2E bilan himoyalangan.
- Tenantlar orasida ma’lumot o‘tishi 0: API, cache key, object key, websocket room
  va analytics hammasi `schoolId` bilan izolyatsiya qilingan.
- Live darsda UDP bloklangan yoki mobil NATdagi foydalanuvchi TURN/TLS orqali
  ulanadi; join success va reconnect SLOlari kuzatiladi.

---

## 2. Domain va subdomen chegarasi — majburiy joylashuv jadvali

Bu jadval mahsulot routingining yagona manbai. “Ikkalasida ham” qatori faqat aynan
ko‘rsatilgan public/auth callback holatida ruxsat; boshqa barcha UX tenantda.

| Funksiya | Joylashuvi | Aniq qoida va asos |
|---|---|---|
| Bilgim landing, value proposition, FAQ, blog, kontakt | `bilgim.uz` | Platforma marketingi; tenant ma’lumotini ko‘rsatmaydi |
| Platform plan/pricing | `bilgim.uz` | O‘qituvchi Bilgim SaaS obunasini tanlaydi; checkoutdan keyin tenant settingsga qaytadi |
| “Maktab ochish” CTA va teacher signup | `bilgim.uz` | Global onboarding entrypoint; email verificationdan keyin school wizardga o‘tadi |
| Login, password reset, email verify | `bilgim.uz` **va tenant `/login`** | Root global entrypoint beradi; tenant login `returnTo` bilan aynan o‘sha tenantga qaytaradi |
| Mening maktablarim / maktab almashtirish | `bilgim.uz/my-schools` | Rootdagi yagona authenticated product exception: faqat a’zolik kartasi, logo, keyingi dars va unread son; tenant dars, baho, to‘lov yoki xabar matni ko‘rsatilmaydi |
| School yaratish wizardi, slug tanlash | `bilgim.uz` | Yaratish tugashi bilan `https://slug.bilgim.uz/setup`ga redirect; rootda dashboard qolmaydi |
| Maktab public landing, teacher bio, natija/fikrlar va kurs vitrinasi | `slug.bilgim.uz` | Template asosidagi teacher storefront; rootdagi global teacher directory **yo‘q** |
| Public course landing va trial/demo lesson | `slug.bilgim.uz` | Konversiya va brand tenantga tegishli |
| Student signup, tenant invite va enrollment request | `slug.bilgim.uz` | Talaba qaysi maktabga kelayotganini yo‘qotmaydi |
| Student course/group checkout, kupon, payment return | `slug.bilgim.uz` | Order va entitlement tenantga tegishli; provider webhook esa `api.bilgim.uz`da |
| Teacher/staff dashboard | `slug.bilgim.uz` | Boshqaruv barcha tenant scope bilan |
| Kurslar, cohort/guruhlar, darslar, fayllar | `slug.bilgim.uz` | Maktabning akademik operatsiyasi |
| Dars player, progress, drip/unlock | `slug.bilgim.uz` | Student entitlement tenantga tegishli |
| Homework, teacher grading, AI suggestion | `slug.bilgim.uz` | Assignment va baho tenantga tegishli |
| Jonli dars, live chat, Q&A, whiteboard, recording | `slug.bilgim.uz` | Session school/course/group entitlementi bilan tekshiriladi |
| Calendar, attendance, so‘rovlar/RSVP | `slug.bilgim.uz` | Maktab jadvali va communitysi |
| Studentlar, enrollment requests, invite links | `slug.bilgim.uz` | Tenant rosteri |
| Community/forum, group chat, DM | `slug.bilgim.uz` | Muloqot tenant ichida; boshqa maktab a’zosi topilmaydi |
| Student gamification: XP, streak, badges, challenges, leaderboard | `slug.bilgim.uz` | Faqat student uchun; XP va leaderboard maktab ichida, global emas |
| Analytics, revenue, exports | `slug.bilgim.uz` | Faqat owner/staffga o‘z maktabi bo‘yicha |
| Maktab branding, custom domain so‘rovi, staff, subscription/plan va usage | `slug.bilgim.uz` | School owner plan, feature availability va usageni ko‘radi; server entitlementni majburiy tekshiradi |
| Notification center va preference | `slug.bilgim.uz` | Notification `schoolId`ga ega; universal account preference ham tenant Settings ichida tahrirlanadi |
| Platform admin/operator | `admin.bilgim.uz` | Public root mahsuloti emas, SSO + MFA + IP policy bilan rezervlangan operator surface |
| Payment provider webhooks | `api.bilgim.uz` | Faqat server-to-server endpoint; UI emas |
| Media/HLS signed delivery | `media.bilgim.uz` yoki R2 custom host | Browserdan bevosita public bucket emas; entitlementga asoslangan signed URL |

### 2.1 Taqiqlangan routing

- `bilgim.uz/dashboard`, `/courses`, `/teachers`, `/discover`, `/student`, `/groups`,
  `/live`, `/messages` yaratma va eski analoglarini redirect qilma. Ular 404 yoki
  marketingga qaytadi.
- `slug.bilgim.uz`dagi `schoolId` query stringdan olinmaydi.
- `www`, `api`, `admin`, `media`, `assets`, `mail`, `docs`, `status`, `support`,
  `app`, `cdn`, `staging`, `dev`, `test` va `www` reserved sluglar. Slug lower-case
  ASCII `[a-z0-9-]`, 3–40 belgi, bosh/oxirida `-` emas.
- Bir maktabning private darsi boshqa maktabning public URLi orqali ochilmasligi
  kerak; har resource lookup `WHERE id = :id AND school_id = :tenantId` bilan.

### 2.2 `bilgim.uz/my-schools` — ataylab qo‘yilgan root exception

Bu sahifa studentni ikki yoki undan ko‘p tenant o‘rtasida yo‘qolib qolishdan
saqlaydigan **account-level school switcher**. U tenant dashboard emas va tenant
content reader bo‘lib qolmasligi shart.

#### Entry resolver

Root login/email-verify/password-reset muvaffaqiyatli tugagach, server-side
`AppEntryResolver` current userning `ACTIVE` `SchoolMember`larini oladi:

| Active a’zoliklar | Majburiy redirect |
|---:|---|
| 0 | Teacher bo‘lishni tanlagan user → `/open-school`; boshqa user → rootdagi “siz hali maktabga qo‘shilmagansiz” sahifasi |
| 1 | Qo‘shimcha sahifasiz `https://{slug}.bilgim.uz`ga 302 redirect; student default `/learn`, staff default `/manage` |
| 2 yoki ko‘p | `https://bilgim.uz/my-schools`ga 302 redirect |

Bu qoida studentga ham, bir nechta maktab boshqaradigan owner/staffga ham bir xil
ishlaydi; kartadagi `role` badge qaysi maktabga qaysi rolda kirishini ko‘rsatadi.
Shunday qilib user ikki maktabda `STUDENT` bo‘lsa aynan so‘ralgan “Mening
maktablarim” ekranini ko‘radi, faqat bitta maktabda bo‘lsa esa hech qachon ortiqcha
tanlash bosqichiga tushmaydi.

#### Sahifa kontrakti

Har karta faqat quyidagi signed, account-level summarydan tuziladi:

```ts
type MySchoolCard = {
  schoolId: string;
  slug: string;
  schoolName: string;
  logoUrl: string | null;
  membershipRole: 'OWNER' | 'TEACHER' | 'ASSISTANT' | 'MODERATOR' | 'STUDENT';
  nextLessonAt: string | null;      // ISO time; lesson body/title/course/payment yo‘q
  unreadMessageCount: number;       // faqat son, message preview yo‘q
  destinationUrl: string;           // https://{slug}.bilgim.uz[/learn|/manage]
};
```

Karta bosilganda browser `destinationUrl`ga navigatsiya qiladi; yangi subdomen
shared SSO cookie orqali sessionni ko‘radi va tenant authorizationni qayta bajaradi.
Root sahifa course title, lesson body, grade, attendance, payment status/amount,
chat/post matni, student roster yoki analyticsni uzatmaydi.

#### Xavfsizlik va ishlash qoidalari

- Endpoint: `GET /v1/account/my-schools`. U tenant endpointi emas, faqat
  authenticated `userId` bo‘yicha `SchoolMember.status=ACTIVE` qatorlarini
  o‘qiydi. Query/bodydagi `schoolId` parametr qabul qilinmaydi.
- `member_school_summaries` read model `(user_id, school_id)` bilan saqlanadi:
  `next_lesson_at`, `unread_message_count`, `updated_at`. Schedule, enrollment,
  chat read-cursor va membership eventlari outbox orqali uni yangilaydi. Bu root
  requestining tenant jadvallariga N+1 fan-out qilishini oldini oladi.
- Summary response `Cache-Control: private, no-store`; server cache key faqat
  `userId` va membership-version bilan. Invite accept/revoke, school suspend,
  message read/new va schedule o‘zgarishi versionni oshiradi.
- `destinationUrl` server host builder tomonidan `slug`dan yasaladi; klient
  yuborgan return URL yoki arbitrary domain ishlatilmaydi.
- Tenant sidebar/top-navda “Maktabni almashtirish” linki doim
  `https://bilgim.uz/my-schools`ga olib boradi. Bu link userda bitta school bo‘lsa
  ham ko‘rinishi mumkin, ammo sahifa entry resolver uni o‘sha tenantga qaytaradi.

---

## 3. Eski kod auditi: qayta ishlatiladigan bilim va tashlab ketiladigan qarorlar

### 3.1 Haqiqiy eski holat

Hozirgi local `bilgim` kodbazasi pnpm/Turborepo, Next.js 14, NestJS, Prisma,
PostgreSQL, Redis/BullMQ va Cloudflare R2ga asoslangan. Taxminan 60 Prisma modeli,
46 controller va 206 backend spec mavjud; frontend test qamrovi esa amalda juda past.
Bu tizim prototip emas, ammo tenant model va E2E darajasida yakunlanmagan.

| Mavjud bo‘lak | Holat | Yangi tizimga munosabat |
|---|---|---|
| Auth, sessions, email verify, JWT refresh, MFA/WebAuthn | Backend katta qismi bor; account recoveryning ayrim kodlari stub | Xavfsizlik tamoyillarini saqla, yangi global User/Session modelda qayta yoz |
| `TeacherProfile.publicSlug` va web middleware | Subdomain host parse, reserved names, shared cookie va faqat root public profile rewrite bor | `School.slug`ga migratsiya qil; bu eski yechim tenant authorization emas |
| Course/Group/Lesson/Enrollment/Schedule | Backend+web UI bor | Domain qoidasi va `school_id` bilan toza bounded contextda qayta yoz |
| R2 media, multipart upload, HLS player/transcode | Mavjud | Object key/asset metadata konseptini saqla; barcha key/policyga `schoolId` qo‘sh |
| Homework UI | Builder hamda writing, reading, listening, speaking, grammar, vocabulary, gap-fill web runtime mavjud | UX g‘oyasini saqla, server-authoritative contractni qayta yoz |
| Homework server runtime | Faqat `WRITING` va `READING` registryda; qolganlari opaque JSON qabul qiladi | Hech qaysi baho logikasini ko‘chirma; yangi registry fail-closed bo‘ladi |
| AI tutor, test generator, AI precheck/rubric | Anthropic adapter va UI mavjud; quota/cost boshqaruvi yetarli emas | Provider-port, audit konseptini saqla; yangi AI Job + budget modeliga o‘tkaz |
| Gamification | XP, badges, streak, challenges, rewards, leaderboard modeli/API/UI bor; test kam | Event-ledger g‘oyasini saqla, lekin faqat `STUDENT` membershipga scope qil; teacher/staff profillarini migratsiya qilma |
| Payme billing | Teacher subscription va student course checkout/webhook kodi bor | Provider state machine va idempotency konseptini saqla; modelni `Order/Payment`ga normallashtir |
| Notifications | In-app/email/push modeli bor; Telegram chat-id binding TODO | Event/outboxni saqla; Telegram linkingni to‘liq qur |
| DM va group chat | CRUD, reactions, pins, read cursor va message sequence bor | Chat engine qoidalarini saqla, room hamda memberni tenantga scope qil |
| Live | LiveKit room/token, chat, whiteboard, recording/Egress bilan birga eski mediasoup va `live-stream` dublikati ham bor | Faqat LiveKit konseptini saqla; yangi bitta Live bounded context qur |
| Security/KMS/outbox/idempotency/audit | Kuchli, testli qismlar bor | Prinsip/abstraksiyalarni saqla, kodni nusxa ko‘chirma |

### 3.2 Eski live sifat muammosining aniq tahlili

Eski UI `1080p` capture va 180/360/1080 simulcast qatlamlarini belgilaydi; Egress
`H264_1080P_30` bilan 1920×1080, 30 fps, 4500 kbps yozuvni so‘raydi. Shu sabab
“bitrate umuman yo‘q” degan xulosa noto‘g‘ri. Ammo production sifatini buzadigan
real muammolar bor:

1. `LiveRoom.tsx`da `audio={false}` — audio publish o‘chirilgan. Bu dars audiosini
   ishonchsiz yoki yo‘q qiladi.
2. TURN URLlari faqat optional environment value; ular bo‘lmasa faqat STUN/ICE
   yo‘liga tayaniladi. Mobil operator NATi, VPN va cheklangan tarmoqlarda join
   yoki media sifati pasayadi.
3. `live-stream` va `live` modullari parallel; LiveKit va mediasoup qoldiqlari
   konfiguratsiya/ownershipni noaniq qiladi.
4. Clientdagi “360/720/1080” selector subscriber yoki publisher bitrate politikasiga
   qat’iy ulanmagan; real telemetry, ABR policy va SLO yo‘q.
5. Egress manba video 1080p bo‘lmasa, recorder 1080p outputni faqat upscale qiladi.

Yangi yechim 7-bo‘limda lock qilingan.

### 3.3 `bilgim.0-0` bo‘yicha ishonch chegarasi

`https://github.com/xursanalime/bilgim.0-0` GitHubda anonymous ko‘rishda 404
qaytardi; terminal orqali ham GitHub credentiali mavjud emas. Shu sabab uning
`.agents/skills/design-taste`, `brandkit`, `minimalist-ui`,
`industrial-brutalist-ui` fayllarining haqiqiy tarkibini uydirmaslik kerak.

Bu master-spec ularning matniga tayanmaydi. Quyidagi dizayn bo‘limi foydalanuvchi
bergan qat’iy brand brief va tekshirilgan mahsulot ehtiyojlariga asoslanadi. Eski
repo keyinchalik ochilsa, u faqat visual reference sifatida tekshiriladi; bu
hujjatdagi routing, data yoki access qarorlarini o‘zgartirmaydi.

---

## 4. To‘liq mahsulot funksiyalari

### 4.1 P0 — maktabni ishga tushirish uchun majburiy

| Funksiya | Nima qiladi | Nega kerak |
|---|---|---|
| School provisioning | Teacher verify → school name/slug/timezone/brand wizard → Free subscription | SaaSning asosiy activation oqimi |
| Mening maktablarim switcheri | Login tugagach 0/1/ko‘p membership resolver; karta orqali school switch, next lesson va unread son | Bir nechta maktabda o‘qiydigan student yagona accountdan to‘g‘ri tenantni topadi |
| Staff va RBAC | Owner teacher/assistant/moderator taklif qiladi, granular permissions tekshiriladi | Kichik markazlar yakka teacherga qamalib qolmaydi |
| Template public landing | `slug.bilgim.uz`da teacher bio, kurslar, student natijalari/fikrlari, FAQ va register/login CTA bilan template storefront | Teacher o‘z linkini Instagram/Telegramga qo‘yadi va visitor studentga aylanadi |
| Course va cohort | Draft/published course; cohort capacity, start/end, price, schedule, teacher | Ingliz tili odatda guruh/cohort bilan sotiladi |
| Lesson/player | Video, audio, PDF, document, text, attachment, completion | Asinxron o‘qishning asosiy tajribasi |
| Enrollment | Invite code/link, paid yoki teacher approval, revoke, capacity | Student accessni aniq boshqaradi |
| Student roster | Search/filter, enrolment holati, progress va attendance ko‘rish | O‘qituvchi uchun kundalik boshqaruv |
| Schedule/calendar | Bir martalik va RRULE recurring dars, timezone, exceptions, ICS link | Guruh darslari va live reminderlar |
| Homework | Assignment, module builder, draft/submit/return/grade, attachments, rubric | Til mashqlarida fikr-mulohaza asosiy qiymat |
| Server baholash | MCQ/gap-fill/matching/vocabulary/grammar/listening serverda score; writing/speaking reviewga | Cheat va browser scorega ishonishni yo‘q qiladi |
| AI teacher assistant | Writing uchun feedback/rubric suggestion, AI text signal, test generation, teacher accept/override | O‘qituvchi vaqtini tejaydi, qarorni almashtirmaydi |
| Live classroom | Scheduled class, pre-join, screen share, chat, raise hand, Q&A, moderation, attendance, recording | Mahsulotni Meet + Telegramdan ajratadi |
| R2 media pipeline | Direct multipart upload, virus/type validation, transcode/HLS, signed stream URL | Katta video xavfsiz va tez yetkaziladi |
| Student payment | Payme checkout, coupon, webhook, receipt, enrollment activation | Lokal monetizatsiya |
| School subscription va entitlement | Free/Pro/Max/Custom, feature gate, atomic quota, renewal/cancel | Bilgim biznes modeli va qat’iy product access |
| Notifications | In-app, email, Telegram linked account; lesson, live, payment, homework, grade eventlari | O‘zbekistondagi Telegram-first xulq |
| Tenant chat | Group chat va teacher-student DM, files, read state, reaction, moderation | Savollarni bir joyga yig‘adi |
| Progress/analytics | Lesson completion, homework score, attendance, learner risk, teacher revenue funnel | O‘qituvchi natijani ko‘ra oladi |
| Student-only gamification | Studentning shaxsiy XP, badge, streak, challenge va opt-in cohort leaderboardi | Davomat va mashqni rag‘batlantiradi; teacher/staff hech qachon o‘ynamaydi |
| Security/operations | MFA, audit, rate limit, idempotency, backup, health, Sentry/OTel | Payment va o‘quvchi PII uchun majburiy |

### 4.1.1 Teacher maktabining template public landing’i

Har active schoolda aynan bitta publish qilinadigan public landing bo‘ladi.
Guest `https://{slug}.bilgim.uz`ga kirganda **shu landing** ochiladi; u dashboard,
generic teacher profile yoki root Bilgim marketing sahifasiga rewrite qilinmaydi.
Landing schoolning o‘z brendi va o‘qituvchisining sotuv sahifasi hisoblanadi.

Owner `/manage/school/landing`da quyidagi built-in template’lardan birini tanlaydi:

- `CLASSIC`: teacher-led course school uchun ishonch/proof-first layout;
- `MINIMAL`: kam blokli, premium va tez landing;
- `BOLD`: katta hero, natijalar va CTA-first layout.

Template faqat layoutni almashtiradi; ma’lumot modeli va conversion oqimi bir xil.
Owner arbitrary HTML, JavaScript, iframe yoki custom CSS qo‘sha olmaydi. U brand
tokenlari, logo/cover, bloklardagi matn va ruxsat berilgan public image/video
assetlarini tahrirlaydi. Bu XSSni, yomon responsive layoutni va brandning buzilishini
oldini oladi.

Draft landing guestga 404/public old version sifatida qoladi. Owner esa
`POST /v1/schools/me/landing/preview-token` orqali 1 soatlik, school-bound signed
preview URL oladi; u unpublished contentni faqat token egasiga render qiladi,
index/SEOga kirmaydi va token expire/revoke bo‘lgach ishlamaydi.

#### Majburiy bloklar va content qoidasi

| Blok | Ko‘rsatiladigan ma’lumot | Qoida |
|---|---|---|
| Sticky header | logo, maktab nomi, “Kurslar”, “O‘qituvchi haqida”, “Fikrlar”, Login/CTA | Har CTA tenant `returnTo` bilan ishlaydi |
| Hero | teacher/maktab headline, qisqa value proposition, cover/illustration, primary CTA | `Kurslarni ko‘rish` va `Ro‘yxatdan o‘tish` tugmasi bo‘ladi |
| Teacher haqida | full name, avatar, bio, tajriba, ixtisoslar, sertifikat/ijtimoiy linklar | Faqat owner tasdiqlagan public profile fieldlari |
| Ishonch ko‘rsatkichlari | active students, tajriba yili, completed cohorts yoki owner-defined highlights | Ishonchsiz avtomatik marketing sonlari ko‘rsatilmaydi; manual highlight label/value auditlanadi |
| O‘quvchi natijalari | result story: qisqa holat, masalan IELTS band yoki level progress, optional before/after, anonymized student identity | `PUBLIC_CONSENT` bo‘lmasa publish mumkin emas; sensitive document/scorecard yuklanmaydi |
| Fikrlar | testimonial body, display name/initial, optional avatar, role/course, publish sanasi | Student/author public consentini bergan bo‘lishi shart; teacher o‘zi yozgan fikrni testimonial deb publish qila olmaydi |
| Kurslar vitrinasi | faqat `PUBLIC` course cards: cover, title, level, short description, price/from-price, next cohort/start | Draft/private course yoki enrolled student ma’lumoti chiqmaydi |
| Qanday ishlaydi | 3 qadam: kurs tanlash → register/login → join/pay/approve → o‘qishni boshlash | Visitorga jarayonni tushuntiradi |
| Upcoming live/event (optional) | public RSVP qilinadigan event title, time, capacity | Private lesson/live hech qachon chiqmaydi |
| FAQ va final CTA | school-specific FAQ, Telegram/contact, terms/privacy link, register CTA | Support/contact source owner tomonidan tasdiqlanadi |

Template yuklanish tartibi aniq: Header → Hero → Trust metrics → Teacher → Results
→ Testimonials → Courses → How it works → optional Events → FAQ → final CTA → Footer.
Owner blokni yashirishi mumkin, ammo Hero, Courses va final CTA publish qilingan
landingda majburiy qoladi. Landing mobile-first, server-rendered, SEO metadata,
Open Graph image, JSON-LD `EducationalOrganization` va canonical
`https://{slug}.bilgim.uz` bilan ishlaydi.

#### Visitor → student conversion oqimi

1. Visitor landingdan course card yoki `Kurslarni ko‘rish`ni tanlaydi va
   `/courses/{courseSlug}` tenant sahifasiga o‘tadi.
2. `Kursga qo‘shilish` bosilganda server tenant/course/cohortni tekshiradi.
   Guest `https://{slug}.bilgim.uz/signup?intent=<signed-short-lived-join-intent>`ga
   yuboriladi; existing account esa ayni signed intent bilan `/login`ga boradi.
3. Verify/login tugagach intent faqat o‘sha `schoolId`, course/cohort va 30 minut
   expiry bilan qayta yechiladi. Klient yuborgan course ID yoki external `returnTo`
   authority emas.
4. Free/auto-admit cohort studentga active enrollment beradi. Approval-required
   cohort `PENDING_APPROVAL` request yaratadi. Paid cohort `Order → Payme checkout
   → verified webhook → active enrollment` oqimiga o‘tadi.
5. Enrollment active bo‘lgach browser `https://{slug}.bilgim.uz/learn/{courseSlug}`
   yoki first unlocked lessonga redirect qiladi. Student keyingi loginlarda
   §2.2dagi bitta/ko‘p maktab entry resolveriga bo‘ysunadi.

Landing visitorga signupdan oldin dashboard, lesson player, private chat yoki
payment historyni ko‘rsatmaydi. U faqat public marketing content va tenant course
conversion oqimini beradi.

### 4.2 P1 — zamonaviy o‘quv platformasida kutiladigan, Bilgimga mos funksiyalar

Quyidagilar Teachable/Thinkificdagi drip, certificates, progress va mobile
kutishlari; Circle’dagi course+community+event modeli; Skool’dagi group-scoped
gamification hamda Kajabi’dagi attribution/coupon amaliyotidan tanlangan. Bu
funksiyalar “hammasini nusxalash” emas, O‘zbekistondagi teacher-led English school
uchun tanlab olingan to‘plamdir.

| Funksiya | Qaror | Nega Bilgimga mos |
|---|---|---|
| Drip content va course compliance | **Kiritiladi** | Cohort darslari haftama-hafta ochiladi; student keyingi darsni oldingi minimum completiondan keyin ochadi. Thinkific uch release modelini qo‘llaydi: enrollment-date, course-start va calendar-date [manba](https://support.thinkific.com/hc/en-us/articles/360030741033-Drip-Schedule). |
| Progress tracking va risk flag | **Kiritiladi** | Completion, attendance va overdue homeworkdan “attention needed” segmenti hosil bo‘ladi; teacher follow-up qiladi. |
| Verifiable completion certificate | **Kiritiladi** | Teacher template tanlaydi; barcha majburiy lesson/assignment bajarilganda PDF va public verify URL beriladi. Teachable ham certificate va enforced completionni core tajriba deb beradi [manba](https://support.teachable.com/en/articles/11682410-new-teachable-plans-in-june-2025). |
| Community/Q&A feed | **Kiritiladi, minimal** | `School Community` va private `Cohort Community` spaces: post, comment, mention, reaction, poll, moderation. Bu Telegramdagi ma’lumot yo‘qolishini kamaytiradi. Circle shu modelda spaces, posts, chat va course progressni birlashtiradi [manba](https://help.circle.so/). |
| Events/RSVP | **Kiritiladi** | Practice club, free webinar, office hours va scheduled live uchun RSVP, capacity, reminder, calendar export. |
| Coupons/limited promotions | **Kiritiladi** | Teacher uchun percentage/fixed price, start/end, max redemption va cohort/course scope. Mahalliy marketing uchun yuqori qiymat. |
| Student uchun school membership narxlashi | **Kiritiladi, school-scoped** | Student Bilgimning global Pro/Maxiga emas, Aziz maktabidagi course bundle yoki “Speaking Club” membershipiga a’zo bo‘ladi. P0: free, one-time va scheduled installment invoice; P1: Payme recurrent tasdiqlangach optional auto-renew. |
| Referral (student) | **Kiritiladi, oddiy** | Bir martalik coupon/referrer reward; oldindan belgilangan reward faqat paid orderdan keyin. |
| Affiliate commission | **Kiritilmaydi P0/P1** | Affiliate payout, fraud, tax va reconciliation murakkab. Kajabi buni commission/payout/reporting bilan alohida mahsulot qiladi [manba](https://help.kajabi.com/articles/sales/affiliates/affiliates-overview). Keyingi B2B relizda manual payout bilan qo‘shish mumkin, ammo hozir schema/UI qurilmaydi. |
| Marketing lead capture | **Kiritiladi, cheklangan** | Public school form: lead name, phone/email, consent, source; owner leadni enrollmentga aylantiradi. |
| Visual email campaign builder | **Kiritilmaydi** | Telegram va transactional email P0 uchun yetarli; murakkab ESP/CRM Bilgim fokusini susaytiradi. API/webhook orqali Brevo/Mailchimp integratsiyasi keyinchalik. |
| Telegram bot linking | **Kiritiladi** | Deep-link `/start <signed_nonce>` userni bot chat IDga bog‘laydi; opt-in va unsubscribe saqlanadi. |
| Mobile student app va push | **Kiritiladi P1** | Expo/React Native faqat student tajribasi: course, player, homework, notification, live join. Teacher admin web-first. Thinkific ham admin ishini desktop webga qoldiradi va studentga drip/community push beradi [manba](https://support.thinkific.com/hc/en-us/articles/13489267385111-Mobile-Only-Features). |
| Offline video download | **Kiritilmaydi P1** | R2 xarajati, DRM va piracy riski yuqori. P1da mobile offline faqat past-risk PDF/text metadata cache; video streaming signed URL bilan. |
| Public global discovery/marketplace | **Kiritilmaydi** | “Teacher customer” positioningini buzadi va subdomen boundaryni chalkashtiradi. |
| Native custom domain | **Kiritilmaydi P1** | `slug.bilgim.uz` avval to‘liq ishlasin; custom-domain only P2 va Cloudflare for SaaS reviewdan keyin. |

### 4.3 Akademik qoidalar

- Course — marketing/content konteyneri; Cohort — vaqt, narx, capacity, teacher va
  studentlarning real guruhi.
- Course ichida section/lesson order immutable published revision bilan saqlanadi.
  Published kontentdagi o‘chirish existing student progressini buzmasligi kerak;
  item `ARCHIVED` bo‘ladi yoki yangi revision chiqadi.
- Lesson `VIDEO`, `LIVE`, `HYBRID`, `TEXT`, `QUIZ` turidan biri; `HYBRID` recording
  paydo bo‘lganda playerda ko‘rinadi.
- Drip rule: `IMMEDIATE`, `AFTER_ENROLLMENT_DAYS`, `AFTER_COURSE_START_DAYS`,
  `AT_DATETIME`, `AFTER_PREVIOUS_COMPLETE`. Server `LessonAccess`ni hisoblaydi,
  frontend faqat ko‘rsatadi.
- Completion: video uchun 90% watch yoki teacher configured threshold; text/PDF
  uchun explicit mark complete; quiz/homework uchun configured pass threshold.
- Certificate uchun course owner: minimum completion %, required assignments,
  attendance % va optional final score belgilaydi. Certificate keyingi qayta grade
  sababli o‘chmaydi; revoke bo‘lsa verification page revoked holatini ko‘rsatadi.
- Student pricing `school_id`ga tegishli va `FREE`, `ONE_TIME`, `INSTALLMENT` yoki
  `RECURRING_MEMBERSHIP`dan biri bo‘ladi. Bu Bilgim SaaS `FREE|PRO|MAX|CUSTOM`
  planlari bilan mutlaqo boshqa bounded context: student bir vaqtning o‘zida Aziz
  maktabida monthly membership, Nodira maktabida one-time course va uchinchi
  maktabda hech qanday paid accesssiz bo‘lishi mumkin.
- P0da course/cohort uchun free, one-time va aniq due-date/amountli installment
  schedule ishlaydi. Installmentning har invoice’i to‘lanmaguncha keyingi access
  server policy bilan yopiladi; grace period owner policyida explicit yoziladi.
  Recurring card charge P0da yo‘q. P1da Payme Subscribe/recurrent contracti va
  sandbox webhooks tasdiqlangach school owner `RECURRING_MEMBERSHIP`ni yoqishi
  mumkin; aks holda monthly renewal invoice oqimi ishlaydi. Payme Subscribe API
  card token/hold oqimini hujjatlashtiradi
  [manba](https://developer.help.paycom.uz/metody-subscribe-api/kholdirovanie/).
- Har access check `active Enrollment` **yoki** current `StudentMembership`ning
  explicit product entitlementidan kelishi shart. Browserning “obuna bo‘ldim”
  flagiga, frontend narxiga yoki boshqa school membershipiga ishonilmaydi.
- `StudentMembership.ACTIVE` accessni `access_until`gacha beradi. Student cancel
  qilsa current paid period tugaguncha access qoladi va next cycle yaratilmaydi;
  payment fail bo‘lsa `PAST_DUE`ga o‘tadi, faqat offer policyidagi explicit grace
  tugagach `EXPIRED` bo‘ladi va membership-source enrollmentlar server workerda
  `REVOKED` emas, `lesson_access.locked_reason=MEMBERSHIP_PAST_DUE` bilan
  qulflanadi. Keyingi successful payment ayni school membershipini qayta `ACTIVE`
  qiladi; teacherning final bahosi, submissioni va progress tarixi yo‘qolmaydi.

### 4.3.1 Student-only gamification — yakuniy mahsulot qoidasi

Gamification Bilgimda o‘qituvchini emas, **studentning muntazam o‘qishini**
rivojlantiradigan qatlamdir. U darsning o‘rnini bosmaydi, bahoni sotib olinadigan
o‘yin valyutasiga aylantirmaydi va maktablar o‘rtasida ko‘chmaydi.

#### Chegara va qatnashish huquqi

- Faqat `SchoolMember.role=STUDENT`, `status=ACTIVE` va kamida bitta `ACTIVE`
  enrollmentga ega user student gamification profili oladi. `OWNER`, `TEACHER`,
  `ASSISTANT`, `MODERATOR`, `PLATFORM_ADMIN` va `GUEST` uchun profil yaratish,
  XP yozish, streak hisoblash, badge berish, challengega qo‘shilish, leaderboardga
  kirish yoki reward redeem qilish **taqiqlangan**.
- Bitta user Aziz maktabida student, Nodira maktabida teacher bo‘lishi mumkin:
  faqat Aziz maktabidagi student membershipi gamificationga ega. `school_id` har
  row, cache key, websocket channel va API queryning majburiy qismidir; global XP,
  global level, global streak va global leaderboard yo‘q.
- Student maktabdan chiqarilsa yoki oxirgi enrollmenti `REVOKED|REFUNDED` bo‘lsa,
  profil `FROZEN` bo‘ladi: tarix saqlanadi, lekin yangi XP/streak/challenge/reward
  harakati rad qilinadi. Qayta active enrollment berilsa owner policyga ko‘ra
  profile `ACTIVE`ga qaytadi; tarix o‘chirilmaydi.
- Teacher va staff o‘yinchi emas, **ta’lim administratori**: challenge/badge/reward
  templatelarini sozlaydi, studentga ko‘rinadigan natijani ko‘radi va faqat auditli
  manual adjustment/fulfillment qiladi. Ularning o‘zlari leaderboardda chiqmaydi
  va student rewardini avtomatik yoki shaxsiy foyda uchun redeem qila olmaydi.

#### Student UX: nimani ko‘radi

`/learn` dashboardida student faqat o‘zining “bugungi qadam”, level progressi,
joriy streak, olingan badge, active challenge va keyingi attainable rewardini
ko‘radi. Bu `admin metric` emas. `Gamification` sahifasi quyidagilarni beradi:

| Qism | Student tajribasi | Qat’iy qoida |
|---|---|---|
| XP va level | Har ishonchli o‘quv harakatidan XP; level thresholdlari 100, 250, 450, 700… kabi versionlangan jadval bilan | XP faqat server eventidan; student miqdorni edit qila olmaydi |
| Daily streak | Ketma-ket school-local kunlarda kamida bitta qualifying learning action | Login/chat/reaction streakni uzaytirmaydi; dam olish kunini policy hisobga oladi |
| Badges | “Birinchi dars”, “7 kunlik streak”, “Listening master”, “Homework hero”, “Course finisher” kabi ko‘rinadigan achievement | Faqat criterion bajarilganda yoki auditli teacher awardi bilan; badge qaytarib olinishi mumkin |
| Challenges | Masalan, 7 kunda 3 lesson + 2 homework yoki speaking clubda 4 attendance | Faol enrollment/cohort va start/end davri bilan scope qilinadi; progress serverda hisoblanadi |
| Leaderboard | Default `OFF`; student xohlasa cohort doirasida rankini ko‘radi | Faqat active studentlar, faqat cohort; display alias, opt-in va privacy policy majburiy |
| Rewards | Teacher belgilagan non-cash academic perk: extra practice, mock-exam slot, certificate cover, office-hour priority | P0/P1da cash, withdrawable balance, crypto, lotereya va avtomatik pul chegirmasi yo‘q |

#### XP event katalogi va balans

P0da teacher arbitrary “10000 XP berish” qila olmaydi. Platforma quyidagi closed
event katalogini seed qiladi; school faqat enabled/disabled va ko‘rsatilgan tor
oraliqdagi qiymatni plan-version kabi policy version orqali sozlaydi. Bir event
turining takrorlanish capi va idempotency keyi majburiy.

| Server-authoritative event | Default XP | Cap / anti-farming qoidasi |
|---|---:|---|
| Required lessonni first completion | 15 | Har enrollment+lesson uchun bir marta; rewatch XP bermaydi |
| Video watch thresholdga birinchi yetish | 10 | Lesson completion bilan duplicate bo‘lmasligi uchun bitta source event ledgeri |
| Quiz/homeworkni deadlinegacha topshirish | 20 | Har assignment/submission uchun bir marta; score keyin o‘zgarsa XP qayta hisoblanmaydi |
| Teacher final score ≥ configured threshold | 10 | Har assignment uchun bir marta, faqat final server grade’dan keyin |
| Scheduled livega minimal attendance chegarasi bilan qatnashish | 15 | Har session uchun bir marta; join-leave spam durationni oshirmaydi |
| Daily qualifying action | 5 | School-local calendar kuniga bir marta; streak shu eventdan hosil bo‘ladi |
| Challenge complete | 30–100 | Challenge policyda fixed amount, faqat bir marta |
| Course complete | 100 | Active enrollment uchun bir marta; certificate bilan alohida duplicate emas |
| Teacher manual adjustment | -100…+100 | Faqat OWNER yoki assigned TEACHER, reason va evidence reference bilan; student notification oladi |

Chat message, post, comment, reaction, login, refresh, player seek, tab switch,
bir xil homeworkni qayta yuborish, self-referral yoki payment summasi XP bermaydi.
Bu qoidalar leaderboardni “eng ko‘p bosgan user” emas, haqiqiy o‘qigan student
qilishga xizmat qiladi.

#### Streak va leaderboard algoritmi

- `qualifying_day` maktab timezoneida hisoblanadi. Kunlik event 00:00–23:59 local
  intervalga tegishli; UTC bo‘yicha noto‘g‘ri chegaraga tayanilmaydi. Bir kun ichida
  nechta qualifying action bo‘lishidan qat’i nazar bittagina streak day yoziladi.
- Student keyingi calendar kunda qualifying action qilsa `current_streak +1`;
  orada bir eligible o‘quv kuni o‘tsa streak 1dan boshlanadi. `school_holidays` va
  teacher belgilagan cohort break kunlari streakni buzmaydi. “Streak freeze” P0/P1da
  yo‘q: uni sotib olish yoki reward bilan chetlab o‘tish taqiqlanadi.
- Leaderboard `COHORT` scopeida, `WEEKLY` va `ALL_TIME` davrida hisoblanadi. U
  default disabled; owner yoqsa ham faqat 13+ yoki guardian-consent policyga mos
  cohortlarda ishlaydi. Student defaultda `hidden`; u explicit opt-in qilsa,
  teacher belgilagan safe alias/avatar bilan chiqadi. Opt-out darhol rankdan
  chiqaradi, XP tarixini o‘chirmaydi.
- Tie-break: ko‘proq XP → ko‘proq completed required lessons → earlier first
  qualifying event. Studentga faqat o‘z ranki va opt-in cohort participants aliasi
  ko‘rsatiladi; to‘liq school roster, email, score yoki cross-cohort data chiqmaydi.
  Leaderboard grade, payment, referral yoki personal behavior bo‘yicha emas.

#### Challenge, badge va reward lifecycle

1. Owner/assigned teacher draft badge/challenge/reward policy yaratadi; policy
   cohort/course scope, audience, start/end, eligibility, XP/reward va daily/total
   capni oladi. Publishdan keyin version immutable; edit yangi version yaratadi.
2. Domain event (lesson complete, attendance, final grade) outboxga yoziladi.
   `GamificationProcessor` eventni school+student eligibility bilan tekshiradi,
   idempotent XP event/progress yozadi va badge/challenge conditionni baholaydi.
3. Condition bajarilsa studentga in-app/push/Telegram transactional notification
   yuboriladi. Challenge yoki badge qoidasi keyin o‘zgarsa oldingi award tarixini
   yashirincha qayta yozmaydi.
4. Reward redemption student tomonidan request qilinadi; server available XP,
   max redemption, active enrollment va catalog availabilityni bitta transactionda
   locklaydi. `PENDING_FULFILLMENT → FULFILLED|DECLINED|CANCELED` state machine;
   staff fulfillment proofini yozadi. XP faqat `FULFILLED`da burn qilinadi; reject
   yoki timeoutda hold release qilinadi.

No-go: XPni studentlar orasida transfer qilish, XPni Payme balancega aylantirish,
cashout, random paid lootbox, teacherga sovg‘a sotib berish, attendance/grade’ni
reward uchun manipulyatsiya qilish yoki rewardni avtomatik student course narxidan
chegirish qurilmaydi.

#### Abuse, fairness va audit

- Har `xp_event`da immutable source event, policy version, actor va idempotency
  key bo‘ladi. Client hech qachon `amount`, `reason` yoki `studentId`ni authority
  sifatida yubormaydi.
- Worker duplicate/out-of-order eventda unique constraint orqali no-op qiladi.
  Suspicious pattern (bir IP/device’dan ommaviy completion, impossible watch time,
  short join-leave, repeated manual adjustments) `gamification_abuse_flags`ga
  yoziladi; reward redemption holdga olinadi, lesson access esa avtomatik kesilmaydi.
- Manual XP/badge revoke va reward decision faqat OWNER yoki resourcega assigned
  TEACHER tomonidan, reason/evidence bilan amalga oshadi; studentga sabab va appeal
  yo‘li ko‘rsatiladi. Har harakat `AuditEvent`ga yoziladi. `ASSISTANT` va
  `MODERATOR` award/adjust/redeem approval qilmaydi.
- Gamification profiling va leaderboard aliasi student privacy preferenceiga
  bog‘liq. Student data exportda uning XP/badge/reward tarixini oladi; erasureda
  personal profil pseudonymize qilinadi, aggregate analytics saqlanish policyiga
  ko‘ra anonymize qilinadi.

#### API va realtime kontrakti

Tenant hostdan resolve qilingan `schoolId` client parametri bilan almashtirilmaydi.
Student APIlar faqat authenticated active student profiliga response qaytaradi:

| Endpoint | Actor | Server qoidasi |
|---|---|---|
| `GET /v1/gamification/me` | active student | Faqat callerning o‘z school profil/level/streak/badge/challenge/reward summarysi |
| `GET /v1/gamification/leaderboards/{cohortId}` | eligible student | `gamification.cohort_leaderboard`, active cohort enrollment, cohort privacy policy va opt-in filteri majburiy |
| `PATCH /v1/gamification/me/leaderboard-privacy` | active student | Faqat `hidden ↔ opt_in` hamda approved alias; boshqa student preferenceini o‘zgartira olmaydi |
| `POST /v1/gamification/rewards/{rewardId}/redemptions` | active student | Profile/reward scope, XP, inventory va capni DB lockda tekshiradi; idempotency key majburiy |
| `GET /v1/gamification/me/history` | active student | Paginatsiyalangan own immutable history; boshqa student `profileId` query qilinmaydi |
| `POST/PATCH /v1/manage/gamification/*` | owner/assigned teacher | Policy/badge/challenge/reward CRUD va publish; exact entitlement + cohort assignment + audit talab qilinadi |
| `POST /v1/manage/gamification/students/{studentMemberId}/adjustments` | owner/assigned teacher | Faqat signed delta range, mandatory reason/evidence; staffning o‘z member IDsi yoki non-student target `403` |
| `POST /v1/manage/gamification/redemptions/{id}/fulfill` | owner/assigned teacher | State transition va proof bilan; student XPni qayta yozmaydi |

`gamification:student:<schoolId>:<studentMemberId>` Socket.IO private channeli
faqat owner studentga `xp_awarded`, `level_up`, `streak_updated`, `badge_awarded`,
`challenge_completed` va redemption state eventlarini yuboradi. Cohort leaderboard
kanali faqat privacy-filterlangan public alias/rank snapshotini yuboradi; raw XP
eventlari va staff identitysi broadcast qilinmaydi.

### 4.4 Subscription tiers va entitlement katalogi

Subscription `User`ga emas, **School**ga tegishli: owner va uning staffi o‘sha
maktabning planiga bo‘ysunadi. Student coursega pul to‘lagani unga Bilgim `Pro`
yoki `Max` imtiyozini bermaydi; student faqat o‘zi to‘lagan `Enrollment` content
entitlementiga ega bo‘ladi.

Quyidagi seeded tiers implementatsiya uchun yakuniy defaultdir. Barcha sonlar
platform admin tomonidan plan versiyasi sifatida tahrirlanadi, ammo oddiy config
o‘zgarishi existing subscription snapshotini yashirincha kengaytirmaydi.

| Entitlement / limit | Free | Pro | Max | Custom |
|---|---:|---:|---:|---|
| Active schools per owner | 1 | 1 | 3 | explicit value |
| Active students per school | 30 | 300 | 2,000 | explicit value |
| Active staff (owner ham kiradi) | 1 | 5 | 20 | explicit value |
| Published courses | 2 | 25 | `-1` unlimited | explicit value |
| Active cohorts | 3 | 50 | `-1` unlimited | explicit value |
| Private media storage | 5 GB | 100 GB | 1 TB | explicit value |
| Interactive live host-hours/month | 4 | 40 | 300 | explicit value |
| Interactive live participant-minutes/month | 1,000 | 10,000 | 40,000 | explicit value |
| `live.recording` | yo‘q | 20 recording soat/month | 200 recording soat/month | explicit boolean + limit |
| AI teacher assistant | yo‘q | 300 request/month | 2,000 request/month | explicit boolean + limit |
| Community, group chat, notifications | basic | ✓ | ✓ | explicit boolean |
| Student XP, level, streak va badges | ✓ | ✓ | ✓ | explicit boolean |
| Student challenges, cohort leaderboard va rewards | yo‘q | ✓ | ✓ | explicit boolean + explicit reward caps |
| Drip/compliance, certificates, coupon | yo‘q | ✓ | ✓ | explicit boolean |
| Advanced analytics, CSV export | yo‘q | basic analytics | ✓ | explicit boolean |
| Referral | yo‘q | ✓ | ✓ | explicit boolean |
| API/integration keys | yo‘q | yo‘q | ✓ | explicit boolean |
| Custom domain | yo‘q | yo‘q | P2 feature flag yoqilgandagina ✓ | explicit boolean, global P2 flag ham talab qilinadi |

`-1` faqat serverning `UNLIMITED` sentinel qiymati; UI uni son sifatida yubormaydi.
`CUSTOM` “Maxga teng yoki undan yuqori” degani emas: subscription yaratilishida
har bir feature va har bir limit satri aniq yoziladi. Mavjud bo‘lmagan satr `false`
yoki `0`; inheritance, wildcard `*`, “admin override” va default allow yo‘q.

#### 4.4.1 Yakuniy narxlar (UZS)

Bu narxlar teacher/maktabning Bilgim SaaS obunasi uchun. Studentning course yoki
membership to‘lovi alohida `Order` bo‘lib, unga kirmaydi. Yillik tarif oldindan bir
yillik to‘langanda qo‘llanadi; u ikki oylik chegirmaga teng (16.7% chegirma)
hisoblanadi.

| Tarif | Oylik to‘lov | Yillik jami | Yillikda effective oy narxi | Kim uchun |
|---|---:|---:|---:|---|
| `FREE` | 0 so‘m | 0 so‘m | 0 so‘m | Mahsulotni sinayotgan individual teacher |
| `PRO` | **699 000 so‘m** | **6 990 000 so‘m** | **582 500 so‘m** | 300 tagacha active studentli o‘sayotgan maktab |
| `MAX` | **5 490 000 so‘m** | **54 900 000 so‘m** | **4 575 000 so‘m** | Katta o‘quv markazi yoki bir nechta maktabli teacher biznesi |
| `CUSTOM` | **8 000 000 so‘mdan / oy** | individual quote | individual quote | Korporativ/yuqori hajm, SLA yoki alohida integratsiya kerak bo‘lsa |

`CUSTOM`ning “dan” narxi kamida bir yillik shartnomadagi standard custom
configuration uchun boshlang‘ich commercial quote hisoblanadi. Har bir custom
shartnoma `school_subscription_entitlements`ning to‘liq snapshotini va alohida
narx/usage qoidalarini oladi; u Max huquqlarini avtomatik meros qilib olmaydi.

#### 4.4.2 Live xarajatini xavfsiz narxlash: ikki alohida quota

`Interactive live host-hours` darsni necha soat ochish mumkinligini, `interactive
live participant-minutes` esa real infratuzilma sarfini cheklaydi. Bitta userning
bir minut roomga ulanishi bir participant-minute: 60 minutlik darsda 20 student va
1 teacher qatnashsa, sarf `21 × 60 = 1,260` participant-minute bo‘ladi. Faqat
host-hours bilan cheklash noto‘g‘ri: masalan, 300 soatlik Max darsiga yuzlab
student kirishi mumkin va flat plan narxidan bir necha baravar video xarajati
chiqadi.

Quyidagi usage overage narxlari plan kvotasi tugagandan keyin *faqat* §4.5dagi
prepaid-usage oqimi yoqilgan Pro/Max/Custom maktablarda ishlaydi:

| Metered usage | `FREE` | `PRO` va `MAX` overage narxi | Hisoblash qoidasi |
|---|---|---:|---|
| Interactive live | hard stop | **70 so‘m / participant-minute** | har join/leave intervalining yakuniy davomiyligi; host ham participant hisoblanadi |
| Recording | mavjud emas | **300 so‘m / recorded minute** | faqat explicit approved recording Egress real ishlagan minutlar |
| Private storage | hard storage cap | **400 so‘m / GB-month** | asset byte usagei kunlik GB-daydan pro-rata hisoblanadi |
| AI teacher assistant | mavjud emas | **1 000 so‘m / request** | faqat successful provider response yoki accepted async job |

Kurs sotuviga Bilgim P0da alohida platforma foizi qo‘shmaydi. Payme/Click/Uzum
merchant fee’i providerning amaldagi shartnomasiga ko‘ra `Order` checkoutida
teacherga aniq ko‘rsatiladi yoki teacherning settlementidan yechiladi; u SaaS plan
narxi ham, Bilgim komissiyasi ham emas.

Narxlar §7dagi tanlangan **LiveKit Cloud** production arxitekturasining
konservativ tannarx bufferi bilan belgilangan. LiveKit WebRTCni participant-minute
va downstream data transfer bo‘yicha, recording/composite Egressni esa transcode
minute bo‘yicha meterlashini hujjatlashtiradi
[manba](https://kb.livekit.io/articles/3947254704-understanding-livekit-cloud-pricing).
Uning amaldagi published tarifida Ship plan 150,000 WebRTC minut va 250 GB
downstream trafficni, 600 recording/export minutni o‘z ichiga oladi; keyingi video
Egress `$0.020`/minut, WebRTC `$0.0005`/minut va downstream transfer `$0.12`/GB
[manba](https://livekit.com/pricing). Shuning uchun 200 recording-soatli Max uchun
oldingi 3.99 mln so‘m xavfsiz emas edi; yakuniy Max narxi 5.49 mln so‘m deb qabul
qilindi. R2 Standard storage `$0.015/GB-month`
[manba](https://developers.cloudflare.com/r2/pricing/). Provider yoki USD/UZS kursi
keskin o‘zgarsa, keyingi **yangi plan versioni** yaratiladi; mavjud paid
subscriptionning narxi o‘z billing periodi ichida o‘zgartirilmaydi.

### 4.5 Qat’iy access control va quota enforcement

Feature kalitlari source code’dagi closed katalogda deklaratsiya qilinadi, masalan
`live.classroom`, `live.recording`, `ai.grading`, `certificate.issue`,
`analytics.export`, `integration.api_keys`, `gamification.core`,
`gamification.challenges`, `gamification.cohort_leaderboard`,
`gamification.rewards`. Plan admini yangi arbitrary key yoki frontend-only feature
yarata olmaydi.

Har protected mutation, read va background job quyidagi aynan shu zanjirdan o‘tadi:

```text
authenticate user
  → resolve active tenant
  → require active SchoolMember + RBAC policy
  → require active SchoolSubscription
  → require exact feature entitlement
  → atomically reserve/check relevant quota
  → perform tenant-scoped domain action
  → commit usage ledger/outbox event
```

- `RequireEntitlement(featureKey)` Nest guard/decorator bo‘ladi. U subscription
  snapshotidagi `enabled=true` satrni topmasa `403 PLAN_FEATURE_NOT_INCLUDED`
  qaytaradi. Owner, teacher, assistant, platform admin yoki UI hidden-state bu
  guardni chetlab o‘tolmaydi. `PLATFORM_ADMIN` faqat support impersonation uchun
  alohida, auditli break-glass oqim bilan tenantga kiradi; u ham tenantning plan
  featureini ishlab berib yubormaydi.
- `QuotaService.reserve(featureKey, amount, resourceId)` PostgreSQL transactionda
  locklangan usage counter yoki `SELECT … FOR UPDATE` bilan ishlaydi. Concurrencyda
  ikki `Pro` request 300dan 301 AI request, 40 host-soatdan yoki 10,000
  participant-minutedan ortiq included resurs ishlata olmaydi. `-1`dan boshqa
  limit bo‘lsa reserve majburiy.
- Long-running ishlar (LiveKit room, Egress, AI job, upload) boshlanishida reserve,
  tugashida actual usage finalize qiladi; failed/cancelled job reserve’ni release
  qiladi. Workerlar ham `RequireEntitlement`ning service-level ekvivalentini
  chaqiradi — queuega job yuborish Max featureini keyin ishlatish yo‘li emas.
- Included quota tugaganida action avtomatik pullik overagega o‘tmaydi. Faqat
  `OWNER` billing sahifasida `allow_paid_overage=true`ni explicit yoqqan, narxlarni
  qabul qilgan va maktabning prepaid `usage_wallet`ida zarur reserve uchun yetarli
  UZS bo‘lsa, `QuotaService` metered overage reservatsiyasiga o‘tadi. `FREE`da bu
  yo‘l umuman mavjud emas. Wallet bo‘sh yoki owner flagni o‘chirgan bo‘lsa server
  `409 PLAN_LIMIT_REACHED` yoki `402 USAGE_CREDIT_REQUIRED` qaytaradi — dars,
  recording yoki AI yashirin qarzga yozilmaydi.
- Participant-minute join webhookida boshlanadi, leave/webhook timeoutida yakuniy
  minutga ceiling qilinadi; bir sessionning host-hours va participant-minutesi
  **ikkalasi** ham reserve/finalize qilinadi. Recording overage Egress startida
  15-minutlik reserve bilan, keyin actual minutda finalize qilinadi; keyingi
  chunkni reserve qilish uchun pul qolmasa Egress tartibli stop qilinadi va hostga
  oldindan banner yuboriladi. Storage overage kunlik GB-day hisobida walletdan
  yechiladi. AI faqat provider successful javob berganda finalize qilinadi.
- Overage narxi `subscription` snapshotiga bog‘langan immutable usage-price satri.
  Plan narxini yoki global pricing configini o‘zgartirish allaqachon faol Pro/Max
  maktabning overage narxini o‘zgartirmaydi. `CUSTOM`da ham satrlar explicit;
  missing usage-price satri overagega ruxsat emas, hard stopdir.
- Cache faqat performance uchun: key
  `entitlement:<schoolId>:<subscriptionVersion>`. Authoritative check DB
  transactionda, renewal/cancel/plan-change subscription versionni oshiradi va
  Redis cache invalidation eventini yuboradi.
- Subscription `PAST_DUE`, `CANCELED` yoki `EXPIRED` bo‘lsa new paid-plan feature
  mutationlari rad qilinadi; already-paid student lesson access bekor qilinmaydi.
  Owner read/export uchun 30 kunlik restricted billing grace UXga ega, ammo live,
  AI, new publish va recording boshlay olmaydi.
- Frontend feature flag faqat UI ko‘rinishi; server `403/409`ni yakuniy qaror deb
  oladi. Har API endpoint OpenAPI `x-required-entitlement` metadata bilan, har
  async processor esa test bilan coverage qilinadi.

Bu dizayn natijasida Pro maktab `live.recording`, API key yoki Max storage qiymatini
so‘rab yuborsa ham serverda feature/limit satri topilmaydi va action bajarilmaydi.
Xuddi shunday, Max maktab 40,000 included participant-minute tugagach ownerning
explicit prepaid ruxsatisiz 40,001-minutni ishlata olmaydi.

---

## 5. Texnik arxitektura

### 5.1 Stack va deployment

Yangi repo pnpm workspace/Turborepo bo‘ladi:

```text
apps/
  web/              Next.js App Router: root + tenant UI
  api/              NestJS modular monolith, REST/OpenAPI + Socket.IO
  mobile/           Expo React Native, P1 student app
packages/
  db/               Prisma schema, migrations, seeds
  domain/           shared pure domain types, policies, Zod schemas
  api-client/       OpenAPI-generated typed client
  ui/               accessible primitives + theme tokens
  i18n/             uz/ru/en messages
infra/
  docker/           local compose
  terraform/        Cloudflare, R2, secrets, monitoring bindings
  livekit/          only dev config; production uses LiveKit Cloud
```

- Runtime: current supported Node LTS, TypeScript strict, pnpm lockfile committed.
- Web: Next.js App Router, React Server Components public pagesda; interactive
  dashboard React Query bilan. Server Actionsga business mutation bermang: barcha
  mutatsiya API/OpenAPI orqali idempotency key bilan o‘tadi.
- API: NestJS **modular monolith**. Mikroservis qurma; clear modules + outbox +
  BullMQ workers yetarli. Websocket gateway va REST bir authorization policydan
  foydalanadi.
- Data: PostgreSQL primary, Redis (cache, rate limit, Socket.IO adapter, BullMQ),
  Cloudflare R2 (private object storage), LiveKit Cloud, transactional email
  provider, Telegram Bot API, Payme P0.
- Edge: Cloudflare proxied DNS/WAF/CDN. `A/AAAA/CNAME *` wildcard record root
  web originiga proxy bo‘ladi; exact reserved hosts wildcarddan ustun turadi. Bu
  Cloudflare DNS xatti-harakatiga mos [manba](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/).
- Containers: API/web separate deploy; migrations faqat CI release jobda bir marta
  bajariladi; app boot paytida migration qilinmaydi.

### 5.2 Host resolution va tenant request context

1. Cloudflare `Host`ni o‘zgartirmasdan web originiga yuboradi.
2. Next middleware hostni `hostname`, port va case-normalizationdan keyin tekshiradi.
3. `bilgim.uz`/`www.bilgim.uz` root surface; reserved hostlar infra; qolgan bitta
   first label tenant slug candidate.
4. Middleware server-side `GET /internal/tenant/resolve/:slug` yoki Redis-cached
   resolver orqali `School(id,status,slug)`ni oladi. Cache key `tenant:slug:<slug>`,
   TTL 60s; create/rename/suspend cache invalidation qiladi.
5. Active school bo‘lmasa tenant app 404 beradi. Marketing rootga silent redirect
   qilinmaydi, chunki typo va phishingni yashirmaslik kerak.
6. Middleware `x-bilgim-tenant-id`, `x-bilgim-tenant-slug`, `x-bilgim-request-id`
   headerini **faqat server internal rewrite**ga qo‘shadi. Public API bu headerni
   qabul qilmaydi va internetdan kelgan nusxasini strip qiladi.
7. API BFF dan `X-Internal-Signature` (timestamp + method + path + tenant id HMAC)
   bilan kelgan tenant contextni tekshiradi. Direct API requestlar hostdan tenant
   aniqlamaydi: `/v1/tenant/*` public endpointi signed context talab qiladi.
8. Har Nest request `TenantContext {schoolId, slug, requestId}`ni scoped providerga
   oladi. Repository public `findById(id)` metodi bermaydi; `findById(ctx,id)` yoki
   `where: { schoolId: ctx.schoolId, id }` majburiy.

Cookie: `__Secure-bilgim_session` va refresh cookie `Domain=.bilgim.uz`,
`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. State-changing requestda double
submit CSRF token hamda Origin allowlist tekshiriladi. Login return URL faqat
`https://*.bilgim.uz/*` allowlistga mos bo‘lsa qabul qilinadi.

### 5.3 Authorization

`User` authentication; `SchoolMember` authorization. Har requestda:

1. session/JWT active userni aniqlaydi;
2. tenant route bo‘lsa active `SchoolMember(schoolId,userId)`ni topadi;
3. policy engine action/resource ownershipini tekshiradi;
4. resource query tenant scope bilan olinadi;
5. audit talab qilinadigan mutation `AuditEvent` yozadi.

Misollar: `TEACHER` faqat biriktirilgan `CohortTeacher`dagi assignmentni grade
qiladi; `ASSISTANT` order refund qilmaydi; `STUDENT` faqat approved enrollmentdagi
lessonni ko‘radi; `MODERATOR` student bahosini ko‘rmaydi.

RBAC va subscription ikki mustaqil, ketma-ket policy qatlamidir: RBAC userning
**kim** ekanini, entitlement esa maktabning **nimaga haqli** ekanini belgilaydi.
Masalan, `OWNER` `live.recording`ni role sababli ololmaydi; `PRO`da ruxsat va
oylik recording quota bo‘lsa-yu, `TEACHER` o‘sha cohortga biriktirilmagan bo‘lsa,
u ham recordingni boshlay olmaydi.

### 5.4 Asinxron ish va eventlar

Business transaction ichida domain mutation + `OutboxEvent` atomik yoziladi.
Dispatcher eventni BullMQga publish qiladi. Queuelar: `notifications`, `media`,
`live-recording`, `ai-grading`, `progress`, `certificate`, `analytics`,
`billing-reconcile`. Har jobda `eventId`, `schoolId`, idempotency key va retry
policy bor; terminal xato DLQga va operator alertiga ketadi.

Mutatsiyalar `Idempotency-Key`ni (POST/PATCH/DELETE) qabul qiladi; scope
`schoolId:userId:method:path:key`. Payment webhooks external provider transaction
id bo‘yicha idempotent.

### 5.5 API kontrakti

- REST prefix: `https://api.bilgim.uz/v1`; OpenAPI CI da generation qilinadi.
- UI BFF `https://{slug}.bilgim.uz/api/*` cookie sessionni API bearer tokeniga
  server-side almashtiradi; browser API tokenini o‘qimaydi.
- Public school endpointlari slugdan tenantni resolver orqali oladi: masalan
  `GET /v1/public/schools/:slug/landing` va
  `GET /v1/public/schools/:slug/catalog`; landing endpoint faqat published page,
  published highlights va `PUBLIC_CONSENT` proof/testimoniallarni qaytaradi.
  `PATCH /v1/schools/me/landing`, `POST/PATCH/DELETE /v1/schools/me/landing/*`
  owner-only signed tenant context, entitlement va audit bilan ishlaydi. Private
  endpointlar signed tenant context talab qiladi.
- Account-level exception endpointi `GET /v1/account/my-schools`: faqat current
  authenticated userning minimal `MySchoolCard[]` summarysini qaytaradi; u
  `TenantContext` qabul qilmaydi, tenant resource ID ham qabul qilmaydi.
- Cursor pagination: `createdAt,id` yoki chat uchun monotonic sequence; offset
  large tablesda ishlatilmaydi.
- Xatolar: `{ code, message, requestId, fieldErrors? }`; UI `code`ga asoslanadi,
  `message` i18n fallback.
- Socket.IO namespace: `/tenant`; join vaqtida server token ichidagi `schoolId`
  va host context mosligini tekshiradi. Room nomi `school:<id>:group:<id>` yoki
  `school:<id>:live:<sessionId>`; raw global room yo‘q.

### 5.6 Bounded contextlar va majburiy route map

Nest modullari: `identity`, `schools`, `catalog`, `enrollment`, `learning`,
`homework`, `ai`, `media`, `live`, `community`, `chat`, `notifications`,
`gamification`, `billing`, `analytics`, `platform-admin`. `identity` ichidagi
`account-entry` service root `my-schools` summary/read modelini boshqaradi. Modul boshqa modulning
Prisma repositorysiga bevosita kirmaydi; public service interface yoki outbox event
orqali ishlaydi.

Tenant web route map (locale prefix ixtiyoriy, lekin canonical URL `uz`):

| Route | Kim | Vazifa |
|---|---|---|
| `/` | guest | template public school landing |
| `/` (authenticated) | active student/staff | studentni `/learn`ga, staffni `/manage`ga server-side redirect; public landing dashboardga aylanmaydi |
| `/catalog`, `/courses/[courseSlug]` | guest/student | public course vitrinasi va course detail |
| `/signup`, `/login`, `/join/[inviteToken]`, `/checkout/[orderId]` | guest/student | tenant-safe signed join intent, invite va tenant checkout |
| `/learn`, `/learn/[courseSlug]/[lessonSlug]` | student | course player, progress, drip entitlement |
| `/homework`, `/homework/[assignmentId]` | student | assignment va submission |
| `/live/[sessionId]` | entitled member | prejoin va live room |
| `/community/[spaceSlug]`, `/messages` | school member | forum/community va DM/group chat |
| `/achievements`, `/challenges`, `/rewards` | active student enrollment | faqat o‘z XP/streak/badge/challenge/rewardi; cohort leaderboard opt-in bo‘lsa shu surface ichida |
| `/calendar`, `/notifications`, `/settings/profile` | school member | individual school-context tools |
| `/manage` | owner/teacher/assistant | tenant admin dashboard |
| `/manage/courses`, `/manage/cohorts`, `/manage/lessons` | allowed staff | academic CRUD |
| `/manage/students`, `/manage/requests`, `/manage/homework` | allowed staff | roster, enrollment, grade queue |
| `/manage/live`, `/manage/community`, `/manage/analytics` | allowed staff | operations |
| `/manage/gamification` | owner yoki assigned teacher | policy, badge/challenge/reward, adjustment va fulfillment; staffning o‘yinchi profili yo‘q |
| `/manage/school`, `/manage/school/landing`, `/manage/staff`, `/manage/billing` | owner only (delegated view optional) | branding, template landing/proof content, membership, SaaS billing |

`/manage`dagi har action server policy bilan yana tekshiriladi; URLni bilish access
bermaydi. Root web route map: `/`, `/pricing`, `/about`, `/login`, `/signup`,
`/verify-email`, `/password-reset`, `/open-school/*`, `/my-schools`; `/my-schools`
faqat §2.2dagi minimal account switcher. Bundan boshqa product route yo‘q.
`admin.bilgim.uz` mutlaqo alohida Next deployment yoki host-based route group
bo‘ladi va public web bundlega admin page kiritilmaydi.

### 5.7 Permission policy matrix

| Action | Owner | Teacher | Assistant | Moderator | Student |
|---|---:|---:|---:|---:|---:|
| School brand, slug, staff owner role | ✓ | — | — | — | — |
| SaaS subscription, plan, refund approval | ✓ | — | view only | — | own receipt only |
| Course/cohort publish | ✓ | assigned only | draft/request only | — | — |
| Student approve/revoke | ✓ | assigned cohort | ✓ | — | — |
| Lesson/assignment create | ✓ | assigned cohort/course | draft only | — | — |
| Final grade / certificate issue | ✓ | assigned cohort | — | — | own result view |
| Start/end live, cohost promote | ✓ | assigned host | scheduled assist only | moderate only | join entitled only |
| Remove/mute/post moderate | ✓ | assigned cohort | — | ✓ | self delete within edit window |
| O‘z XP/streak/badge/challenge/rewardini ko‘rish yoki redeem request | — | — | — | — | ✓ (faqat o‘zi) |
| Gamification policy publish, manual adjustment, reward fulfillment | ✓ | assigned cohort only | — | — | — |
| Analytics/export | school-wide | assigned scope | roster limited | — | own data only |

`✓` noaniq superpower emas: har operation tegishli `schoolId` va resource ownership
filteri bilan bajariladi. Assistantning `draft/request only` actioni owner/teacher
publish qilmaguncha public statega o‘tolmaydi.

---

## 6. Ma’lumotlar bazasi sxemasi

### 6.1 Qoida

PostgreSQL UUID primary keylardan foydalanadi; timestamps UTC `timestamptz`.
User kiritgan local date/time `School.timezone` bilan saqlanadi va displayda
konvertatsiya qilinadi. PIIga encryption-at-rest bilan birga app-level envelope
encryption faqat zarur yuqori sezgir ustunlarda ishlatiladi. `JsonB` faqat flexible
config/payload uchun; query qilinadigan atributlar alohida column.

### 6.2 Core va identity

| Jadval | Majburiy ustunlar / constraint |
|---|---|
| `users` | `id`, citext unique `email`, `phone?`, `password_hash`, `full_name`, `avatar_asset_id?`, `locale`, `status`, `sessions_revoked_at`; global rol yo‘q |
| `sessions` | hashed refresh token, `user_id`, expiry, revoke, device/ip metadata; index `(user_id, revoked_at)` |
| `mfa_credentials`, `mfa_backup_codes` | TOTP/WebAuthn encrypted secret/public data; single-use backup hash |
| `schools` | `id`, unique citext `slug`, `name`, `status(DRAFT|ACTIVE|SUSPENDED|CLOSED)`, `owner_user_id`, `timezone`, `default_locale`, `brand_json`, `created_at`; unique owner active-school quota service bilan |
| `school_holidays` | school, local start/end date, title, published/archived; overlap validation; streak calculator va calendar shu source-of-truthdan foydalanadi |
| `school_members` | `school_id`, `user_id`, `role`, `status(INVITED|ACTIVE|SUSPENDED)`, `invited_by`, `joined_at`; PK/unique `(school_id,user_id)`, index `(user_id,status)` |
| `member_school_summaries` | `user_id`, `school_id`, `next_lesson_at?`, `unread_message_count @default(0)`, `membership_version`, `updated_at`; unique `(user_id,school_id)`, faqat root `my-schools` minimal kartasi uchun |
| `school_invites` | hashed token, target email, role, expires/accepted/revoked; unique live invite token |
| `school_domains` | `school_id`, unique citext `hostname`, `kind(PLATFORM_SUBDOMAIN|CUSTOM)`, verification/status; P1da faqat platform row yaratiladi |
| `school_landing_pages` | one-to-one `school_id`, `template(CLASSIC|MINIMAL|BOLD)`, hero/headline/CTA/FAQ/contact/SEO JSON, `is_published`, published version/time; unsafe HTML field yo‘q |
| `landing_highlights` | school, label/value, icon key, position, `is_published`; owner-defined trust metric audit bilan |
| `landing_success_stories` | school, title/body, metric label/value, student display alias/avatar asset, `consent_status`, consent timestamp, published/position; `PUBLIC_CONSENT`siz querydan ham chiqarilmaydi |
| `landing_testimonials` | school, author user? yoki external consent record, display name/initial, body, avatar asset?, course label?, consent/published/position; owner authored testimonial taqiqlangan |
| `audit_events` | `school_id?`, actor, action, entity type/id, request id, IP, previous/next redacted JSON, immutable hash chain |

`TeacherProfile` migratsiyada yo‘qolmaydi, ammo `schools.owner_user_id` va
`school_members`ga bo‘linadi. `TeacherProfile.publicSlug` → `schools.slug`;
`themeColor/headline/bio/cover` → `schools.brand_json` va owner public profile.

### 6.3 Catalog, cohort va learning access

| Jadval | Majburiy ustunlar / constraint |
|---|---|
| `courses` | `id`, `school_id`, `slug` (unique per school), title/description/level/cover, `visibility(DRAFT|PUBLIC|UNLISTED|ARCHIVED)`, owner, version; index `(school_id,visibility)` |
| `course_sections` | course, title, position, published; unique `(course_id,position)` |
| `lessons` | `school_id`, course/section, slug, type, title, position, `status`, `content_json`, estimated minutes; unique `(course_id,slug)` |
| `lesson_assets` | lesson, media asset, role, position; no external R2 URL stored as public link |
| `cohorts` | `school_id`, course, title, capacity, start/end, enrollment status, visibility, timezone; narx `pricing_offers`da versionlangan holda saqlanadi, bu jadvalda mutable `price_uzs` yo‘q |
| `cohort_teachers` | cohort/member with `PRIMARY|TEACHER`; unique pair |
| `schedule_rules`, `schedule_exceptions`, `cohort_breaks` | cohort, RRULE/start/end/local TZ, cancellation/replacement rule yoki local break date interval; streak calculator published cohort breakini eligible day emas deb oladi |
| `pricing_offers` | school, sellable target `COURSE|COHORT|MEMBERSHIP_PLAN`, immutable published version, billing model `FREE|ONE_TIME|INSTALLMENT|RECURRING_MEMBERSHIP`, UZS price/interval/trial, enrollment approval rule, availability/capacity; one active offer version per target/channel |
| `installment_schedules`, `installment_due_items` | offer/order, due date, UZS amount, state `PENDING|PAID|OVERDUE|WAIVED`; sum must equal order total; provider payment is linked to exactly one due item |
| `student_membership_plans`, `membership_plan_access` | school, title, active offer, recurring interval/trial/grace policy; explicit course/cohort grants; no “all future content” wildcard in P0 |
| `student_memberships` | school, student user, plan/offer price snapshot, state `PENDING|ACTIVE|PAST_DUE|CANCELED|EXPIRED`, starts/current period/access-until/cancel; unique active membership per student/plan; never grants cross-school access |
| `enrollments` | `school_id`, student `user_id`, course, cohort?, `status(PENDING_PAYMENT|PENDING_APPROVAL|ACTIVE|COMPLETED|REVOKED|REFUNDED)`, `access_source(ORDER|MEMBERSHIP|MANUAL|INVITE)`, membership?, activated/expires; unique active enrollment per `(student,cohort)` via partial index |
| `lesson_access` | enrollment+lesson, `available_at`, `locked_reason`, completed_at, last_position_seconds; unique pair; worker updates after events |
| `lesson_progress_events` | immutable event (watch, open, complete); dedupe source event; rollup access row |
| `attendance` | `school_id`, live/event session, enrollment/user, joined/left/duration, status; unique `(session_id,user_id)` |

### 6.4 Homework va AI

| Jadval | Majburiy ustunlar / constraint |
|---|---|
| `assignments` | `school_id`, lesson, title, instructions, due_at, max_points, rubric_json, `DRAFT|PUBLISHED|CLOSED|ARCHIVED` |
| `assignment_modules` | assignment, `type`, config JSON, position, weight; publish vaqtida server runtime mavjudligi tekshiriladi |
| `submissions` | `school_id`, assignment, enrollment/student, status, answers JSON, submitted_at, final score, final grader; unique `(assignment_id,student_id)` |
| `submission_scores` | submission/module, source `AUTO|AI_SUGGESTION|TEACHER`, score/max, breakdown, rubric version, author/job; immutable history |
| `feedback` | submission, author user/AI, visibility, rich-text sanitized body, attachment; optional final marker |
| `ai_grading_jobs` | `school_id`, submission, prompt/version/model, status, cost/token/latency, result redacted, error; idempotency unique per task/version |
| `ai_usage_ledgers` | `school_id`, user, intent, input/output tokens, cost, date; used for quota/hard cap |

`score`ni klient yozmaydi. `submissions.final_score` faqat server side transactionda
teacher accepted score yoki deterministic auto-score bilan yangilanadi. Qolgan
homework module enumlari faqat ularning server runtime’i bo‘lganda feature flag
orqali yoqiladi.

### 6.5 Payments, promotion va subscription

| Jadval | Majburiy ustunlar / constraint |
|---|---|
| `platform_plans` | platform global: immutable `code(FREE|PRO|MAX|CUSTOM_TEMPLATE)`, display, monthly/annual UZS price, currency, billing interval, plan version, active; new version creates new row, old snapshot o‘zgarmaydi |
| `plan_entitlements` | `plan_id`, closed-catalog `feature_key`, `enabled`, `limit_value?`; unique `(plan_id,feature_key)`. Har Free/Pro/Max plan barcha katalog keylari bilan seeded qilinadi, missing satr allowed emas |
| `plan_usage_prices` | `plan_id`, meter key (`live.participant_minute`, `live.recorded_minute`, `media.storage_gb_month`, `ai.request`), UZS unit price, enabled; unique `(plan_id,meter_key)`; Free’da enabled overage satri bo‘lmaydi |
| `school_subscriptions` | school, plan, state `ACTIVE|PAST_DUE|CANCELED|EXPIRED`, price snapshot, `subscription_version`, period/cancel, `allow_paid_overage`; Free row maktab yaratilganda active va expiry yo‘q; one live subscription partial unique |
| `school_subscription_entitlements` | subscription snapshot: `feature_key`, `enabled`, `limit_value?`, source plan version; `CUSTOM` uchun ham to‘liq explicit satrlar; unique `(subscription_id,feature_key)` |
| `school_subscription_usage_prices` | subscriptiondagi immutable meter/UZS price/enabled snapshot; `CUSTOM` uchun ham barcha kerakli satrlar aniq; missing satr hard stop |
| `entitlement_usage` | school/subscription/version/period/feature key, reserved/actual amount; unique `(subscription_id,period_start,feature_key)` va atomic quota counter |
| `usage_wallets`, `usage_wallet_entries` | school, currency `UZS`, available/reserved balance; top-up/hold/capture/release/refund immutable ledgeri, order/payment reference va idempotency key; negative balance DB constraint bilan taqiqlanadi |
| `usage_charges` | school/subscription, meter, quantity, unit price snapshot, amount, state `RESERVED|CAPTURED|RELEASED`, resource/session/job reference; unique idempotency key |
| `orders` | `school_id`, buyer user, purpose `STUDENT_ENROLLMENT|STUDENT_MEMBERSHIP|INSTALLMENT_DUE|SCHOOL_SUBSCRIPTION|USAGE_WALLET_TOPUP`, subtotal/discount/total UZS, status; immutable money snapshot |
| `order_items` | order, pricing offer/course/cohort/membership plan or SaaS plan snapshot, quantity, unit/total amount; course price clientdan qabul qilinmaydi |
| `payments` | order, provider `PAYME|CLICK|UZUM`, provider tx ID, state, amount, raw encrypted/redacted provider payload; unique `(provider,provider_transaction_id)` |
| `payment_events` | payment, provider event id/type, payload hash, processed at/result; external-webhook dedupe |
| `refunds` | payment/order, amount/reason/state, actor; no destructive delete |
| `membership_billing_cycles` | student membership, period, expected/paid amount, payment/order, state `SCHEDULED|PAID|FAILED|SKIPPED`, provider recurring reference?; P0da monthly invoice, P1da approved Payme recurrent debit bilan paid bo‘ladi |
| `coupons` | school, code case-insensitive unique per school, fixed/percent, limits, starts/ends, course/cohort scope |
| `coupon_redemptions` | coupon, order/user, discount; unique coupon/order and per-user limit query |
| `referral_codes`, `referral_attributions` | school + owner student code, click attribution expiry, completed paid order, granted reward; P1 only |

Provider adapter interface: `createCheckout`, `parseWebhook`, `verifyWebhook`,
`refund`, `getStatus`; P1 recurrent adapteriga `createRecurringConsent`,
`chargeRecurring`, `cancelRecurring` qo‘shiladi. Payme JSON-RPC merchant flow
[rasmiy manba](https://developer.help.paycom.uz/nastroyka-vzaimodeystviya/) P0 adapter;
Click va Uzum adapterlari shu interfacega keyin qo‘shiladi. Uzum Merchant flow
`/check → /create → /confirm` webhook state machinega ega
[manba](https://developer.uzumbank.uz/en/merchant/), shuning uchun `PaymentEvent`
modeli providerga qattiq bog‘lanmaydi. P1 recurring actioni faqat provider consent
va contract/sandbox verificationi mavjud bo‘lsa production feature flag bilan
yoqiladi; aks holda `membership_billing_cycles`dagi checkout invoice ishlaydi.

Owner overage ishlatishdan oldin `Billing → Usage credit`dan Payme orqali walletga
kamida o‘zi tanlagan summa (P0 minimum: 100 000 so‘m) top-up qiladi. Ushbu pul faqat
maktabning subscription usagei uchun ishlatiladi; student course checkout balanceiga
aralashmaydi. Overage toggle yoqishning o‘zi pul yechmaydi, ammo top-up bo‘lmasa
server overage actionni ochmaydi. Bu recurring card debit yoki muddati o‘tgan qarzga
tayangan noaniq billing oqimini P0dan chiqaradi.

### 6.6 Media, live, communication, gamification

| Jadval | Majburiy ustunlar / constraint |
|---|---|
| `media_assets` | `school_id`, owner, R2 object key, kind/mime/bytes, status, checksum, visibility, retention; index `(school_id,status)` |
| `transcode_jobs` | asset, profile, state, HLS manifest key/error; unique asset/profile active job |
| `live_sessions` | `school_id`, lesson/event, LiveKit room name unique, scheduled/start/end, state, host member, `recording_state(OFF|REQUESTED|APPROVED|RECORDING|DECLINED) @default(OFF)`, requester/approver/reason/timestamps; `OFF`da egress ID bo‘lishi mumkin emas |
| `live_participants` | session/user/guest, role, join/leave, quality aggregates; unique session/user identity |
| `recordings` | school/session, asset, egress id, state, duration, playback policy; faqat `live_sessions.recording_state=RECORDING`dan yaratiladi; immutable lifecycle |
| `community_spaces` | school, cohort?, type `SCHOOL|COHORT|ANNOUNCEMENT`, visibility, moderation policy |
| `posts`, `comments`, `post_reactions`, `polls`, `poll_options/votes` | all `school_id`; author membership; soft delete/moderation state |
| `chat_rooms`, `chat_members`, `chat_messages`, `message_reactions`, `read_cursors` | all school-scoped; room sequence cursor; DM requires two members from same school |
| `notifications`, `notification_deliveries`, `notification_preferences`, `push_devices`, `telegram_links` | school/event context, delivery state, explicit channel consent; encrypted Telegram chat ID |
| `gamification_policies` | school, immutable version, timezone, `is_active`, level-threshold JSON, daily XP cap, enabled event keys; owner publishes a new version rather than mutating history |
| `student_gamification_profiles` | `school_id`, `student_member_id`, `user_id`, state `ACTIVE|FROZEN|ARCHIVED`, lifetime XP, current level, current/best streak, last qualifying local date, leaderboard opt-in/alias; FK member role must be `STUDENT`, unique `(school_id,student_member_id)` |
| `xp_events` | school, student profile, signed/closed `event_type`, positive/negative amount, policy version, source entity/event ID, actor member?, occurred-at; unique `(school_id,idempotency_key)` and unique source-key where event is once-only; no client-authored amount |
| `streak_days` | profile, school-local date, qualifying XP event, timezone/policy version; unique `(profile_id,local_date)`; holiday/break reconciliation is reproducible |
| `badges` | school, immutable badge version, key, name/icon/criterion JSON, scope, published/revoked; unique `(school_id,key,version)`; no staff/player ownership field |
| `student_badges` | school, student profile, badge/version, awarded/revoked timestamps, source event or audit adjustment; unique active `(profile_id,badge_id)` |
| `challenges` | school, optional course/cohort, policy version, criteria JSON, XP award, starts/ends, eligibility, state `DRAFT|PUBLISHED|ENDED|ARCHIVED`; only student audience accepted |
| `challenge_progress` | challenge, student profile, criterion rollup JSON, complete/awarded timestamps, source cursor; unique `(challenge_id,profile_id)` |
| `leaderboard_periods`, `leaderboard_entries` | school + **cohort only**, period `WEEKLY|ALL_TIME`, student profile, XP/rank/tiebreak data, visibility snapshot; query only opt-in active student aliases; never school-global or staff rows |
| `reward_catalog` | school, optional cohort, name/description, non-cash fulfillment type, XP cost, inventory/per-student/month caps, active window, policy version; monetary, transferable and automatic discount types DB enumdan tashqarida |
| `reward_redemptions` | reward, student profile, XP hold/charge event, state `PENDING_FULFILLMENT|FULFILLED|DECLINED|CANCELED|EXPIRED`, request/fulfillment actor/evidence/reason; idempotency key; only `FULFILLED` XPni burn qiladi |
| `gamification_adjustments`, `gamification_abuse_flags` | student profile, signed delta/reason/evidence, actor and review state; suspicious source/threshold/device metadata; immutable audit linkage |
| `certificate_templates`, `certificates` | school/course, PDF asset, unique verify code, issue/revoke metadata |

R2 object naming: `schools/<schoolId>/<category>/<yyyy>/<mm>/<uuid>`. `schoolId`
hech qachon user-controlled string emas. Download/playback uchun API short-lived
signed URL beradi; public marketing coverlar only explicit `PUBLIC` asset policy bilan
CDNga chiqariladi.

---

## 7. Live classroom — yakuniy texnik dizayn

### 7.1 Production tanlov

Production: **LiveKit Cloud** + R2. Sabab: LiveKit Cloud UDP, TURN/UDP va TURN/TLS
fallbacklarini boshqaradi; docs bu fallback tartibini ko‘rsatadi
[manba](https://docs.livekit.io/intro/basics/connect/). Birinchi relizda bu own
TURN sertifikati, UDP port range, public IP va autoscalingni boshqarishdan ancha
ishonchli. Local devda LiveKit Docker ishlatilishi mumkin, ammo production config
unga tayanmaydi.

### 7.2 Ruxsat va session oqimi

1. Teacher tenantda lesson/eventdan live session schedule qiladi: visibility
   `ENROLLED_ONLY|COHORT_ONLY|PUBLIC_VIEW_ONLY`, start/end, waiting room,
   moderatorlar va `recording_state=OFF` bilan. Schedule yaratish recordingni
   so‘ramaydi va hech qanday recorder job yaratmaydi.
2. Start vaqtida API membership/enrollmentni tekshiradi, LiveKit roomni yaratadi,
   `live_sessions`ga provider room IDni yozadi.
3. `POST /live-sessions/:id/join` yana entitlementni tekshiradi va 15 minutlik
   LiveKit JWT beradi. Teacher `canPublish=true`; student default audio/video
   publish qila oladi faqat interactive roomda; broadcastda student audience
   `canPublish=false`. Moderator alohida permissionga ega.
4. Token `schoolId`, sessionId, user/membership identityga bog‘lanadi; boshqa
   tenant useri room nomini bilsa ham join qilolmaydi.
5. Webhook `participant_joined/left`, room ended va egress lifecycle eventlarini
   imzolangan holda qabul qiladi; attendance va recording status serverda yoziladi.

### 7.2.1 Recording request va approval state machine

Recording har bir lessonning default artifacti emas. Quyidagi state mashinadan
tashqari recorder/Egress start qilinishi taqiqlanadi:

```text
OFF
  ├─ teacher “Yozib olishni so‘rash” + explicit confirm ─→ APPROVED
  └─ entitled student “Yozib olishni so‘rash” ───────────→ REQUESTED
REQUESTED
  ├─ teacher approve ────────────────────────────────────→ APPROVED
  └─ teacher decline ────────────────────────────────────→ DECLINED
APPROVED
  ├─ teacher begins live ─────────────────────────────────→ RECORDING
  └─ teacher cancels before start ────────────────────────→ OFF
RECORDING
  └─ teacher ends live / explicitly stops ───────────────→ finalized Recording
DECLINED
  └─ new distinct request ────────────────────────────────→ REQUESTED
```

- Teacher requesti faqat `live.recording` entitlementi va qolgan recording quota
  bo‘lsa `APPROVED` bo‘ladi. UI confirm dialogida retention/policy ko‘rsatiladi;
  event auditga yoziladi.
- Student requesti studentga recordingni majburlash huquqini bermaydi. U owner
  yoki session hostga notification yuboradi; faqat hostning explicit approve’i
  recordingni yoqadi. Bu request faqat school planida `live.recording` mavjud
  bo‘lsa ko‘rsatiladi.
- `APPROVED` faqat preflight; actual Egress `RECORDING`ga o‘tganida start qilinadi
  va recording-hour quota atomik reserve qilinadi. Quota tugagan bo‘lsa state
  `OFF`ga qaytadi va `PLAN_LIMIT_REACHED` ko‘rsatiladi — yoki §4.5dagi explicit
  prepaid overage ruxsati hamda 15-minutlik wallet reserve mavjud bo‘lsa metered
  recording boshlanadi. `FREE` recordingni hech qachon yoqa olmaydi.
- `RECORDING`ga o‘tishdan oldin barcha mavjud participantlarga aniq banner/modal:
  “Bu dars yozib olinmoqda”, owner, maqsad va retention muddati ko‘rsatiladi.
  Qo‘shiladigan participant ham join preflightda shu disclosure’ni ko‘radi va
  davom etish uchun acknowledge qiladi. Acknowledge `LiveParticipant`da saqlanadi.
- Teacher `RECORDING`ni stop qilsa Egress finalizatsiya bo‘ladi; keyingi qismni
  yozish uchun yana explicit request/approval kerak. Session endidagi no-op state
  (`OFF`, `REQUESTED`, `DECLINED`, `APPROVED`) hech qachon recording yaratmaydi.
- Recording request, approve/decline, start/stop, participant acknowledgment,
  download/delete/revoke — hammasi immutable `AuditEvent`da.

### 7.3 Sifat profillari va ABR

| Holat | Publish | Subscribe | UI xatti-harakati |
|---|---|---|---|
| Default interactive class | Camera 720p30 simulcast 180/360/720; Opus audio yoqilgan | adaptive stream + dynacast | Recommended; sifat avtomatik |
| Teacher screen share | 1080p15–30, text priority | Sharer spotlight, boshqa video 180/360 | Screen share recordingda asosiy panel |
| High quality recording | Teacher yuqori qatlamni publish qila olsa 1080p30 | Viewer ABR mustaqil | Egress 1080p30 4500 kbps; source layer mavjudligi telemetry bilan tekshiriladi |
| Low bandwidth | 360p yoki audio-only | video opt-in | “Bandwidth saver” va reconnect action |
| Public webinar | Host/cohost publish, guest view-only | adaptive | Chat/Q&A optional, no guest camera |

Doimiy 1080pni barcha mobil userga majburlama: u upstreamni yutadi va klass sifati
pasayadi. 720p classroom default, screen share va recordingda quality ladder
server/client telemetry asosida tanlanadi. `audio={false}` kabi flag taqiqlanadi:
audio device pre-joinda user tomonidan yoqiladi va publish state UI indicator bilan
tekshiriladi.

### 7.4 Live feature set

- Device/browser/network preflight (camera, mic, selected device, uplink estimate,
  relay required warning).
- Teacher: start/end, screen share, whiteboard, cohost, mute/remove, waiting room,
  chat/Q&A moderation, spotlight, **recording request/approve/start/stop**. Record
  tugmasi default off va entitlement bo‘lmasa ko‘rinmaydi.
- Student: join, audio/video toggle interactive classda, hand raise, reactions,
  Q&A upvote, chat, screen share view, reconnect. No unmoderated file upload.
- Live Q&A chatdan ajralgan entity: question, upvote, answered/dismissed, spotlight.
- Recording: faqat `RECORDING` stateida `RoomComposite Egress` → MP4 + HLS segmented
  output R2ga; speaker layoutda screen share primary. LiveKit Egress HLS/MP4/RTMP/SRT
  outputlarni qo‘llaydi [manba](https://docs.livekit.io/transport/media/ingress-egress/egress/outputs/).
- Recording job complete bo‘lsa media pipeline poster, captions/transcript (P1),
  signed HLS va lessonga attachment yaratadi.
- Faqat approved recording yaratilgandan keyin default retention 180 kun qo‘llanadi;
  owner per-school policy 30/90/180/365 kun tanlaydi; delete schedule background
  job bilan, legal hold bo‘lsa o‘chmaydi.

### 7.5 Observability va quality SLO

Frontend har 15 soniyada anonymous aggregate client metric yuboradi: connection
state, RTT, packet loss, jitter, selected layer, publish bitrate, reconnect count,
device/browser/network type. PII/audio/video yuborilmaydi.

SLOlar:

- join success ≥ 99.0% (15 daqiqalik intervalda);
- p95 join < 8 s;
- roomdagi participantning p95 reconnect < 10 s;
- `RECORDING` stateiga o‘tgan sessionlarda recording completion ≥ 99.0%;
- 24 soatda failed egress > 1% bo‘lsa alert.

Live dashboard tenantda session, attendance, chat/Q&A export, recording, quality
issues va egress errorni ko‘rsatadi. Bu Circle’dagi live admin modeliga o‘xshash,
ammo Bilgimda ownerning o‘z tenantigina ko‘rinadi [manba](https://help.circle.so/p/live-and-events/live-management/utilizing-the-live-dashboard).

---

## 8. Dizayn tizimi va UX qoidalari

### 8.1 Tenant product tema

- Canvas: `#0A0A0F`; elevated surface: `#12121A`; border: `#232332`;
  primary text: `#F5F5F7`; muted text: `#A1A1B5`; accent: `#6C63FF`;
  success: `#36D399`; warning: `#FBBF24`; danger: `#FB7185`.
- Font: Geist Sans UI/headline, Geist Mono ids/code/metric. Fallback sistem fontlar.
- Ikonalar: **faqat `lucide-react`**. Emoji icon, mixed icon libraries, custom
  random SVG icon packs ishlatilmaydi. Mascot illustration icon emas.
- Layout: desktop left sidebar + top contextual bar; mobile bottom nav student
  uchun. Max content width 1440px, 8px spacing scale, radius 12/16/24, keyboard
  focus ring accent rangida.
- Cardlar yengil 1px border, qat’iy hierarchy; ortiqcha glassmorphism/gradient,
  neon va dekorativ motion ishlatilmaydi. Motion faqat state transition va
  accessibility `prefers-reduced-motion`ga bo‘ysunadi.
- Color semantic token bilan ishlatiladi (`--surface`, `--text`, `--accent`),
  komponent ichida hex hardcode qilinmaydi.

### 8.1.1 Tenant public landing visual contract

`slug.bilgim.uz` guest landing’i dashboardning sidebar/cardlarini ko‘chirmaydi.
U teacherning professionalligi va student proofini ko‘rsatadigan editorial landing:
katta hero portrait/cover, o‘qilishi oson result/testimonial cards, course CTA va
mobile sticky enroll CTA. `CLASSIC`, `MINIMAL`, `BOLD` template’lari shu dark
purple token bazasidan foydalanadi; owner accent rang, logo va image tanlaydi,
ammo low-contrast rang, arbitrary font yoki cheksiz layout/scripting bilan brendni
buza olmaydi. Student success story va testimoniallarda consent badge yoki
anonymized display ko‘rsatiladi.

### 8.2 Root marketing tema

Root landing tenant dashboardga o‘xshamasin: dark premium canvas, lime-green va
purple CTA accents, Geist, katta editorial headinglar, Bilgim mascot
illustratsiyalari, bento proof/feature cards va qisqa product mockuplar. Root
o‘qituvchini “maktabingizni oching”ga olib boradi; global course feed yaratmaydi.

Lime faqat conversion/highlight uchun; katta textda WCAG kontrastni buzmasin.
Hero, plan, testimonial, FAQ, CTA bloklari server-rendered va SEO-friendly bo‘ladi.

### 8.3 Design system deliverables

`@bilgim/ui` quyidagilarni beradi: Button, IconButton, Input, Select, Combobox,
Textarea, Dialog, Drawer, Dropdown, Tabs, Tooltip, DataTable, Badge, EmptyState,
Skeleton, Toast, FormField, StatusPill, Progress, Avatar, Calendar, Chart wrapper.
Har komponent keyboard, focus trap, ARIA label, error state, loading/disabled state
va dark contrast testiga ega bo‘ladi.

Page-level UX:

- Owner dashboard: today schedule, pending payments/requests, attention-needed
  learners, homework to grade, upcoming live.
- Student dashboard: continue learning, today task, upcoming live, progress,
  streak; marketing yoki admin metric yo‘q.
- Empty states userni keyingi eng muhim actionga olib boradi; “bo‘sh jadval” emas.
- Destructive action confirm dialog va consequence textga ega; delete policy
  soft-delete/archiving bo‘yicha entityga mos.

`bilgim.0-0`dagi skillsni ko‘ra olmaganimiz sabab ulardan “olingan” aniq qoida
deb da’vo qilinmaydi. Ular ochilsa, visual audit uchta savol bilan cheklanadi:
brand palette, layout/typography, interaction restraint. Ularning hech biri
yuqoridagi accessibility/tenant qoidalarini zaiflashtirmaydi.

---

## 9. Xavfsizlik, maxfiylik va reliability

- Password Argon2id; email verification; refresh rotation/reuse detection; all
  session revoke on password reset/suspension; optional MFA, owner uchun mandatory
  MFA P1.
- CSP nonce, Helmet, strict CORS (root + active tenant hosts), CSRF, request body
  limits, Zod validation, HTML sanitize, R2 upload mime/size/antivirus queue.
- Rate limits: auth by IP+identifier, AI by school+user, chat by membership,
  payments/webhooks provider specific. CAPTCHA only signup/checkout abuse signaldan
  keyin, normal studentga doimiy barrier emas.
- Audit: billing/subscription change, entitlement denial/override attempt, role
  change, student revoke, grade finalization, recording request/approve/start/stop,
  download/delete, data export/erasure va admin access.
- Backup: encrypted PostgreSQL PITR + daily logical backup; R2 versioning/lifecycle;
  restore drill quarterly. RPO 24h, RTO 4h boshlang‘ich target.
- Privacy: studentga media/AI data consent; minor uchun account creationda guardian
  consent modelining legal texti; Telegram marketing opt-in alohida; unsubscribe
  darhol respect qilinadi.
- AI: prompt injectionga qarshi user material untrusted; system instruction user
  inputdan ajratiladi, tool execution yo‘q, all model output sanitize/render
  plain-text/structured JSON schema bilan validate.
- Sentry error + OpenTelemetry trace; trace `requestId`, `schoolId` (hashed/redacted
  external log policy), user id; password/token/message body logga yozilmaydi.

---

## 10. Eski tizimdan migratsiya va cutover

### 10.1 Mapping

| Eski model | Yangi model |
|---|---|
| `User` | `users`; global role migrationda faqat initial membership rolega signal; importdan keyin har active membership uchun `member_school_summaries` backfill qilinadi |
| `TeacherProfile` | owner `SchoolMember` + `schools` brand/public fields |
| `TeacherProfile.publicSlug` | `schools.slug`; null slug owner uchun deterministic available slug bilan wizard pending |
| `Course.teacherId` | `courses.school_id` va owner/teacher relation |
| `Group` | `cohorts`; price/capacity/schedule migratsiya qilinadi |
| `Lesson`, `Attachment`, `MediaAsset` | `lessons`, `lesson_assets`, `media_assets`; R2 object inventory/checksum bilan |
| `Enrollment`/request/invite | `enrollments`, `school_invites` yoki archived historical enrollment |
| `Assignment`/module/submission/feedback | yangi homework tables; opaque runtime submission legacy/read-only bo‘ladi |
| `LiveSession`, `Recording`, participants | history-only `live_sessions`, `recordings`, `attendance`; old LiveKit room qayta ishlatilmaydi |
| subscription/invoice/Payme tx | `school_subscriptions`, explicit entitlement snapshotlari, `orders`, `payments`, `payment_events`; legacy plan mapping topilmasa `FREE`ga tushadi, hech qachon Pro/Maxga avtomatik ko‘tarilmaydi |
| gamification global profile/event | Faqat source eventdan `school_id` va active `STUDENT` membership aniq topilgan XP/badge/challenge tarixigina `student_gamification_profiles`/`xp_events`ga import qilinadi; teacher/staff profile yoki ambiguous/global XP `LEGACY` read-only archivega ketadi, leaderboard/reward redemption import qilinmaydi |
| DM/group chat | faqat aniq school/groupga tegishli roomlar import; ambiguous cross-tenant DM import qilinmaydi |

### 10.2 Buyruq ketma-ketligi

1. Legacy DB va R2 read-only snapshot ol; schema/data count/checksum manifest yarat.
2. New production infra, migration DB, monitoring va secretsni tayyorla; empty
   stagingga sanitized snapshot import qil.
3. `legacy_id_map` table bilan transform scriptsni idempotent yoz; har source row
   key `(source_table,source_id)` bilan bir marta import bo‘ladi.
4. Users → schools/members → catalog/cohorts → assets → enrollments → homework →
   billing history → communication/gamification tartibida import qil.
5. Per-table count, money total, active enrollment count, asset checksum va sampled
   permission testlarini legacy bilan solishtir; mismatch 0 bo‘lmaguncha cutover yo‘q.
6. Pilot 3 maktab bilan staging/prod feature flagda parallel acceptance test qil.
7. Maintenance window: legacy write freeze, final incremental export/import,
   verification, wildcard DNS switch, user communication.
8. 14 kun legacy read-only rollback window. Agar P0 bug chiqsa DNS eski appga emas,
   maintenance pagega olinadi; allaqachon yangi payment yozilgan bo‘lsa split-brain
   bo‘lmasligi uchun data rollback qilinmaydi, forward fix qilinadi.

### 10.3 Migratsiya uchun qat’iy testlar

- har `publicSlug` exactly bitta active Schoolga aylanadi yoki collision report;
- har active enrollmentning target cohort/course/schooli bor;
- paid legacy invoice total va payment total invariantlari saqlanadi;
- R2 object count/checksum hamda asset authorization ishlaydi;
- legacy student boshqa school asset/lesson/chatga kira olmaydi;
- no source secret/refresh token/password hash log/exportga kirmaydi.

---

## 11. Amalga oshirish rejasi va exit criteria

### Faza 0 — poydevor (1–2 hafta)

Yangi repo, CI/CD, branch protection, conventional commits, secret manager,
environment schema, Docker local stack, Prisma, test DB, lint/typecheck, OpenAPI,
Playwright, Sentry/OTel, backup va security baseline.

**Exit:** blank app deploy, health/metrics, DB migration, R2 signed-upload smoke,
authenticated test user, CI green; secrets repo yoki logda yo‘q.

### Faza 1 — identity va tenant core (2–3 hafta)

Global auth, verify/reset/MFA skeleton; `School`, `SchoolMember`, `My Schools`
entry resolver/summary read model, provisioning wizard, wildcard routing/resolver,
tenant BFF signature, RBAC, settings/brand.

**Exit:** teacher rootda maktab yaratadi; `slug.bilgim.uz`ga qaytadi; other tenant
URL/API/websocket resourceiga 404/403; bitta membership root loginidan to‘g‘ri
subdomenga auto-redirect, ikki membership esa `/my-schools`dagi minimal kartalarga
chiqadi; Playwright tenant isolation suite green.

### Faza 2 — academic core va storefront (3–4 hafta)

Three-template tenant landing editor/public renderer, consent-safe results and
testimonials, courses/cohorts/lessons/media, schedule, signed visitor
register/login/join conversion, versioned free/one-time/installment pricing offers,
enrollment/invite, student/teacher dashboards, progress/access/drip foundations.

**Exit:** guest `slug.bilgim.uz`da teacher landing, public courses va faqat
consented results/testimonialsni ko‘radi; CTA → signup/login → tenant enrollment
request/pay → teacher approve → student protected lesson flow to‘liq E2E; R2 asset
cross-tenant test green.

### Faza 3 — subscription, payments va notifications (2–3 hafta)

Free/Pro/Max/Custom plan versionlari va §4.4.1dagi UZS narx snapshotlari, explicit
subscription entitlement snapshotlari, server guard/quota ledger, host-hours +
participant-minutes dual live meterlari, prepaid usage wallet/overage ledger,
order/payment state machines, Payme adapter/webhook, coupon, receipt, one-time va
installment enrollment activation, school-scoped student membershipning invoice
cycle/access expiry qoidasi, in-app/email/Telegram linking/reminders.

**Exit:** Payme sandboxdan duplicate/out-of-order webhooklar bilan order exactly
once processed; failed/cancel/refund state tests; Pro userining har bir Max-only
REST/socket/worker actioni `PLAN_FEATURE_NOT_INCLUDED` bilan rad etiladi;
concurrent quota testlari green; participant-minute hisobida ham hard cap va
prepaid overage reservation testlari green; payment→enrollment E2E green; Aziz
membershipi Nodira tenantiga access bermasligi hamda overdue installment accessni
faqat own school policy bo‘yicha yopishi green.

### Faza 4 — homework, AI va student core gamification (3–4 hafta)

All enabled server runtimes, submissions, rubric/feedback, AI jobs/quota/cost,
progress rollups hamda student-only gamificationning P0 qismi: eligibility guard,
immutable XP ledger, level/streak calculator, seeded badges, student dashboard,
privacy preference va auditli manual adjustment. Teacher/staff uchun player profile
yaratilmaydi.

**Exit:** client `score=100` yoki `xp=100` yuborsa server ignore qiladi; every
module config/answer property tests; AI cap va teacher override testlari; teacher,
assistant, moderator va admin uchun gamification player APIlari `403`; bir student
ikki maktabda mustaqil XP/streakga ega; duplicate/out-of-order source event XPni
ikki marta yozmaydi.

### Faza 5 — live classroom (2–3 hafta)

LiveKit Cloud project, secure token/webhook, prejoin, ABR profiles, chat/Q&A/
whiteboard/moderation, attendance, default-off recording request/approval state
machine, Egress → R2/HLS, telemetry dashboard.

**Exit:** 10 teacher/100 student scripted load; TURN relay test; audio/video/screen
share/reconnect E2E; `OFF` va declined sessionda egress/recording 0 ta; student
requesti teacher approvalsiz yozuv boshlamasligi; approved recording HLS signed
playback works.

### Faza 6 — P1 learning engagement va advanced student gamification (3–4 hafta)

Community spaces/posts/polls, drip/compliance, certificate verify, RSVP/events,
referral, Expo student app/push, advanced analytics hamda Pro/Max student
challenges, opt-in cohort leaderboard va non-cash reward redemption/fulfillment.

**Exit:** drip unlock deterministic test, certificate verify/revoke, moderation,
push deep link tenant validation, mobile smoke suite; leaderboardda faqat opt-in
active student aliaslari; reward XP hold/capture/release exact-once; staff hech
qachon rank yoki reward recipient sifatida chiqmaydi.

### Faza 7 — migration, pilot va launch (2–3 hafta)

Mapping scripts, shadow import, pilot, reconciliation, training/support material,
cutover and incident runbooks.

**Exit:** §10 checks all pass, three pilot owners sign off, P0/P1 security review,
load test, restore drill, launch go/no-go checklist signed by operator.

---

## 12. Test strategiyasi

| Qatlam | Majburiy test |
|---|---|
| Unit | domain state machine, RBAC+entitlement guard, tenant resolver, score runtime, payment adapter, recording request flow, XP policy/streak/level/reward state machine |
| Property | no double XP/payment/enrollment/usage charge; only active `STUDENT` membership can receive XP; tenant scope; coupon/quota limit; score range; idempotency; participant-minute/recording reserve accuracy; Pro hech qachon Max feature/limitga chiqmasligi |
| Integration | PostgreSQL real constraints/migrations, Redis/BullMQ, R2 signed route, Payme fixtures, LiveKit token webhook verification |
| API contract | OpenAPI generated client breaking-change check |
| E2E | teacher creates school; template landing publish/preview; unconsented result/testimonial invisibility; visitor CTA → signup/login → free/one-time/installment tenant enrollment; school-scoped student membership access/expiry; Free/Pro/Max/Custom entitlement matrix va UZS price snapshot; single-school auto-redirect; multi-school `my-schools` cards; course progress; homework grade; live join; recording request/approval; included participant-minute hard cap; owner-funded overage; student-only XP/streak/badge; two-school XP isolation; staff player-API denial; opt-in cohort leaderboard; reward fulfillment; tenant isolation; role permissions |
| Load | signup/tenant resolve, course/player, websocket chat, 100-participant live simulator, provider retry flood |
| Security | OWASP auth/IDOR/CSRF/CSP/upload, dependency scan, secret scan, permission regression |
| Accessibility | keyboard-only, screen reader semantic smoke, contrast and reduced-motion for every core screen |

No phase unit/typecheck bilan “tayyor” deyilmaydi; u o‘z exit criteria E2E va
security/reliability tekshiruvini ham o‘tishi kerak.

---

## 13. Ochiq savollar — kodni bloklamaydigan biznes tasdiqlari

Quyidagilar uchun bu hujjatdagi default bilan qurishni boshlash kerak; owner keyin
qarorni o‘zgartirsa config/data orqali yangilanadi. Agent bu savollarni kutib
turmaydi.

| Savol | Default implementatsiya | Inson tasdiqlashi kerak bo‘lgan narsa |
|---|---|---|
| Bilgim plan narxi | §4.4.1dagi `FREE=0`, `PRO=699 000`, `MAX=5 490 000`, `CUSTOM=8 000 000 so‘mdan`; barcha quota/usage narxi subscription snapshotida immutable | VAT/fiskal receipt va price-review mas’uli |
| Payment merchant of record | Bilgim merchant-of-record; teacher revenue order ledgerda alohida | Huquqiy shaxs va teacher payout/commission modeli |
| Voyaga yetmaganlar | DOB optional, guardian consent required flag va privacy copy placeholder | Yosh chegarasi, parent consent legal matni, retention qonuni |
| AI provider | Anthropic adapter, hard per-school budget, AI feature opt-in | Model/region va oyma-oy AI budget |
| Live provider | LiveKit Cloud production | Contract/region/cost ceiling |
| Telegram | Bitta Bilgim bot, signed `/start` linking, transactional opt-in | Bot nomi, support owner, marketing consent policy |
| Ko‘p til | `uz` default, `ru/en` schemas/messages | Professional translation/brand voice |
| Certificate validity | `verify.<school slug>.bilgim.uz/c/<code>` public minimal page, revoke state | Legal/accreditation wording |
| Custom domain | Data model ready, UI disabled | P2 budget va Cloudflare SaaS contract |

Bu jadval “keyin hal qilinadi” degani emas: defaultlar implementatsiya uchun
yetarli va configuration orqali boshqariladi. Noaniq biznes qarori sabab tenant
architecture, payment idempotency yoki user access hech qachon qoldirilmaydi.

---

## 14. Rasmiy tadqiqot manbalari

- [Teachable: course compliance, certificates, progress, coupons va referrals](https://support.teachable.com/en/articles/11682410-new-teachable-plans-in-june-2025)
- [Thinkific: drip release qoidalari](https://support.thinkific.com/hc/en-us/articles/360030741033-Drip-Schedule)
- [Thinkific mobile: student push/community expectations](https://support.thinkific.com/hc/en-us/articles/13489267385111-Mobile-Only-Features)
- [Circle: community/course/chat/email/live/event platform modeli](https://help.circle.so/)
- [Circle Live: cohost, moderation, Q&A, 1080p va recording](https://help.circle.so/p/live-and-events/live-setup/circle-live-overview)
- [Skool: group-scoped points, levels va leaderboard](https://help.skool.com/article/183-how-do-points-and-level-work)
- [Kajabi: tracked commission affiliate modeli](https://help.kajabi.com/articles/sales/affiliates/affiliates-overview)
- [Cloudflare: wildcard DNS va certificate cheklovlari](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/)
- [LiveKit: connection fallback/TURN](https://docs.livekit.io/intro/basics/connect/)
- [LiveKit: egress output va 1080p preset](https://docs.livekit.io/reference/other/egress/api/)
- [Payme Business: merchant JSON-RPC interaction](https://developer.help.paycom.uz/nastroyka-vzaimodeystviya/)
- [Uzum Bank: Merchant payment state flow](https://developer.uzumbank.uz/en/merchant/)
