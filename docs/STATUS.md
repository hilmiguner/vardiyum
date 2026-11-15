# Vardiyum — Güncel Durum / Kanıt Kaydı

**Güncelleme:** 2026-11-15  
**Repo:** https://github.com/hilmiguner/vardiyum  
**Ürün:** Her sektörden vardiyalı çalışanlara offline-first iOS/Android takvim + rutin + tahmini kazanç asistanı.

## GitHub main dalında doğrulananlar

- [x] PR #1: ürün/mimari/handoff belgeleri.
- [x] PR #3: Expo SDK 57, React Native, TypeScript mobil iskeleti; dört sekme ve ayarlar, SQLite v1, yerel demo döngü.
- [x] PR #3 main sonrası Actions [#43698720966](https://github.com/hilmiguner/vardiyum/actions/runs/43698720966) SUCCESS.
- **PR #5 öncesi main SHA:** `ffb8e5de2d4f2c945057ea4c614ddf4e48458945`.

## Faz 2 — Geliştirme dalında; henüz main'e merge edilmedi

**[PR #5 — Özel vardiyalar ve günlük istisnalar](https://github.com/hilmiguner/vardiyum/pull/5)**  
**Branch:** `feat/shift-templates-overrides-v2`

- [x] Kullanıcının vardiya türü adı, saatleri, mola süresi ve ek çalışma/izin günü şablonlarını oluşturup düzenlemesi.
- [x] Bitişi ertesi güne geçen veya 24 saat süren planlı vardiya aralıkları.
- [x] Takvimde aylık gezinme, gün seçimi ve günlük vardiya istisnası/geri alma.
- [x] Değiştirilen gün sonraki döngü indeksini kaydırmaz (domain testleri).
- [x] SQLite v1→v2 eklemeli migrasyon; `break_minutes` alanı ve varsayılan şablonların mevcut veriyi ezmeden eklenmesi.
- [x] Eski döngü, özel gün ve düzenlenmiş şablonların veritabanı geçişinde korunmasına ilişkin Node SQLite testleri.
- [x] TR/EN arayüz metinleri ve planlanan vardiya için takvim saat dilimine göre gün seçimi.
- [x] **[Actions #43700598683](https://github.com/hilmiguner/vardiyum/actions/runs/43700598683) SUCCESS**: `npm ci`, Expo bağımlılık kontrolü, Prettier, ESLint, TypeScript, Node testleri, Android/iOS JavaScript export.

**Not:** Bu belge sonlandığında PR'ın merge durumu değişmiş olabilir; önce GitHub PR ve main commit'ini kontrol et.

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
- PR #5'in son Actions sonucunu kontrol et ve uygun şekilde merge et; sonra main SHA ve CI doğrulamasını bu dosyaya yaz.
- Kalan Faz 2 konuları için ayrı PR: gerçek cihaz migrasyonu, zaman dilimi/DST süre semantiği, izin/mesai kayıtları ve serbest şablon yönetimi.
- Her gelişmede bu dosyayı, HANDOFF, ROADMAP ve DECISIONS kayıtlarını kanıtlarla güncelle.

## Geçmiş

- 2026-11-15: İlk ürün ve mimari belgelendirme PR #1 merge.
- 2026-11-15: Expo mobil iskeleti PR #3 merge, main CI başarılı.
- 2026-11-15: Özel vardiya/günlük istisna motoru PR #5 geliştirildi; JS ve birim testleri başarılı; native test henüz yok.
