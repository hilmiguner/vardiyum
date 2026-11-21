# Vardiyum — Gerçek Cihaz Kabul Listesi

> **2026-11-22 / E08-A2 DRIVE READ-ONLY VERIFY PASS:** Kullanıcı Pixel 7 / Android16 emülatörde özel Google Drive'dan şifreli yedeği tekrar seçip doğru key ile doğruladı; ekran görüntüsü **`Backup verified`, createdAt `2026-11-21T21:20:10.396Z` (= İstanbul 2026-11-22 00:20:10), `10 rows across 18 tables`** gösteriyor. Tablolar: `shift_templates=3`, `shift_patterns=1`, `pattern_days=1`, `routine_rules=2`, `app_settings=1`, `routine_completion_events=2`, diğerleri 0. **E08 fresh export self-check PASS + Drive share→pick→correct-key read-only Verify PASS**; **yeni, bağımsız temiz AVD üzerinde restore ve sonrası kayıt karşılaştırması PENDING**. Mevcut dolu Pixel 7 emülatörde RESTORE/clear data/uninstall YOK. Yeni commit için 362/362 tam Windows logu alınmadı (önceki kesin 359/359 eski kod). PR #46 OPEN; GitHub Actions 1 Aralık'a kadar duraklatıldı, merge yok.

> **2026-11-22 / E08 FRESH EXPORT SELF-CHECK ANDROID EMÜLATÖR PASS:** Kullanıcı `SELF_CHECK=PASS` bildirdi; PR #46 `decodeBase64Bytes` / Android native `ByteArray` düzeltmesinden sonra `Create encrypted backup` yeni key UI'ya ulaşarak kaydedilmiş ciphertext'in aynı key ile açılması ve payload doğrulamasını **Android Pixel7 emülatöründe PASS** etti. Bu **yalnız native fresh-export self-check** kanıtıdır. **Yeni `npm run check` için 362/362 çıktısı paylaşılmadı** (son tam log 359/359 eski commit). **Drive share→select→correct key read-only Verify PENDING; temiz hedef gerçek Restore PENDING**. Kurtarma key/dosya sohbet/GitHub'a yüklenmeyecek. PR #46 OPEN, CI 1 Aralık'a kadar duraklatıldı, merge yok.

> **2026-11-22 / E08 COMBINED_FAILED — EXPO ANDROID BYTEARRAY DÜZELTMESİ:** Kullanıcı Pixel 7 Android emülatöründe `BACKUP_EXPORT_CHECK_COMBINED_FAILED` gördü. Expo SDK 57 kaynak `AesCryptoModule.kt`, `SealedData.fromCombined` için `combined: ByteArray` bekliyor; Vardiyum Base64 **string** yolluyordu. PR #46 kaynak [`c547f5e`](https://github.com/hilmiguner/vardiyum/commit/c547f5efebf0ef28129351544ce264e7660061bf) strict Base64 → `Uint8Array` dönüşümünü iki decrypt yolunda da uyguluyor; `.vdb` dosya şeması, şifre, AAD, anahtar ve veritabanı değişmedi. **Yerel kalite ve emülatör QA yeni commit için PENDING**. Son tam kullanıcı Windows kanıtı 359/359 PASS (`550550b`), ara teşhis ile 360 beklenirken bu 2 regresyon testinden sonra **362 bekleniyor**. E08 PASS DEĞİL; RESTORE/DB wipe/secret paylaşımı YOK, GitHub Actions 1 Aralık'a kadar kapalı, PR OPEN.

> **2026-11-22 / E08 DOĞRULAMA HATASI — GÜNCEL:** Kullanıcının eklediği tam PowerShell çıktısı **359/359 PASS**, Prettier/TS PASS, ESLint 0 hata/29 uyarı. Android Pixel 7 emülatörde yeni `Create encrypted backup` aşamasında **`BACKUP_EXPORT_SELF_CHECK_FAILED`** screenshot'ı var; **E08 native FAIL**, yedek henüz güvenilir değil. [PR #46](https://github.com/hilmiguner/vardiyum/pull/46) kaynak [`ed38975`](https://github.com/hilmiguner/vardiyum/commit/ed38975fe38671e783f963da70476760561f0ce4) yalnız **yeni oluşturulan dosya/key** self-check'i için güvenli aşama kodları ekledi (cache, key-import, AES, payload ayrımı); kullanıcıdan gizli veri istenmiyor. **Yeni commit yerel QA PENDING, beklenen 360 test**. RESTORE/DB silme/Drive paylaşma yok; Actions 1 Aralık'a kadar kapalı, PR OPEN.

> **2026-11-22 / E08 EXPORT PREFLIGHT WINDOWS LOCAL QUALITY USER-PASS:** Kullanıcı son Prettier düzeltmesi `b296381` ve PR #46 dalındaki güncellemeler sonrasında **“Testler geçti”** diye bildirdi; daha önce `npm run check` çalıştırması istenmişti, dolayısıyla **Windows local check kullanıcı bildirimiyle PASS**. Konsolun tam `tests/pass/fail` sayıları paylaşılmadı: 359 bekleniyor fakat **359/359 sayısal kanıt sunulmadı**. Gerçek Android emülatöründe yeni benzersiz .vdb + oluşturma içi readback AES self-check **henüz TEST EDİLMEDİ**; doğru-key `Verify` önceki denemede FAIL kaldı. Sıradaki: Metro JS reload → yalnız `Create encrypted backup` → anahtar görünür mü, yoksa `BACKUP_EXPORT_SELF_CHECK_FAILED` mı; şifre veya dosya paylaşılmasın, **RESTORE YOK**. CI (GitHub Actions) 2026-12-01'e kadar kapalı, PR #46 OPEN, merge yok.

> **2026-11-21 / E08-A1 DOĞRU ANAHTAR İLE VERIFY FAIL (ANDROID EMÜLATÖR):** Kullanıcı, yeni Drive `.vdb` yedeğine doğru anahtarı girdiğini belirtmesine rağmen `BACKUP_DECRYPTION_OR_VALIDATION_FAILED` ekranını paylaştı. **Doğru-key doğrulama FAIL**, E08 bütünleşik kabulü BLOKLU. Sebep kesinleşmedi: Drive'da aynı gün aynı isimli eski yedek, anahtar eşleşmesi, native decrypt veya payload doğrulama olabilir; **anahtar hatalıydı** varsayma. PR #46 üzerinde yedek cache dosya adları zaman+random UUID ile benzersiz, `overwrite:false`; oluşturma sonrası **kaydedilmiş ciphertext + oluşturulan yeni key** ile salt-okunur self-check başarı olmadan Share açılmaz. Bu yeni patch yerel `npm run check` ve emülatör QA **PENDING**; eski yedekler silinmedi, şema/şifre biçimi değişmedi. **RESTORE YAPMA**, kullanıcıdan anahtar/yedek dosyası isteme. PR OPEN / CI 1 Aralık'a kadar kapalı.

> **2026-11-21 / E08-A1 YANLIŞ ANAHTAR REDDİ PASS (EMÜLATÖR):** Kullanıcının Pixel 7 Android emülatöründeki ekran görüntüsünde yanlış 64-hex kurtarma anahtarı ile `Verify` sonrası **`Backup not verified; key, integrity or version mismatch`** ve `BACKUP_DECRYPTION_OR_VALIDATION_FAILED` uyarısı gösterildi. **Yanlış anahtarla deşifre reddi UI gözlemi PASS**; doğrulama başarılı önizlemesi/SQLite değişmezliği ayrıca karşılaştırılmadı. Sırada **en son oluşturulmuş `.vdb` + doğru yeni anahtar** ile sadece salt-okunur `Verify`, tarih/18 tablo/satır sayısı. Anahtarı sohbete veya screenshot'a koyma; **RESTORE YAPMA**. PR #46 OPEN; CI duraklatıldı.

> **2026-11-21 / E08-A1 BACKUP CREATE + DRIVE SAVE KULLANICI PASS:** Pixel 7 Android emülatöründe kullanıcı, önceki screenshot'ta kurtarma anahtarı görüntülendiği için **yeni şifreli yedek oluşturup Google Drive'a kaydettiğini bildirdi**. Yeni yedek dosyasını ve yeni anahtarı doğrulamadık; **dosya oluşturma+Drive'a kaydetme kullanıcı gözlemiyle PASS**, dosya içeriği/anahtar koruması/Drive'dan yeniden alma **PENDING**. Özellikle **aynı tarihli `.vdb` dosyalarının ismi aynı olabileceğinden en son oluşturulan dosyanın seçildiğinden emin olunmalı.** Sırada yanlış 64-hex key → `Verify` güvenli ret, sonra doğru key → yalnız 18 tablo önizleme. **RESTORE YAPMA**, silme/uninstall yok. PR #46 açık; GitHub CI duraklatılmış.

> **2026-11-21 / E05-C ANDROID EMÜLATÖR OPT-OUT PASS:** Kullanıcı açıkça **“Hatırlatmalar kapatıldıktan sonra planlanmış bildirim gönderilmedi”** sonucunu bildirdi. **E05-C emülatör gözlem sonucu PASS**; E05-A isteme/ret ve E05-B tek zamanlı teslim PASS ile Android emülatör kısa bildirim akışı **3/3 PASS**. OS bekleyen notification ID envanterinin sıfırlandığı, rutinlerin arşivlendiği veya uzun süreli pil kısıtı davranışları **ayrıca kanıtlanmadı**. Gerçek Android/iOS D05 açık. Sıradaki **E08-A1 (şifreli backup + salt-okunur wrong/correct-key verify)**; dolu emülatörde RESTORE ÇALIŞTIRMA. Son kesin Windows `npm run check` 355/355; son Alert UI değişiklikleri sonrası 357/357 henüz bildirilmedi. PR #46 OPEN, GitHub Actions 1 Aralık'a kadar kapalı.

> **2026-11-21 / E05-B ANDROID EMÜLATÖR BİLDİRİM TESLİMİ PASS:** Kullanıcı Pixel 7 Android16 emülatöründe `Bildirim Testi` sentetik rutinini **23:19** için programladı; bildirimin **23:19'dan yaklaşık 10 saniye sonra** Android bildirim merkezine ulaştığını bildirdi. Ekran görüntüsünde `Vardiyum · now`, başlık `Vardiyum`, gövde `Bildirim Testi` var. **E05-B emülatörde planlı bildirim teslimi PASS**; sabit 10 sn garanti, fiziksel Android/iOS teslim kanıtı veya tüm arka plan/düşük güç modları kapsamı DEĞİL. **E05-A izin/ret PASS**. Sıradaki sentetik rutin arşiv/opt-out ve bekleyen bildirimi iptal etme testi; `357/357` yeni yerel kalite çıktısı henüz paylaşılmadı. PR #46 OPEN, CI 1 Aralık'a kadar duraklatılmış.

> **2026-11-21 / E05-A UYARI METNİ EMÜLATÖR RETEST PASS:** Pixel 7 / Android16 emülatör yeni PR #46 `Alert.alert(short title, full message)` düzeltmesini çalıştırdı. Kullanıcının ekran görüntüsünde **`Local routine reminders` başlığı**, altında **`Notifications are denied or restricted. Enable them in system settings; tasks remain available.` mesajının tamamı**, `OK` butonu; önceki `syste...` kesilmesi artık yok. **Uyarı görünümü PASS**, E05-A izin red/uygulama çalışıyor önceki PASS. **Yeni commit üzerinde Windows `npm run check` 357/357 sonucu henüz bildirilmedi**; son kesin yerel kalite 355/355 PASS. E05-B planlanan bildirim teslimi NOT_TESTED. PR #46 açık, GitHub Actions 2026-12-01'e kadar duraklatılmış, main merge yok.

