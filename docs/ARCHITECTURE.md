# Vardiyum — Teknik Mimari (Taslak)

**Tarih:** 2026-11-15  
**Durum:** Uygulanmamış mimari tasarım; sürüm uyumlulukları proje kurulurken doğrulanacak.

## Mimari ilkeler

1. **Offline-first:** vardiya, rutin, görev tamamlamaları ve kazanç çevrimdışı çalışır.
2. **Tek mobil kod tabanı:** React Native + Expo + TypeScript ile iOS/Android.
3. **Saf domain motorları:** hesaplama kodu UI, ağ ve veri deposundan bağımsızdır; deterministik test edilebilir.
4. **Yerel kaynak veri:** ilk sürüm SQLite kayıtları kaynak kabul edilir; gelecekteki Supabase isteğe bağlıdır.
5. **Doğrulanabilirlik:** Plan ile gerçekleşen çalışma; dönem tahmini ile gerçek bordro birbirinden ayrılır.
6. **Güvenlik ve gizlilik:** minimum veri toplama, dışa aktarmada açık kullanıcı eylemi, gizli bilgi asla git içine konmaz.

## Planlanan araçlar

| Katman | Aday | Not |
| --- | --- | --- |
| Çerçeve | React Native + Expo + TypeScript | SDK ve mağaza hedefleri uygulama anında teyit edilecek |
| Navigasyon | Expo Router | Dosya bazlı yönlendirme |
| Yerel veri | expo-sqlite | Şema migrasyonları ve yedekleme şart |
| UI state | Zustand | Kısa ömürlü ekran durumu |
| Veri sözleşmeleri | Zod | Depolanan ve alınan verilerin doğrulanması |
| Bildirim | expo-notifications | İşletim sistemi sınırlamaları altında |
| Çoklu dil | expo-localization + i18next | tr/en, saat ve para yerelleştirme |
| Test | Vitest ve mobil E2E (Maestro aday) | Native çalışma uyumluluğu doğrulanacak |
| CI | GitHub Actions | Lint, typecheck, unit test, build kontrolü |
| Derleme/yayın | Expo EAS (aday) | Geliştirici hesapları ayrıca gerekli |
| Sonraki sürüm | Supabase (aday) | Opsiyonel kullanıcı hesabı + senkronizasyon |

İlk MVP için ayrı API sunucusu ve sürekli çalışan backend **öngörülmüyor**.

## Önerilen modüler yapı

- src/app: ekranlar ve Expo Router
- src/components: tekrar kullanılan UI parçaları
- src/features/{onboarding,calendar,shifts,routines,earnings,settings}: özellik bazlı UI ve use-case
- src/domain/{shift-engine,routine-engine,earnings-engine}: saf iş kuralları
- src/data/{sqlite,repositories,migrations}: yerel kalıcılık
- src/services/{notifications,backup}: platform servisleri
- src/i18n, src/theme
- tests: unit, integration ve E2E senaryoları
- docs: ürün, kararlar, mimari, devir ve durum

## Mantıksal veri modeli

| Varlık / tablo | Ana alanlar / sorumluluk |
| --- | --- |
| shift_templates | id, name, color, starts_at_local, ends_at_local, end_day_offset, is_rest_day |
| shift_patterns | id, name, anchor_local_date, timezone_id, active/revision metadata |
| pattern_days | pattern_id, offset_index, shift_template_id |
| day_overrides | local_date, override_kind, shift_template_id?, note; tek günlük istisna |
| routine_rules | id, name, enabled, recurrence_selector, optional_shift_id, reminder |
| task_completions | id, rule_id, local_date, completed_at |
| work_entries | id, date, actual_start/end, worked_minutes, kind (regular/overtime/etc.) |
| compensation_profiles | id, effective_from, payment_model, currency, base/rate, rule config |
| pay_adjustments | id, applicable_period, kind, amount_minor_units, note |
| notification_preferences | reminder_offset, enabled, timezone-aware rules |
| app_settings | locale, time format, currency, theme, backup preferences |

Bu tablo isimleri öneridir; gerçek SQLite migrasyonu ile kesinleşecek. Foreign key, index, unique constraint, veri yaşam döngüsü ve veri taşıma testleri geliştirme sırasında tanımlanacak.

## Vardiya hesaplama sözleşmesi

