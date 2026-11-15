# Vardiyum — Test ve Kabul Stratejisi

**Durum:** Henüz testler yazılmadı; aşağıdakiler **planlanan** doğrulamalardır.

## 1. Birim testleri — saf motorlar

### Vardiya motoru
- Döngü: 2 sabah, 2 akşam, 2 gece, 2 izin; 8. günden sonraki ilk gün doğru.
- 1 günlük, 7 günlük, 8 günlük, 21 günlük ve daha uzun döngüler.
- Başlangıç tarihinden önceki günlerde pozitif modulo ve doğru vardiya.
- 29 Şubat, yıl değişimi, 30/31 gün, pazar/pazartesi haftası.
- 23:00–07:00 ve 24 saatlik vardiyalarda sonraki güne sarkan bitiş.
- Yerel takvim günü hesabı, DST geçişinde 23/25 saatli günler.
- Bir günlük izin/değişiklik istisnası yalnızca ilgili günü etkiler.
- İstisnanın silinmesi normal döngüye dönülmesini sağlar.
- Plan güncellense bile gerçekleşen çalışma geçmişi korunur.
- Kullanıcı hatalı vardiya saati, boş döngü, tekrarlanan/verisi bozuk öğelerde uygun uyarı alır.

### Rutin motoru
- Vardiya filtresi, hafta günü filtresi ve döngü gününe göre görev seçimi.
- Aynı gün ve kural için çift görev üretmeme.
- İzin gününde sadece koşulu karşılayan görevleri gösterme.
- Tamamlanan görev tarihsel kayıtlarının kural düzenlenmesinde bozulmaması.
- Başka zaman dilimine geçiş ve gece vardiyası gününe bağlama kuralı.

### Kazanç motoru
- Aylık maaş + ekstra mesai; saatlik ücret × gerçekleşen saat.
- Çarpan, prim, kesinti, sıfır saat, ay sonu taşıma.
- Para/kuruş hassasiyeti, ondalık girişler, ara/toplam yuvarlama.
- Geçerlilik tarihine göre ücret oranı; geçmiş dönem değişmemeli.
- Aynı hesap girdilerinden aynı sonucun ve satır dökümünün elde edilmesi.
- Vergi/SGK/resmi bordro hesaplaması olduğu izlenimi yaratılmaması.

## 2. SQLite / veri bütünlüğü
- Boş veritabanı ilk kurulum; uygulama güncellemesi için versiyonlu migration.
- Uygulama kapanıp açılınca kayıtların korunması.
- Yerel yedek -> farklı temiz kurulum -> geri alma; veri sayısı ve içerik eşleşmesi.
- Bozuk/eski yedek dosyasının güvenli reddi.
- Foreign key, benzersiz görev tamamlama ve tarih/kural doğrulama.

## 3. Mobil ve bildirim testleri
- Türkçe/İngilizce, açık/koyu tema, büyük font, TalkBack/VoiceOver.
- Android ve iOS gerçek cihazda açılış, ilk kurulum, takvim ve veri girişi.
- Uçak modunda tam kullanım.
- Bildirim izni açık/kapalı, saat değişikliği, düzen değişikliği, uygulama kapalıyken hatırlatma.
- Bildirim API/OS sınırlamaları nedeniyle tam zaman garantisi **test sonucu olarak varsayılmaz**.

## 4. CI ve yayın kapıları
- PR: format/lint, typecheck, domain unit test; bilinen kritik hatalar yok.
- Faz sonu: entegrasyon, E2E smoke ve temel performans kontrolü.
- Yayın adayı: iki platformda cihaz testi, yedek restore testi, erişilebilirlik, gizlilik metni ve mağaza uygunluğu kontrolü.

## 5. Beta kabul hedefleri

- Farklı sektörlerden **hedef 20** gönüllü test kullanıcısı.
- Kullanıcının ilk vardiya döngüsünü **hedef 3 dakikada** oluşturması.
- Kritik vardiya hesaplama hatası: **0**.
- Veri kaybı: **0**.
- Bu eşikler planlanan hedeflerdir; başarılar ancak test sonuçları kaydedilince doğrulanır.

## Issue #6 — Saat dilimi ve DST domain testleri (2026-11-15)