> **2026-11-21 / E05-A ANDROID EMÜLATÖR İZİN REDDİ PASS:** Pixel 7 Android16 emülatörde kullanıcı otomatik tarih/saat ayarlarını geri açtı, Rutinler'e girdiğinde kendiliğinden OS izni çıkmadığını doğruladı. `Enable reminders` tıklayınca Android izin penceresi açıldı, `Don't allow` seçildi, uygulama çalışmaya devam etti ve izin reddi uyarısı göründü. **E05-A kullanıcı etkileşimi/ret akışı PASS**; ret sonrası yeniden açılışta off-state ve bildirim teslimi ayrı testtir. Ekran görüntüsünde uzun uyarı metni `syste...` diye **kesiliyor**: `Alert.alert(longTitle)` yerine `Alert.alert(shortTitle, fullMessage)` düzeltmesi PR #46'da kaynak düzeyinde yapıldı, yeni native emülatör retesti **PENDING**. Son doğrulanmış Windows yerel kalite 355/355 PASS; yeni testlerle `npm run check` tekrar çalıştırılmalı. GitHub Actions 1 Aralık'a kadar kapalı, PR OPEN.

> **2026-11-22 / E06-A/B/C ANDROID EMÜLATÖR PASS (3/3):** Pixel 7 Android16 API36 emülatöründe kayıtlı `Europe/Istanbul` program saat dilimi kapat/aç kalıcılığı (A), 21→22 Kasım yerel 00:00'da **5–6 sn içinde** Bugün/yarın otomatik güncellenmesi (B), Home ile arka plandayken gece yarısı geçtikten sonra geri dönüşte `Bugün=2026-11-22` / `Sonraki gün=2026-11-23` (C) **kullanıcı gözlemiyle PASS**. E06-C sonucu kullanıcı bildirimi, ayrı screenshot yok. Bu yalnız Android **emülatör** sınırlı kabulüdür; Android gerçek cihaz/iOS D02–D10 ve OS bildirim teslimi/yedek restore hâlâ açık. Sıradaki **E05-A rutin bildirim izninin yalnız doğrudan kullanıcı basışıyla sorulması ve ret akışı**. PR #46 açık, GitHub CI 1 Aralık'a kadar duraklatıldı.

> **2026-11-22 / E06-B GECE YARISI EMÜLATÖR PASS:** Kullanıcı Pixel 7 / Android16 API36 emülatörde, kayıtlı `Europe/Istanbul` program saat diliminde 2026-11-21 23:59→2026-11-22 00:00 geçişinde **Bugün ekranının yaklaşık 5–6 saniyede kendiliğinden yenilendiğini** bildirdi; ekran görüntüsünde saat `00:00`, Bugün `2026-11-22`, Sonraki gün `2026-11-23`, `Schedule time zone: Europe/Istanbul` var. **E06-B PASS**; `E06-A PASS` korunuyor; **E06-C arka plandan dönüş PENDING**. Bu emülatör UI kanıtıdır, gerçek Android/iOS cihaz veya E06-C sonucu değildir. PR #46 OPEN, otomatik CI 2026-12-01'e kadar duraklatılmış.

> **2026-11-21 / E06-A PIXEL 7 EMÜLATÖR PASS:** Kullanıcı Pixel 7 / Android 16 emülatöründe kayıtlı program saat dilimini `Europe/Istanbul` seçip kaydetti; uygulamayı tamamen kapatıp yeniden açtıktan sonra seçim **korundu**, Bugün ekranı **hatasız açıldı**. **E06-A PASS**, E06-B (odaktayken yerel 00:00 geçişi) ve E06-C (arka plandan 00:00 sonrası dönüş) **PENDING**. Geçmiş UTC çalışma kayıtlarının byte-identical korunduğu bu gözlemde ayrıca doğrulanmadı. Windows yerel son kod testi 355/355 PASS; GitHub CI yok, PR #46 OPEN.

> **2026-11-21 / YENİ YEREL KALİTE KANITI (PR #46 `b586e6d`):** Kullanıcının `C:\vardiyum-native-qa` klonunda `git pull --ff-only` FAST-FORWARD PASS; `npm run check` **355/355 Node PASS**, Prettier PASS, TypeScript PASS, ESLint **0 error / 29 warning**. İstanbul gün değişimiyle ilgili 2 yeni test de PASS. Bu **Windows local quality** sonucudur; GitHub Actions ve `Europe/Istanbul` emülatör gece yarısı / `AppState` görsel kabulü değildir. `package.json` ve `expo-env.d.ts` mevcut kullanıcı değişiklikleri korunmuştur. PR #46 OPEN, otomatik CI 1 Aralık'a kadar duraklatılmış; merge yok.

> **EN SON KABUL 2026-11-21:** Pixel 7 Android 16 emülatör 5/5 MVP arayüz/kalıcılık kısa kontrolü PASS; custom 64dp navbar ikon/etiket hizalama kullanıcının ekran görüntüsünde düzgün, görsel hata çözüldü. Yerel kalite 353/353 test PASS, ESLint 0 error/29 warning. Görselde schedule zone GMT olduğundan Istanbul midnight/resume kapsamı henüz ayrıca test edilmedi. PR #46 açık, CI otomatik duraklatıldı (2026-12-01'e kadar), main merge yok. Kurumsal A23 test için kullanılmıyor.

> **EN GÜNCEL 2026-11-21 / A23 GERÇEK CİHAZ:** Galaxy A02s Android12 ARM32 SQLite ilk açılış/kalıcılık PASS. Galaxy A23 Android14'te yeni APK ile eski veriler KORUNDU, varsayılan Sabah/Akşam/Gece/İzin silme seçenekleri VAR, kullanılmayan şablon silme + Kaydet + yeniden açma PASS; alt sekmelere dokunuluyor ve OS navigasyonuyla önceki çakışma görünmüyor. **Kalan:** Bugün sekmesindeki geniş gri aktif arka plan/ikon hizası; 00:23 ekranında Bugün 2026-11-20 görünmesi (yerel IANA tarih yenileme olası kusuru). PR #46 dalında bu iki sorun için **YENİ KOD DÜZELTMELERİ VAR AMA YENİ APK/PHYSICAL RETEST YOK**. Bu bildirimde EAS build ID/SHA verilmedi. PR #46 OPEN/merge onayı yok; final CI doğrulanmalı. Android D01 PARTIAL, diğer Android D02-D10 ve tüm iOS QA AÇIK, beta/store yok.

## 2026-11-21 — Sonraki Pixel 7 Android emülatör oturumu (PENDING)

**Bu bölüm önceki 5/5 kısa görsel kabulden ayrı bir testtir.** Yalnız `Pixel_7_API_36` kişisel emülatörde, test verileriyle yürüt. Kurumsal Samsung A23'te ADB/developer mode kullanma. Yerel `package.json` veya `expo-env.d.ts` dosyalarını reset/clean ile silme. GitHub Actions otomatik/manual çalıştırma; PR #46 merge etme.

| Kimlik | İşlem | Beklenen | Mevcut kanıt |
| --- | --- | --- | --- |
| E06-A | Ayarlar → kayıtlı program saat dilimini **Europe/Istanbul** seç, açık onayla Kaydet; tekrar açıp seçimin korunduğunu kontrol et | Program bölgesi `Europe/Istanbul`, kayıtlı eski UTC gerçek çalışma sessizce değişmez | **PENDING** (önceki 5/5 ekranında GMT idi) |
| E06-B | Yalnız sentetik verili emülatörde Android sistem otomatik saatini geçici kapat, tarihi 23:59'a getir; Bugün sekmesini **açık tut**, 00:00 sonrası en çok 15 sn + kısa UI toleransı gözle | `Bugün` tarih + vardiya aynı kayıtlı zone'un yeni sivil gününe döner; yarın alanı yeni ertesi gün olur | **PASS — 22 Kasım 00:00, yaklaşık 5–6 sn'de otomatik güncelleme; kullanıcı ekran görüntüsü** |
| E06-C | Aynı kurulumda gece yarısından önce Bugün açıkken uygulamayı arka plana al; gece yarısından sonra yeniden ön plana getir | `AppState=active` / ekran odağında yeni tarih görünür, yanlış eski gün kalmaz | **PASS — Home→background sonrası 22 Kasım 00:00; Bugün 2026-11-22, yarın 2026-11-23 (kullanıcı bildirimi)** |
| E05-A | Sentetik rutinle ilk kez yerel hatırlatma izin ekranını gözle; uygulamanın açık onay butonuna basmadan OS istemi açılmamalı, ret akışı ayrıca denenmeli | İzin sadece kullanıcı isteğiyle, reddedilince sessiz otomatik etkinleştirme yok | **PASS — Etkinleştir öncesi otomatik prompt yok, tıklanınca OS prompt ve Don't allow; uygulama çalışıyor** |
| E05-B | İzin ve uygulama opt-in sonrası geleceğe planlanmış sentetik rutin bildirimi, uygulama arka plandayken Android bildirim merkezinde teslim edilmeli | Planlanan başlık ve rutin metni görünmeli; teslim gecikmesi not edilmeli | **PASS — 23:19 hedef, yaklaşık +10 sn; 'Vardiyum' / 'Bildirim Testi' ekran görüntüsü** |
| E05-C | Hatırlatmalar opt-out edildikten sonra önceden planlı sentetik bildirimin görünmemesi | Planlanan yeni bildirimin gelmemesi, diğer uygulamaların bildirimlerine dokunulmaması | **PASS — kullanıcı bildirimi: 'Hatırlatmalar kapatıldıktan sonra planlanmış bildirim gönderilmedi'; OS pending-ID doğrulaması yapılmadı** |
| E08-A | AES yedek/yanlış anahtar ve **yalnız temiz ayrı emülatör/hedef DB** üzerinde geri yükleme | Yanlış anahtar hiçbir DB değişimi yaratmaz; gerçek kişisel veri/anahtar paylaşılmaz; dolu hedefe restore yok | **PENDING** |

**Saat değişikliği emülatöre özgü geçici test ayarıdır.** Sonunda Android otomatik tarih/saatini geri aç; kullanıcının Windows saatini değiştirme. Saat değiştirme mümkün değilse E06-B/C `BLOCKED` olarak işaretlenir, PASS sayılmaz. Emülatör Metro'ya bağlı geliştirme build'i olduğundan ağsız native standalone sonucu çıkarılamaz. Bildirim teslimi E05-A'dan ayrıdır ve ayrıca fiziksel cihazda kanıtlanmalıdır. Geri yükleme için güvenli temiz hedef sağlanamıyorsa E08-A'yı ÇALIŞTIRMA.

**Kayda geçir:** PR source SHA, `Pixel_7_API_36`, kayıtlı program timezone, test edilen gerçek sanal saat, uygulamanın foreground/background konumu, gözlenen tarih, PASS/FAIL/BLOCKED, kişisel veri içermeyen ekran görüntüsü. Android ARM32/One UI ve iOS gerçek cihaz açık kalır.

## 2026-11-16 — GÜNCEL MVP 2. aşama / tek gerçek cihaz kabul oturumu (Issue #38, #2, #20)

**Önkoşul:** PR #41 kullanıcı onayıyla merge ve main CI başarılı olduktan sonra aşağıdaki testleri **Android ve iOS gerçek native derlemelerde ayrı ayrı** kaydet. JS export/Expo Go/Mac simülatör yalnız sınırlı kanıttır; native standalone/offline, OS bildirimleri ve AES dosya yaşam döngüsü gerçek OS üzerinde doğrulanmalıdır. Tüm kutular **henüz test edilmedi**. Aşağıdaki sonuçları kişisel finans, recovery key veya hassas vardiya notlarını paylaşmadan kaydet.

| ID | Gerçek cihaz kabulü | Android | iOS |
| --- | --- | --- | --- |
| D01 | Native preview ilk açılış ve sekmeler; SQLite kayıt/kalıcılık; sistem navigasyonu | **PARTIAL** — A02s Android12 SQLite + sekmeler + döngü kalıcılığı PASS. A23 Android14 eski veriler PASS, saat dilimi ve profil geçişi PASS; alt bar sistem safe-area çakışması DEVAM. Yeni safe-area patch için APK RETEST PENDING (#43/#44). | NOT_TESTED |
| D02 | Vardiya döngüsü/renk/gece+1/mola/override→geri alma; aynı gün shift değişince eski gerçek çalışma saatleri default'ta kalmaz | NOT_TESTED | NOT_TESTED |
| D03 | Gerçek çalışma UTC, günlük görev tamamla/geri al/rutin arşiv; uygulamayı kapat/yeni aç; offline SQLite verisi aynı | NOT_TESTED | NOT_TESTED |
| D04 | SQLite v1→v8 ardışık migration, eski verinin korunumu, FK/integrity, WAL, temiz kurulum | NOT_TESTED | NOT_TESTED |
| D05 | OS bildirim izni kabul/ret, rutin opt-in/out, foreground/background, tekrar planlama, eski owned dışında hiçbir bildirimin silinmemesi | NOT_TESTED | NOT_TESTED |
| D06 | Saat dilimi, NYC DST gap/fold, Nepal +05:45, midnight crossing; planlı ≠ gerçek çalışma | NOT_TESTED | NOT_TESTED |
| D07 | Aylık ve 26–25 Bugün kaynağı, earnings BLOCKED/no profile/no work/FX durumlarında rakam gizleme; Türkçe+İngilizce | NOT_TESTED | NOT_TESTED |
| D08 | AES-256-GCM yedek ve 64 karakter anahtar; yanlış key/bozuk dosya, yalnız boş temiz hedef atomik restore, key gizliliği, OS dosya seçici | NOT_TESTED | NOT_TESTED |
| D09 | OS CSV/JSON paylaşımdan önce explicit consent, iptal, geçici plaintext cleanup, arka plan/kill/düşük disk sırasında yanlış paylaşım/veri kaybı olmaması | NOT_TESTED | NOT_TESTED |
| D10 | TalkBack/VoiceOver, büyük font/satır kayması, light/dark kontrast, uzun TR/EN metinleri, erişilebilir Retry/permission CTA | NOT_TESTED | NOT_TESTED |

**Her kayıt için:** commit SHA, uygulama sürümü/build ID, cihaz modeli/OS, tarih, tester, kurulum durumu, beklenen ve gözlenen, PASS/FAIL/BLOCKED/NOT_TESTED, ilgili GitHub issue, kişisel bilgi içermeyen kanıt. **Kritik P0 FAIL ile beta aşamasına geçilmez.** Android testi iOS PASS sayılmaz.

**Tarihsel eski Faz 1–4 listeleri aşağıda korunur; güncel teslim kontrolü bu tablo ve [MVP-SCOPE-FREEZE.md](MVP-SCOPE-FREEZE.md)'dir.**

**Durum:** 2026-11-15 itibarıyla henüz uygulanmadı. GitHub Actions #43697865419 Android/iOS **JavaScript** export doğrulaması yapmıştır; gerçek cihazda açılış kanıtı değildir.

## Hazırlık

1. Güncel Vardiyum dalını çek, Node 22 kullan ve `npm ci` çalıştır.
2. `npx expo install --check` ve `npx expo start --clear` ile Expo Go / uyumlu development build başlat.
3. Android fiziksel cihaz veya emulator; iOS fiziksel cihaz veya macOS simulator üzerinde aşağıdaki testleri ayrı ayrı kaydet.
4. **İnternetsiz kullanım:** Expo Go geliştirme sırasında Metro'ya ihtiyaç duyabilir. Ağsız işlevleri gerçek standalone pakette ayrıca test et; Expo Go testini çevrimdışı kanıtı sayma.

## Android ve iOS test senaryoları

- [ ] Açılış: Bugün, Takvim, Rutinler, Kazanç ve Ayarlar ekranlarına sorunsuz geçiş.
- [ ] İlk kullanımda döngü olmadığı mesajı ve Ayarlar'a yönlendirme.
- [ ] Ayarlardan 8 günlük örnek döngüyü yükle, kaydet; Bugün ve 14 gün listesinde doğru göründüğünü doğrula.
- [ ] Uygulamayı tamamen kapatıp yeniden aç; SQLite kaydının korunduğunu doğrula.
- [ ] Döngü gününe dokunup vardiyayı değiştir; gün ekle / kaldır; tekrar kaydet ve yeniden aç.
- [ ] Geçersiz başlangıç tarihi (ör. `2026-02-29`) gir; hata mesajı çıkmalı, uygulama çökmemeli.
- [ ] Sistem Türkçe/İngilizce olduğunda çeviriler ve açık/koyu temalar düzgün görünüyor.
- [ ] Erişilebilirlik: büyük yazı, TalkBack/VoiceOver, düğme etiketleri.
- [ ] Standalone paket varsa interneti kes; önceden girilmiş takvim ve veritabanı çalışmaya devam ediyor.

**Kapsam dışı:** Kişiselleştirilmiş vardiya saatleri, değişiklik istisnaları, rutin/mesai/kazanç ekranlarında gerçek işlemler (henüz geliştirilmedi).

## Test kanıtı

| Alan | Bilgi |
|---|---|
| Platform, OS ve cihaz | Android/iOS, model |
| Test commit SHA | SHA |
| Derleme türü | Expo Go / dev build / standalone |
| Tarih ve testi yapan | YYYY-MM-DD |
| Her madde | PASS/FAIL, açıklama |
| Hata bağlantısı | GitHub Issue / kişisel veri içermeyen ekran görüntüsü |

**Yayın/geliştirme sınırı:** Native test kaydı olmadan 'Android/iOS cihaz testleri tamamlandı' denmez.

## Faz 2 için ek cihaz testleri — PR #5 (henüz yapılmadı)

- [ ] V1'den yükselen telefonda eski döngü ve günlük değişiklik korunur; SQLite `user_version=2`.
- [ ] Özel vardiya ekle: 19:00–07:00, mola 30 dk; kapat/aç, değerler aynı.
- [ ] Aynı saat 07:00–07:00 gir: 24 saatlik planlı vardiya olarak görünmeli.
- [ ] Aylık takvimde rastgele bir günü "izin" olarak değiştir, sonraki döngü günü bozulmamalı.
- [ ] Değişiklik geri alınınca düzenli döngü görünür; kapat/aç sonrası kalıcıdır.
- [ ] Türkçe ve İngilizce metinler; Android/iOS açık/koyu tema ve TalkBack/VoiceOver erişimi.
- [ ] Kullanıcı geçersiz saat veya mola girince uygulama çökmemeli, kayıt reddedilmeli.

## Issue #8 — Gelecekteki cihaz kontrolü (kullanıcı tercihiyle ertelendi)

- [ ] iOS ve Android'de v2->v3 SQLite migrasyonu; pattern/override/eski work_entries korunur.
- [ ] NYC 2026-11-01 01:30 fold: erken/geç seçenekleri tek gün için saklanır; uygulama kapanıp açılınca yeniden yüklenir.
- [ ] Şablon saati veya program bölgesi değişince eski DST seçimi kullanılmaz.
- [ ] Planlanan ile gerçek giriş/çıkış farklı tutulur; gerçek mola girişi ve silme sonrası kalıcılık.
- [ ] Aynı gerçek UTC aralık çakışması reddedilir, ardışık aralıklara izin verilir.
- [ ] Program IANA saat dilimi değişim önizlemesi/açık onayı, geçmiş fiilî UTC kayıtlar değişmez.
- [ ] Geliştirme vs üretim build, çevrimdışı kullanım, uygulama kapanıp açılınca kayıtlar, TalkBack/VoiceOver.
- [ ] Hermes/ICU/tzdb sürümünden kaynaklanan DST farkları kaydedilir; ücret motoruna otomatik aktarılmaz.

**Durum:** Henüz gerçek cihaz testi yapılmadı. Bunlar planlanan, tamamlanmamış maddelerdir.

## Faz 3 / Issue #10 (planlandı, henüz yapılmadı)

- [ ] Android/iOS SQLite v3→v4 migrasyonu, rutin/checkbox ve eski work/shift/override verileri korunuyor.
- [ ] Rutin oluştur, vardiya/hafta/döngü/izin filtreleri ve gece vardiyası başlangıç günü doğru.
- [ ] Günlük istisna değiştiğinde günlük checklist değişiyor.
- [ ] Tamamlandı/geri al, kapat/aç kalıcılığı; arşiv/geri alma ve geçmiş snapshot korunuyor.
- [ ] Türkçe/İngilizce, TalkBack/VoiceOver, erişilebilir checklist ve büyük yazılar.
- [ ] Bildirimler henüz uygulanmadı; bu testin kapsamı değil.

**Kullanıcı cihaz testlerini erteledi; native PASS kanıtı yok.**

## Issue #12 — Gerçek cihaz bildirim smoke (henüz yapılmadı)

- [ ] iOS/Android v4→v5 SQLite migrasyonu, önceki rutin/checklist ve geçmiş kayıtları korunuyor.
- [ ] İzin etkinleştirmesi yalnızca düğmeye basıldığında soruluyor; reddetme, kalıcı red ve sonra Ayarlar'dan izin verme.
- [ ] Android 13+ kanal/POST_NOTIFICATIONS; Android 12–14 exact alarm verilmediğinde best-effort teslim; iOS yetki (provisional/authorized).
- [ ] Ekran önünde, arka planda, kilitli telefonda, uygulama kapalı/yeniden başlatılmışken yerel bildirim teslimi ve beklenen OS sınırlamaları.
- [ ] Günlük vardiya override, döngü değişimi, rutin etkinleştirme/arşivleme, tamamlandı/geri al ve zone değişimi sonrası pending owned bildirimleri yeniden senkronize.
- [ ] DST gap/fold, farklı IANA tzdb sürümleri ve seyahatte zone değişimi; yanlış saat veya çift hatırlatma olmamalı.
- [ ] 14 gün/48 toplam/6 günlük sınır, diğer sistem bildirimlerini silmeme ve telefonun pil/izin sınırlamaları.
- [ ] TR/EN arayüz, TalkBack/VoiceOver ve tamamlanmamış görevlerin çevrimdışı kalıcılığı.

**Durum:** Kullanıcı cihaz testlerini sonraya bırakmıştır; bu kutular tamamlanmış sayılmaz. JS bundle ve Node testleri native izin/teslim kanıtı değildir.

## Issue #14 — Kazanç ekranı ve SQLite v6 için ileride cihaz kabulü

- [ ] v5→v6 yükseltme sonrası eski shift/rutin/tamamlanma/gerçek giriş-çıkış ve hatırlatma kayıtlarının korunması, kapat-aç persistansı.
- [ ] TR/EN Kazanç sekmesinde ayrı ay seçimi, saatlik/tam aylık kullanıcı profili oluşturma, yeni geçerlilik ayı ve aynı ay ikinci profil reddi.
- [ ] Gerçek giriş/çıkış ve mola kaynaklı tutarın kalem kalem görünmesi; planlanan vardiyanın otomatik iş sayılmaması.
- [ ] Kullanıcının eşik, mesai oranı, prim, kesinti ve manuel düzeltme girdileri sonrası raporu yenileme.
- [ ] DST, ay sınırını aşan vardiya, örtüşen veri ve para birimi uyuşmazlığı halinde sahte toplam yerine blok uyarısı.
- [ ] Cihazda hatasız integer cent biçimi, büyük tutar/eksi miktar, çevrimdışı kullanım, uygulama kapanıp tekrar açılması, büyük font ve VoiceOver/TalkBack.
- [ ] Resmî net ücret/SGK/vergi sonuçlarının veya hukuki mevzuat varsayımının **sunulmadığı** onayı.

**Henüz yapılmadı:** Kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'ye ertelendi; Android/iOS JS export yalnızca paketlemeyi doğrular.

## Issue #16 / PR #17 — İleride yapılacak native ay bölme/paylaşım kabulü

- [ ] Android/iOS SQLite v6→v7 additive migrasyon ve eski gerçek çalışma/profil/ayarlama/rutin verilerinin, uygulama kapatılıp açıldıktan sonra korunması.
- [ ] Ayın son günü 23:00–07:00 gece vardiyasında (Türkiye) Kasım/Aralık farklı profile göre 1h/7h doğru hesap.
- [ ] New York DST geri/ileri, Nepal 45 dakika ve Adelaide yarım saat UTC offsetlerinde ay sınırı UTC bölünmesi.
- [ ] Mola 0 otomatik; mola >0 kullanıcı başlangıç ayı dk girip kaydedince iki ayda ayrı bölüm, tekrar açılışta aynı tercih, düzeltmede v7 audit izi.
- [ ] İmkânsız mola dağılımı, UTC uçlarının değişmesi, çakışma ve ay sınırı çözümsüzse kazanç tahmininin bloke edilmesi.
- [ ] Kullanıcı onayı olmadan rapor paylaşılmaması; Share sheet iptal, CSV/JSON metin, başka uygulama seçme, gizlilik uyarısı, iOS/Android UI.
- [ ] TalkBack/VoiceOver, TR/EN, uzun rakam/eksi para, erişilebilirlik ve çevrimdışı çalışma.
- [ ] **Gerçek resmî bordro/net ücret/vergisel uygunluk iddiası yapılmıyor.**

**Durum:** Kullanıcının tercihiyle native cihaz QA sonraya bırakıldı ([Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)). JS export, Share sheet/SQLite v7 cihaz davranışını doğrulamaz.

## Issue #16 / PR #18 — Native ücret profili düzeltme kabulü (ertelendi)

- [ ] Mevcut SQLite v7 verisini native cihazda v8'e yükselt, v1 profil/veri korunumu ve boş revision tablosunu doğrula.
- [ ] Aynı ayın yeni profil v2/v3 düzeltmesi için gerekçe sorulması, eski oran ve UTC kayıt anının okunabilmesi.
- [ ] Uygulama kapat/aç sonrası tüm sürümlerin korunması; bir başka ekrandaki eski açık formdan düzeltme yapıldığında stale-revision reddi.
- [ ] Önceki sürümü seçerek hesaplama yapılması, güncel rapora dönme, CSV/JSON çıktısında doğru `profileId/revision`, geçmiş raporun birebir kopyası olmadığı uyarısı.
- [ ] TR/EN, TalkBack/VoiceOver, büyük yazı ve offline ekran deneyimi.
- [ ] İşveren onayı, net maaş/vergi/SGK/yasal katsayı iddiası olmadığının doğrulanması.

**Durum:** Kullanıcı isteğiyle gerçek cihaz QA ertelendi ([Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)). JS export native migrasyon ve persistans kanıtı değildir.

## Issue #16 / PR #19 — Native şifreli yedek cihaz kabulü (ertelendi)

- [ ] iOS/Android gerçek cihazda SQLite v8 tüm 18 tabloyu şifreli backup'a alma, 4M plaintext/8M encrypted envelope limitini güvenli reddetme.
- [ ] `AESEncryptionKey.generate` kriptografik key oluşturma, AES-256-GCM + AAD ve native sealedData biçimi; aynı cihaz ve farklı cihazda .vdb dosyasını key ile doğrulama; yanlış key/bozuk dosyayı reddetme.
- [ ] Recovery key ekranda görülür, ayrı kaydedildiği onaylanmadan Share açılmaz, anahtar .vdb/cache/SQLite/loglara yazılmaz; uygulamadan çıkınca key yaşam döngüsü.
- [ ] Android/iOS sistem Share ve DocumentPicker izinleri, .vdb paylaşımı, düşük disk alanı, dosyanın yanlışlıkla silinmesi, target app iptali, büyük dosya, offline.
- [ ] Dosya/anahtar doğrulamasında tablo sayıları doğru; **mevcut veritabanı hiçbir şekilde değişmemeli** (read-only verification).
- [ ] Çökme/uygulama kapat-aç, TR/EN, TalkBack/VoiceOver, gizlilik ve finans verisi paylaşım onayı.
- [ ] **Gerçek atomik restore / temiz hedef üzerinden tüm kullanıcı verilerini geri getirme henüz mevcut değil**; ayrı tasarım, geliştirme ve QA ister.

**Durum:** Kullanıcı gerçek cihaz QA'yı [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de erteledi; JS bundle AES native çalışma, dosya paylaşımları veya data restore kanıtı değildir.

## Issue #20 / PR #21 — Native temiz kurulum restore kabulü (ertelendi)

- [ ] Gerçek iOS ve Android'de birinci cihazdan v8 AES-GCM .vdb dosyası oluştur, 64-char recovery key'i ayrı tut, dosyayı ikinci temiz cihazda DocumentPicker'dan al, doğru/yanlış key ve bozuk dosyayı doğrula.
- [ ] Önizleme hiçbir SQLite yazımı yapmamalı. `RESTORE` metni yazılmadan veya ikinci Alert onaylanmadan restore gerçekleşmemeli.
- [ ] Gerçek temiz hedef: sadece 4 dokunulmamış seed şablonu + diğer 17 tablo boş; kayıplı güncelleme olmadan 18 tablo yeniden yükleniyor; profil revizyonu/UTC sessions/rutin/mola event satırları korunuyor.
- [ ] İkinci import, değiştirilmiş seed template, geçmiş çalışma/rutin, var olan `app_settings` içeren cihazda işlemi reddet, hedef verileri başlangıçla karşılaştır.
- [ ] Kesilen yazma, düşük disk/space, uygulamayı zorla öldürme/cihaz yeniden başlatma sırasında rollback veya tam restore; SQLite `PRAGMA integrity_check` ve `foreign_key_check`, WAL dosyaları ile tekrar açılış.
- [ ] `routine_reminders_opted_in`=0 olmalı, OS bildirim izni/eski bildirim trigger'ları otomatik etkinleşmemeli; kullanıcı yeniden bilinçli onay vermeli.
- [ ] TR/EN, TalkBack/VoiceOver, büyük font, uzun key, açılan/kapanan ekranlarda secret clear, offline ve cache lifecycle QA.
- [ ] Çok büyük >4M/8M backup, unsupported v7/v9, FK bozuk tarihsel snapshot, farklı IANA timezone ve kopya profil verisi fail-closed.

**Durum:** kullanıcı isteğiyle gerçek cihaz QA [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi. JS export/Node SQLite testleri **native restore kanıtı değildir**; [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık.

## 2026-11-19 — İlk gerçek Android cihaz kabulü: P0 FAIL + kullanıcı UX bulguları (PR henüz merge değil)

- İlk Android EAS `preview` APK: [build d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48), kaynak `13e7ba4fbbf53e4bdf28a708841379baccdf7857`. Kullanıcı **iki fiziksel Android telefona kurdu, ikisinde de uygulama penceresi açıldı**. **Telefonda A:** SQLite local database `NativeDatabase.constructor` → `java.lang.NoClassDefFoundError: expo.modules.sqlite.NativeDatabaseBinding`; veriler yüklenemedi, **D01 Android platform kabulü FAIL**. **Telefonda B:** veriler açıldı ama UX sorunları var; diğer D02–D10 ve iOS testleri tamamlanmadı. Cihaz modelleri/Android sürümleri ve JNI cause-chain logları henüz bilinmiyor; native sınıf/ABI hata kökenini tahmin edip sürüm yükseltme veya wipe yapma. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43).
- B cihazında gözlenenler: 8 günlük örnek döngü gereksiz; yeni custom vardiya/izin türü silinemiyor; IANA zone serbest metin girişi karmaşık; `needs_profile` iken `showEditor || needs_profile` form gizlenemiyor; Android sistem geri/home düğmeleri ile tab çakışıyor. [Issue #44](https://github.com/hilmiguner/vardiyum/issues/44).
- Kullanıcının **ayrı ürün isteği**: normal OT x1,5 / bayram OT x2, kullanıcı tanımlı mesai türleri. Mevcut `overtimeAfterMinutes` dönem toplam kaydedilmiş fiili çalışma eşiği (dk); `overtimeMultiplierNumerator/Denominator` tek rasyonel katsayı `3/2=1,5`. **Mevcut gerçek çalışma satırlarında mesai türü olmadığı için** bu isteği sırf iki UI butonu ekleyip doğru para tahminiymiş gibi gösterme. [Issue #45](https://github.com/hilmiguner/vardiyum/issues/45) ayrı doğru veri modeli/tasarım/CI/native QA ister, eski FIXED/FX BLOCKED koşulları korunur.
- **Bu açık kod dalında kaynak P0/UX düzeltmeleri:** 8 günlük örnek CTA kaldır, ilk döngü başlangıç taslağı 1 gün; custom template silme açık onay + SQLite atomik referans kontrolü (cycle, override, routine) ve sadece gerçekten silme onayında; city-based aranabilir IANA modal; ücret formu hide doğru; mevcut tek OT katsayısını açıklayan TR/EN metinler; `useSafeAreaInsets` alt tab height/padding, stack Ayarlar bottom safe-area; EAS `extra.eas.projectId=0ec5a8c3-f277-43d0-82c7-8b822835a4c2` gerçek kullanıcıdan doğrulandı ve source config'e eklendi (token/secret yok). **Source/Node test + JavaScript paketleme gerçek cihaz PASS değildir**. Native SQLite root cause ve gerçek Android A/B sonrası yeni APK retesti **halen açık**.
- Sıradaki: PR CI başarılı + kullanıcının ayrı merge onayı; native SQLite için Android A/B model, OS API, CPU ABI ve güvenli logcat; ardından yeni EAS APK derlemesi gerçek D01 tekrar testi, iOS fiziksel ve tüm D02–D10. D01 FAIL varken Stage 3 beta/Stage 4 mağaza YOK. [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38) dört kapı, kapsam dondurma ancak açık kullanıcı isteği P0/UX düzeltmelerine uygulanır.

## 2026-11-20 — ARM32 SQLite native library missing: build-source mitigation pending physical retest

**Physical evidence:** Galaxy A02s SM-A025F/DS (Android 12) runs `zygote32`, ABI `armeabi-v7a,armeabi` only. Extracted original first preview APK `d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48` directly from installed device (`adb shell pm path` / `adb pull`): among **22 ARM32 .so libraries**, `lib/armeabi-v7a/libexpo-sqlite.so=MISSING` while `libexpo-modules-core.so`, `libreactnative.so`, `libc++_shared.so` are PRESENT. Native runtime previously reported `java.lang.NoClassDefFoundError: expo.modules.sqlite.NativeDatabaseBinding`. For Expo SDK57 source, `NativeDatabaseBinding` calls `System.loadLibrary("expo-sqlite")` in companion initializer, so the missing architecture-specific .so is the strong concrete explanation. A23 SM-A235F/DSN Android14 opens SQLite (likely arm64, **not yet direct APK ABI inventory**). No data wipe is warranted.

**SDK 57 source findings:** `packages/expo-sqlite/android/shouldUsePublication.groovy` chooses a *prebuilt/published AAR* by default; if `expo.sqlite.enableFTS` Gradle property is explicitly set, it instead builds from native source. `packages/expo-sqlite/android/build.gradle` local native CMake `abiFilters (*reactNativeArchitectures())` includes `armeabi-v7a` in the defaults. SDK57 SQLite plugin `android.enableFTS: true` sets the Gradle property; FTS was already enabled by default and SQLCipher is NOT enabled. [Expo SDK57 SQLite config docs](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/); [Expo SDK57 source](https://github.com/expo/expo/blob/sdk-57/packages/expo-sqlite/android/shouldUsePublication.groovy).

**Candidate fix — OPEN PR #46, NOT MERGED:** Set `app.json` SQLite plugin `["expo-sqlite", {"android":{"enableFTS":true}}]`, forcing native compilation for the same SQL backend rather than relying on published Android binary. Add regression test `tests/native-preview-config.test.mjs` checking source-build guard and `scripts/verify-android-apk-native.ps1` to fail if `libexpo-sqlite.so` is absent for either ARM32 or ARM64 in generated APK. No changes to `src/data/database.ts`, migrations, saved data or encryption. **This is an unverified fix hypothesis until a new EAS preview APK is built, checked by script and installed on both actual devices.** Do not claim final native P0 resolved based only on JS CI.

**Next:** wait for PR #46 code CI, then safely build a preview APK from that PR branch (preferred: fresh worktree or separate clone, preserve user's existing local `C:\vardiyum\app.json` created by `eas init`). On Windows: `powershell -File scripts/verify-android-apk-native.ps1 -ApkPath <finished APK>`; require `armeabi-v7a SQLITE=True` and `arm64-v8a SQLITE=True`, then physically retest SQLite startup/persistence A02s and A23. Keep PR OPEN / D01 FAIL until real evidence; user approves merge separately. iOS physical remains NOT_TESTED. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43), [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38), [PR #46](https://github.com/hilmiguner/vardiyum/pull/46).

## 2026-11-20 20:29 — Android native EAS second build artifact verified, REAL DEVICE RETEST PENDING

- Source PR [#46](https://github.com/hilmiguner/vardiyum/pull/46) HEAD `dc6a4e19300d361939794f98f5c17bce0d68fc9c` (OPEN, not merged), CI [#44776687512](https://github.com/hilmiguner/vardiyum/actions/runs/44776687512) 351/351 tests PASS.
- User completed **new APK native build** `db787de4-e2d5-46f6-91e3-7c5c554e63d8` [Expo build](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/db787de4-e2d5-46f6-91e3-7c5c554e63d8), [artifact APK](https://expo.dev/artifacts/eas/So6mToPJbRvAk__pXPEo-qz0Wa3euivrL0ExLJelU-U.apk); finished 2026-11-20 20:29:34; SDK 57, version 0.1.0, code 1.
- User downloaded into `C:\vardiyum-native-qa\vardiyum-test.apk`, ran checked-in `scripts/verify-android-apk-native.ps1` and got **`armeabi-v7a REACT_NATIVE=True SQLITE=True`**, **`arm64-v8a REACT_NATIVE=True SQLITE=True`**, **`NATIVE_SQLITE_ABI=PASS`**. SHA-256 `1B88EE921F4AB584D17890F4B592B11C73667AAD9078DEEB942B3FD6D0D9702C`.
- Strong evidence that previously **missing ARM32 `libexpo-sqlite.so`** in old physical A02s APK is now packaged. **DO NOT claim physical SQLite bug fixed or D01 pass until new APK installed and exercised on A02s (Android12 zygote32) and A23 (Android14)**. Install with `adb install -r C:\vardiyum-native-qa\vardiyum-test.apk`, same signing key, do not uninstall/clear app data if signature mismatch; test opens all tabs, schedule saves and survives force stop/reopen, existing A23 data persists; safe area and UX fixes. Keep Issue [#43](https://github.com/hilmiguner/vardiyum/issues/43) and [#38](https://github.com/hilmiguner/vardiyum/issues/38) open pending physical acceptance, #45 custom OT planned separately.


## 2026-11-20 — İlk ARM32 gerçek cihaz SQLite PASS, A23 bekliyor

- **Gerçek cihaz:** Samsung Galaxy A02s `SM-A025F/DS`, Android 12, `zygote32` / `armeabi-v7a`; EAS preview build [`db787de4-e2d5-46f6-91e3-7c5c554e63d8`](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/db787de4-e2d5-46f6-91e3-7c5c554e63d8), kaynak commit `dc6a4e19300d361939794f98f5c17bce0d68fc9c`, APK SHA256 `1B88EE921F4AB584D17890F4B592B11C73667AAD9078DEEB942B3FD6D0D9702C`.
- **Kullanıcının doğrudan test sonucu:** (1) `Yerel veriler açılmadı` / `NativeDatabaseBinding` hatası tekrar etmiyor, (2) Bugün, Takvim, Rutinler, Kazanç açılıyor, (3) Ayarlar'da döngü kaydı yapıldı ve uygulama tamamen kapatılıp yeniden açıldığında **kalıcı**. **A02s SQLite P0 teşhis edilen cihazda düzeldi (PASS)**.
- ARM32 + ARM64 native SQLite kütüphaneleri aynı yeni APK'da `NATIVE_SQLITE_ABI=PASS`. Önceki APK'da ARM32 SQLite .so eksikti; Expo SQLite kaynak derleme ayarı bu eksikliği gidermiş görünüyor ve fiziksel cihazda doğrulandı.
- **Sıradaki cihaz:** Samsung Galaxy A23 `SM-A235F/DSN`, Android 14. **Yeni APK'nın** üzerine kurulumunun, eski kayıtların kalıcılığının, bottom-safe-area, vardiya/izin ekle-sil, şehir bazlı zone picker, ücret profili formu göster/gizle ve kaldırılmış örnek döngünün gerçek cihaz testi **BEKLİYOR**. `adb install -r C:\vardiyum-native-qa\vardiyum-test.apk`; önceki uygulamayı uninstall/clear etme, imza uyuşmazlığında dur.
- **MVP gate:** D01 Android `PARTIAL` (A02s ilk açılış ve SQLite kalıcılık PASS; A23 yeniden test bekliyor), Android kalan D02–D10 ve iOS D01–D10 NOT_TESTED. [PR #46](https://github.com/hilmiguner/vardiyum/pull/46) **OPEN**; explicit user merge onayı yok. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43) kök neden + cihaz kapsamı, [#38](https://github.com/hilmiguner/vardiyum/issues/38) takip. Beta/store henüz yok.

## 2026-11-20 22:08 — Galaxy A23 gerçek cihaz UX retest + ikinci patch (build gerekiyor)

- **Cihaz:** Samsung Galaxy A23 `SM-A235F/DSN`, Android 14, yeni EAS internal Android APK `db787de4-e2d5-46f6-91e3-7c5c554e63d8` (source `dc6a4e19300d361939794f98f5c17bce0d68fc9c`). **Kullanıcı sonucu:** Eski veriler geri geldi (**PASS**); yeni özel vardiya ve izin türleri siliniyor (**PASS**); saat dilimi seçimi (**PASS**); ücret profili formunu göster/gizle (**PASS**). **SAFE AREA PARTIAL/FAIL:** alt sekmelerin zemin/dokunma alanı hâlâ sistem geri/ana ekran bölgesinde. **DEFAULT DELETE FAIL:** Sabah, Akşam, Gece, İzin türlerinin silme seçeneği yoktu.
- **A02s SM-A025F/DS Android12:** aynı yeni APK ile SQLite açılış PASS, 4 sekme PASS, döngü kaydet/kapat/aç kalıcılık PASS; ARM32 `libexpo-sqlite.so` source-build root cause giderildi, güvenli navigasyon/daha geniş D02–D10 native QA henüz tamamlanmadı.
- **PR #46 ilave kaynak düzeltmesi (yeni EAS APK'da henüz yok):** `src/app/(tabs)/_layout.tsx` Android'de `SafeAreaView edges={['bottom']}` ile Tabs navigator'ı fiziksel bottom safe area **dışına** alıyor; `tabBarStyle` kendi içinde ikinci kez Android inset eklemiyor. Galaxy A23 **3-button + gesture navigation** üzerinde gerçek yeniden test gerekir; kaynak CI PASS native retest kanıtı değildir.
- **Varsayılan türleri kaldırma:** `src/app/settings.tsx` silme kontrolünü tüm `Sabah/Akşam/Gece/İzin` dahil görünür kılar; `src/domain/shift-template-deletion.ts` ve `src/data/shift-repository.ts` artık `custom_` ön eki zorunluluğu uygulamaz. Onay + Kaydet, atomik SQLite işlem: eski cycle konumu yeni türlere dönüştürülmeden silinemez; day override ve rutin (arşivlenmiş dahil) referansı varsa silinemez; son kalan tür korunur; actual UTC çalışması/audit bozulmaz. TR/EN kullanım mesajları güncellendi. [#44](https://github.com/hilmiguner/vardiyum/issues/44).
- **CI:** Bu kod değişikliği [Actions #44800321106](https://github.com/hilmiguner/vardiyum/actions/runs/44800321106) **SUCCESS 351/351**, formatting, lint, types, Android/iOS JS bundles başarılı. Fiziksel yeni APK **henüz oluşturulmadı**. [PR #46](https://github.com/hilmiguner/vardiyum/pull/46) **OPEN** / main değişmemiş; kullanıcıdan ayrı merge onayı bekle.
- **Yerel QA klasörü:** Kullanıcı `C:\vardiyum-native-qa` silinsin mi diye sordu. **Şimdilik tutmak yararlı:** açık PR branch'inden bir sonraki APK'yi aynı ayrı klonda derleyebilir, eski APK ve kontrol betiği orada. Son başarılı cihaz retest / merge sonrası `git status --short` ve tekil dosya kontrolüyle opsiyonel silinebilir; ana `C:\vardiyum` çalışma alanı etkilenmez. Gizli anahtarları/keystore'ları silme/taşıma yok.
- **Gates:** Android D01 `PARTIAL` (SQLite PASS iki cihaz; A23 safe-area hâlâ FAIL), D02–D10 Android kısmen ilerledi ama tam kabul değil, iOS D01–D10 NOT_TESTED. Henüz beta/store yok. Mesai tipleri (#45) ayrı ürün işi.

## 2026-11-21 — Galaxy A23 ikinci APK: fiziksel cihaz testi ve kalan tab hizalaması

- **Samsung Galaxy A23 / Android 14, kullanıcı tarafından test edildi:** Yeni EAS preview APK yüklendi. (1) Sekmelere tıklanabiliyor; sistem tuşlarının altındaki önceki erişim çakışması görselde yok. (2) Varsayılan Sabah/Akşam/Gece/İzin şablonlarının Sil seçenekleri görünüyor. (3) Kullanılmayan şablon Sil + Kaydet sonrasında uygulamayı kapat/aç ile silinmiş kalıyor. (4) Önceki kayıtlar korunuyor. Bunlar **A23 fiziksel veri koruma + varsayılan şablon silme PASS** kanıtıdır.
- **Kalan görsel UX:** Kullanıcının ekran görüntüsünde Bugün sekmesinin gri aktif arka planı çok büyük ve Unicode ikon/etiketlerin dikey çizgisi görsel olarak tutarsız; sekmeler yatayda yaklaşık eşit dağıtılıyor. PR #46 üzerinde yeni bir **kaynak kozmetik adayı**: aktif/inaktif arka plan aynı kart rengi, sabit below-icon etiket, 28x28 icon center ve Android includeFontPadding=false. Ayrı statik regresyon testi eklendi. Bu yeni patch için native APK ve cihaz doğrulaması **YAPILMADI**.
- **Kanıt sınırı:** Bu turda kullanıcı yeni Expo build ID/SHA bildirmedi. Önceki yönergenin beklenen kod SHA'sı 438b2af4 idi, gerçek APK source SHA henüz bağımsız doğrulanmadı. Yalnız ekran görüntüsü ve kullanıcı fiziksel gözlemi kanıtlandı; Galaxy A02s önceki SQLite PASS sonucu geçerli ama bu son buildte tekrar edilmedi. Android D01 **PARTIAL**, Android D02-D10/iOS tam QA açık, beta/store hazır değil. PR #46 OPEN/unmerged; kullanıcıdan ayrı merge onayı gereklidir. Issue #43/#44/#38 açık takip.

### 2026-11-21 — Gece yarısı Bugün ekranı tarih yenilemesi (kaynak düzeltmesi, native test bekliyor)

- A23 ekran görüntüsünde telefon saati **00:23**, Bugünkü vardiya etiketi **2026-11-20**, program IANA zone **Europe/Istanbul**. Ekran görüntüsü bu yerel gece yarısından sonra alındıysa bugün 2026-11-21 olmalı. Kodda TodayScreen takvim tarihini render anında hesaplıyor; ekran gece yarısı boyunca açık kalırsa odak/clock değişikliği olmadan tarih yenilenmeyebilir. Cihazda ekranın ne zaman açıldığı bildirilmediği için bu **muhtemel kaynak kök neden** olarak ele alındı, kesin native regresyon kanıtı değil.
- PR #46 kaynak düzeltmesi: Bugün ekranı odaktayken 15 saniyelik düşük sıklıklı kontrol, tab odağına dönüşte ve AppState `active` anında `calendarDateInZone(schedule.timeZone)` değerini yeni instant ile yeniler. Gece yarısı/foreground tüm geçişlerinde mevcut IANA zone'u esas alır. SQLite/mali kaynak mutasyonu yok. `tests/shift-engine.test.mjs` İstanbul UTC 20 Kasım 21:00 = yerel 21 Kasım 00:00 geçiş sınırını doğrular. Native cihazda **henüz test edilmedi**; A23 ve A02s üzerinde gece yarısı/resume gereklidir.
- Önceki fiziksel PASS sonuçları etkilenmez; yeni tab hizalama + yeni gün yenileme patch'leri için APK retest ve en güncel CI gerekir. PR OPEN/unmerged, beta/store açık.

## 2026-11-21 — Pixel 7 API36 emülatör: 4/5 kontrol + tab bar görsel yerleşim düzeltmesi

- Kullanıcı ekran görüntüsü ve işaretli checklist ile **PASS** bildirdi: Bugün/Takvim/Rutinler/Kazanç sekmeleri açılıyor; `Bugün` tarihi 2026-11-21 olarak gösteriliyor; vardiya döngüsü kaydı yeniden açılışta korunuyor; kullanılmayan başlangıç vardiya türü silme + kaydet + tekrar açma başarılı. Navigasyon ikon/yazıları **FAIL / görselde dikey olarak alt kenara sıkışık**. Alt Android sistem navigasyon şeridiyle doğrudan çakışma görünmüyor. Kullanıcı checklist'i 4/5 seçti.
- **Saat dilimi kanıt ayrımı:** Emülatör screenshot'ında `Schedule time zone: GMT` yazıyor; bu nedenle tarih ekranında 21 Kasım görülmesi, kayıtlı **Europe/Istanbul** gece yarısı devri testinin PASS olduğu anlamına gelmez. Türkiye saat dilimi / odakta kalmış sekmede gece yarısı/resume hâlâ ayrı doğrulama gerektiriyor.
- **Geliştirme:** `src/app/(tabs)/_layout.tsx` React Navigation'ın cihaz ölçüsüne göre otomatik bar item/icon/label yerleşimi yerine `Tabs tabBar` custom bar kullanıyor. Çubuğun yüksekliği 64 dp, dört `Pressable` tam eşit `flex:1` genişlikte; ikonlar 32x28 slotta, metin 16 lineHeight ile dikey ortalanmış grupta; basma `tabPress` / `defaultPrevented` / `navigation.navigate` ve uzun basma `tabLongPress` semantiği, selected accessibility state ve screen reader etiketleri korunuyor. Kök `SafeAreaView edges={['bottom']}` hem Android hem iOS alt sistem alanını barın dışında tutuyor; seçili gri arka plan kaldırıldı. `tests/tab-bar-layout.test.mjs` layout ve navigasyon kaynak regresyon denetimi güncellendi. **BU PATCH HENÜZ EMÜLATÖRDE FİİLEN TEST EDİLMEDİ**.
- **Güvenli kullanıcı adımı:** Mevcut ayrı `C:\vardiyum-native-qa` çalışma ağacında `git status --short` ve gerekiyorsa tracked `package.json` diff kontrolü, `git pull --ff-only origin fix/native-d01-mvp-ux-gates`, `npm run check` yerel; açık Metro terminalinde `r` reload (JS-only patch, yeniden EAS/native build şart değil). Vardiyum'un 4 sekmesi arasında geçip hizalamayı yeni ekran görüntüsüyle kontrol et. İş Samsung A23'e debug bağlantısı kurulmayacak.
- GitHub Free CI kotası için PR branch workflow `workflow_dispatch` ile otomatik tetikleyici kapalı, `main` bozulmadı. PR #46 OPEN/unmerged; 2026-12-01'de tek kontrollü CI/merge politikası geçerli.

## 2026-11-21 — Pixel 7 / Android 16 emülatör navbar görsel kabulü: PASS (5/5)

- Kullanıcı, yeni custom 64dp tab bar patch'i ve yerel kalite kontrolü sonrasında Pixel 7 API36/x86_64 Android emülatör ekran görüntüsünü paylaştı: **sekmelerin 4 simgesi ve etiketleri artık görsel olarak yatay/dikey dengeli, tab bar içinde ortalanmış; gri seçili-blok yok; Android gesture/system navigasyon alanına taşmıyor.** Kullanıcı açıkça “Problem çözülmüş” dedi. Navbar görsel kusuru **Android emülatör için RESOLVED/PASS**.
- Önceki kullanıcı checklist'i 4/5 idi: Bugün/Takvim/Rutinler/Kazanç açılıyor (PASS), Bugün tarih gösterimi PASS, vardiya döngüsü restart kalıcılığı PASS, kullanılmayan varsayılan şablon silme kalıcılığı PASS; **navbar görsel PASS eklenince emülatör checklist 5/5**. Ekrandaki bugün tarihi 2026-11-21, schedule zone **GMT**. Bu doğrulama **Europe/Istanbul gece yarısı arka plandan dönme testi değildir**; ayrı QA hâlâ açık.
- Kullanıcı yerel `npm run check` için **LOCAL_QUALITY=PASS** bildirdi: Prettier PASS, ESLint 0 error/29 warning, TypeScript PASS, **353/353 unit tests PASS**. Bu local test kanıtıdır; GitHub CI değil. Real-device A23 eski kullanıcı testleri korunur, kurumsal A23'te yeni debugging yapılmaz. Emülatör başarılı olması ARM32/A02s ve iOS gerçek cihaz doğrulamasının yerine geçmez.
- **PR #46 OPEN/unmerged**; dalda GitHub otomatik CI `workflow_dispatch` only; Free kota nedeniyle 2026-12-01 öncesinde manuel GitHub Actions başlatma. Yeni özellikler aynı PR dalında yerel kalite/test ile ilerler; 1 Aralık workflow restore + tek PR CI ve ayrı merge onayı. Kullanıcı yerel `package.json` ve `expo-env.d.ts` modified dosyalarını koruyor.

## 2026-11-21 — Yeni gece yarısı regresyon testlerinin yerel sonucu

- PR #46 kaynak `b586e6d`, kullanıcı Windows `npm run check`: **355/355 PASS** (İstanbul midnight yenileme + kayıtlı IANA zone testi dahil), Prettier/TS PASS; ESLint 0 error/29 warning. Bu yalnız saf/yerel testtir; E06-A/B/C **PENDING** ve gerçek Android/iOS kabulü henüz tam değildir.
- Sonraki doğrudan adım: Pixel 7 API36 emülatörde Ayarlar'da mevcut GMT'den `Europe/Istanbul` program bölgesine açık onayla geç, uygulamayı tamamen kapatıp yeniden açarak korunmasını doğrula. Önceki UTC gerçek çalışma kayıtları sessizce değişmemelidir. `E06-A` için gözlemi PASS/FAIL/BLOCKED olarak bildir; daha sonra gece yarısı E06-B ve foreground E06-C yapılacaktır.

## 2026-11-21 — E06-A Android emülatör kabulü

- **E06-A PASS / kullanıcı doğrudan test gözlemi:** Pixel 7 Android16 x86_64 emülatöründe Ayarlar'da program `Europe/Istanbul` kaydedildi. Uygulama tamamen kapatılıp yeniden açıldığında seçim korundu; Bugün ekranı hatasız açıldı. Eski UTC gerçek çalışma kayıtlarının birebir bütünlük kontrolü test edilmedi.
- **E06-B/E06-C PENDING:** Sanal cihazın zone'u İstanbul değilse sanal ekranda 23:59 = İstanbul 23:59 demek değildir. İstanbul UTC+03, GMT cihazda 20:59→21:00 GMT geçişi İstanbul takviminde 23:59→00:00'a eşittir. Mümkünse sanal Android cihaz bölgesini `Europe/Istanbul` yap, yalnız emülatör saatini değiştir. Uygulama odaktayken geçişi (B) ve Home ile arka plandan dönüşü (C) ayrı gözle; her iki senaryodan sonra otomatik tarih/saat ayarını geri aç. Windows bilgisayar saatini değiştirme. Ekran ve gözlemler sunulmadan E06-B/C PASS sayılmaz.

## 2026-11-22 — E06-B kullanıcı gözlemi: PASS

- **Ortam:** Pixel 7 Android 16 API36 x86_64 emülatör, kaydedilmiş schedule IANA `Europe/Istanbul`. Emülatör 2026-11-21 23:59→2026-11-22 00:00 yerel saat geçişine ayarlandı.
- **Gözlem:** Kullanıcı, Bugün ekranı ön plandayken tarih etiketinin yaklaşık **5–6 saniyede otomatik güncellendiğini** belirtti. Ekran görüntüsü `00:00`, `Today's shift · 2026-11-22`, `Next day 2026-11-23`, `Schedule time zone: Europe/Istanbul`. **E06-B PASS**; kodun 15 sn polling hedefi karşılandı. E06-A önceki PASS.
- **E06-C PENDING:** Bugün sekmesinde 23:59'da `Home` ile arka plana çık, 00:00'ı geçirip uygulamayı tekrar öne al; Bugün ve yarın tarihleri otomatik düzelmeli. Uygulamayı durdurma/veri temizleme yok; yalnız emülatörün saatini geçici ayarla ve sonunda geri aç. Bu ayrı `AppState`/focus yoludur, E06-B PASS sonucundan çıkarılamaz. Gerçek fiziksel Android/iOS kabulü sürer.