- Vardiya şablonu yerel başlangıç saati ve gerekirse bir sonraki takvim günündeki bitişiyle saklanır.
- Bir takvim günü için: index = positive_mod(day_difference(local_date, anchor_local_date), pattern_length). İlgili pattern_days kaydı seçilir.
- Aynı gün için day_overrides varsa **istisna, düzenli döngünün önüne geçer**.
- Haftanın günü, döngü indeksi ve vardiya türü birbirinden ayrı kavramlardır.
- Gece yarısını aşan vardiyanın başlangıç günü, vardiyanın takvimde ilişkilendirildiği gündür. Gerçek zaman aralığı saat dilimiyle hesaplanır.
- Tarih farkı **UTC milisaniyesini 86_400_000'e bölerek** yapılmaz; takvim günü hesabı kullanılır. Yaz/kış saati ve zaman dilimi değişiklikleri test edilir.
- Uzun süreli geleceği db satırlarıyla doldurmak yerine görünür zaman aralıkları talep üzerine hesaplanır.
- İstisna girişi vardiya döngüsünün sonraki indekslerini kaydırmaz.
- Zaman dilimi seyahati, farklı ülkeler ve DST geçişleri için ürün davranışı implementasyondan önce açıkça kararlaştırılır.

## Rutin kural motoru

- Kural filtreleri: vardiya türü, haftanın günü, döngü günü veya basit günlük tekrar; birleştirme (AND/OR) davranışı UI'de açık olmalı.
- Aynı kural aynı yerel gün için tek görev örneği olarak görünür.
- Tamamlanma kaydı kural değişse bile geçmişte korunur.
- Kuralların düzenlenmesi ve silinmesi geçmiş ilerleme açısından açık politikaya tabi olmalı.

## Kazanç hesaplama motoru

- **Tahmin**, resmi bordro değil; hesaplanan satırların kaynağı ve yöntemi kullanıcıya gösterilir.
- Sabit aylık veya saatlik ücret; fazla mesai katsayıları, prim ve manuel kesinti desteklenecek.
- Paralar küçük tam sayı birimleri (örn. kuruş) veya hassas ondalık aritmetik ile işlenecek; ikili float toplamlarından kaçınılacak.
- Ücret kuralı ve oranı için geçerlilik tarihi / snapshot kullanılacak.
- Planlanan vardiya ile gerçekleşen çalışma farklıdır; yalnızca uygun kaynağa göre hesap yapılır.
- Ülkeye özgü vergi, SGK, resmi tatil, ücret katsayıları **varsayılan doğruymuş gibi sabitlenmeyecek**. İlk sürümde kullanıcı girdisiyle açık tahmin.
- Dönem sınırı, para birimi, ara yuvarlama, manuel prim/kesinti ve sıfır çalışma ayrı test edilir.

## Yerel bildirimlerin yönetimi

- Kullanıcı izni alındıktan sonra kısa ileri dönem için planla; düzen değiştiğinde etkilenen bildirimleri iptal/yeniden oluştur.
- Her alarm için kayıt kimliği ve idempotent yenileme stratejisi.
- Uygulama açılışı, zaman dilimi/ayar değişikliği ve cihaz yeniden başlama senaryoları kontrol edilir.
- OS kısıtları nedeniyle **tam zamanında çalışma garantisi** verilmez; reddedilen izin için uygulama içi görünür hatırlatmalar kalır.

## Yedekleme, migrasyon, gizlilik

- İlk sürümde kullanıcı kontrollü dışa aktarma / içe alma; format sürümlü olmalı.
- İçerik doğrulama, bozuk dosyada güvenli hata, çakışma stratejisi ve geri alma senaryoları test edilmeli.
- Sürüm yükseltmelerinde SQLite migrasyon testleri ve veri bütünlüğü kontrolleri.
- Gelecekte hesap ve senkronizasyon eklense bile temel deneyim yerel çalışmaya devam eder.
- Analitik seçilirse ücret/çalışma ayrıntıları kimliksizleştirilmeden otomatik gönderilmez.

## Başlamadan önce netleştirilecek teknik açık noktalar

