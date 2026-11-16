# Vardiyum — Güncel Durum / Kanıt Kaydı

**Güncelleme:** 2026-11-15  
**Repo:** https://github.com/hilmiguner/vardiyum  
**Ürün:** Her sektörden vardiyalı çalışanlara offline-first iOS/Android takvim + rutin + tahmini kazanç asistanı.

## GitHub main dalında doğrulananlar

- [x] **PR #9**: SQLite v3, gün bazlı DST seçimi, gerçek çalışma kayıtları, IANA zaman dilimi değişimi — merge SHA `a4fcb627b203e2aa626266ed1f90adc543de2403`; merge CI [#43704664276](https://github.com/hilmiguner/vardiyum/actions/runs/43704664276) SUCCESS.

- [x] PR #1: ürün/mimari/handoff belgeleri.
- [x] PR #3: Expo SDK 57, React Native, TypeScript mobil iskeleti; dört sekme ve ayarlar, SQLite v1, yerel demo döngü.
- [x] PR #3 main sonrası Actions [#43698720966](https://github.com/hilmiguner/vardiyum/actions/runs/43698720966) SUCCESS.
- [x] **PR #5** squash merge edildi: main SHA `d321be3e54eac31de6a69e59afcc461113ceaf25` (özel şablonlar, takvim, overrides, SQLite v2).

## Faz 2 — Çekirdek geliştirme main'de, kalan kabul işleri açık