## 2026-11-22 — E06-C arka plandan gece yarısı dönüş: PASS / E06 3/3

- Pixel 7 Android16 API36 emülatör / `Europe/Istanbul` program bölgesi: kullanıcı 21 Kasım 23:59'da Vardiyum'u Home ile arka plana aldı; 22 Kasım 00:00 sonrasında uygulamaya döndü, Bugün `2026-11-22`, yarın `2026-11-23`. **E06-C PASS (kullanıcı doğrudan bildirimi, ayrı ekran görüntüsü yok)**; E06-A/B önceki PASS; E06 A/B/C tümü emülatör seviyesinde tamamlandı. Gerçek cihaz ve iOS native D06 tamamlanmış değil.
- **Yeni E05-A testi (PENDING):** emülatörün otomatik tarih/saat/zaman dilimi geri açıldıktan sonra Vardiyum'u aç. Rutinler sayfasında kullanıcı `Hatırlatmaları etkinleştir` seçmeden OS bildirim izni sorulmamalı. İlk etkinleştirme sırasında izin önceden verilmediyse Android 13+ OS izni çıkması, `İzin verme` sonrası uygulamanın hata/crash yaşamadan hatırlatmaları kapalı tutması beklenir. Önceden izin verilmiş/izin reddedilmişse ilk-prompt kabulü koşulludur; clear data/uninstall veya DB wipe yapma. Bildirim teslimi ayrıca E05-B'dir. Gerçek maaş/rutin verileri yerine sentetik test kayıtları kullan.