- İstisna vs izin vs gerçekleşen çalışma düzenleme UX'i
- Zaman dilimi hareketliliğinde başlangıç referansı
- Rutin kurallarındaki eşleştirme mantığı ve tamamlanma geçmişi
- Local-only yedekleme şifrelemesi ve paylaşım/ithalat akışı
- Maaş dönem başlangıcı ve açık katsayı editörü
- Expo SDK, native test ve EAS sürüm uyumluluğu

## Uygulanan Faz 2 değişiklikleri — PR #5 (2026-11-15)

- SQLite sürüm 1'den **2'ye** geçiş, `shift_templates.break_minutes` sütununu ekler, mevcut satırları `INSERT OR IGNORE` ile koruyarak varsayılan sabah/akşam/gece/izin türlerini gerektiğinde tohumlar; önceki pattern/override kayıtlarına dokunmaz.
- `ShiftTemplate`: sabit tanımlayıcı, görünen ad, renk, yerel başlangıç/bitiş saati, `endDayOffset`, mola dakikası, izin bayrağı. Kullanıcı özel vardiya türü ekleyebilir ve var olanları düzenleyebilir; henüz silme UI'si yoktur.
- `ShiftPattern.days` artık vardiya türü ID'leri dizisidir; sabit üçlü vardiya kuralı yoktur. Döngü, sabit 24 saat geçen süre değil sivil tarih indeksiyle hesaplanır.
- `day_overrides` yalnızca seçilen gün için geçerlidir; sonraki düzenli döngü değişmeden hesaplanır.
- `resolveShift` normal döngü veya istisna kaynağını ayırt eder. Aylık görünüm, bu birleşik sonucu gösterir.
- `plannedWallMinutes`, saatin kadrandaki aralığıdır; **DST durumunda gerçek geçen çalışma dakikası değildir**. Ücret hesabında gerçek dakika kullanılacaksa saat dilimi geçişi ve birden fazla yerel saat eşleşmesi (fold/gap) ayrıca çözülmelidir.
- Node `node:sqlite` testleri mevcut v1 kayıtlarının korunmasını ve v2 tohumlamasını sınar; **Expo'nun cihaz SQLite sürücüsü üzerinde gerçek mobil test henüz yapılmadı**.

## UTC zaman aralığı ve DST çözümlemesi — Issue #6 / PR #7 (2026-11-15)

**Amaç:** Bir vardiyanın yerel takvim günü, IANA saat dilimi, başlangıç/bitiş saati ve `endDayOffset` bilgilerini kesin UTC anlarına dönüştürmek. `plannedWallMinutes` ile bu süreyi birbirine karıştırmamak.

- Saf ve platformdan ayrılmış `src/domain/zoned-shift-time.ts` modülü kullanılır. `possibleUtcInstants(date, HH:mm, timeZone)` yerel saatin tüm eşleşen UTC anlarını döndürür; `resolveLocalBoundary(..., choice)` bu sonuçları tekilleştirir.
- **Gap:** Yerel saatin var olmadığı anlarda hiçbir otomatik ileri alma veya saat düzeltmesi yapılmaz; `nonexistent` / `NONEXISTENT_START|END` döner.
- **Fold:** Yerel saat iki ana karşılık geliyorsa varsayılan `reject` seçimiyle `ambiguous` / `AMBIGUOUS_START|END` döner. Ayrı başlangıç/bitiş politikalarına bilinçli `earlier` veya `later` verilerek çözüm üretilebilir. Bu seçimler henüz cihazda kullanıcı tercihi olarak kalıcı saklanmıyor; belirsiz saatler otomatik kazanç hesabına **dahil edilmez**.
- **Kesin çözüm:** `resolveShiftInterval` yalnızca iki sınır net ve bitiş başlangıçtan büyükse `startInstantUtc`, `endInstantUtc`, `elapsedSeconds`, `wallMinutes` ve `breakMinutesPlanned` döndürür. `elapsedSeconds` **brüt planlı aralığın geçen saniyesidir**, fiilî çalışılan veya ücretlendirilebilir süre değildir. Mola otomatik düşülmez.
- **Saat dilimi sabitliği:** Vardiya programı oluşturulduğunda kaydedilmiş `shift_patterns.timezone_id` esas alınır. Kullanıcının telefonu farklı bölgeye taşınsa bile hesabın referansı **bu kaydedilmiş zaman dilimidir**; seyahatte program bölgesini elle değiştirme UX'i ayrıca tasarlanacaktır. Kaydetme sırasında mevcut kayıtların `timezone_id` alanı üzerine yazılmaz.
- **Çözümleme yöntemi:** `Intl.DateTimeFormat.formatToParts` ve seçili IANA zone üzerinde yerel/UTC round-trip. Yerel nominal UTC saatinin ±36 saat çevresinde saatlik örneklenen ofsetlerden aday anlar çıkarılır; her aday tam yerel tarih/saat/saniye bileşenleriyle kontrol edilir. Kesin eşleşmeyen hiçbir aday kullanılmaz. Tipik modern DST geçişleri ve yarım saatlik ofset değişimleri desteklenir.
- **Sınırlar:** Saatten daha kısa süreli ender tarihsel ofset değişimleri, farklı platformların ICU/IANA tzdb sürümleri veya Hermes `Intl` uygulaması farklılıkları için cihaz üzerinde kabul testi gereklidir. Node/Linux testlerinin geçmesi mobil tzdb eşdeğerliği garantisi değildir.
- **UI:** Bugün ve Takvim seçilen vardiya detaylarında planlanan duvar saati aralığı ile saat dilimine göre geçen süre ayrıdır. Çift anlamlı/var olmayan saatlerde uyarı görünür; hesaplama sessizce tahmin edilmez.
- **Veri tabanı:** Bu değişiklik yeni SQLite migrasyonu gerektirmez; mevcut v2 kayıtları aynen kullanılır.
- **Ücret sınırı:** İleride bordroya aktarım için gerçekleşen başlangıç/bitiş zamanları, mola fiiliyatı, fold kararı ve iş sözleşmesi kuralları ayrıca doğrulanmalı. `elapsedSeconds` tek başına ücret hesaplama için kanıt değildir.