`tests/zoned-shift-time.test.mjs` ile:
- New York ilkbahar 23.00–07.00 = 7 saat; sonbahar 23.00–07.00 = 9 saat, her ikisinde planlanan 8 saat
- 24 saatlik vardiyada DST nedeniyle 23/25 saat gerçek süre
- İstanbul sabit modern UTC+3, Sydney güney yarım küre, Lord Howe yarım saatlik değişim, Kathmandu 45 dakika offset
- NY 01.30 fold için iki UTC anı; varsayılan reddetme ve bilinçli earlier/later
- NY 02.30 gap için reddetme, Samoa 2011 tarih atlama
- Başlangıç ve bitişte ayrı ambiguous/gap kodları; UTC yıl sonu ve artık gün
- Geçersiz tarih/saat/IANA zone/fold policy, izin gününde sıfır, yalnızca brüt elapsed time

**CI kanıtı:** [#43702389590](https://github.com/hilmiguner/vardiyum/actions/runs/43702389590) SUCCESS. Gerçek mobil tzdb/Intl uygulama davranışı Issue #2 kapsamında sonradan test edilmeli.

## Issue #8 / PR #9 — Test kapsamı

- Gün bazlı DST fold kaydı: aynı gün/saat dilimi/şablon için geçerli, başka gün, farklı vardiya saati/ID veya başka program zonunda **geçersiz**.
- Tam çözümlenmemiş veya geçersiz DST saatleri **persist edilmez**.
- Gerçek çalışma başlangıcı için ayrı fold kararı ve çıkış için bağımsız seçim; programın fold seçimini miras almaz.
- Geçersiz tarih, mola, uzun not, sıfır/negatif/72 saatten uzun aralık reddi; kaynağı kullanıcı beyanıdır.
- İleri atlayan saatlerde gerçek UTC anları doğru, gerçek çalışma mola sonrası saniyesi net hesaplanır (bordro değil).
- SQLite v1/v2'dan v3'e kayıpsız migrasyon; eski `work_entries`, `day_overrides`, `pattern_days` aynen korunur.
- Aynı UTC aralığında iki kaydın örtüşmesi SQL sorgusuyla tespit edilir; DB check constraints korunur.

**Kanıt:** [Actions #43704251648](https://github.com/hilmiguner/vardiyum/actions/runs/43704251648) **SUCCESS**, toplam 39 Node test / 0 başarısız. Expo/Android/iOS JavaScript bundle PASS; native cihaz doğrulaması **yapılmadı**.

## Faz 3 / Issue #10 — rutin otomatik testleri

- `tests/routine-engine.test.mjs`: 8 günlük döngü, anchor öncesi pozitif modulo, DST gece vardiyası başlangıç günü, günlük override, ISO hafta günü, aynı grupta OR/gruplar arasında AND, boş filtre, izin, etkin/pasif/arşiv.
- `tests/routine-migration.test.mjs`: v1→v2→v3→v4 ve legacy rutin/checkbox/work/pattern koruma; eski tamamlamanın olay günlüğüne aktarımı; arşiv ve değişiklik sonrası olay başlığı snapshot'ı, geri alınınca geçmişin korunması; tarih/rutin kimliği benzersizliği.
- **CI:** [#43706375916](https://github.com/hilmiguner/vardiyum/actions/runs/43706375916) SUCCESS, 51/51 Node testi. Android/iOS **JS paketleme** PASS; native test ileride.

## Issue #12 / PR #13 — Hatırlatma planlayıcı testleri (2026-11-15)

- Rutin `HH:mm` doğrulama, IANA zone + revision saklama, ilk kurulumda `app_settings` iznin yokluğu.
- 14 günlük plan, 48 global / 6 günlük kotası; geçmiş hatırlatmayı tekrar tetiklememe, tamamlanan/günlük override/kapalı/arşivli rutinin plan dışına alınması.
- New York DST gap/fold, zamanı ileri/geri alma; hiçbiri otomatik önce/sonra anına taşınmıyor.
- Gece vardiyasına bağlı görevin vardiyanın başlangıç günü esas alınması, program timezone değiştirmede eski kayıt anahtarlarının geçersizleşmesi.
- `reconcileReminderRequests`: başka sisteme ait bildirimi koruma, aynı anahtar kopyasını temizleme, rule edit/opt-out cleanup, scheduling başarısızsa eski bildirimlerin erken iptal edilmemesi.
- SQLite v4→v5 migrasyon: eski rutin, tamamlamalar ve olay günlüğü korunur; geçersiz clock DB CHECK engellenir; timezone değişimi revision günceller.

**PR test kanıtı:** [Actions #43708621922](https://github.com/hilmiguner/vardiyum/actions/runs/43708621922) SUCCESS, 67/67 Node test, Android/iOS JS export. Native OS teslimi bu testlerin kapsamında değildir.

## Issue #14 — Kazanç motoru testleri

- `tests/earnings-engine.test.mjs`: kuruş/cent giriş-çıkış ve negatif para, BigInt rasyonel half-away-from-zero yuvarlama, saatlik 3 saat normal + 1 saat kullanıcı fazla mesai eşiği, sabit aylık tam ay (otomatik kesinti yok), iki gerçek vardiya kaydında kronolojik eşiği aşma.
- Kullanıcı tarafından girilen vergi öncesi düzeltmeler; prim pozitif/kesinti negatif; currency ve source doğrulaması; aylık profil geçerlilik tarihi, ayrı profil kimliği/REV, dönem kontrolü.
- DST gerçek UTC aralığı, mola sonrası net bildirilen süre; planlı vardiya üzerinden ücret üretmeme; ters/nested örtüşme, ay sonunu kesen veya önceki aydan gelen çalışma için **blocked**.
- `tests/earnings-migration.test.mjs`: v1→v6 eski vardiya/rutin/notification/actual-work ve legacy finansal tabloların silinmemesi; yeni profil/adjustment CHECK/UNIQUE/source kısıtları.
- Toplam test kanıtı [Actions #43710412387](https://github.com/hilmiguner/vardiyum/actions/runs/43710412387) **84/84 Node PASS**, Expo/lint/TS, Android&iOS JS export PASS. Native cihaz testi bunun kapsamında değil.

## Issue #16 / PR #17 — Ay bölme/rapor güvenliği testleri

- `tests/cross-month-earnings.test.mjs`: 0 molayla **iki aya net saniye toplamı** (tek iş kimliği), aynı kaydın farklı ay ücret profili, **ay başında mesai eşiğinin yeniden başlaması**.
- Mola toplamı sıfır değilse her ayda `BREAK_ALLOCATION_REQUIRED` bloklama; kullanıcı seçimi ile başlangıç/sonraki ay net saniyelerinin orijinal net toplamına eşitliği; her iki aya sığmayan veya kaynak UTC uçları değişmiş seçim reddi.
- New York 2026-11 DST geriye geçişi, Nepal +05:45, Adelaide +10:30 ve UTC oturum bitişinin tam ay sınırında olması; sivil zamanın kaydedilmiş timezone ile çapraz doğrulanması; çakışma.
- `tests/earnings-period-migration.test.mjs`: SQLite v1–v6 veri korunumu; v7 mola dağılımı ve append-only revizyon, CHECK/UNIQUE/source kısıtları.
- `earnings-export.ts`: yalnızca estimated rapor, deterministik JSON ve CSV, kullanıcı açıklamalarında CSV formula guard; blocked raporu paylaşmama.
- **Kanıt:** [Actions #43713024596](https://github.com/hilmiguner/vardiyum/actions/runs/43713024596) SUCCESS, **98/98 Node testi**, Android&iOS JavaScript export. Native Share ve SQLite testleri yapılmadı.

## Issue #16 / PR #18 — Ücret profili revizyon testleri

- `tests/earnings-profile-revisions.test.mjs`: v1 ve v2/v3 tam snapshot, sıra/boşluk/duplicate, efektif tarih ve profil ID kilidi, kaynak/UTC/gerekçe doğrulaması, geçersiz para birimi ve katsayı, her ay ayrı son revizyonun seçimi, eski oranla güncel kayıttan tahmin ve export sürüm kimliği.
- `tests/earnings-profile-migration.test.mjs`: SQLite v7→v8 eski vardiya/rutin/UTC çalışma/mola ve pay verisi korunumu; her sürüm tam snapshot, FK/PK/CHECK ve DELETE/UPDATE trigger immutability kanıtı.
- Tarihsel `tests/earnings-period-migration.test.mjs` v7 düzeyinde kalır; `SCHEMA_VERSION=8` güncel migrasyon testindedir.
- Kanıt: [Actions #43717238275](https://github.com/hilmiguner/vardiyum/actions/runs/43717238275) SUCCESS. Native SQLite v8/testler kullanıcı tarafından ertelendi.
