# Vardiyum — Yeni Sohbette Devam Notu

**Repo:** https://github.com/hilmiguner/vardiyum  
**Tarih:** 2026-11-15

## Her zaman önce doğrula

1. `main` SHA, son Actions (özellikle push CI), açık PR/Issue durumunu kontrol et.
2. [STATUS.md](STATUS.md), [ROADMAP.md](ROADMAP.md), [DECISIONS.md](DECISIONS.md) ve bu dosyayı oku.
3. Kod var demek native test, mağaza yayını veya ürünün tamamı hazır demek değildir.

## Ürün / hedef

**Vardiyum**, başlangıçtan itibaren **tüm vardiyalı çalışanları** hedefleyen offline-first, TR/EN bir iOS/Android kişisel çalışma asistanı.

- Periyodik esnek vardiyalar + izin/değişiklik için tek gün istisnaları.
- Vardiyaya/güne bağlı rutin görevler, tamamlanma ve hatırlatmalar (Faz 3).
- Mesai, taban ücret, prim/kesinti üzerinden **tahmini** kazanç (Faz 4; resmi bordro değil).
- Çekirdek özellikler için internet ve üyelik zorunluluğu yok; ileride Supabase opsiyonu.
- Marka çalışma adı Vardiyum; tescil/domain/mağaza uygunluğu henüz kontrol edilmedi.

## GitHub ilerlemesi

- **PR #1:** Dokümantasyon/hafıza main'e merge edildi.
- **PR #3:** Expo SDK 57 + RN/TS, SQLite v1, uygulama iskeleti ve CI main'e merge edildi. PR #3 main CI: [#43698720966](https://github.com/hilmiguner/vardiyum/actions/runs/43698720966) SUCCESS.
- **PR #5:** `feat/shift-templates-overrides-v2` — kullanıcı tanımlı vardiya adı/saat/mola şablonları, aylık takvim, tek gün değişiklik/geri alma, SQLite v2 eklemeli migrasyon, geçmiş v1 veri koruma ve domain testleri.
- **PR #5 CI:** [#43700598683](https://github.com/hilmiguner/vardiyum/actions/runs/43700598683) SUCCESS (npm ci, Expo check, Prettier, lint, TS, Node test, Android+iOS JS export).
- **PR #5 merged:** main SHA `d321be3e54eac31de6a69e59afcc461113ceaf25`. Son PR CI #43700862285 SUCCESS; merge sonrası main CI [#43700993958](https://github.com/hilmiguner/vardiyum/actions/runs/43700993958) SUCCESS, doc güncellemesi CI [#43701110474](https://github.com/hilmiguner/vardiyum/actions/runs/43701110474) SUCCESS.

## Teknik sınırlar / sonraki işler

- Yerel takvim günü hesabında tarih + IANA zaman dilimi kullanılır; sabit 24 saatlik milisaniyeye göre gün farkı hesaplanmaz.
- 23:00–07:00 veya 07:00–07:00 (+1) **planlı duvar saati aralığıdır**. DST geçişlerinde gerçek geçen süre ayrı çözüm gerektirir; ücret hesabında bunu gerçek dakika varsayma.
- SQLite v2 tablo ekler/alan genişletir; eski `pattern_days` ve `day_overrides` korunmalı.
- Tek günlük istisnalar diğer günlerin döngü sırasını değiştirmez.
- PR #5 gerçek telefonda test edilmedi; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık.
- Kullanıcı rutinleri, bildirimler ve kazanç motorları henüz boş/yer tutucu ekranlar.
- [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4) Faz 2'nin açık üst işi; eksik kapsam ve cihaz testleri bitene kadar kapanmamalı.

## Bir sonraki somut geliştirme

1. PR #5 main'e birleştirildi; yeni oturumda son main commit/Actions ve [Issue #6](https://github.com/hilmiguner/vardiyum/issues/6) durumunu doğrula.
2. Native SQLite v1→v2 cihaz/uygulama yeniden başlatma testlerini yap; fiziksel test yapılamıyorsa açık bırak.
3. Faz 2 kalan kapsamını küçük PR'lara böl: [Issue #6](https://github.com/hilmiguner/vardiyum/issues/6) DST/gerçek geçen süre; şablon silme/sürümleme; izin/mesai kayıtları.
4. Her PR için otomatik test + Android/iOS JavaScript export + belgeler; hiçbir zaman yalnızca sohbet hafızasına güvenme.

## Yeni sohbet için kopyalanabilir mesaj

> Vardiyum projesini GitHub'dan devralıp kaldığımız yerden devam edelim: https://github.com/hilmiguner/vardiyum. Önce docs/HANDOFF.md, docs/STATUS.md, docs/ROADMAP.md, docs/DECISIONS.md, açık PR/Issue ve güncel Actions durumlarını oku. PR #3 Expo iskeleti main'de; PR #5 özel vardiya/günlük istisnalar **main'e merge edildi**; sıradaki Issue #6 DST/gerçek geçen süre. Native Android/iOS cihaz testleri Issue #2'de açık, Faz 2 Issue #4. Test edilmemiş işleri tamamlandı diye işaretleme. Yeni değişiklikleri GitHub'a kanıtlarıyla kaydet.