## Faz 2 devam — PR #9 / Issue #8: kalıcı DST seçimi ve fiilî çalışma (2026-11-15)

### Yeni SQLite v3 tabloları

- `shift_boundary_choices(local_date PRIMARY KEY, schedule_signature, start_choice, end_choice, updated_at)`: Bir yerel tarih için iki sınırın `reject|earlier|later` kararları. `schedule_signature` vardiya kimliği, başlangıç/bitiş saatleri, `endDayOffset`, izin durumu ve IANA saat diliminden deterministik üretilir. Şablon saatleri, vardiya kimliği veya saat dilimi değişirse önceki karar **eşleşmez ve katı reddetme politikasına dönülür**. Ad/renk değişikliği kararı etkilemez.
- `actual_work_sessions`: `id`, `local_date`, yerel giriş/çıkış saatleri ve çıkış tarihi, kaydedildiği andaki `timezone_id`, giriş/çıkış fold seçimleri, `start_instant_utc`/`end_instant_utc`, fiilî olarak kullanıcının beyan ettiği `break_minutes`, `note` ve `source='user_entered'`. Ayrı tabloda tutulur, eski `work_entries` kayıtları **otomatik dönüştürülmez veya silinmez**.
- İki yeni tablo + indeksler tek transaction ile `PRAGMA user_version=3` olur. V1/v2 verilerinin korunması Node SQLite migration testleriyle doğrulanır; native SQLite güncelleme testi ertelendi.

### Saat sınırı ve kayıt sözleşmeleri

- `prepareBoundaryChoice(date, template, timezone, policy)` yalnızca **her iki uç çözümlü ve pozitif** planlı UTC aralığına sahip olduğunda kayda izin verir. Kullanıcı önce ekrandan geçerli fold seçimlerini yapar, ardından **bu güne özel** kaydeder.
- `effectiveBoundaryPolicy` yalnızca gün ve şablon/saat dilimi imzası eşleşiyorsa saklanan kararı uygular; diğer günlere veya değiştirilmiş saatlere yayılamaz.
- `prepareActualWork` planlanan DST kararını **asla miras almaz**; gerçek giriş/çıkış saatinde fold varsa kullanıcı tekrar açık seçim yapar. Gap zaman reddedilir. Kaydedilen UTC aralığı pozitif ve en fazla 72 saat, mola tam dakika ve aralıktan kısa olmalıdır. Günler arası kayıt için çıkış tarihi girişi bulunur.
- UTC olarak kesişen iki kullanıcının beyan ettiği çalışma kaydının oluşturulması SQLite exclusive transaction içinde reddedilir. Aynı takvim gününde kesişmeyen birden fazla kayıt mümkün; silme kullanıcı onayıyla yapılır.
- `elapsedSeconds` ve `netLoggedSeconds` yalnızca **beyan edilmiş zaman** ölçümleridir; doğrulanmış ücret, fazla mesai katsayısı veya bordro verisi değildir. Geçmiş kayıtların UTC başlangıç/bitişi farklı program saat dilimine göre yeniden yazılmaz.
- `changeScheduleTimeZone` yalnızca mevcut programa uygulanan açık bir UI onayı ile kayıtlı `shift_patterns.timezone_id` değerini günceller. Döngü başlangıç tarihi, şablon saatleri ve tarihe özel vardiya istisnaları aynı kalır. Eski fold seçimi imzası uyuşmadığı için uygulanmaz. Kullanıcıya önce/sonra UTC başlangıç örneği gösterilir.

