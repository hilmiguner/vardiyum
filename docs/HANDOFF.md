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
- **PR #9 merged:** main commit `a4fcb627b203e2aa626266ed1f90adc543de2403`; merge sonrası [Actions #43704664276](https://github.com/hilmiguner/vardiyum/actions/runs/43704664276) SUCCESS. Sonraki sohbetler yeni commit/CI varsa onları da kontrol etmeli.
- **Ana sınır:** Bir günün fold seçimi yalnızca şablonun saatleri/ID'si ve program zaman dilimi aynıysa geçerli. Gerçek çalışma giriş/çıkışı planlanan vardiyadan ayrı ve kullanıcı beyanıdır; aynı UTC anları için çakışan fiilî kayıt reddedilir. Maaş motoru halen yok.
- **SQLite:** V3 `shift_boundary_choices` ve `actual_work_sessions` ekler. V1/V2 veri ve tarih korunur; legacy `work_entries` yanlışlıkla doğrulanmış sayılmaz.
- **Saat dilimi:** kullanıcı açık onayla program IANA zonunu değiştirir; yerel döngü tarih/saatleri korunur, geçmiş actual UTC kayıtları yeniden hesaplanmaz.
- **Cihazlar:** kullanıcı cihaz testlerini sonraya bırakmayı istedi. Bu eksiklik [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de açık, **PASS denmeyecek**.
- **Sıradaki iş:** [Issue #10](https://github.com/hilmiguner/vardiyum/issues/10) Faz 3 vardiyaya bağlı rutinler/önceki tamamlanmalar. [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4) geçmiş vardiya sürümlemesi açık; cihaz doğrulaması Issue #2 üzerinden sonraya ertelendi.

Yeni sohbet başlangıcı:

> Vardiyum projemiz https://github.com/hilmiguner/vardiyum. Önce docs/STATUS.md, docs/HANDOFF.md, docs/ROADMAP.md ve docs/DECISIONS.md dosyalarını, açık PR/Issue ve güncel main CI'ını doğrula. PR #7 UTC/DST motoru main'de; PR #9 günlük fold seçimi, gerçek çalışma ve saat dilimi ayarı ile SQLite v3 **main'e merge edildi**; sıradaki Issue #10 rutin motoru. Native cihaz testleri kullanıcı isteğiyle ertelendi (Issue #2). Belgelenen gerçek test kanıtlarını esas al, sonraki MVP geliştirmesine geç, değişiklikleri GitHub'a işle.

## 2026-11-15 — Issue #10 / PR #11 son geliştirme devri

- **PR #11 merged:** https://github.com/hilmiguner/vardiyum/pull/11, merge SHA `e336bf4dce5597932482b774235575fe68428217`. Merge sonrası main [Actions #43706843264](https://github.com/hilmiguner/vardiyum/actions/runs/43706843264) SUCCESS.
- **Kod:** `src/domain/routine-engine.ts` saf seçim motoru; `src/data/routine-repository.ts` transaction'lar; `src/components/routine-day-checklist.tsx` günlük görevler ve geçmiş; `src/app/(tabs)/routines.tsx` düzenleme/arşiv yönetimi; `src/data/schema.ts` SQLite v4.
- **İş kuralları:** Vardiya başlangıcının sivil günü, 8/12/366 günlük döngü, override, dinlenme ve ISO haftanın günü. Filtreler gruplar arasında AND, aynı grupta OR; boş filtre tüm günler.
- **Veri güvenliği:** Rutin silme yok, soft archive var. Mevcut checkbox `task_completions` içinde; tamamla/geri al snapshot'lı olayları append-only `routine_completion_events` içine yazar. V1–V3 verileri ve eski tamamlamalar v4'e kayıpsız aktarılmalı.
- **CI:** [Actions #43706375916](https://github.com/hilmiguner/vardiyum/actions/runs/43706375916) SUCCESS — **51 Node test**, 0 fail, npm ci/Expo check/format/lint/tsc/Android&iOS JS export PASS.
- **Açık:** Native gerçek cihaz ve çevrimdışı/SQLite v4 testleri kullanıcı isteğiyle ertelendi ([Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)); yerel hatırlatma bildirimleri henüz yapılmadı.
- **Sonraki:** [Issue #12](https://github.com/hilmiguner/vardiyum/issues/12) Faz 3 lokal rutin hatırlatmaları ve yeniden zamanlama. Bildirim tesliminin native kanıtı olmadan PASS deme; cihaz testleri Issue #2'de ertelendi.

Yeni sohbet başlangıcı:

> Vardiyum https://github.com/hilmiguner/vardiyum. Önce docs/STATUS.md, docs/HANDOFF.md, docs/ROADMAP.md, docs/DECISIONS.md, main commit, açık PR/Issue ve Actions'ı doğrula. PR #11 (Issue #10) vardiyaya bağlı rutinler, günlük görevler ve geçmiş + SQLite v4 **main'de**. Sıradaki Issue #12 lokal bildirimler. Native cihaz testleri kullanıcı isteğiyle sonraya bırakıldı (Issue #2). Doğrulanan işleri GitHub'a kaydet ve sıradaki Faz 3 lokal bildirim motoruna geç.

## 2026-11-15 — Issue #12 / PR #13 son durum

- **PR:** [#13](https://github.com/hilmiguner/vardiyum/pull/13), dal `feat/offline-routine-reminders-v5`. **PR CI [#43708621922](https://github.com/hilmiguner/vardiyum/actions/runs/43708621922) SUCCESS** (67/67 Node testi, Android&iOS JS export dahil).
- **Kod:** `src/domain/routine-reminders.ts` DST-safe saf planlayıcı ve owned reconciliation; `src/services/routine-notifications.ts` Expo Notifications; `src/components/reminder-coordinator.tsx` sıralı sync; `src/components/reminder-consent-panel.tsx` yalnızca açık izin; `src/data/reminder-repository.ts`, SQLite v5.
- **Kurallar:** 14 sivil gün, toplam 48, günlük en fazla 6; kullanıcı izin istemediyse OS permission prompt yok. `reminderClock + reminderTimeZone + revision` kayıtlıdır. Fold/gap anları atlanır, tamamlanan/kapalı/arşivli rutinler planlanmaz. Bildirim anahtarında tarih, zone, revizyon var; yalnızca `vardiyum-routine-v1` sahibi pending bildirimler iptal edilir.
- **Senkronizasyon:** uygulama açılışı/ön plana dönüş, vardiya/tek gün istisna/zone değişimi, kural ekle-düzenle-arşivle ve tamamlandı/geri al. Uygulama açılmazsa 14 günden ileriye bildirim garantisi yok, exact alarm izni istenmez.
- **Açık:** Kullanıcı [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) gerçek native/SQLite v5/izin/teslim testlerini erteledi. Expo SDK 57 Android/iOS JS bundle PASS **native/notification-delivery PASS değildir**.
- **Sıradaki:** PR #13 merge/main CI durumunu doğrula; STATUS/HANDOFF/ROADMAP kanıtlarını main'de güncelle. Ardından Faz 4 tahmini ücret/mesai veri modeline, geçmiş kayıtları koruyan ayrı Issue/PR ile geç. Native cihaz testini kullanıcı istemedikçe zorunlu tutma.

Yeni sohbet prompt'u:

> Vardiyum repo https://github.com/hilmiguner/vardiyum. Önce docs/STATUS.md, docs/HANDOFF.md, docs/DECISIONS.md, docs/ROADMAP.md; main SHA, açık PR/Issue, GitHub Actions son durumunu kontrol et. Issue #12 / PR #13 yerel rutin bildirimleri ve SQLite v5: 14 günlük best-effort, izin yalnızca kullanıcının düğmesine basmasıyla; cihaz testleri Issue #2'de ertelendi. Tamamlanmayan native testleri PASS diye sunma. Gelişmeleri GitHub'a kaydet ve sonraki Faz 4 tahmini kazanç motoru işlerine geç.