## 2026-11-21 — E05-A bildirim permission denied emülatör PASS; kesilen Alert başlığı

- **Pixel 7 Android16 API36 x86_64 kullanıcı gözlemi:** Otomatik tarih ve saat yeniden açıldı; Rutinler ekranı kendiliğinden Android izin istemedi; `Enable reminders` sonrasında sistem izin penceresi geldi; kullanıcı `Don't allow` dedi; uygulama çalıştı. Ekranda uyarı `Notifications are denied or restricted. Enable them in syste...` kesilmiş, Alert başlığına uzun body yazıldığı kodda doğrulanmıştır. İzin akışı **E05-A PASS**, fakat izin reddi sonrası tam DB restart kalıcılığı bu testte incelenmedi.
- **PR #46 kaynak düzeltmesi:** `Alert.alert(t('reminderGlobalTitle'), t('reminderPermissionDenied'))`; ayrılmış kısa başlık + açıklama, mevcut TR/EN çeviri korunur. İki yeni kaynak regresyon testi var. **Yeni patch için Windows local check ve emülatör UI retest PENDING**. OS izin penceresi reddedilmiş izin için ikinci kez görünmeyebilir; yalnız uygulama Alert görünümü incelenir, uninstall/clear data yapılmaz. E05-B bildirim teslim testi ayrı ve henüz yapılmadı.