### Kısıtlar ve doğrulama

- Kayda girilen **başlangıç yerel tarihi seçilen takvim günüdür**; çıkış 0–3 takvim günü ileride olabilir, UTC süresi en fazla 72 saat. Girişin önceki takvim gününde olması veya farklı saat diliminde çıkış yapma gelişmiş UX'i henüz yoktur.
- SQLite sürücüsü, iOS/Android gerçek cihazdaki `Intl`/ICU/tzdb eşlemesi, uçak modunda kalıcılık ve migrasyon henüz test edilmedi; kullanıcı bu testleri erteledi ([Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)).
- **Sürümleme açık:** Şablon geçmişi ve işveren onayı henüz uygulanmadı; kullanıcı beyanına dayalı kayıtlar ücret motoruna otomatik aktarılmamalıdır.

## Faz 3 — Rutin motoru ve SQLite v4 (PR #11, 2026-11-15)

- `src/domain/routine-engine.ts`: JSON v1 filtreleri (`shiftIds`, ISO `weekdays` 1–7, sıfır tabanlı `cycleDays` 0–365, `restOnly`). Filtre grupları AND, grup içi seçimler OR; boş gruplar kısıtlama yapmaz. `resolveShift` günlük istisnayı dahil eder, sivil tarih döngü indeksini kullanır. Gece vardiyası başlangıç gününe bağlıdır.
- `src/data/routine-repository.ts`: `routine_rules` fiziksel silinmez; arşivlenir. `revision` üzerinden eski editör ekranı diğer düzenlemeyi ezemez. Aktif tamamlama durumu v1 `task_completions` tablosunda saklanır; tamamla ve geri al işlemleri transaction ile `routine_completion_events` günlüğüne snapshot yazar.
- SQLite v4: `routine_rules.archived_at`, `routine_rules.revision` ve bağımsız append-only `routine_completion_events` (id, routine_id, local_date, completed/uncompleted, title_snapshot, recurrence_snapshot, occurred_at). Önceki v1 rutin tamamlamaları tek seferlik `legacy:` event kimliğiyle geri doldurulur. Arşivleme geçmişi ve `task_completions` verisini silmez.
- Rutinler sekmesi tarih seçimi, kural oluşturma/düzenleme, haftanın günü/vardiya/döngü/izin filtreleri, arşiv yönetimi ve hareket geçmişini; Bugün sekmesi günlük görev listesini sunar.
- Gerçek cihaz/native SQLite v4 doğrulaması [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) üzerinde ertelendi. Yerel hatırlatıcı/bildirim planlama bu PR kapsamı dışındadır; iOS/Android bildirim izni semantiği ayrı test edilecek.

## Faz 3 — Yerel rutin hatırlatmaları (Issue #12 / PR #13, 2026-11-15)

