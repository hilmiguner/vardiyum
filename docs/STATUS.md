# Vardiyum — Güncel Durum / Kanıt Kaydı

**Güncelleme:** 2026-11-15  
**Repo:** https://github.com/hilmiguner/vardiyum  
**Ürün:** Her sektörden vardiyalı çalışanlara offline-first iOS/Android takvim + rutin + tahmini kazanç asistanı.

## GitHub main dalında doğrulananlar

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
- [ ] Yaz saati geçişlerinde **gerçek geçen dakika** hesabı. Mevcut süre yalnızca planlanan yerel duvar saati süresidir; ücret hesabına otomatik aktarılmamalı.
- [ ] Tam serbest şablon silme ve geçmiş sürümleme, çakışma davranışı; veri kaybı testi.
- [ ] Rutinler, bildirimler, maaş/mesai, dışa aktarma/geri alma ve mağazalar.

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
**Kod yazıldı; merge durumu yeni oturumda doğrulanacak.**

- [x] IANA saat dilimi ve vardiya sınırlarından UTC `startInstantUtc` / `endInstantUtc`.
- [x] `wallMinutes` ile `elapsedSeconds` ayrımı; planlanan mola/ücret hesabı ile karıştırılmıyor.
- [x] DST ileri sıçrama `nonexistent` / geri dönüş `ambiguous`; varsayılan katı reddetme, açık `earlier/later` kod sözleşmesi.
- [x] Bugün ve aylık takvimde süre karşılaştırması veya uyarı; TR/EN.
- [x] ABD, Avrupa/İstanbul, Avustralya Sydney/Lord Howe, Nepal, Samoa, yıl sonu, 24 saat, gap/fold örnekleri dahil 16 ek otomatik test senaryosu.
- [x] PR head commit `f233ec544a4ccadfdc7d839e2f836c21c42132c6`: [Actions #43702389590](https://github.com/hilmiguner/vardiyum/actions/runs/43702389590) **SUCCESS** (npm ci, Expo check, format, lint, typecheck, Node test, Android/iOS JS export).
- [ ] PR #7 main'e merge ve merge sonrası main CI onayı.
- [ ] Android/iOS **native** çalıştırma ve timezone/ICU doğrulaması: kullanıcı isteğiyle sonraya bırakıldı, [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık.
- [ ] Fold kararını gerçek kullanıcı tarihi/mesai kaydıyla kalıcı bağlama; resmî maaş motoru henüz yok.

**Takip:** [Issue #6](https://github.com/hilmiguner/vardiyum/issues/6) için PR #7 sonrası durum kaydedilecek. Bu iş bitse bile Faz 2 / [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4) diğer açık maddeler nedeniyle devam eder.