**[PR #5 — Özel vardiyalar ve günlük istisnalar](https://github.com/hilmiguner/vardiyum/pull/5)**  
**Merge:** `d321be3e54eac31de6a69e59afcc461113ceaf25`; geliştirme branch'i PR geçmişinde.

- [x] Kullanıcının vardiya türü adı, saatleri, mola süresi ve ek çalışma/izin günü şablonlarını oluşturup düzenlemesi.
- [x] Bitişi ertesi güne geçen veya 24 saat süren planlı vardiya aralıkları.
- [x] Takvimde aylık gezinme, gün seçimi ve günlük vardiya istisnası/geri alma.
- [x] Değiştirilen gün sonraki döngü indeksini kaydırmaz (domain testleri).
- [x] SQLite v1→v2 eklemeli migrasyon; `break_minutes` alanı ve varsayılan şablonların mevcut veriyi ezmeden eklenmesi.
- [x] Eski döngü, özel gün ve düzenlenmiş şablonların veritabanı geçişinde korunmasına ilişkin Node SQLite testleri.
- [x] TR/EN arayüz metinleri ve planlanan vardiya için takvim saat dilimine göre gün seçimi.
- [x] **[Actions #43700598683](https://github.com/hilmiguner/vardiyum/actions/runs/43700598683) SUCCESS**: `npm ci`, Expo bağımlılık kontrolü, Prettier, ESLint, TypeScript, Node testleri, Android/iOS JavaScript export.

**Doğrulama:** PR #5 merged. PR head CI [#43700862285](https://github.com/hilmiguner/vardiyum/actions/runs/43700862285) SUCCESS. Main push CI [#43700993958](https://github.com/hilmiguner/vardiyum/actions/runs/43700993958) **SUCCESS**; belge güncellemesi sonrası CI [#43701110474](https://github.com/hilmiguner/vardiyum/actions/runs/43701110474) **SUCCESS**.

## Açık kalan kabul kanıtları

- [ ] Native iOS/Android uygulama derlemesi ve gerçek cihaz/emülatör açılışı: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2).
- [ ] Gerçek cihazda SQLite v1→v2 güncellemesi ve uygulama yeniden açılışında veri kalıcılığı.
- [ ] Gerçek standalone pakette internet olmadan çalışma.
- [x] Yaz saati değişimi üzerinden planlanan vardiyanın UTC gerçek geçen süre dönüşümü PR #7 ile doğrulandı.
- [ ] Bu planlı süre, **gerçek çalışılmış/ücretlendirilebilir süre** olarak otomatik aktarılmıyor; resmi bordro politikası henüz yok.
- [ ] Tam serbest şablon silme ve geçmiş sürümleme, çakışma davranışı; veri kaybı testi.
- [x] Rutin/checklist/geçmiş kodu PR #11; son CI #43706375916 SUCCESS.
- [ ] Yerel bildirimler, maaş/mesai, dışa aktarma/geri alma ve mağazalar henüz tamamlanmadı.

## Açık işler ve sıradaki adım

- [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2): native cihaz ve SQLite kalıcılığı.
- [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4): Faz 2 vardiya motoru; PR #5 ilk dilim.
- PR #5 main'e alındı; main CI #43700993958 ve #43701110474 SUCCESS. Sıradaki commit/PR sonucunu ayrıca doğrula.
- Kalan Faz 2 konuları için ayrı PR: gerçek cihaz migrasyonu, zaman dilimi/DST süre semantiği, izin/mesai kayıtları ve serbest şablon yönetimi.
- Her gelişmede bu dosyayı, HANDOFF, ROADMAP ve DECISIONS kayıtlarını kanıtlarla güncelle.

## Geçmiş

- 2026-11-15: İlk ürün ve mimari belgelendirme PR #1 merge.
- 2026-11-15: Expo mobil iskeleti PR #3 merge, main CI başarılı.
- 2026-11-15: Özel vardiya/günlük istisna motoru PR #5 geliştirildi; JS ve birim testleri başarılı; native test henüz yok.

## Issue #6 — UTC gerçek geçen süre (PR #7)

**Branch:** `feat/zoned-shift-elapsed-time`  
**PR:** [#7](https://github.com/hilmiguner/vardiyum/pull/7)  
**Main'e merge edildi:** [PR #7](https://github.com/hilmiguner/vardiyum/pull/7), merge commit `5d4e1f9fd5f0bdffdefe8b1281c74da4e25760fb`.

- [x] IANA saat dilimi ve vardiya sınırlarından UTC `startInstantUtc` / `endInstantUtc`.
- [x] `wallMinutes` ile `elapsedSeconds` ayrımı; planlanan mola/ücret hesabı ile karıştırılmıyor.
- [x] DST ileri sıçrama `nonexistent` / geri dönüş `ambiguous`; varsayılan katı reddetme, açık `earlier/later` kod sözleşmesi.
- [x] Bugün ve aylık takvimde süre karşılaştırması veya uyarı; TR/EN.
- [x] ABD, Avrupa/İstanbul, Avustralya Sydney/Lord Howe, Nepal, Samoa, yıl sonu, 24 saat, gap/fold örnekleri dahil 16 ek otomatik test senaryosu.
- [x] PR head commit `f233ec544a4ccadfdc7d839e2f836c21c42132c6`: [Actions #43702389590](https://github.com/hilmiguner/vardiyum/actions/runs/43702389590) **SUCCESS** (npm ci, Expo check, format, lint, typecheck, Node test, Android/iOS JS export).
- [x] **PR #7 squash merge edildi:** main SHA `5d4e1f9fd5f0bdffdefe8b1281c74da4e25760fb`.
- [x] **Merge sonrası main CI:** [Actions #43702715736](https://github.com/hilmiguner/vardiyum/actions/runs/43702715736) SUCCESS.
- [ ] Android/iOS **native** çalıştırma ve timezone/ICU doğrulaması: kullanıcı isteğiyle sonraya bırakıldı, [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık.
- [ ] Fold kararını gerçek kullanıcı tarihi/mesai kaydıyla kalıcı bağlama: [Issue #8](https://github.com/hilmiguner/vardiyum/issues/8). Resmî maaş motoru henüz yok.

**Takip:** [Issue #6](https://github.com/hilmiguner/vardiyum/issues/6) çekirdek UTC/DST çözümleyicisi tamamlandı; kalıcı fold tercihi ve gerçek mesai kaydı [Issue #8](https://github.com/hilmiguner/vardiyum/issues/8) üzerinden takip edilecek. Bu iş bitse bile Faz 2 / [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4) diğer açık maddeler nedeniyle devam eder.

## Issue #8 / PR #9 — gün bazlı DST kararı, gerçek çalışma ve zone değiştirme

**Geliştirme dalı:** `feat/persisted-fold-work-sessions-v3` (PR #9 merged)  
**PR:** [#9](https://github.com/hilmiguner/vardiyum/pull/9)  
**Kod/CI kanıtı:** [GitHub Actions #43704251648](https://github.com/hilmiguner/vardiyum/actions/runs/43704251648) **SUCCESS**: npm ci, Expo package check, Prettier, ESLint, TypeScript, **39/39 Node testi**, Android/iOS JavaScript paketlemesi.

- [x] Vardiya başlangıç/bitiş fold seçimleri gün+şablon+IANA imzasıyla yerel SQLite v3 kaydı.
- [x] Değişen vardiya saati veya zone için önceki fold kararını uygulamama.
- [x] Kullanıcının fiilî giriş/çıkış UTC anlarını ve mola/not girdilerini ayrı tabloda saklama; örtüşen aralık reddi.
- [x] Gün seçimi ve saat dilimi değişimini açıklayan TR/EN form ve onay/önizleme.
- [x] V1/v2 -> v3 SQLite migrasyonu, önceki `work_entries` ve pattern/override verilerini koruma testleri.
- [x] **PR #9 squash merge:** `a4fcb627b203e2aa626266ed1f90adc543de2403`.
- [x] **Merge sonrası main CI:** [Actions #43704664276](https://github.com/hilmiguner/vardiyum/actions/runs/43704664276) SUCCESS.
- [ ] Gerçek Android/iOS native cihaz/simülatör SQLite persistans, Intl/tzdb testi: **kullanıcı tercihine göre sonra**, [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık.
- [ ] Gerçek kayıt **kullanıcı beyanı**; resmi puantaj, ücretlendirilebilir saat ve maaş motoru değildir.
- [ ] Tarihsel vardiya şablonu sürümleme ve işveren doğrulaması sonraki işler.

**Sıradaki kod hedefi:** [Issue #10 — Faz 3 vardiyaya bağlı rutin motoru](https://github.com/hilmiguner/vardiyum/issues/10). Paralelde Faz 2 şablon geçmiş sürümlemesi [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4) açık. Cihaz testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi.

## Issue #10 — Faz 3 rutin motoru / PR #11

**[PR #11](https://github.com/hilmiguner/vardiyum/pull/11):** main'e squash merge edildi (`e336bf4dce5597932482b774235575fe68428217`).  
**Kanıt:** [Actions #43706375916](https://github.com/hilmiguner/vardiyum/actions/runs/43706375916) **SUCCESS** — npm ci, Expo check, Prettier, ESLint, TypeScript, **51/51 Node testi**, Android ve iOS JavaScript export.

- [x] Günlük vardiya override'ını dikkate alan vardiya/hafta/döngü/izin filtreli saf rutin motoru.
- [x] Bugün/Rutinler görevleri; tamamlandı/geri al, geçmiş tarih, rutin oluşturma/düzenleme/etkinleştirme/arşivleme/geri alma.
- [x] SQLite v3→v4 eklemeli migrasyon; eski `routine_rules`, `task_completions`, shift/work verileri korunur; legacy checkbox olaylarına backfill yapılır.
- [x] Tamamlanma geçmişinde olay zamanı başlık/filtre snapshot'ı; kullanıcı checkbox geri alsa veya rutini arşivlese de geçmiş kaybolmaz.
- [x] **PR #11 squash merge:** `e336bf4dce5597932482b774235575fe68428217`.
- [x] **Merge sonrası main CI:** [Actions #43706843264](https://github.com/hilmiguner/vardiyum/actions/runs/43706843264) SUCCESS (51/51 Node test, Android/iOS JS export).
- [ ] Yerel bildirimler ayrı Faz 3 işi.
- [ ] Gerçek Android/iOS cihaz, SQLite v4 ve offline standalone kontrolü kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'ye ertelendi.

**Sıradaki iş:** [Issue #12 — Faz 3 yerel hatırlatmalar](https://github.com/hilmiguner/vardiyum/issues/12). Bildirim izni, zamanlama, yeniden planlama ve DST koşullarını güvenli testlerle ele al. [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) cihaz testleri ertelenmiş ve açık.

## Issue #12 / PR #13 — Yerel rutin hatırlatmaları

**[PR #13](https://github.com/hilmiguner/vardiyum/pull/13):** main'e merge edildi (`cc708c8dd22fb614194e019047345b298684ef2b`).  
**PR kod CI:** [Actions #43708621922](https://github.com/hilmiguner/vardiyum/actions/runs/43708621922) **SUCCESS**: npm ci/Expo check/Prettier/ESLint/TypeScript, **67/67 Node testi**, Android+iOS JS export.

- [x] Rutin başına isteğe bağlı `HH:mm`, zone + revizyon ile kalıcı SQLite v5 kayıt.
- [x] Genel izin yalnızca açık kullanıcı eyleminde soruluyor; varsayılan kapalı ve reddedilirse görevler çalışıyor.
- [x] Offline 14 günlük / 48 toplam / 6 günlük hatırlatma planlayıcı; UTC mutlak DATE trigger, DST gap/fold atlama.
- [x] Vardiya/rutin/izin/zaman dilimi/görev tamamlanması değişiminde Vardiyum-aidiyetli bildirimleri uzlaştırma; başkasının bildirimleri korunuyor.
- [x] Eski v1–v4 veri ve rutin tamamlamalarını koruyan migrasyon testleri.
- [x] **PR #13 squash merge:** `cc708c8dd22fb614194e019047345b298684ef2b`.
- [x] **Merge sonrası main CI:** [Actions #43708986995](https://github.com/hilmiguner/vardiyum/actions/runs/43708986995) SUCCESS (67/67 Node test, Android/iOS JS export).
- [ ] **Gerçek cihaz native bildirim izni, teslim, boot/arka plan, SQLite v5 persistans** kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'ye ertelendi. Uygulama sürekli çalışmaz; kesin zamanlı alarm vaadi yok.

**Sıradaki MVP kod fazı:** [Issue #14 — Faz 4 şeffaf tahmini kazanç motoru](https://github.com/hilmiguner/vardiyum/issues/14). Resmî bordro/mevzuat hesabı iddiası olmadan yalnızca kullanıcı verilerinden şeffaf tahmin; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) gerçek cihaz QA ertelendi.

## Issue #14 / PR #15 — Faz 4 tahmini kazanç motoru

**[PR #15](https://github.com/hilmiguner/vardiyum/pull/15):** main'e squash merge edildi (`510f4ee833d03b7e6df2453bd2542be86534c6d9`).  
**Kanıt:** [Actions #43710412387](https://github.com/hilmiguner/vardiyum/actions/runs/43710412387) **SUCCESS** (npm ci, Expo check, Prettier, ESLint, TypeScript, **84/84 Node test**, Android&iOS JavaScript export).

- [x] Saatlik veya sabit tam aylık ücret profilleri; tarihsel geçerlilik ayı, para birimi (TRY/USD/EUR/GBP), revision ve kayıt kaynağı.
- [x] Tam sayı kuruş + BigInt/rational çarpan, satır bazında belirgin yuvarlama, kaynak id/sürüm/açıklama.
- [x] Kullanıcı beyanlı `actual_work_sessions` UTC aralıkları; planlanan vardiyaları gelir olarak saymama.
- [x] Kullanıcının açık eşik/mesai oranı ile fazla mesai tahmini, manuel prim/kesinti/correction.
- [x] Geçersiz/örtüşen/aylar arası veya yanlış döviz kaydı varsa toplamı **bloklama**.
- [x] SQLite v5→v6 eklemeli migrasyon; eski v1–v5, legacy pay ve work taslakları korunur, otomatik bordroya alınmaz.
- [x] Kazanç sekmesi ve TR/EN bilgilendirici arayüz; net ücret/vergi/SGK resmî beyanı yok.
- [x] **PR #15 squash merge:** `510f4ee833d03b7e6df2453bd2542be86534c6d9`.
- [x] **Merge sonrası main CI:** [Actions #43710791686](https://github.com/hilmiguner/vardiyum/actions/runs/43710791686) SUCCESS (84/84 Node testi, Android&iOS JS export).
- [ ] Native Android/iOS gerçek cihaz, SQLite v6 kalıcılık ve ekran testi kullanıcı isteğiyle ertelendi: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2).
- [ ] Aylar arası vardiyayı paylaştırma, işveren onayı, ülke/vergi kuralları, aktarılabilir rapor sonraki iş.

**Sıradaki:** [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) — aylar arası gece vardiyasının güvenli bölünmesi, ücret profili sürümleri ve veri dışa aktarma. [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) native QA ertelendi. Bu çalışma vergi/SGK/net/resmî bordro hesabı değildir.

## Issue #16 / PR #17 — UTC/IANA ay bölme ve açık mola dağılımı

**[PR #17](https://github.com/hilmiguner/vardiyum/pull/17):** squash-merge ile main'de (`07deee632090f823713226ad7abe92845ff6699f`).  
**Kanıt:** [Actions #43713024596](https://github.com/hilmiguner/vardiyum/actions/runs/43713024596) **SUCCESS** (npm ci/Expo check/Prettier/ESLint/TypeScript, **98/98 Node testi**, Android/iOS JavaScript export).

- [x] Gece vardiyalarını **orijinal kaydedilmiş IANA timezone + UTC anları** üzerinden ayın 00:00 sınırında bölme. DST bitişi, +05:45 Nepal, +10:30 Adelaide, tam sınır anı, geçmiş UTC kimliği testleri.
- [x] Mola 0 ise otomatik bölme; mola varsa açık başlangıç-ay dakikası, her iki ayın gerçek UTC süresini doğrulama, bilinmiyorsa hesaplamayı bloke etme.
- [x] SQLite v6→v7 eklemeli ve önceki karar değişikliklerini append-only audit ile saklama, v1–v6 korunumu.
- [x] Her ayın kendi mesai eşiği/profiliyle kullanıcı tahmini; çakışmalar ve geçersiz kaynaklarda fail-closed.
- [x] Açık finansal veri paylaşım onayından sonra CSV/JSON metnini sistem paylaşım ekranına aktarma; tehlikeli CSV hücresi koruma ve bloke raporu paylaşmama.
- [x] **PR #17 squash merge:** `07deee632090f823713226ad7abe92845ff6699f`.
- [x] **Merge sonrası main CI:** [Actions #43713571844](https://github.com/hilmiguner/vardiyum/actions/runs/43713571844) SUCCESS (98/98 Node, Android+iOS JS export).
- [ ] Issue #16 **açık**: tarihi ücret profilini revizyonlama, özel maaş dönemi, kontrollü içe alma/şifreli yedek, dosya temelli ihracat henüz yok.
- [ ] Native Android/iOS SQLite v7, sistem paylaşım ekranı, DST/ICU/erişilebilirlik testleri kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

**Sıradaki:** [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) kapsamında tarihsel ücret profili düzeltme/revizyonlama, kontrollü içe alma ve şifreli yedek tasarımı. PR #17 kodu/CI main'de; Issue #16 **açık kalıyor**. Native QA [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

## Issue #16 / PR #18 — Ücret profili sürüm düzeltmeleri

**[PR #18](https://github.com/hilmiguner/vardiyum/pull/18):** main'e squash merge edildi (`01f781ac9db442a163b14e6e9033839679a60ce5`).  
**Kod CI:** [Actions #43717238275](https://github.com/hilmiguner/vardiyum/actions/runs/43717238275) **SUCCESS** (format/lint/typecheck/Node testi/Android+iOS JavaScript export).

- [x] Aynı efektif ay için orijinal v1 profil değişmeden, **v2+ tam snapshot** olarak gerekçeli düzeltmeler.
- [x] SQLite v7→v8 additif; revision FK/PK/check, UPDATE/DELETE engeli; v1–v7 veri korunumu.
- [x] Gerekçeli kullanıcı beyanı, UTC kayıt anı, optimistic revision ve transaction; eski sürümden fail-closed alan/kimlik kontrolü.
- [x] Kazanç ekranında mevcut profil düzenleme ve eski sürüm geçmişini gösterme.
- [x] Önceki sürümle **bugünkü** fiilî çalışma/ayarlama kayıtlarından yeniden hesaplama; eski tarihli dondurulmuş rapor iddiası yok.
- [x] **PR #18 squash merge:** `01f781ac9db442a163b14e6e9033839679a60ce5`.
- [x] **Merge sonrası main CI:** [Actions #43718105350](https://github.com/hilmiguner/vardiyum/actions/runs/43718105350) SUCCESS (Node testleri, Android/iOS JS export).
- [ ] [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık: kontrollü içe alma/şifreli yedek, özel maaş dönemi, gerçek dosyaya rapor aktarımı.
- [ ] [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık: native Android/iOS SQLite v8 ve UI sürümleme testleri kullanıcı isteğiyle ertelendi.

**Sıradaki:** [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık: kontrollü içe alma/şifreli yedekleme ve özel maaş dönemi tasarımı. Profil sürümü PR #18 main'de; native cihaz kanıtı [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) üzerinde ertelendi.

## Issue #16 / PR #19 — Offline şifreli yedek + read-only import preview

**[PR #19](https://github.com/hilmiguner/vardiyum/pull/19):** squash merge ile main'de (`1686a844b5c9ee723fea6fc104093695ce5e612b`).  
**Kod CI:** [Actions #43721507257](https://github.com/hilmiguner/vardiyum/actions/runs/43721507257) **SUCCESS** (**119/119 Node test**, npm ci, Expo SDK 57 uyumu, Prettier/ESLint/TypeScript, Android/iOS JavaScript export).

- [x] 18 adet SQLite v8 tabloyu tutarlı salt-okunur an olarak şifreli snapshot'a alma; legacy finans/veri ve orijinal UTC oturumları dahil, limit aşımında fail-closed.
- [x] Rastgele 256-bit AES-GCM **tek yedek anahtarı**, key dosyadan ayrı; AES-GCM tag ve snapshot SHA-256; AAD.
- [x] Kullanıcı anahtarı ayrı sakladığını onaylamadan şifreli dosya sistem paylaşım ekranına gönderilmez; otomatik ağ gönderimi yapılmaz.
- [x] Sistem dosya seçimi ve secret girince authenticated **salt-okunur preview**, SQLite v8 schema/kolon/veri tipi ve boyut denetimleri, tablo bazlı satır sayıları.
- [x] Yanlış key, bozulan dosya, schema downgrade, missing/extra column ve çok büyük veri birim testlerinde fail-closed.
- [x] **PR #19 squash merge:** `1686a844b5c9ee723fea6fc104093695ce5e612b`.
- [x] **Merge sonrası main CI:** [Actions #43722072994](https://github.com/hilmiguner/vardiyum/actions/runs/43722072994) SUCCESS (119/119 Node test, Android+iOS JS export).
- [ ] **Gerçek restore/import-yazma YOK**; mevcut SQLite dosyası/tabloları bu PR ile değiştirilmez. Restore için atomic clean-target, FK/integrity ve izinli apply ayrı geliştirme [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16)'da.
- [ ] Gerçek Android/iOS cihazda AES/file picker/Share sheet/anahtar UI/SQLite tutarlı kopya ve restore testleri kullanıcı tercihiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

**Sıradaki:** [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) — temiz hedefte atomik, onaylı ve veri kayıpsız SQLite restore/rollback; [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık kalır. Native AES/Share/SQLite veri geri dönüşü [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

## Issue #20 / PR #21 — Temiz kurulumda atomik restore (kodlandı, native cihaz doğrulanmadı)

**[PR #21](https://github.com/hilmiguner/vardiyum/pull/21):** squash-merge main `de110794d9f71c8bfa81e978b0141ead74fb3e35`.  
**Kod CI:** [#43724855020](https://github.com/hilmiguner/vardiyum/actions/runs/43724855020) SUCCESS (**127/127 Node testi**, Prettier/ESLint/TS, Expo paket check, Android/iOS **JS** export).

- [x] Kaynak şifreli dosya **AES-GCM/AAD, SHA-256, SQLite v8 18 tablo trusted schema** ile doğrulanmadan geri yükleme adayı değil.
- [x] UI: önce read-only tablo/row önizlemesi, sonra `RESTORE` metni ve ikinci risk onayı; TR/EN *deneysel/native test edilmedi* ibaresi.
- [x] Tek transaction içinde hedef `PRAGMA user_version=8`, exact 18 tablo, dört **değişmemiş** seed şablonu ve diğer tabloların **boşluğu** kontrol edilir. Dolu DB ve özelleştirilmiş şablonlar **reddedilir**.
- [x] Transaction: statik v8 tablo/kolon INSERT, readback exact, `PRAGMA foreign_key_check` + `PRAGMA integrity_check`, hata durumunda rollback.
- [x] Sistem bildirim opt-in'i restore sırasında **0** olarak resetlenir; ikinci restore'u önlemek için marker; source user data geri kalan birebir.
- [x] SQLite v8 Node regresyonu: dolu hedef reddi, seed özelleştirme reddi, mükerrer restore, fault injection/UNIQUE rollback, FK OFF bağlantısında FK postcheck rollback, schema mismatch.
- [x] **PR #21 merged:** `de110794d9f71c8bfa81e978b0141ead74fb3e35`.
- [x] **Merge sonrası main CI:** [Actions #43725429338](https://github.com/hilmiguner/vardiyum/actions/runs/43725429338) SUCCESS (127/127 Node test, Android/iOS JS export).
- [ ] **Gerçek native Android/iOS cihaz testleri yapılmadı:** kayıt kalıcılığı, AES interoperability, düşük disk, crash/relaunch, SQLite exclusive tx, Share/Picker ve OS bildirimleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelenmiş. [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) bu kabul olmadan **kapatılmayacak**.
- [ ] Mevcut dolu DB ile merge/overwrite veya özel maaş dönemi yok; [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık.

**Sıradaki:** PR #21 main ve CI başarılı. [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) native restore kalıcılık/crash/low-disk kabulü için **açık**; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) kullanıcı isteğiyle ertelendi. Dolu DB merge yok, cihaz kurtarma doğrulandı iddiası yok. [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16)'da özel maaş dönemi kaldı.

**Sonraki bağımsız MVP işi:** [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) — kullanıcı tanımlı maaş dönemi (ör. 26→25), DST/UTC sınırları, ayrı dönem mesai eşiği ve ücret profil geçerlilik kuralları. Gerçek cihaz QA [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi; restore native kabulü [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık.

## 2026-11-15 — Issue #22 / özel maaş dönemi: ilk domain kodu (PR incelemesinde)

- **Kapsam:** `src/domain/pay-period.ts` ile 1–28 kullanıcı seçimi; `YYYY-MM` anahtarı **başlangıç ayı**; 26→25, Şubat 28/29 ve yıl devri için fail-closed sınırlar.
- Kaydedilmiş çalışma IANA zone'unda 00:00 UTC dönüşümü, DST gap/fold belirsizliğinde blok; UTC kaynak oturumu değiştirmeden net çalışma parçalama, *yeni* dönem mola dağılımı kaynak doğrulaması ve çift saymayı önleme.
- **Testler eklendi; CI sonucu PR üzerinde doğrulanmalı:** `tests/pay-period.test.mjs`. Tasarım: [PAY-PERIOD-DESIGN.md](./PAY-PERIOD-DESIGN.md).
- **Henüz tamamlanmadı:** SQLite v8'de kullanıcı seçimi veya özel dönem mola kayıtları kalıcı değil; kazanç sekmesi/hizmet hâlen takvim ayını kullanıyor. Ücret profili ayın 1'inde değiştiğinde karma oran politikası, sabit ücret dönemi ve manuel düzeltme eşlemesi açık. Mevcut AES yedek v8 şeması **değişmedi**.
- **Takip:** [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) **açık**; [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) üst iş; native QA [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2), restore native [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) ertelendi/açık. Mevzuat, vergi, SGK, net ücret veya onaylı bordro hesabı yok.

## 2026-11-15 — Issue #22 / PR #23 ve kalıcı dönem tercihi dilimi

- [x] **PR #23 merge:** `d85f63f0c468f15692aef0f78f13d0a2e695d4c3`; [main Mobile quality #43728968056](https://github.com/hilmiguner/vardiyum/actions/runs/43728968056) **SUCCESS**; 137 Node test + Android/iOS JavaScript export. Salt domain UTC/IANA dönem sınırı ve mola doğrulaması main'de.
- [ ] **Yeni feature branch `feat/pay-period-persisted-setting` (PR/CI incelemesi bekleniyor):** V8 `app_settings` tek satır anahtarı `earnings_pay_period_start_day_v1` ile kullanıcının **1–28** başlangıç günü kaydı; olmayan anahtar = 1, bozuk anahtar = blokla. Şema versiyonu/18 tablo değişmedi.
- [ ] Ayarlar'da TR/EN başlangıç günü seçimi ve 26→25 dönem tarih önizlemesi; **halen Kazanç sekmesinde takvim ayı hesaplaması** uygulanır. Kaydedilen tercih finansal rapora otomatik yansımaz.
- [ ] Node v8 tam migration/preference/persistence/fail-closed/korunan SQLite schema/FK/integrity testleri eklendi; yeni PR CI sonucu doğrulanacak.
- **Kalan Issue #22:** Kullanıcıya gerçek özel dönem kazanç hesaplama, otomatik karışık aylık ücret profilini güvenli çözümleme, özel dönem mola audit, period-keyed adjustments, sabit ücret kararı ve CSV/JSON. Native cihaz [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2), restore cihaz QA [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık.

## 2026-11-15 — Issue #22 / PR #24 MERGED: maaş dönemi tercihi (en güncel kod kanıtı)

- [x] [PR #23](https://github.com/hilmiguner/vardiyum/pull/23) saf 26→25 domain main'e merge: `d85f63f0c468f15692aef0f78f13d0a2e695d4c3`, [main CI #43728968056](https://github.com/hilmiguner/vardiyum/actions/runs/43728968056) SUCCESS (137 Node testi, Android+iOS JS).
- [x] [PR #24](https://github.com/hilmiguner/vardiyum/pull/24) özel dönem 1–28 gün tercihi ve TR/EN Ayarlar önizlemesi main'e squash merge: `456415cdcf5a7ce6ef8d6487a0678d01818b8106`.
- [x] [PR CI #43729824011](https://github.com/hilmiguner/vardiyum/actions/runs/43729824011) SUCCESS, **142/142 Node testi** ve format/lint/TS/Expo/iki JS export. [Merge sonrası main CI #43729927452](https://github.com/hilmiguner/vardiyum/actions/runs/43729927452) **SUCCESS** aynı kalite aşamaları.
- [x] SQLite v8 `app_settings` kanonik `earnings_pay_period_start_day_v1` anahtarıyla eski 18 tablo/AES backup/clean-target restore formatını değiştirmeden kalıcı tercih. Eksik anahtar = 1; bozuk değer reddedilir. 142 test şema/FK/integrity ve eski ayar korumasını içerir.
- [ ] **Kazanç motoru hâlen takvim ayına göre hesaplar.** Kullanıcının yeni tercihi yalnız Ayarlar'da tutulur/önizlenir. Mixed effective-month ücret profili, yeni dönem mola audit, sabit tutar varsayımı, manuel adjustments, CSV/JSON özel dönem raporu **henüz yok**. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) ve üst [#16](https://github.com/hilmiguner/vardiyum/issues/16) açık.
- [ ] Native Android/iOS ayar kalıcılığı/AES restore/DST, düşük disk/crash: kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ve [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) üzerinde **ertelendi**. JS export native cihaz kanıtı değildir.

## 2026-11-15 — Issue #22 yeni dilim: özel dönem mola beyanı ve sürüm geçmişi (feature PR)

- **Başlangıç:** main `a1ee96da6ff07b632788f6c33687c386e11d7073`; [main CI #43730144090](https://github.com/hilmiguner/vardiyum/actions/runs/43730144090) SUCCESS (142 Node). Issue #22 yanlışlıkla kapanmış görünüyordu; finansal entegrasyon tamamlanmadığından **yeniden açıldı**.
- **Feature `feat/pay-period-break-audit-v8`:** `src/domain/custom-pay-break-audit.ts` ve `custom-pay-break-store.ts` ile 26→25 gibi **takvim dışı** dönem sınırını aşan molalar için kaynak UTC anları, kaydedilmiş IANA zone, başlangıç günü/başlangıç dönemi ve **kullanıcı gerekçesi** bağlı beyan; her düzeltme yeni ve sıralı olay anahtarı.
- **Saklama:** mevcut SQLite **v8, 18 tablo** korunur. `app_settings` içinde `earnings_custom_pay_break_v1:<day>:<workId>:event:<rev>` INSERT-only event ve `...:head` işaretçisi aynı exclusive transaction'da; stale sürüm, kaynak değişimi, kayıp olay, geçersiz mola, tutarsız veri, ayar değişimi fail-closed. Eski takvim ayı mola tablosu ve arşivi değiştirilmez. SQLite dosyasına doğrudan erişim karşısında kriptografik değişmezlik iddiası **yok**.
- **Ekran:** Kazanç içinde bağımsız TR/EN "özel dönem mola dağılımı (hazırlık)" paneli; mevcut aylık rapor/CSV/JSON **özel beyanı kullanmaz**. İlgili dönemde molalı crossing yoksa sadece bilgilendirme. Yanlış / stale durumda bağımsız hata.
- **Kanıt bekleniyor:** Node v1→v8 SQLite mutation/rollback/history/source integrity testleri ve Android/iOS JS export için PR Actions. Tamamlandı olarak yazma, PR merge CI kanıtı gelince güncelle.
- **Kalan:** dönemin gerçek tahmini kazancı; efektif ayda değişen ücret profili politikası, sabit ücret periyodu, ayrıca dönem adjustments/CSV/JSON. Native cihaz / AES restore [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ve [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) ertelendi; üst [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık.

## 2026-11-15 — PR #25 MERGED: Özel dönem mola beyanları, v8 sürüm geçmişi

- **[PR #25](https://github.com/hilmiguner/vardiyum/pull/25)** squash merge `624eae8197d2ff9b406e9d8f9cc712b50bb39616`; [PR CI #43732374247](https://github.com/hilmiguner/vardiyum/actions/runs/43732374247) **SUCCESS**, [merge sonrası main CI #43732513262](https://github.com/hilmiguner/vardiyum/actions/runs/43732513262) **SUCCESS** — **150/150 Node test**, Prettier/ESLint/TS, Expo uyumluluk ve Android/iOS **JS export**.
- **Kod:** `src/domain/custom-pay-break-audit.ts`, `custom-pay-break-store.ts`, `src/data/custom-pay-break-repository.ts`; `src/components/custom-pay-break-panel.tsx` bağımsız TR/EN hazırlık UI; `tests/custom-pay-break-audit.test.mjs` gerçek Node SQLite v1→v8 transaction/rollback/stale/bozuk geçmiş testleri.
- **Kural:** Takvim dışı başlangıç günü 2–28; her mola beyanı orijinal gerçek UTC giriş-çıkış/IANA zone ve 2 dönem sınırı doğrulamadan kaydedilmez. Ayrı olay anahtarları uygulama düzeyinde append-only; `head` aynı exclusive transaction'da. Stale revision, ayar değişimi, geçersiz veya silinmiş olay, hatalı source ve fault injection fail closed. SQL dosyasını dışarıdan değiştiren aktöre karşı kriptografik tamper-proof iddiası **yok**.
- **Uyumluluk:** SQLite v8 **18 tablo ve AES backup/clean-target restore şeması değişmedi**; app_settings event'leri backup içinde. Eski aylık mola geçmişi ve mevcut gerçek çalışma kayıtları değişmez.
- **YAPILMADI:** Özel dönem gerçek tahmini kazanç/mesai, efektif profil geçişi, sabit ücret, manuel adjustments ve CSV/JSON custom rapor. Mevcut Kazanç raporu **takvim ayını** kullanmaya devam eder. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) reopened ve **açık**; üst [#16](https://github.com/hilmiguner/vardiyum/issues/16) açık. Native cihaz [#2](https://github.com/hilmiguner/vardiyum/issues/2) ve geri yükleme native kabulü [#20](https://github.com/hilmiguner/vardiyum/issues/20) ertelendi/açık.

## 2026-11-15 — Issue #22 / özel dönem efektif ücret profili geçişi (yeni PR, CI bekleniyor)

- Başlangıç main `fa6af365e0dfc8b51f8d9dca1aca0f7594e29119`; [main CI #43732734275](https://github.com/hilmiguner/vardiyum/actions/runs/43732734275) **SUCCESS** (150 Node testi, 2 JS export), açık Issue #22.
- **Feature `feat/custom-pay-profile-transition-preview`:** `src/domain/custom-pay-profile-policy.ts` saf ve fail-closed efektif profil dönem çözümlemesi; `src/domain/custom-pay-profile-preview-store.ts` SQLite v8'den orijinal profil ve tüm immutable revision chain'i doğrulayan **read-only** sorgu; `src/components/custom-pay-profile-preview-panel.tsx` Kazanç'ta kaynaklı TR/EN geçiş önizlemesi.
- 26→25 seçildiğinde dönemin başladığı `YYYY-MM` ile bir sonraki ayın 1'inde aktifleşen ücret profilleri **ayrı segmentlere** ayrılır. Tarihsel revision/id/currency/model ve **IANA yerel 00:00 → UTC** gösterilir. Değişiklik olmasa bile ikinci efektif profil kimliği varsa geçiş açık inceleme ister. Sabit aylık modelde tam/eksik özel dönem ücreti varsayımı zorunlu. Profil dönemin başını kapsamıyorsa `needs_profile` ve bozuk/orphan/eksik revision varsa fail closed. DST midnight fold/gap tahmin edilmez.
- **ÖNEMLİ:** Bu yalnız **gösterim ve güvenli rate-transition policy**; gerçek custom-period maaş, fazla mesai, full/partial fixed pay, özel dönem adjustments/CSV/JSON **hesaplanmıyor**. Mevcut takvim ayı Kazanç tutarı değişmedi. Önizleme plan saat dilimidir, gerçek çalışma fiyatlandırması ileride **orijinal iş kaydı IANA zone/UTC** ile yapılmalı.
- SQLite v8 18 tablo, mevcut şifreli AES backup/restore, çalışma/ayar/mola geçmişi **değişmedi**. Unit testler GitHub PR CI ile doğrulanacak. Native cihaz Issue #2/#20 ertelendi; Issue #22/#16 açık kalır.

## 2026-11-15 — PR #26 MERGED: özel maaş dönemi efektif profil geçiş önizlemesi

- [x] [PR #26](https://github.com/hilmiguner/vardiyum/pull/26) **squash merge** main kod SHA `b4cd8c9cda15040fb3b7d7206d91c38cd35ea1ed`. [PR CI #43747093629](https://github.com/hilmiguner/vardiyum/actions/runs/43747093629) **SUCCESS**, [main merge sonrası CI #43747264298](https://github.com/hilmiguner/vardiyum/actions/runs/43747264298) **SUCCESS**, **163/163 Node testi**, Prettier/ESLint/TypeScript, Expo dependency ve Android+iOS **JS export**.
- [x] `src/domain/custom-pay-profile-policy.ts` saf 26→25 dönem efektif ücret profili segmentleri; `custom-pay-profile-preview-store.ts` SQLite v8 `earnings_profiles` + immutable `earnings_profile_revisions` read-only resolver; `src/data/custom-pay-profile-repository.ts` Expo köprü ve `src/components/custom-pay-profile-preview-panel.tsx` Kazanç TR/EN kaynaklı önizleme.
- [x] Ayın 1'inde profil değişiyorsa iki ayrı tarih/UTC IANA sınırı, profil kaynak kimliği ve immutable revision, model/para birimi/ücret gösterilir. İkinci aktif profil değişiklik incelemesi gerektirir; tam/eksik fixed ücret varsayımı olmadan ödeme **hesaplanmaz**, eksik/bozuk/orphan revision veya belirsiz DST boundary fail-closed.
- [x] SQLite **v8 18 tablo** / AES yedek / clean-target restore, geçmiş vardiya/çalışma/mola/finansal kayıtlar **değişmedi**. Kayıtlar salt SELECT ile incelenir. Schedule IANA UTC gösterimi **sadece önizleme**; gerçek çalışma fiyatlandırması her kaydın orijinal zone/UTC'sini kullanmalı.
- [ ] **Gerçek custom-period kazanç ve mesai tutarı hâlen YOK.** `loadEarningsReport`, adjustments ve CSV/JSON eskisi gibi takvim ayı. Sırada gerçek UTC work segmentleri, yeni dönemde net saat/fazla mesai eşiği, profil sınırı mola belirsizliği için ayrıca beyan, fixed full/partial kullanıcı varsayımı, dönem bazlı adjustments ve CSV/JSON. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) ve üst [#16](https://github.com/hilmiguner/vardiyum/issues/16) AÇIK.
- [ ] Native iOS/Android SQLite/persist/restore ve düşük disk/crash kabul testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ve [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) üzerinde kullanıcı isteğiyle ertelendi. JS export **native PASS değildir**.

## 2026-11-15 — Issue #22 / özel maaş dönemi GERÇEK saatlik çalışma tahmini (PR #27; CI bekleniyor)

- **Ön koşul:** PR #23–#26 main'de, [main CI #43747540464](https://github.com/hilmiguner/vardiyum/actions/runs/43747540464) SUCCESS (**163 Node testi**, Android+iOS JS), main `5ab9f16fb025b3e5ca839ee222e9dc8c8bd6bd21`.
- **Yeni PR #27** `feat/custom-hourly-work-estimate-v8`: `src/domain/custom-hourly-work-estimate.ts` ve `src/data/custom-hourly-work-repository.ts` ile özel dönem (ör. 26 Ekim–25 Kasım) içinde **yalnız kaydedilmiş gerçek çalışmaların tek saatlik profil üzerinden kaynaklı tahmini brüt çalışma ücreti**. `src/components/custom-hourly-estimate-panel.tsx` bağımsız TR/EN Kazanç ekranı; `tests/custom-hourly-work-estimate.test.mjs` Node v1→v8 SQLite / UTC / IANA / sınır-mola / fazla mesai testleri.
- Saatlik maaş profilinin dönemin tümünde **aynı** ve tek olması şart; efektif profil değişimi, fixed monthly, başlangıç profili eksikliği, bozuk vardiya, çakışan gerçek çalışmalar, kaynağı doğrulanmamış custom period mola beyanı **hesaplamayı durdurur**. Her orijinal çalışma kendi IANA/UTC aralığında kesilir, **yeni dönem mesai eşiği sıfırlanır**; dakika çifte sayılmaz. Kuruşlar BigInt rational/cumulative rounding ile toplanır, kaynak UUID/revision/UTC/süre tutulur.
- **Aylık prim/kesinti/düzeltme varsa hesap bloke** edilir; bunları özel döneme sessizce taşımak yok. Geçerli tek saatlik profilde ve tamamen kullanıcı beyanlı veride çıktı **SADECE gerçek çalışma ücreti**, ne tam maaş ne net ne resmî bordro. Mevcut `loadEarningsReport`/aylık CSV+JSON ve eski ay bazlı mola audit **değişmedi**. Özel dönem CSV/JSON henüz yok.
- SQLite **v8 18 tablo**, AES encrypted backup/clean-target restore sözleşmesi değişmedi; yeni kaydetme/şema adımı yok, rapor aynı exclusive SQLite snapshot üzerinden **read-only** üretiliyor. Native iOS/Android ve restore/low disk/crash kullanıcı isteğiyle [#2](https://github.com/hilmiguner/vardiyum/issues/2)/[#20](https://github.com/hilmiguner/vardiyum/issues/20) erteli; bu PR native kabul sayılmaz. PR CI/merge doğrulanmadan tamamlandı işaretleme. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) / üst [#16](https://github.com/hilmiguner/vardiyum/issues/16) açık.

## 2026-11-15 — PR #27 MERGED: Güvenli gerçek özel dönem saatlik çalışma kazancı

- **[PR #27](https://github.com/hilmiguner/vardiyum/pull/27)** merged, main code SHA `9965a9b904250bc5fbcfb113f07a9ce09cd4c26e`. [PR CI #43749326253](https://github.com/hilmiguner/vardiyum/actions/runs/43749326253) **SUCCESS**, [merge sonrası main CI #43749478876](https://github.com/hilmiguner/vardiyum/actions/runs/43749478876) **SUCCESS**; **177/177 Node test**, Prettier, ESLint, TypeScript, Expo package ve Android+iOS **JS export**.
- **Gerçek özellik:** Kazanç'ta ayrı TR/EN `CustomHourlyEstimatePanel`; `src/domain/custom-hourly-work-estimate.ts` tek, dönem boyunca değişmeyen hourly profilin **kaydedilmiş fiilî çalışma** UTC/IANA parçalarına tutar hesaplar. `src/domain/custom-hourly-work-store.ts` ve `src/data/custom-hourly-work-repository.ts` içinde **tek exclusive SQLite transaction ile salt-okunur tutarlı snapshot**; kullanıcı başlangıç günü ve immutable profile revisions, kaynak iş, PR #25 custom period mola geçmişi, aylık adjustment varlığı doğrulanır.
- 26→25 gibi özel dönem sınırını aşan molalı gerçek çalışma yalnız ayrı kaynak bağlı custom mola beyanıyla bölünür; komşu dönemlere net saniye çifte aktarılmaz. Dönem mesai eşiği sıfırdan başlar. Normal/overtime kaynak satırları ve orijinal/segment UTC, audit revision, çalışma süreleri/saat dilimi ile **BigInt rational cumulative kuruş** hesaplanır. Dönem başlangıç günü=1 olursa varsayılan takvim ayı raporu kullanılmaya devam eder.
- **Blok kuralı:** Dönem içinde efektif ücret profili değişimi, sabit maaş, opening profile yok, vardiya overlap/duplicate/geçersiz IANA UTC, kaynak/mola audit eksikliği, money overflow veya dönem aralığındaki **iki takvim ayından birinde mevcut bonus/deduction/correction** → özel dönem tutarı gösterilmez. Geçerli durumda görünen rakam **yalnız work-only user-reported pre-tax estimate**, tam maaş/net/bordro değil.
- **Değişmedi:** Eski `loadEarningsReport`, aylık adjustment ve monthly CSV/JSON, SQLite v8 **18 tablo** AES backup/clean restore. Özel dönem CSV/JSON henüz kapalı; mixed pay profile/fixed full/partial/period adjustments sonraki iş. Issue #22 ve üst #16 **AÇIK**. Gerçek Android/iOS / AES restore, low disk/crash QA [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2), [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) ertelendi; **JS export native PASS değildir**.

## 2026-11-15 — Issue #22 karma saatlik ücret profili dönemi (PR inceleme/CI bekliyor)

- Başlangıç main `9d32348493618d97e044ebcd96358f1aaa91a242`, [CI #43749767124](https://github.com/hilmiguner/vardiyum/actions/runs/43749767124) SUCCESS (177 Node + Android/iOS JS). PR #23–#27 main, Issue #22/#16 açık.
- `feat/custom-mixed-hourly-rates` üzerinde **özel dönem içinde ayın 1'inde başlayan yeni saatlik ücretin gerçekten uygulanması**: `src/domain/custom-mixed-hourly-work.ts` iki immutable efektif profili kaynağıyla doğrular; her gerçek vardiyayı kendi **kayıtlı IANA timeZone'unda** ücret değişiminin 00:00 UTC anından keser, eski/yeni oranları birbirine karıştırmaz. `src/domain/custom-hourly-work-estimate.ts` tek profil davranışını korur, iki saatlik profil varsa özel motora yönlendirir; TR/EN panel her tutar satırında profil ID/revision ve karma geçişini açık gösterir.
- **Açık ürün politikası:** İki hourly profilin para birimi ve `overtimeAfterMinutes` değeri eşit olmalı. Eşik özel maaş dönemi boyunca **tek kez** çalışır, yeni ücret tarihinde resetlenmez. Her profilin açıkça kullanıcı girdiği overtime multiplier'ı kendi segmentine uygulanır. Oran geçişini kesen ve molası sıfırdan büyük olan parçanın molası ücret değişiminden önce/sonra bilinmediğinden otomatik dağıtılmaz, **CUSTOM_RATE_BREAK_ALLOCATION_REQUIRED**. PR #25 custom **maaş dönemi** mola audit'i, ayrı **ücret değişimi** mola ataması yerine geçmez.
- Farklı döviz, farklı fazla mesai eşiği, sabit maaş, eksik/bozuk kaynak ve ay bazlı prim/kesintiler → tutar üretilmez. Kaynak UUID, original UTC/segment UTC/IANA, mola audit revision, profil ID/revision ve BigInt minor-unit cumulative rounding korunur. Eski takvim aylı Kazanç/CSV+JSON değişmez; mixed custom export henüz yok. Gerçek cihaz Issue #2/#20 erteli.
- V8 **18 tablo/AES şifreli yedek/temiz yükleme** değişmedi, rapor readonly SQLite snapshot. Yeni Node testleri ve PR CI henüz kanıtlanmadı; merge/test sonucunu daha sonra kesin olarak kaydet.

## 2026-11-15 — PR #28 MERGED: Özel maaş döneminde farklı saatlik ücretler

- **[PR #28](https://github.com/hilmiguner/vardiyum/pull/28)** squash merge code main SHA `dfc6664f10eb963ad20713f79fe5e37b27442807`; [PR CI #43751530540](https://github.com/hilmiguner/vardiyum/actions/runs/43751530540) **SUCCESS**, [merge sonrası main CI #43751705225](https://github.com/hilmiguner/vardiyum/actions/runs/43751705225) **SUCCESS**: **192/192 Node testi**, Prettier/ESLint/TypeScript, Expo check ve Android+iOS **JavaScript** export.
- **Teslim:** `src/domain/custom-mixed-hourly-work.ts` iki aylık efektif `hourly` profilin gerçek çalışma parçalarını işin **kayıtlı IANA timeZone'unda** 1'inin 00:00 UTC karşılığından kesiyor; farklı rate/model/profil revision kaynağı satırlara yazılıyor. Aynı para birimi ve aynı overtime threshold zorunlu. Eşik **maaş dönemi başından tek kez** ilerliyor; ücret geçiş tarihinde resetlenmiyor. Her efektif profilin user-entered overtime multiplier'ı kendi çalışma saniyesine uygulanıyor. Per profile+regular/overtime BigInt rational cumulative rounding toplam-kuruş koruması. Eski tek-rate rota geriye dönük korunuyor.
- **Fail-closed:** Ücret değişimi gece yarısını aşan **pozitif molalı** çalışma için ayrı rate-boundary mola beyanı hâlen olmadığı için tahmin bloklanıyor. PR #25 `custom pay-period` break audit **rate midnight** belirsizliğini çözmez. Currency/threshold mismatch, fixed salary, kaynak hatası, plan/çakışma, aylık adjustments gibi engeller korunuyor; otomatik kur/prim/paylaşım yapılmıyor.
- **UI/kanıt:** TR/EN ayrı Kazanç paneli, iki ücret kaynağı ve her parasal satırın profil ID/revision bilgisini gösteriyor. `tests/custom-mixed-hourly-work.test.mjs` +15 Node regresyonu: aynı dönem iki rate, tek OT eşiği, rate crossing 0 break / >0 break blocker, Kathmandu work-zone / Istanbul schedule-zone ayrımı, New York DST, changed multiplier, microsecond rounding, SQLite v1→v8 immutable revision salt-okuma, 18 tablo/FK/integrity. 177→**192** test.
- **Eski davranış ve yedek:** Takvim ayı `loadEarningsReport` ve aylık CSV+JSON, custom gün=1, SQLite **v8 18-tablo AES şifreli yedek/clean restore** değişmedi. Özel dönem CSV/JSON, full/partial fixed salary, custom period adjustment atfı ve rate-boundary pozitif mola atfı hâlâ eksik. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22)/parent [#16](https://github.com/hilmiguner/vardiyum/issues/16) AÇIK. Native cihaz [#2](https://github.com/hilmiguner/vardiyum/issues/2)/[#20](https://github.com/hilmiguner/vardiyum/issues/20) erteli: JS export native PASS değildir.

## 2026-11-15 — PR #29 MERGED: Ücret değişimi sınırı mola beyanı ve gerçek tahmin

- **[PR #29](https://github.com/hilmiguner/vardiyum/pull/29)** squash merge, main **code SHA `3ecfe1701e5cfef6e0ad836d8809923f3077354b`**. [PR CI #43754736968](https://github.com/hilmiguner/vardiyum/actions/runs/43754736968) **SUCCESS** ve [merge sonrası main CI #43754910798](https://github.com/hilmiguner/vardiyum/actions/runs/43754910798) **SUCCESS**: **204/204 Node testi**, Prettier, ESLint, TypeScript, Expo dependency check, Android+iOS **JS export**.
- [x] **`src/domain/rate-boundary-break-audit.ts`:** İki aylık saatlik ücret profilinin değiştiği ayın 1'indeki yerel gece yarısını (her gerçek çalışma kaydının **orijinal IANA zone'unda**) aşan **pozitif molayı** kullanıcı explicit **eski oran tarafındaki dakika** olarak beyan edebilir; yeni oran tarafının dakikası toplam moladan türetilir. Her parça gross UTC kapasitesini aşamaz. Kaynak work ID, source UTC/local dates/zone, özel dönem key+startDay, efektif ayın 1'i UTC, original+piece break, reason 3–160, canonical timestamp, monotonic revision ile doğrulanır.
- [x] **`src/domain/rate-boundary-break-store.ts`:** SQLite **v8 `app_settings`** ayrı `earnings_rate_boundary_break_v1:<startDay>:<periodKey>:<workId>` namespace. `event:001...` revizyonları INSERT-only, head exclusive SQLite transaction ile atomik ileri alınır; expectedRevision optimistic lock; append sonrası bütün eventlerin canonical revalidation/readback. Bu **uygulama seviyesinde append-only** koruma, SQLite dosyasını dışarıdan değiştirene karşı **kriptografik tamper-proof değil**.
- [x] `src/data/rate-boundary-break-repository.ts` Expo exclusive transaction, `src/components/rate-boundary-break-panel.tsx` TR/EN source/time-zone/reason/minutes/revision formu. Save sonrasında gerçek **custom hourly work-only** kazanç paneli yeniden yüklenir. `src/domain/custom-mixed-hourly-work.ts` eski/yeni oran UTC parçalarında **yalnız son kaynakla eşleşen rate audit** varsa molayı dağıtır ve kaynak satırında `rateBreakAuditRevision` gösterir; mola beyanı yoksa **BLOCKED**. Tek-rate/aylık rapor hiç değişmedi.
- [x] +**12 gerçek Node/SQLite v1→v8 regresyonu**: kayıtsız blok→beyan→kuruşlu tahmin, correction rev2/önceki kayıt byte korunması, stale/invalid rollback, head bozulma/source provenance değişimi reddi, yazma hata rollback, work ID wildcard izolasyonu, Kathmandu UTC+5:45, sahte event reddi, no-break/single-rate/day1. 192→**204 test**.
- **KAPSAM SINIRI:** Aynı gerçek çalışma **hem özel maaş dönemi sınırını hem efektif ücret tarihini** aşıyorsa iki ayrı mola atfının tutarlılığı henüz tasarlanmadı; bu kaynak için tahmin **BLOCKED**. Ayrıca mixed currencies, farklı OT eşikleri, fixed salary ve aylık bonus/kesintiler bloklanır; full/partial fixed, custom period adjustments ve özel dönem CSV/JSON eksik. **Issue #22** ve üst **#16 AÇIK**, native iOS/Android/backup restore crash/low-disk **#2/#20 erteli**. SQLite v8 **18 tablo AES encrypted backup/clean restore** korunur. Android/iOS JS bundle **native device PASS değildir**.

## 2026-11-15 — PR #30 MERGED: İki sınırı aşan gerçek vardiyanın mola uzlaştırması

- **[PR #30](https://github.com/hilmiguner/vardiyum/pull/30)** merged, main code SHA `fb8ed3b7a48bd0d103f4e9c520e335ad5613e064`. [PR CI #43757510214](https://github.com/hilmiguner/vardiyum/actions/runs/43757510214) **SUCCESS**, [merge sonrası main CI #43757686602](https://github.com/hilmiguner/vardiyum/actions/runs/43757686602) **SUCCESS** — **217/217 Node testi**, Prettier, ESLint, TypeScript, Expo dependency check ve Android+iOS **JS export**.
- `src/domain/dual-boundary-break-audit.ts`, `src/domain/dual-boundary-break-store.ts` ve `src/data/dual-boundary-break-repository.ts`: tek kaydedilmiş gerçek vardiya **hem özel maaş dönemi kapanışı hem ayın 1'inde efektif saatlik ücret** sınırını aşıyorsa 2 ayrı beyanla ücret atfı. Önce [PR #25](https://github.com/hilmiguner/vardiyum/pull/25) kaynaklı **maaş dönemi** mola event/revision zorunlu, sonra bu dönemde ücret değişimini aşan kısmın molası **eski ücret tarafındaki tam dakika** olarak kaydedilir; yeni taraftaki dakika kayıtlı dönem parça toplamından çıkarılır.
- **Bağlı revizyon:** İkinci event kendi `earnings_dual_boundary_break_v1:<day>:<periodKey>:<workId>` SQLite v8 `app_settings` namespace'inde INSERT-only event/atomic head olarak kaydedilir; **ilk maaş dönemi audit event'inin tam kaynağını/revizyonunu** snapshot olarak içerir. İlk beyan sonra değiştirilirse ikinci beyan eski revizyona bağlıdır ve gerçek fiyatlandırma **STALE_DUAL_PAY_PERIOD_AUDIT** ile BLOCKED olur; kullanıcı yeni ikinci beyanı açıkça kaydetmelidir. Eski event JSON'ları uygulama düzeyinde korunur, doğrudan SQLite'a müdahaleye karşı **kriptografik kurcalanamaz iddiası yok**.
- `src/domain/custom-mixed-hourly-work.ts` ile `src/domain/custom-hourly-work-store.ts` aynı salt-okuma SQLite snapshot'ında güncel iki audit kaynağını doğrular; gerçek work IANA zone local midnight → UTC segment, iki custom pay period arasında toplam net saniye **çifte sayılmaz**, gerçek rate/OT değerleri doğru parçaya uygulanır. TR/EN `src/components/dual-boundary-break-panel.tsx` yeni beyan ve stale uyarısı; `src/components/custom-hourly-estimate-panel.tsx` kaynak satırında ayrı rate/dual audit revision. Uygun tek-rate/tek-sınır ve calendar-month raporları **değişmedi**.
- **Yeni +13 Node testi** `tests/dual-boundary-break-reconciliation.test.mjs`: 27s gerçek kaynakta Dec1 ücret/Dec2 pay boundary 90dk mola, pay split 60/30 ve rate split 20/40 ile old/new/next net süre + integer kuruş; ilk audit düzeltmesinde 2. audit stale ve explicit rebind, immutable history, yanlış head/source/id/stale/rollback, Kathmandu UTC+5:45, FX blocker, legacy SQLite v8 integrity. 204→**217**.
- **Korunanlar:** SQLite v8 **18 tablo, AES encrypted backup/clean-target restore**, aylık `loadEarningsReport` ve CSV/JSON. **Yalnız kullanıcı kayıtlı, vergi öncesi ACTUAL WORK-ONLY ücret tahmini**; sabit maaş ve dönemlik bonus/deduction/correction atfı, custom-period CSV/JSON, vergi/net/SGK/resmî bordro henüz yok. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22)/üst [#16](https://github.com/hilmiguner/vardiyum/issues/16) AÇIK; native cihaz/restore/low-disk/crash [#2](https://github.com/hilmiguner/vardiyum/issues/2)/[#20](https://github.com/hilmiguner/vardiyum/issues/20) erteli. JS export native test değildir.

## 2026-11-15 — PR #31 MERGED: Kullanıcı onaylı sabit ücret ana tutarı (özel maaş dönemi)

- **[PR #31](https://github.com/hilmiguner/vardiyum/pull/31)** MERGED, main code SHA `3eaa0876224224919b4ccf1d9b97886d11297048`. [PR CI #43760613389](https://github.com/hilmiguner/vardiyum/actions/runs/43760613389) **SUCCESS**, [merge sonrası main CI #43760758921](https://github.com/hilmiguner/vardiyum/actions/runs/43760758921) **SUCCESS**: **232/232 Node**, Prettier/ESLint/TypeScript/Expo dependencies, Android+iOS **JS exports**. Native cihaz PASS iddiası yok.
- **Yeni:** `src/domain/custom-fixed-base-policy.ts` mevcut kaynak immutable **tek `monthly_fixed`** ücret profiliyle (id/effectiveFrom/revision/currency/base), custom pay period 2–28 gün/periodKey, schedule IANA, zaman, reason ve kendi audit revision'ıyla bağlı `CustomFixedBaseEvent`. Uygulama tutar göstermeden kullanıcı **`full_base`** (profilin tam aylık *ana tutarı*, özel dönemde aynısını uygulama KARARI) veya **`explicit_partial_base`** (0 dahil tam minor para birimi tutarı; kaynak tam sabit ücretten KÜÇÜK) seçip 3–160 karakter açıklama girer. **Takvim gününden veya fiilî çalışma saatinden sessiz prorata YOK.**
- **Sürüm + ekran:** `src/domain/custom-fixed-base-store.ts` mevcut SQLite **v8 `app_settings`** ayrı `earnings_custom_fixed_base_v1:<startDay>:<periodKey>` event:### INSERT-only/transactional head optimistic expectedRevision, source-bound canonical history. `src/data/custom-fixed-base-repository.ts` Expo exclusive transaction, `src/components/custom-fixed-base-panel.tsx` TR/EN tam/eksik tutar seçimi, kaynak profil, reason, revizyon, stale uyarısı. Bir profile yeni immutable revision gelirse veya schedule time zone değişirse eski ücret beyanı **STALE → requires_choice**, yeni explicit onay gereklidir. Geçmiş eventler kendi eski kaynak snapshot'larıyla doğrulanır; app-level append-only, SQLite dosyasına dışardan müdahaleye karşı **kriptografik tamper-proof değil**.
- **Fail-closed:** Tek profil olmayan sabit/saatlik karma geçişleri, her iki takvim ayından birindeki bonus/deduction/correction **BLOCKED**. Day=1 veya yalnız hourly profil için bu özel sabit paneli **not_applicable**. Bekleyen kullanıcı beyanı varsa rakam YOK. Başarılı çıktı yalnız **BASE_ONLY_OVERTIME_WORK_ADJUSTMENTS_EXCLUDED**, user-reported PRE-TAX sabit ücret ana tutarıdır. **Fazla mesai, gerçek çalışma, prim, kesinti, net/vergi/SGK veya tam bordro dahil DEĞİL**, hourly work-only tutarıyla otomatik birleştirilmez.
- **Regresyon:** `tests/custom-fixed-base-policy.test.mjs` +15 Node (217→**232**): full/partial/0 exact kuruş, initial absent choice=no money, rev2 correction, source pay profile rev2 sonrası stale→explicit re-confirm, schedule zone change, 3 tür aylık adjustment engeli, karma fixed profiller, day1/hourly izolasyonu, stale/invalid rollback, corrupted history/header, interrupted SQLite write rollback, key isolation, DST/year rollover, v1→v8 migration 18 table/FK/integrity.
- **Korunanlar:** SQLite v8 **18 tablo**, AES encrypted archive/clean-target restore, eski aylık kazanç/CSV/JSON, önceki hourly+break audit hesapları değişmedi. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) ve [#16](https://github.com/hilmiguner/vardiyum/issues/16) AÇIK: sırada sabit ücret **fazla mesai** için ayrı veri/politika ve testler, değişken/mixed-fixed profillerin explicit onayı, özel dönem prim/kesinti atfı ve CSV/JSON. Gerçek cihaz/native SQLite/restore/low-disk/crash QA [#2](https://github.com/hilmiguner/vardiyum/issues/2)/[#20](https://github.com/hilmiguner/vardiyum/issues/20) ertelendi.

## 2026-11-16 — PR #32 MERGED: Sabit ücret + onaylı gerçek fazla mesai

- [PR #32](https://github.com/hilmiguner/vardiyum/pull/32) merged; code main SHA `39f3ac22d2f7a34d173ce9416ceb85e56adc250b`. [PR CI #43764510109](https://github.com/hilmiguner/vardiyum/actions/runs/43764510109) **SUCCESS** ve [merge sonrası main CI #43764652681](https://github.com/hilmiguner/vardiyum/actions/runs/43764652681) **SUCCESS**: **249/249 Node testi**, Prettier, ESLint, TypeScript, Expo compatibility, Android+iOS **JS exports**. Fiziksel cihaz kabulü DEĞİL.
- **Açık ikinci kullanıcı kararı:** [PR #31](https://github.com/hilmiguner/vardiyum/pull/31) `CustomFixedBaseEvent` ile tam/eksik `monthly_fixed` *ana tutarı* ayrı explicit seçildikten sonra yeni **`FixedOvertimeEvent`** `include_logged_overtime` veya `exclude_logged_overtime` kararı, reason/time ve önceki **tam sabit ücret source event snapshot/revision** ile saklanır. Onay yoksa veya hariç tutulduysa birleşik tutar gösterilmez. Sabit ana ücret beyanı/profil revizyonu/schedule IANA değişirse önceki overtime onayı stale→BLOCKED; yeniden explicit karar gerekir. Önceki onaylar app düzeyinde append-only, kriptografik tahrifata dayanıklılık iddiası yok.
- **Gerçek hesap:** `src/domain/custom-fixed-overtime-engine.ts` yalnız original user-entered `actual_work_sessions` UTC/IANA zaman dilimi ve pozitif molalı pay-period geçişi için source-bound [PR #25](https://github.com/hilmiguner/vardiyum/pull/25) custom-break audit'ini kullanır. Bir özel maaş döneminde tüm gerçek NET saniyelere kullanıcı tarafından kayıtlı `overtimeAfterMinutes` eşiği **bir kez** uygulanır; **normal süre sabit ana ücrete tekrar ücret olarak eklenmez**. Sadece eşik üstü saniyeler son immutable fixed `overtimeHourlyMinorUnits × overtimeMultiplierNumerator / overtimeMultiplierDenominator` ile **BigInt kümülatif tam minor birim** fiyatlandırılır; kaydedilen gerçek çalışmalar değişince yeni kaynak tutar hesaplanır. İki komşu dönemin kesişmeyen UTC parçaları çifte sayılmaz.
- **Kayıt/UI:** `src/domain/custom-fixed-overtime-policy.ts`, `custom-fixed-overtime-store.ts`, `src/data/custom-fixed-overtime-repository.ts`, `src/components/custom-fixed-overtime-panel.tsx` ve TR/EN çeviriler. Mevcut SQLite **v8 app_settings** ayrı `earnings_custom_fixed_overtime_v1:<day>:<periodKey>` INSERT-only event ve exclusive transaction mutable head expectedRevision/CAS/readback; yeni migration YOK. UI sabit kaynak revizyonu/eşik/oran/çarpan, izin/ret ve gerçek UTC kaynak satırlarını gösterir; sadece geçerli include olursa **seçilen sabit BASE + gerçek çalışma overtime** toplamı gösterir.
- **+17 Node regressions** `tests/custom-fixed-overtime.test.mjs`, toplam 232→**249**: base seçimi olmadan para yok; overtime threshold yoksa yapılandır; explicit ret birleşik rakam üretmez; pozitif mola crossing audit eksikse block; iki ayrı 26→25 dönemiyle net saniye ve tam kuruş; base correction/profile correction stale/reapproval; kümülatif 1sn pennies; duplicate/overlapping work; aylık bonus/deduction/correction block; malformed history, stale save, interrupt rollback; Kathmandu source IANA; day1/hourly/mixed-fixed izolasyonu; gerçek v1→v8 SQLite **18 tablo/FK/integrity**.
- **KAPSAM:** Sadece kullanıcı bildirimli **PRE-TAX fixed BASE + user-chosen logged overtime** tahmini. Kullanıcı eşiği yasal fazla mesai eşiği iddiası değildir. Takvim-aylık bonus/kesinti/düzeltme custom döneme taşınmaz, **BLOCKED**; sabit→sabit veya sabit→hourly efektif profil geçişi BLOCKED; net/vergi/SGK/resmî bordro değil. Eski calendar monthly earnings/CSV/JSON, hourly estimator, SQLite v8 18-table **AES encrypted backup+clean restore** korunur. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) ve üst [#16](https://github.com/hilmiguner/vardiyum/issues/16) AÇIK; sonraki önemli geliştirme özel dönem bonus/deduction/correction kaynak atfı+CSV/JSON; mixed-fixed ayrıca; native QA [#2/#20](https://github.com/hilmiguner/vardiyum/issues/20) kullanıcı isteğiyle erteli.

## 2026-11-16 — PR #33 MERGED: Kaynak-bağlı özel maaş dönemi prim/kesinti/düzeltme atfı

- **[PR #33](https://github.com/hilmiguner/vardiyum/pull/33)** squash merge, main code SHA `277ab98683bab26c05cc218bea0931a7a91817b9`. [PR CI #43766646282](https://github.com/hilmiguner/vardiyum/actions/runs/43766646282) **SUCCESS** ve [merge sonrası main CI #43766839777](https://github.com/hilmiguner/vardiyum/actions/runs/43766839777) **SUCCESS**, **267/267 Node** + Prettier, ESLint, TypeScript, Expo dependencies, Android+iOS **JS bundle**. Gerçek native cihaz testi DEĞİL.
- **Tek gerçek kaynak, iki aday özel dönem:** `src/domain/custom-adjustment-attribution.ts` mevcut takvim-aylı `earnings_adjustments` her user-entered `bonus | deduction | correction` kaydının full source snapshot'ını (id, original calendar periodKey, kind, currency, signed amount in minor units, note, createdAt) doğrular; current custom startDay 2–28 üzerinden source ayının 1'i ile son gününün ait olduğu **iki komşu custom period** hesaplanır. Kullanıcı eski özel dönemin **kesin tam minor tutarını** yazar, yeni döneme kalan miktar atanır. **İşaret, para birimi ve tam kaynak tutarı korunduğu** matematiksel olarak doğrulanır; 0/full ve signed correction geçerli, aşırı atıf/işaret tersliği/FX/day-based prorata yasak.
- **V8 sürümlü audit:** `src/domain/custom-adjustment-attribution-store.ts`, `src/data/custom-adjustment-attribution-repository.ts` ile mevcut SQLite v8 `app_settings` ayrı `earnings_custom_adjustment_split_v1:<startDay>:<adjustmentId>` namespace'inde event:### INSERT-only, exclusive transaction CAS head ve expectedRevision; canonical JSON history/readback. Tek kaynak kararını iki ayrı maaş dönemi ortak okur; başka dönemde ikinci bağımsız kopya YOK. Düzeltme rev2 eski event byte'larını korur. Source content dışarıdan değişirse önceki audit **stale/fail closed** olur; doğrudan SQLite'a müdahaleye karşı **kriptografik tamper-proof iddiası yok**.
- **Kazanç ekranı:** TR/EN `src/components/custom-adjustment-attribution-panel.tsx` aynı kaynağın orijinal tutarı, ayı, türü, açıklaması, iki aday dönemi, önceki dönemin kullanıcı seçtiği payı, sonraki kalan, reason 3–160, audit revision, stale warning. Her aday kaynağın verified audit'i yoksa **hiçbir özel dönem atıf toplamı gösterilmez**. Tam doğrulama varsa **para birimi ayrı ayrı ek kalem toplamı** (FX birleştirme YOK), kaynak satırları. Kaydedilen eski aylık rapor ay bazında **değişmeden** kalır; aylık ve özel dönem raporları birbiri üstüne TOPLANMAZ.
- **Güvenli yeniden açılma:** `adjustmentAttributionGate` validated two-month source count ile tüm kaynakları eşleştirdikten sonra `src/domain/custom-hourly-work-store.ts`, `custom-fixed-base-store.ts`, `custom-fixed-overtime-store.ts` içindeki önceki bilinmeyen adjustment-blokajı çözülebilir; ama bu raporlar **HALA sadece work-only/base-only/base+overtime**, atfedilen adjustment tutarlarını kazanç toplamına sessizce KATMAZ. Yeni tek bir calendar adjustment girilirse önceki durum tekrar pending→bloklu. Bu bir **tam bordro toplamı DEĞİL**.
- **+18 gerçek SQLite/Node regression** `tests/custom-adjustment-attribution.test.mjs` (249→**267**): iki aday özel dönem, signed bonus/deduction/correction/zero/full/exceed, source conservation, iki calendar-month kaynaktan tek özel döneme bütünlüklü atıf, iki komşu custom dönem toplamı kaynak tutarına eşit, multi-currency ayrı, eksik/stale kaynak NO totals, rev2 eski event byte'ları korunur, stale UI/invalid/replay/rollback, source edit stale, corrupt history/head/gap, literal underscore ID izolasyonu, day1 legacy untouched, gerçek v1→v8 18 tablo/FK/integrity. Ayrıca gerçek SQLite fixed BASE ve hourly work-only raporlarının ancak verified atıf sonrası açıldığı ama **primle şişmediği** kanıtlandı.
- **KAPSAM:** SQLite **v8 18 tablo, AES şifreli arşiv/clean-target restore sözleşmesi**, eski calendar earnings/CSV+JSON, rate/break audit migration'ları korunur. **Kaynaklı özel dönemin CSV/JSON export'u ve verified base+overtime+adjustment tek toplamı HENÜZ YOK**, üst #16/Issue #22 AÇIK. Karma fixed→fixed/fixed→hourly aylık profile geçişi hâlâ BLOCKED. Vergi/SGK/net/yasal bordro değil. Gerçek telefon/device SQLite/restore/crash/low disk Issue #2/#20 kullanıcı isteğiyle erteli.

## 2026-11-16 — PR #34 MERGED: Doğrulanmış birleşik özel maaş dönemi kazanç tahmini

- [PR #34](https://github.com/hilmiguner/vardiyum/pull/34) squash MERGED, code main SHA `db8875817fb0e6d054ee50aa5263d5379f45a3f0`. [PR quality #43820684484](https://github.com/hilmiguner/vardiyum/actions/runs/43820684484) **SUCCESS**, [merge main quality #43820987714](https://github.com/hilmiguner/vardiyum/actions/runs/43820987714) **SUCCESS**: **290/290 Node** (önceki 267 +23), Prettier/ESLint/TypeScript/Expo dependency check, Android+iOS **JavaScript export**. Native cihaz kabulü DEĞİL.
- **Yeni rapor:** `src/domain/custom-pay-combined.ts` ve `custom-pay-combined-store.ts`, Expo `src/data/custom-pay-combined-repository.ts` ile tek **SQLite exclusive read transaction** içinde original user work UTC/IANA, maaş profillerinin son immutable revision'ları, PR #25–30 pay/rate/dual break denetimleri, PR #31 sabit full/partial BASE beyanı, PR #32 ayrı include/exclude fazla mesai kararı, PR #33 orijinal calendar aylık bonus/deduction/correction kaynaklarının iki komşu custom period arasındaki signed exact minor atıf history'si okunup tek kaynaklı **PRE-TAX combined estimate** çıkarılır. Day=1 eski calendar report; custom 2–28 model.
- **Aritmetik:** `hourly_actual_work`: tek veya iki efektif saatlik profil için gerçek normal + eşik üstü OT + seçilen dönemde kesin atfedilmiş imzalı adjustment. `monthly_fixed`: kullanıcı tarafından seçilmiş tam/eksik sabit BASE + ayrıca onaylı gerçek OT (ya da explicit `exclude_logged_overtime` ise 0) + doğrulanmış adjustment. **Sabit maaşın normal gerçek saatleri tekrar ücretlendirilmez**. Her kaynak line: real work UTC origin+segment/IANA, profil id/revision ve pay/rate audit revizyonu; her bonus/kesinti line: original source id/month/createdAt/note/amount + latest attribution revision, earlier/later exact cents ve reason. BigInt exact signed minor, sınır ±1e12, NEGATİF combined salary gösterilmez.
- **FAIL CLOSED:** Kullanıcı beyanı/mesai onayı/gerçek work/mola audit/adjustment atfı eksik veya stale ise, fixed→fixed/fixed→hourly effective profile geçişinde, bir USD/EUR adjustment kaynak para birimi TRY ücretinden farklıysa **even 0 allocated** (FX YOK), kaynak satır tutarı/historiği tutmazsa, duplicate, overflow ya da total<0 ise **birleşik rakam YOK**. Legacy calendar-month kaynakları kendi raporunda yine görünür; **calendar ve custom raporu birlikte TOPLAMA**.
- **Düzeltme:** Önceki PR #33 fixed overtime gate, tüm monthly adjustments açıkça custom period'a atansa bile `estimateCustomFixedOvertime(..., adjustments.n)` geçerek yanlış BLOCKED olabiliyordu. PR #34 `remainingUnattributed=adjustmentAttributionGate(...)` değerini (tümü verified ise **0**) engine'e geçirir, OT yeniden açılır; adjustment tutarı OT engine içinde yine kesinlikle eklenmez. Regression test eklendi.
- **UI:** `src/components/custom-pay-combined-panel.tsx` ve TR/EN kazanç ekranında tek birleşik toplam, BASE/normal/hourly OT/ek kalemler dökümü, profil/audit revizyon ve gerçek UTC kaynağı, no-payslip/no-calendar-double-count uyarısı. Yeni DB table **YOK**, SQLite v8 **18 tablo**, AES encrypted archive/clean-target restore ve eski aylık CSV/JSON kodu değişmedi. **Özel dönem CSV/JSON henüz YOK**, kullanıcı mahremiyet onayı gerekir.
- **+23** `tests/custom-pay-combined.test.mjs`: real SQLite v1→v8 18 table/FK/integrity, hourly+2 effective hourly rates one threshold, fixed full/partial BASE+OT include/exclude, signed 3 adjustment categories, source rev2 immutable, stale profile/base, missing period break, pending source, currency NO FX, forged JSON/audit, negative total/overflow, duplicates, no-work, day1/mixed-fixed guard. [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22), parent [#16](https://github.com/hilmiguner/vardiyum/issues/16) AÇIK; sonraki privacy-confirmed özel dönem CSV/JSON ve fixed effective geçiş politikası. Native phone #2/#20 kullanıcı isteğiyle erteli.

## 2026-11-16 — PR #35 incelemede: özel maaş dönemi için açık onaylı CSV/JSON

- [PR #35](https://github.com/hilmiguner/vardiyum/pull/35) `feat/custom-pay-privacy-export-v8` branch'inde; **main'e merge edilmedi, CI sonucu ayrıca kontrol edilmeli**. Issue #22/#16 kapsamındaki user-confirmed custom export.
- `src/domain/custom-pay-export.ts`: yalnız **güncel source-coherent `status=estimated` combined custom day2–28** raporu; JSON `vardiyum-custom-pay-estimate-v1`, kaynak çalışma ID/UTC/IANA, ücret profil/audit revision, imzalı integer minor tutarlar, bonus/kesinti/düzeltme orijinal ve dönem atıf izi; CSV tüm riskli metinlerde spreadsheet formula neutralization. Negatif/overflow/bozuk kaynak/toplam/no FX ve blocked/day1 export kapalı.
- `src/components/custom-pay-combined-panel.tsx`: TR/EN toplam+dönem+satır sayısı **önizlemesi ve her paylaşım için kullanıcı onayı**; onaydan **sonra** tek SQLite exclusive transaction ile raporu yeniden oku. Kullanıcıya gösterilmiş eski raporla herhangi bir kaynak/audit/para alanı uyuşmazsa **paylaşma, tekrar inceleme iste**. Otomatik upload yok.
- `src/services/custom-pay-export-files.ts`: kullanıcı share ekranı için kısa süreli **şifresiz cache dosyası**; paylaşım bitince/iptal/hata durumunda `finally` cleanup. Native OS davranışları **gerçek cihazda test edilmedi**. Dosya şifreli backup değildir.
- `tests/custom-pay-export.test.mjs`: format, source/revision, FIXED-EXCLUDE, old-vs-fresh consent, blocked/day1/no FX, spreadsheet formula and signed cents regresyonu. Mevcut aylık export, SQLite v8 18 tablo ve AES backup/restore kodu **değiştirilmedi**.
- Özel dönemde efektif ay içinde **fixed→fixed / fixed→hourly** ücret geçişi hâlâ BLOCKED. Gerçek telefon/SQLite/AES restore/düşük disk/crash ve dosya sharing QA [#2](https://github.com/hilmiguner/vardiyum/issues/2)/[#20](https://github.com/hilmiguner/vardiyum/issues/20) kullanıcı isteğiyle erteli. No net/vergi/SGK/yasal bordro.