- `src/domain/routine-reminders.ts` **saf planlayıcı**: `RoutineRule.reminderClock` + `reminderTimeZone` + `revision`, mevcut `routineMatchesDate`, tek günlük override, `task_completions`, kaydedilmiş IANA program bölgesi. Zaman dönüşümü `resolveLocalBoundary` ile yapıldığından DST gap/fold **fail-closed**: belirsiz/var olmayan yerel saat için bildirim oluşturulmaz.
- Planlayıcı **14 sivil gün**, toplam en fazla **48** ve her gün en fazla **6** bildirim üretir. Geçmiş anlar, 10 saniye içinde kalan anlar, tamamlanmış ve aktif olmayan rutinler dışarıda. Etiketler `routineId + localDate + reminderClock + timezone + ruleRevision` kombinasyonundan deterministik anahtar üretir.
- `src/services/routine-notifications.ts`: Expo Notifications tek seferlik DATE trigger/Android rutin kanal adaptörü. Kullanıcının açık eylemi olmadan `requestPermissionsAsync` çalıştırılmaz. Android **exact alarm** yetkisi istemiyoruz; zamanlama sistemin best-effort koşullarına tabidir. `getAllScheduledNotificationsAsync` ve `cancelScheduledNotificationAsync` ile yalnızca `data.owner = vardiyum-routine-v1` kayıtları yeniden uzlaştırılır; `cancelAllScheduledNotificationsAsync` **kullanılmaz**.
- `src/components/reminder-coordinator.tsx` uygulama başlangıcında, program/tarih/vardiya değiştiğinde, rutin güncellendiğinde, tamamlandı/geri alındığında ve uygulama öne döndüğünde **sıraya alınmış** senkronizasyon yapar. İşletim sistemi izin vermezse eski Vardiyum rutin bildirimlerini kaldırır ve görev listesi aynen çalışır. İnternet veya hesap gerekmez; uygulama hiç açılmazsa **14 günün ötesi önceden planlanmış değildir**.
- `src/components/reminder-consent-panel.tsx` bildirimlerin genel etkinleştirme/kapatma UI'sidir; izni **yalnızca kullanıcı basarsa** ister. `app_settings.routine_reminders_opted_in` başlangıçta yoktur/kapalıdır.
- SQLite v5 eklemeli: `routine_rules.reminder_clock` (null veya 24 saat `HH:mm`), `routine_rules.reminder_timezone_id` (nullable IANA zone), indeks; v1–v4 iş/veri ve completion eventleri korunur. Program zone değişikliği aynı transaction'da hatırlatma zone'larını günceller ve rutin revizyonunu artırarak eski schedule anahtarlarını geçersiz kılar.
- **Platform sınırları:** iOS pending bildirim kotası, Android 12+ kesin alarm politikası, OS güç tasarrufu, izin reddi, saat dilimi veritabanı farkları ve teslim/yeniden başlatma davranışı **native test yapılmadan kesinlenemez**; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) üzerinde ertelendi. Planlanmış bildirimin tam zamanında gelmesini garanti etmeyiz.

## Faz 4 — Tahmini kazanç mimarisi (Issue #14 / PR #15)

### Saf hesaplama ve para modeli

- `src/domain/earnings-engine.ts` saf motoru, UTC `actual_work_sessions` kayıtlarından ve manuel `earnings_adjustments` kalemlerinden şeffaf **vergi öncesi tahmin** üretir. `work_entries` ve planlanan shift süreleri veri kaynağına yükseltilmez.
- `EarningsProfile`: geçerlilik ayının **ilk günü** `effectiveFrom`, `hourly|monthly_fixed`, ISO alt kümesi `TRY|USD|EUR|GBP`, pozitif ücret (minor unit), açık dönem `overtimeAfterMinutes` veya null, `overtimeMultiplierNumerator/Denominator`, sürüm kimliği ve revizyon. Aynı ay birden fazla profil SQLite UNIQUE ile reddedilir. Bu ilk sürüm, tam ay varsayımını kullanır.
- `hourly`: kullanıcı beyanına dayalı dönem çalışma saniyeleri, kullanıcı eşiğinin altındaki normal ve üstündeki fazla mesai olarak kronolojik ayrılır. `monthly_fixed`: sabit tam ay tutarı bir kez eklenir, çalışma kayıtları bilgi olarak sunulur; fazla mesai eşiği tanımlanmışsa ayrıca belirtilen saat ücreti/çarpanla eklenir. Her iki modelde de mevzuat/işveren puantajı varsayılmaz.
- Kuruş/cent tüm kayıtlarda **safe integer**; oranlar **BigInt pay/payda** ile hesaplanır, her parasal satırda `half-away-from-zero` yuvarlanır. Toplam BigInt ile toplanır ve safe integer sınırında korunur. `src/domain/money-text.ts` para girişini ondalık float üzerinden **parse etmez**, görüntüde de 2 ondalığı string olarak oluşturur.
- Her `EarningsLine` için `kind`, `sourceId` (`workId`, profil veya adjustment), `profileId` ve `profileRevision`, gerçek saniye, kullanıcı girdilerinden üretilen integer tutar ve açıklama mevcuttur. Sonuç tipi `needs_profile` | `blocked` | `estimated` ile **fail closed** semantiğini açık gösterir.
- Rapor dönemleri ilk sürümde **takvim ayı** `YYYY-MM` olup vardiyanın kullanıcının kaydettiği *başlangıç sivil günü* temel alınır. Sivil çıkış günü sonraki aya taşarsa veya önceki aydan gelen kayıt bulunursa **hesap bloklanır**. Gerçek UTC anları/aktif timezone yeniden yorumlanmaz. Tüm raporun sessiz bölünmesi, eksik çalışma için otomatik kesinti ve ülke hukuku kuralları *henüz yoktur*.
- `src/data/earnings-repository.ts` salt-okunur rapor için ilgili profil, ayı kesen tüm `actual_work_sessions` ve aynı para birimindeki düzeltmeleri kullanır; ekleme API'leri **append-only**. Profil güncelle/sil veya düzeltme silme API'si yoktur; tarihsel kayıtlar kalır. Rutin, bildirim ve diğer finansal legacy tablolar etkilenmez.

