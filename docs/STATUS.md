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