## 2026-11-21 — E05-A kesilmiş Android Alert görsel regresyonu: PASS

- PR #46 `Alert.alert(short title, full message)` sonrası kullanıcı Pixel 7 emülatör ekran görüntüsü paylaştı. `Local routine reminders` kısa başlığı, `Notifications are denied or restricted. Enable them in system settings; tasks remain available.` **tam gövde mesajı** ve `OK` görünür. Önceki başlık kırpılması giderildi; **E05-A denied UI retest PASS**. Bu screenshot kod testinin `357/357 PASS` olduğu anlamına gelmez; kullanıcı yeni `npm run check` sonucunu henüz sağlamadı, önceki 355/355.
- **E05-B PENDING / planlı teslim:** yalnız Android Pixel 7 emülatörde, sistem saati otomatik. OS Settings > Apps > Vardiyum > Notifications izin ver; Rutinler'de ayrıca `Enable reminders` ile kullanıcı opt-in yap. Bugün için +3–5 dakika `HH:mm` filtresiz, etkin, tamamlanmamış sentetik rutin tanımla; Home ile arka plana al; vade gelince OS banner/bildirim alanını kontrol et. Gelirse tarih, local saat, şablon bilgisi ve veriye zarar vermeden ekran kanıtı; gelmezse FAILURE nedenini kaydet. Test sonrası yalnız test rutinini arşivle ve uygulama hatırlatmalarını kapat. Gerçek Android cihaz/iOS teslimi hâlâ NOT_TESTED.