### SQLite v6 ve güvenli kapsam

- `earnings_profiles`: `id`, `effective_from UNIQUE`, model, iki ondalıklı desteklenen currency, integer ana ücret, isteğe bağlı fazla mesai eşiği/saat ücreti/çarpan, revision, `source='user_entered'`.
- `earnings_adjustments`: `id`, ay, `bonus|deduction|correction`, currency, işaretli integer miktar, açıklama, kaynak ve UTC olay anı. Yeni bir ters correction ile hata dengelenebilir; eski satır silinmez.
- **Eski `compensation_profiles`, `pay_adjustments`, `work_entries` otomatik yeni hesaplamaya alınmaz.** Migration 6 yalnızca yeni tablolar/indeksler ekler; SQLite v1–v5 korunur. `PRAGMA user_version=6`.
- Bu finansal modül **resmî bordro**, **net gelir**, **SGK/vergi hesabı** veya işveren onaylı puantaj değildir. Gerçek cihazda SQLite v6 migrasyon/kalıcılık testi kullanıcı tercihine göre [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

## Faz 4 devam — PR #17 / SQLite v7: ay bölme, mola dağılımı, kullanıcı paylaşımı

- `src/domain/earnings-period.ts` saf `splitWorkForMonth`, **orijinal oturumun UTC anlarını** ve **o kayıt anında kaydedilmiş IANA `timeZone`** alanını kullanır. Ay sınırları `resolveLocalBoundary('YYYY-MM-01','00:00', IANA,'reject')` ile UTC anına çevrilir. Ay başlangıcı yerel olarak nonexistent/fold ise **fail-closed**; seyahat nedeniyle telefon zone'u değişse bile geçmiş değiştirilmez. Bitiş anı exclusive; ayın tam 00:00'ında biten oturum gelecek aya ücret yazmaz.
- Orijinal tek `actual_work_sessions.id` iki raporda aynı kalır; `WorkPeriodPortion` her ay için `startInstantUtc, endInstantUtc, grossSeconds, breakMinutes, netSeconds, originStartUtc/originEndUtc` alanlarıyla iz bırakır. Tarih, IANA zone ve kaydedilmiş UTC anları birbirini doğrulamazsa rapor bloklanır. Her ay yalnızca o UTC aralığını sayar; iki aya eşik/katsayı **bağımsız** uygulanır.
- **Mola toplamı 0 ise** UTC dilimler otomatik hesaplanır. Mola varsa iki ay arasında mola zamanı bilinmediği için **explicit** `MonthBreakAllocation` (iş ID, başlangıç ayı, orijinal mola ve UTC uçları, başlangıç ayına düşen dakika, `user_entered`) gerekli. İkinci ayın molası `totalBreak-startBreak`; her iki ayın gerçek gross süresini aşamaz. Mola tahmini **yapılmaz**. Kullanıcı kararı değişince aynı oturum kimliği için `revision` artırılır.
- SQLite **v7**, eklemeli `earnings_month_break_allocations` güncel karar tablosu ve `earnings_month_break_allocation_events` bağımsız append-only revizyon izi ekler. v1–v6 vardiya/fiilî çalışma/rutin/ücret profili/ayarlama verileri dönüştürülmez/silinmez. Seçim ve olay kaydı aynı exclusive transaction'dadır.
- `src/data/earnings-repository.ts` seçilen aya giren önceki ay başlangıçlı oturumları ve ilgili mola kararlarını yükler. `saveBreakAllocation` yalnızca gerçek iki aya yayılan ve molalı oturuma, her iki dilim güvenli doğrulandıktan sonra yazar.
- `src/domain/earnings-export.ts` yalnızca **estimated** rapor için deterministik, şemalı JSON ve CSV metni üretir. Raporun kaynak ID/profil sürümü/UTC dilim bilgileri bulunur; CSV formül enjeksiyonu için tehlikeli ilk karakterler korunur. `earnings.tsx` ekranında açık **finansal gizlilik onayı** sonrası React Native `Share.share` sistem paylaşım ekranı açılır. Kendi başına sunucuya gönderme, dosyaya otomatik kaydetme, şifreleme veya kontrollü içe alma **yoktur**; paylaşım kullanıcının hedef seçimine tabidir.
- **Açık:** Eski ücret profilini aynı efektif ay için düzeltme/revizyonlama, güvenli içe alma/şifreli yedekleme ve gerçek cihazda native SQLite v7/Share UI testi ([Issue #16](https://github.com/hilmiguner/vardiyum/issues/16), [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)). Resmî bordro/vergi/SGK/net/işveren onayı hâlâ kapsam dışıdır.

## Faz 4 devam — PR #18 / SQLite v8: ücret profili sürümleme

- **v1** ücret profili `earnings_profiles` içinde eski haliyle korunur. Yeni `earnings_profile_revisions` tablosundaki her satır **tam durum snapshot'ı** içerir: `profile_id`, `revision >=2`, aynı `effective_from`, model, currency, tam sayı kuruş, ek mesai eşiği/ücreti, seçilmiş multiplier, **zorunlu gerekçe**, UTC `recorded_at`, `user_entered`. `PRIMARY KEY(profile_id,revision)`, FK ve CHECK kısıtları vardır.
- SQLite `BEFORE UPDATE` ve `BEFORE DELETE` trigger'ları sürüm kayıtlarına müdahaleyi reddeder. Geçmiş v1/v2/... silinmez; yeni düzeltme **tek yeni satır INSERT**. `appendPayProfileCorrection` işlemi exclusive transaction içinde **en son sürümün yüklenmesi, stale-revision kontrolü ve kayıt** adımlarını tek atomik işlemde yapar. Aynı ayın profil `id/effectiveFrom` değerleri düzeltilemez.
- `src/domain/earnings-profile-revisions.ts`: profil verisi `validateEarningsProfile`, `revision` ardışıklığı (gaps/dupes reddi), tarih/düzeltme nedeni/provenance, identity ve tarih tutarlılığı fail-closed. `resolvePayProfileRevisions` yalnızca orijinal v1 kaydıyla eşleşen sürümleri uygulayarak güncel etkili profili seçer.
- `loadEarningsReport(month, selectedProfileRevision?)`: normalde en yeni profil; kullanıcı eski sürümü seçerse o sürümün **oranı** ile *bugünkü* fiilî çalışma ve manuel düzeltme verilerini tekrar hesaplar. `loadPayProfileHistory` v1 + tüm v2+ değişikliklerin gerekçe/tarihini gösterir. Önceden görünen raporun **tarihsel snapshot'ı DB'de saklanmaz**. CSV/JSON çıktısında `profileId/profileRevision` vardır, resmî bordro değildir.
- `src/app/(tabs)/earnings.tsx` profil düzeltme UI'sinde tarih kilitli, gerekçe zorunlu, kullanıcı önceki sürümleri görebilir. Otomatik mevzuat/SGK/vergi/net hesabı eklenmez.
- SQLite v8 **sadece yeni tablo/indeks/trigger ekler**; v1–v7 çalışma, vardiya, mola ve ücret verileri değiştirilmez. Native Android/iOS SQLite v8 veri koruma testi [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.
