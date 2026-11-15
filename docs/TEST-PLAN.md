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