## 2026-11-21 — E05-B Pixel 7 emülatör gerçek planlı bildirim teslimi PASS

- **Kullanıcının gözlemi ve Android shade screenshot:** Pixel 7 Android16 API36 emülatör, sentetik rutin `Bildirim Testi` 23:19'a planlandı, bildirim hedef saatten yaklaşık 10 sn sonra geldi. Shade üzerinde `23:19 Sat, Nov 21`, `Vardiyum · now`, `Vardiyum` ve rutin gövdesi `Bildirim Testi` göründü. **E05-B PASS**. Ekran görüntüsü tam saniye zaman damgasını göstermediği için +10 sn kullanıcı gözlemidir, kesin ölçüm değildir; tüm native güç/cihaz senaryoları PASS sayılmaz.
- **E05-C PENDING:** Önce var olan sentetik `Bildirim Testi` görevini arşivle. Yeni hatırlatma saatli sentetik rutinini 4–5 dakika sonraya kur, uygulama hatırlatmalarını hedeften **önce** kapat; planlanan saatten birkaç dakika sonraya kadar yeni Vardiyum bildirimi gelmediğini kontrol et. Güvenli test bittikten sonra rutin arşivli ve uygulama opt-out kalmalı. Zaman geçmeden opt-out yapamazsan test PASS kabul edilmez. Android OS izinleri, diğer uygulama bildirimleri, gerçek veriler değiştirilmez; emulator automatic time on kalır. Gerçek cihaz/iOS D05 testi açık.

