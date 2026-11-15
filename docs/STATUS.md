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

**PR:** [#21](https://github.com/hilmiguner/vardiyum/pull/21) · `feat/clean-target-atomic-backup-restore`  
**Kod CI:** [#43724855020](https://github.com/hilmiguner/vardiyum/actions/runs/43724855020) SUCCESS (**127/127 Node testi**, Prettier/ESLint/TS, Expo paket check, Android/iOS **JS** export).

- [x] Kaynak şifreli dosya **AES-GCM/AAD, SHA-256, SQLite v8 18 tablo trusted schema** ile doğrulanmadan geri yükleme adayı değil.
- [x] UI: önce read-only tablo/row önizlemesi, sonra `RESTORE` metni ve ikinci risk onayı; TR/EN *deneysel/native test edilmedi* ibaresi.
- [x] Tek transaction içinde hedef `PRAGMA user_version=8`, exact 18 tablo, dört **değişmemiş** seed şablonu ve diğer tabloların **boşluğu** kontrol edilir. Dolu DB ve özelleştirilmiş şablonlar **reddedilir**.
- [x] Transaction: statik v8 tablo/kolon INSERT, readback exact, `PRAGMA foreign_key_check` + `PRAGMA integrity_check`, hata durumunda rollback.
- [x] Sistem bildirim opt-in'i restore sırasında **0** olarak resetlenir; ikinci restore'u önlemek için marker; source user data geri kalan birebir.
- [x] SQLite v8 Node regresyonu: dolu hedef reddi, seed özelleştirme reddi, mükerrer restore, fault injection/UNIQUE rollback, FK OFF bağlantısında FK postcheck rollback, schema mismatch.
- [ ] PR #21 belge commit sonrası merge ve main CI doğrulanacak.
- [ ] **Gerçek native Android/iOS cihaz testleri yapılmadı:** kayıt kalıcılığı, AES interoperability, düşük disk, crash/relaunch, SQLite exclusive tx, Share/Picker ve OS bildirimleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelenmiş. [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) bu kabul olmadan **kapatılmayacak**.
- [ ] Mevcut dolu DB ile merge/overwrite veya özel maaş dönemi yok; [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık.

**Sıradaki:** PR #21 merge/main CI; gerçek cihaz kabulü için Issue #2/#20 ve sonraki MVP seçenekleri. Restore tam cihaz kanıtı olmadığından 'cihaz kurtarma doğrulandı' denmeyecek.