## 2026-11-15 — Issue #6 / PR #7 devralma

- **PR:** [#7](https://github.com/hilmiguner/vardiyum/pull/7), **main'e squash merge edildi**; geliştirme branch'i `feat/zoned-shift-elapsed-time`. Başlangıç kodu: `src/domain/zoned-shift-time.ts`, UI: `src/components/scheduled-duration.tsx`, testler: `tests/zoned-shift-time.test.mjs`.
- **CI:** [Actions #43702389590](https://github.com/hilmiguner/vardiyum/actions/runs/43702389590) `SUCCESS` — Expo check, format, lint, tsc, Node testleri, Android+iOS JS export.
- **Kural:** Belirsiz/olmayan saatlerde varsayılan `reject`; `earlier/later` sadece açıkça verilirse. Kesin UTC aralığı varsa bile `elapsedSeconds` **fiilî çalışma veya bordro süresi değil**, yalnızca planlı aralığın gerçek geçen süresidir; mola otomatik düşülmez.
- **Seyahat:** Kaydedilmiş program IANA zaman dilimi sabit kalır; cihazın geçerli bölgesi hesaplamayı sessizce değiştirmez.
- **Açık:** Native cihazlarda Intl/tzdb farklılıkları, fold kararlarının kalıcı kaydı ve gerçek mesai/bordro bağlama. Kullanıcı, cihaz testlerinin sonraya kalmasını açıkça istedi. [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık.
- **PR #7 merged:** main commit `5d4e1f9fd5f0bdffdefe8b1281c74da4e25760fb`, main [Actions #43702715736](https://github.com/hilmiguner/vardiyum/actions/runs/43702715736) SUCCESS. Sıradaki teknik konu [Issue #8](https://github.com/hilmiguner/vardiyum/issues/8): kalıcı fold tercihi, fiilî çalışma/saat dilimi seçimleri. Faz 2 şablon sürümleme ve Faz 3 rutin motoru da açık. Asla native cihaz testini yapılmış olarak gösterme.

## 2026-11-15 — Issue #8 / PR #9 devri (en yeni durum)

Önce **[STATUS.md](STATUS.md)** ve GitHub'ın güncel main commit/PR/Actions ekranını kontrol et.

- **[PR #9](https://github.com/hilmiguner/vardiyum/pull/9)**, branch `feat/persisted-fold-work-sessions-v3`: günlük DST fold seçimi, açık saat dilimi değiştirme/önizleme, fiilî giriş/çıkış kayıtları ve yerel SQLite v3 migrasyonu.
- **Kanıt:** [Actions #43704251648](https://github.com/hilmiguner/vardiyum/actions/runs/43704251648) SUCCESS — Prettier, ESLint, TypeScript, npm ci, Expo dependency check, **39 Node test, 0 fail**, Android ve iOS JS export.
- **Henüz belgelendiği anda:** PR merge edilmedi; önce PR #9 HEAD/merge/main CI durumunu sorgula.
- **Ana sınır:** Bir günün fold seçimi yalnızca şablonun saatleri/ID'si ve program zaman dilimi aynıysa geçerli. Gerçek çalışma giriş/çıkışı planlanan vardiyadan ayrı ve kullanıcı beyanıdır; aynı UTC anları için çakışan fiilî kayıt reddedilir. Maaş motoru halen yok.
- **SQLite:** V3 `shift_boundary_choices` ve `actual_work_sessions` ekler. V1/V2 veri ve tarih korunur; legacy `work_entries` yanlışlıkla doğrulanmış sayılmaz.
- **Saat dilimi:** kullanıcı açık onayla program IANA zonunu değiştirir; yerel döngü tarih/saatleri korunur, geçmiş actual UTC kayıtları yeniden hesaplanmaz.
- **Cihazlar:** kullanıcı cihaz testlerini sonraya bırakmayı istedi. Bu eksiklik [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de açık, **PASS denmeyecek**.
- **Sıradaki iş:** PR #9 merge ve main CI doğrulanır; sonra STATUS/HANDOFF/ROADMAP commit/CI bilgileriyle güncellenir. Faz 2 tarihsel şablon sürümleme ya da Faz 3 rutine ilerlenir.

Yeni sohbet başlangıcı:

> Vardiyum projemiz https://github.com/hilmiguner/vardiyum. Önce docs/STATUS.md, docs/HANDOFF.md, docs/ROADMAP.md ve docs/DECISIONS.md dosyalarını, açık PR/Issue ve güncel main CI'ını doğrula. PR #7 UTC/DST motoru main'de; PR #9 günlük fold seçimi, gerçek çalışma ve saat dilimi ayarı ile SQLite v3. Native cihaz testleri kullanıcı isteğiyle ertelendi (Issue #2). Belgelenen gerçek test kanıtlarını esas al, sonraki MVP geliştirmesine geç, değişiklikleri GitHub'a işle.