## 2026-11-21 — E05-C kapatma sonrası bildirim gelmedi: emülatör PASS

- Kullanıcı Pixel 7 Android16 emülatöründe hatırlatmaları kapattıktan sonra planlanan bildirimin **gelmediğini** doğruladı. **E05-C PASS (son kullanıcı gözlemi)**; OS pending request IDs listesi ve rutin arşivleme ayrıca test edilmedi. E05-A/B/C emülatör kısa akışı **3/3 PASS**, fiziksel Android/iOS D05 kabulü açık.

### E08-A1 — Şifreli yedek dosyası ve salt-okunur doğrulama (PENDING)

1. Sadece emülatörde ve mümkünse sentetik test verisiyle **Settings → encrypted backup → Create encrypted backup**. Kurtarma anahtarı gizlidir; paylaşma, ekran görüntüsü alma, loga basma. `I saved the key` onayı olmadan `.vdb` paylaşımı açılmamalı.
2. Anahtarı **dosyadan ayrı**, özel ve geçici güvenli yere kaydet; anahtar paylaşımı yapma. `Share` ile yalnız şifreli `.vdb` dosyasını kullanıcı kontrollü güvenli bir konuma al; dosyanın ulaşılabilir olduğundan emin ol.
3. `Select encrypted file` → aynı dosya → **yanlış ama geçerli biçimde 64 hex haneli** test anahtarı → `Verify`: deşifre reddedilmeli, verified preview / restore seçeneği açılmamalı; mevcut uygulama çalışmalı.
4. Aynı `.vdb` dosyasını yeniden seç → gerçek anahtarı cihaz UI'ya gizlice gir → `Verify`: 18 tablo ve toplam satır sayısı / tarih önizlemede görünmeli. Bu **salt-okunur doğrulama**, gerçek restore değildir.
5. **DOKUNMA:** `RESTORE` metni, Restore onay düğmesi, uygulama verilerini temizleme/uninstall, mevcut dolu emülatörde geri yükleme. Ayrı temiz hedef yoksa D08 restore `PENDING` kalır. Test sonucu yalnız PASS/FAIL, tablo sayısı ve *anahtar içermeyen* hata metni olarak bildirilmeli.

- Kaynak kontrolü: `EncryptedBackupPanel` ayrı `verify()` read-only yolunu ve `confirmRestore()` içinde literal `RESTORE` + ikinci native Alert'i kullanıyor; `encrypted-backup-files.ts` yalnız AES ciphertext `.vdb` paylaşıyor. Native E08-A1 başarı sonucuna kadar bütün maddeler PENDING.

## 2026-11-21 — E08-A1 encrypted export/Drive save kullanıcı PASS, doğrulama PENDING

- Kullanıcı ilk screenshot'ta key görünmesi nedeniyle yeni anahtarlı şifreli yedek oluşturup Drive'a kaydettiğini bildirdi. **Create + Drive save: USER-PASS**. `.vdb` dosyasının gerçek içeriği, yeni key'e ait oluşu, 18 tablo ve read-only decrypt **PENDING**; eski screenshot key'i artık güvenli değil, yeniden kullanma.
- Dosya adı günlük `vardiyum-encrypted-YYYY-MM-DD.vdb` olduğundan Drive'da aynı isimli iki kayıt bulunabilir; en son oluşturulmuş dosyayı seç. Test: `Select encrypted file` → yanlış biçimi-geçerli 64 hex key ile `Verify` reddi; yeniden seç → doğru yeni key ile salt-okunur 18 tablo preview. Anahtarın kendisini/screenshot'ını sohbete gönderme. `RESTORE` yazma/onaylama, silme/clear data/uninstall yok.

## 2026-11-21 — E08-A1 Android emülatör yanlış anahtar doğrulama reddi PASS

- Kullanıcı screenshot'ı yanlış anahtarla `Verify` sonrası **`Backup not verified; key, integrity or version mismatch`** ve `BACKUP_DECRYPTION_OR_VALIDATION_FAILED` uyarısını gösterdi. **Wrong-key rejection PASS**; bu dosyanın doğru key ile okunması veya real restore anlamına gelmez.
- Sonraki adım: en yeni Drive `.vdb` dosyasını seç, gerçek yeni recovery key'i **paylaşmadan** uygulamaya gir, sadece `Verify` ile 18 tablo, tarih ve toplam kayıt sayısının salt-okunur önizlemesini kontrol et. Önizleme dışında `RESTORE` akışına girme; dolu hedefe geri yükleme yasak. Doğru-key sonuç gelene kadar E08-A1 bütünleşik tamamlandı sayılmaz.

## 2026-11-21 — E08-A1 doğru anahtar başarısız; güvenli yeniden test (PENDING)

- **FAIL** kullanıcı ekran görüntüsü: doğru yeni kurtarma anahtarı denenmesine rağmen `Backup not verified; key, integrity or version mismatch` + `BACKUP_DECRYPTION_OR_VALIDATION_FAILED`; authenticated 18-table preview yok. Eski Drive dosyası ile yeni key'in eşleşmeme ihtimali var ancak native şifreleme/payload hatası da mümkündür; kesin neden bilinmiyor. Başlangıçtaki yanlış-key PASS sonuçları korunur.
- **Patch QA:** Kaynak JS pull + `npm run check` sonrasında Metro reload; aynı emülatörde yeni `Create encrypted backup`: **self-check** otomatik yapılır. `BACKUP_EXPORT_SELF_CHECK_FAILED` görülürse paylaşma, sonucu bildir (native AES/validation incelemesi gerekir). Self-check başarılıysa kurtarma anahtarı UI'da çıkar, yeni `.vdb` zaman+UUID benzersiz isimle kaydedilir; yalnız key'i kendin sakla ve güvenli Drive'a sadece ciphertext paylaş. Sonra aynı yeni dosya+key ile **yalnız Verify**; 18 tablo ve doğru satır sayısı beklenir. Hâlâ FAIL ise dosyayı/key'i paylaşma, restore etme, sonuçla devam et.
- **DOKUNMA:** `RESTORE` yazma/onaylama, uygulama verilerini temizleme/uninstall, key screenshot'ı, şifresiz veri/log gönderme. Eski dosyalar silinmez, yeni fonksiyonlar veritabanına yazmaz. Kaynak/regresyon QA geçmeden E08 PASS yazma; emülatör ve gerçek cihaz ayrı kapsamdır.

## 2026-11-22 — E08 native export self-check kullanıcı cihaz testi bekliyor

- Kaynak patch'inden sonra Windows `npm run check` için kullanıcı **PASS** bildirdi, terminalin kesin test toplamı alınmadı (359 bekleniyor). Pixel 7 / Android16 emülatör E08 yeni `Create encrypted backup` otomatik self-check henüz çalıştırılmadı. Eski doğru-key verify FAIL devam ediyor.
- Test (veri silme/restore yok): aktif Metro'da JS `r` ile güncelle; Vardiyum Ayarlar → `Create encrypted backup`. Yeni key ve paylaşım arayüzü çıkarsa cache ciphertext readback + same-key decrypt self-check geçmiş olmalı. `BACKUP_EXPORT_SELF_CHECK_FAILED` çıkarsa paylaşma ve yalnız kodu bildir. Recovery key ekran görüntüsü, `.vdb`, anahtar veya özel veri sohbete gönderilmez. Restore temiz hedefi henüz kurulmadı.

## 2026-11-22 — E08 Android export self-check FAIL ve güvenli aşama teşhisi

- **Kullanıcının tam ek çıktısı:** `C:\vardiyum-native-qa` `git pull --ff-only` FAST-FORWARD `1eb0b6f..550550b` PASS; `npm run check` Prettier PASS; ESLint **0 errors/29 warnings**; TypeScript PASS; Node **359 tests / 359 pass / 0 fail / 0 skipped**. `MODULE_TYPELESS_PACKAGE_JSON` uyarıları bilgilendirici.
- **Emülatör screenshot:** Android16 Pixel 7 içinde `Create encrypted backup` → `Failed to create backup` / `BACKUP_EXPORT_SELF_CHECK_FAILED`. Sonradan en son Drive dosyasını seçmeden, yerel oluşturma/doğrulama yolunda FAIL olduğu için sadece Drive eşleşmesi sorunu olduğunu varsayma. Correct-key imported verify da önceki testte FAIL; yedeğin doğruluğu henüz gösterilmedi, **E08 bloke**. Kurtarma anahtarı görünmediği için güvenli paylaşım kapısı kapalı kaldı.
- **PR #46 kaynak `ed38975`:** `EncryptedBackupPanel.generate` sadece kendi yeni ürettiği ciphertext'i cache'den okuyup aynı key ile kontrol ederken `BACKUP_EXPORT_CHECK_CACHE_READ_FAILED`, `CACHE_MISMATCH` ve `checkFreshEncryptedBackup` üzerinden `ENVELOPE`, `KEY_FORMAT`, `KEY_IMPORT`, `COMBINED`, `AES_DECRYPT`, `BYTES`, `UTF8`, `PAYLOAD` sabit aşama kodlarını verir. Dışarıdan seçilen .vdb için generic `BACKUP_DECRYPTION_OR_VALIDATION_FAILED` davranışı aynen kalır. Anahtar/payload/native exception/metin hash'i/log gönderilmez; AES biçimi, SQLite ve Restore değişmez. Yeni 1 statik regresyon testi eklenmiş, yeni beklenen toplam **360**.
- **NEXT:** yerel `git pull --ff-only origin fix/native-d01-mvp-ux-gates` ve `npm run check` (beklenen 360/360), Metro'dan `r` reload, yalnız `Create encrypted backup`. Hata varsa **yalnız sabit hata kodunu** bildir; anahtar ekranı görünürse sadece PASS olarak bildir, ekran görüntüsünde key paylaşma. Hâlâ dosya dışa aktarma, RESTORE, emülatör verilerini temizleme YOK. GitHub Actions başlatma, kullanıcı onayı olmadan merge yok.

## 2026-11-22 — E08 COMBINED_FAILED kök neden / Android sealed data ByteArray

- **Kullanıcının ekran görüntüsü:** `Create encrypted backup` aşamasında `BACKUP_EXPORT_CHECK_COMBINED_FAILED`. İlk baştaki yanlış-key reddi PASS, doğru-key Drive Verify FAIL ve self-check FAIL kalır; yeni native roundtrip henüz geçmedi.
- **Resmî native kaynak:** `expo/expo` `sdk-57`, `packages/expo-crypto/android/src/main/java/expo/modules/crypto/aes/AesCryptoModule.kt`, `StaticFunction("fromCombined") { combined: ByteArray, ... }`. Önceki `AESSealedData.fromCombined(encoded)` ifadesi Base64 string verdiği için Android `ByteArray` türüne uymaz. `combined('base64')` çıktısını JSON dosyada saklamak doğrudur, ancak parse öncesi bayta çevirmek gerekir.
- **PR #46 patch:** `decodeBase64Bytes` (strict/kanonik karakter, padding ve kapasite kontrolü; saf JS); hem `checkFreshEncryptedBackup` hem `openEncryptedBackup` artık `AESSealedData.fromCombined(decodeBase64Bytes(...))` kullanıyor. Eski `.vdb` içerik biçimi, AES-256-GCM AAD, kurtarma anahtarı, SQLite v8, 18 tablo, clean-target restore korumaları **aynen kalıyor**. Dosya, gizli anahtar veya gerçek kullanıcı verisi taşınmadı; external Verify hataları hâlâ genel.
- **Regresyon:** Node Buffer byte dizileriyle strict decoder karşılaştırması ve Android hem fresh-export hem import byte konversiyon gate testleri eklendi (beklenen toplam 362). Yardımcı kodun bağımsız Node vektör sanity kontrolü **PASS**, fakat branch'in tüm `npm run check` ve Pixel 7 emülatör denemesi **PENDING**.
- **NEXT:** `C:\vardiyum-native-qa` konumunda `git pull --ff-only origin fix/native-d01-mvp-ux-gates`; `npm run check` (362/362 beklenir); Metro `r` reload; yalnız `Create encrypted backup`. Anahtar UI görünürse yalnız `SELF_CHECK=PASS` de, anahtar fotoğrafı verme. Hata varsa sadece `BACKUP_EXPORT_CHECK_*_FAILED` kodunu bildir. Self-check geçmeden Drive'a yedek gönderme. `RESTORE`, clear data/uninstall, GitHub Actions veya merge yok.

## 2026-11-22 — E08-A1 fresh local backup self-check Android emulator PASS

- **Kanıt:** Kullanıcı yalnız `SELF_CHECK=PASS` bildirdi; uygulamanın yeni oluşturduğu yedek `readEncryptedBackupFromCache` → stored ciphertext equality → `checkFreshEncryptedBackup` (native `Uint8Array` import, AES-GCM + payload) kapısından geçerek yeni recovery key UI aşamasına ulaştı. **Local fresh-export self-check PASS (user observation).**
- **E08-A2 Drive read-only roundtrip PENDING:** Anahtarı ayrı sakla, şifreli yeni UUID/timestamp `.vdb` paylaşımını özel Drive'a yap, `Select encrypted file` ile aynı dosyayı tekrar yükle, key'i yalnız uygulama UI içinde gir ve `Verify` yap. `createdAt`/18 tablo/row count beklenir. **RESTORE/clear data/uninstall yapma**, anahtarlı screenshot/dosya paylaşma. Eski yedek isimleriyle karıştırma; hata olursa salt kodu ver. Fiziksel cihaz, iOS ve clean-target restore açık.
## 2026-11-22 — E08-A2 Drive roundtrip read-only verification PASS

- **Kullanıcı görsel kanıtı:** `Backup verified`, `2026-11-21T21:20:10.396Z`, 10 kayıt / 18 tablo. Kaynak dağılımı 3 vardiya şablonu, 1 döngü, 1 döngü günü, 2 rutin, 1 ayar, 2 rutin tamamlama olayı; gerisi boş. Doğru key ile Android Pixel 7 emülatörde `.vdb` Drive'dan içeri alınarak authenticated snapshot preview **PASS**. Yanlış-key reddi önceki testte PASS. Native actual clean-target restore **NOT_TESTED**.
- **E08-A3/PENDING, YALNIZ HAZIRLIK:** Android Studio → Device Manager → Create device → ikinci Pixel 7 Android16/API36 x86_64 AVD `Vardiyum_Restore_QA_API36`. Var olan kaynak `Pixel_7_API_36` kullanıcı verilerini olduğu gibi bırak; gerekiyorsa yalnız kapat. **Hiçbir AVD'yi wipe/delete etme, uygulamayı kaldırma, veritabanı temizleme veya mevcut kaynağa Restore yapma.** Yeni hedefte kodun aradığı clean precondition: tam dört untouched shift_templates `morning/evening/night/off`; diğer 17 SQLite iş tablosu boş. Yeni hedefte bile `RESTORE` yalnız net cihaz/serino ve default DB doğrulamasından SONRA ayrı kabul oturumunda yapılacak. Kaynak screenshot/backup key paylaşılmayacak.
- **Beklenen ileriki gerçek restore sonucu (henüz ölçülmedi):** `restoredRows=10`, `tableCount=18`, reminder consent reset ve tekrar kullanımda duplicate restore reject; yeni hedefte yalnız kaynak 3 template ve toplam 10 iş kaydı. Doğrulama ekranı 10 satırsa gerçek DB yazımı yapılmış demek değildir. Hata/roll-back/düşük disk/offline ve iOS ayrıca test edilmeden bunlara PASS deme.
