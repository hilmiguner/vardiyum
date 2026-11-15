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
- **PR #13 merged:** SHA `cc708c8dd22fb614194e019047345b298684ef2b`; merge sonrası main [Actions #43708986995](https://github.com/hilmiguner/vardiyum/actions/runs/43708986995) SUCCESS. **Sıradaki:** [Issue #14](https://github.com/hilmiguner/vardiyum/issues/14) Faz 4 şeffaf tahmini ücret/mesai modelini, v1–v5 kayıtları koruyacak ayrı PR ile geliştir. Native QA Issue #2'de ertelendi.

Yeni sohbet prompt'u:

> Vardiyum repo https://github.com/hilmiguner/vardiyum. Önce docs/STATUS.md, docs/HANDOFF.md, docs/DECISIONS.md, docs/ROADMAP.md; main SHA, açık PR/Issue, GitHub Actions son durumunu kontrol et. Issue #12 / PR #13 yerel rutin bildirimleri + SQLite v5 main'de; 14 günlük best-effort, izin yalnızca kullanıcının düğmesine basmasıyla. Sonraki Issue #14 tahmini kazanç; cihaz testleri Issue #2'de ertelendi. Tamamlanmayan native testleri PASS diye sunma. Gelişmeleri GitHub'a kaydet ve sonraki Faz 4 tahmini kazanç motoru işlerine geç.

## 2026-11-15 — Issue #14 / PR #15 yeni devir notu

- **PR #15 merged:** [PR #15](https://github.com/hilmiguner/vardiyum/pull/15), main SHA `510f4ee833d03b7e6df2453bd2542be86534c6d9`; merge sonrası [Actions #43710791686](https://github.com/hilmiguner/vardiyum/actions/runs/43710791686) SUCCESS.
- **CI:** [Actions #43710412387](https://github.com/hilmiguner/vardiyum/actions/runs/43710412387) **SUCCESS** — npm ci, Expo sürüm uyumu, Prettier, ESLint, TypeScript, **84/84 Node testi**, Android+iOS JS export.
- **Kod:** `src/domain/earnings-engine.ts` saf açıklanabilir, fail-closed tam sayı para motoru; `src/domain/money-text.ts` kesin kuruş parse/format; `src/data/earnings-repository.ts` eski kayıtları karıştırmadan kullanıcı çalışma oturumu/profil/düzeltme okuma ve ekleme; `src/data/schema.ts` SQLite v6; `src/app/(tabs)/earnings.tsx` TR/EN ekran.
- **Ürün sınırları:** Kullanıcı beyanlı gerçek UTC aralık, planlanan vardiya iş sayılmaz. Saatlik ve tam ay sabit ücret, yalnızca **kullanıcı belirlediği** mesai eşiği/çarpanı, manuel prim/kesinti. Toplam, mevzuat/SGK/vergi/net veya işveren onaylı bordro **değildir**.
- **Koruma:** `compensation_profiles`, `pay_adjustments`, `work_entries` legacy taslakları otomatik yeni hesaplamaya katılmaz; SQLite v1–v5 korunur. Çalışma ay sonunu geçerse, çakışma/kayıt bozuksa rapor bloklanır, otomatik bölen algoritma henüz yok.
- **Kalanlar:** Native Android/iOS ekran/SQLite v6 testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi; ay sonu vardiya bölmesi, gün içinde oranlama, farklı maaş periyodu, işveren doğrulaması ve rapor dışa aktarması ayrıca ele alınacak.
- **Sıradaki:** [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) aylar arası vardiya bölünmesi ve rapor dışa aktarma/ücret profili sürümleme. Cihaz testleri Issue #2'de ertelendi; resmî bordro/SGK/vergi/net ücrete geçme.

Yeni sohbet komutu:

> Vardiyum https://github.com/hilmiguner/vardiyum. Önce main SHA, açık PR/Issue, son Actions ve docs/STATUS.md, docs/HANDOFF.md, docs/ROADMAP.md, docs/DECISIONS.md kontrol et. Issue #14 / PR #15 gerçek UTC çalışma üzerinden BigInt/minor-unit ile açıklanabilir tahmini kazanç, saatlik/tam ay modeli ve SQLite v6 main'e merge edildi. Sonraki Issue #16: ay sonunu aşan vardiya, profil sürümleri ve dışa aktarma. Resmî bordro/net/vergi/SGK hesaplaması yok. Native cihaz testleri ertelendi (Issue #2). Kod/CI ve merge kanıtını doğrula; projeyi GitHub üzerinden sürdür.

## 2026-11-15 — Issue #16 / PR #17 (en güncel devir)

- **PR #17 merged:** [PR #17](https://github.com/hilmiguner/vardiyum/pull/17), merge SHA `07deee632090f823713226ad7abe92845ff6699f`; merge sonrası [Actions #43713571844](https://github.com/hilmiguner/vardiyum/actions/runs/43713571844) **SUCCESS** (98 Node test, iki JS export). Sonraki konuşmada yeni commit/CI varsa güncelini doğrula.
- **Kod kanıtı:** [Actions #43713024596](https://github.com/hilmiguner/vardiyum/actions/runs/43713024596) SUCCESS — **98/98 Node test**, Expo package check, Prettier/ESLint/TypeScript ve iki platform JS export.
- **Ana parçalar:** `src/domain/earnings-period.ts` saf UTC/IANA sivil ay bölme ve mola dağılımı, `earnings-engine.ts` döneme özgü üst sınır/para tahmini, `earnings-export.ts` CSV/JSON ve güvenli hücre; `earnings-repository.ts` iki ay için mola kaydı/yenileme ve kaynak iş, `src/components/earnings-break-allocation.tsx`, `src/app/(tabs)/earnings.tsx` paylaşım onay UI, SQLite v7 migrasyonu.
- **Davranış:** Orijinal `actual_work_sessions` UTC uçları ve kaydedilen IANA `timezone_id` değiştirilmez. Mola yoksa aylar otomatik bölünür; mola varsa kullanıcı başlangıç ayına düşen dakika girer, kalan ikinci aya gider; iki ay da doğrulanır, v7 revizyon olayı tutulur. Her ay ayrı eşik/profil; çalışma saniyeleri çifte sayılmaz.
- **Gizlilik:** CSV/JSON yalnızca kullanıcı açık onayıyla React Native paylaşım ekranına metin olarak iletilir. Bloke tahmin dışa aktarılamaz. Şifreli yedek, otomatik ağ gönderimi, dosya yazma veya kontrollü içe alma **yoktur**.
- **Kalan Issue #16:** Geçmiş ücret profili düzeltme/revizyonlama, özel maaş dönemi ve güvenli içe alma/şifreli yedek hâlâ açık. PR #17 bu issue'yu **tamamen kapatmaz**.
- **Cihazlar:** Native Android/iOS SQLite v7/Share/DST, çevrimdışı yeniden açılış ve erişilebilirlik testleri kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi; JS export native PASS değildir.
- **Sonraki:** [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) **açık**: geçmiş ücret profili düzeltmesi/revizyonu ve kontrollü içe alma/şifreli yedek tasarımı. İkinci PR için önce bunun veri modelini tasarla ve eski v1–v7 kayıtlarını koruyan testlerle ilerle. Native QA ertelenmiş kalır.

Yeni sohbet başlangıcı:

> Vardiyum https://github.com/hilmiguner/vardiyum projesinde kaldığımız yerden devam. Önce docs/STATUS.md, docs/HANDOFF.md, docs/ROADMAP.md, docs/DECISIONS.md; main SHA, açık Issue/PR ve Actions kontrol et. Issue #16/PR #17 UTC/IANA ay sınırı bölünmesi, mola dağılımı/SQLite v7 audit ve CSV/JSON paylaşımı **main'e merge edildi**; merge CI #43713571844 SUCCESS. Issue #16'nın kalan profil revizyonu/güvenli içe alma işleri açık. Native QA Issue #2'de ertelendi. Issue #16'nın kalan profil sürümü/içe alma işlerini kapandı sanma. Kod/CI kanıtlarıyla GitHub üzerinden devam et.

## 2026-11-15 — Issue #16 / PR #18 (son durum)

- **PR #18 merged:** [PR #18](https://github.com/hilmiguner/vardiyum/pull/18), merge SHA `01f781ac9db442a163b14e6e9033839679a60ce5`; main [Actions #43718105350](https://github.com/hilmiguner/vardiyum/actions/runs/43718105350) SUCCESS. Yeni konuşmada en güncel commit'i doğrula.
- **Kod CI:** [Actions #43717238275](https://github.com/hilmiguner/vardiyum/actions/runs/43717238275) **SUCCESS**, Expo dependency, Prettier/ESLint/TS, Node domain+SQL testleri ve Android/iOS JS export.
- **Kod:** `src/domain/earnings-profile-revisions.ts` saf ardışık versiyon doğrulama ve sürüm hazırlama; `src/data/schema.ts` SQLite v8 yeni immutable revision tablosu ve UPDATE/DELETE trigger'ları; `src/data/earnings-repository.ts` effective-month/latest/historical selection ve SQLite transaction ile `appendPayProfileCorrection`; `src/app/(tabs)/earnings.tsx` düzeltme, gerekçe, geçmiş listesi ve sürüm seçimi; TR/EN.
- **Sınırlar:** v1 orijinal profil sabit, v2+ tam snapshot tarih/gerekçeyle append-only. Hesaplama varsayılan en yeni profili, istekte önceki sürümü seçebilir. *Önceki hesaplamanın dondurulmuş bordro snapshot'ı yok*; eski oranla bugünkü çalışma/ayarlama üzerinden yeniden hesap yapılır. Net/vergi/SGK/işveren onayı yok.
- **Açık:** Kontrollü finansal içe alma, şifreli yedekleme, özel maaş dönemi ve gerçek dosya aktarımı [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16)'da. Gerçek cihaz SQLite v8 migrasyon/sürüm seçimi testi [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.
- **Sonraki:** Issue #16 açık; kontrollü içe alma ve şifreli yedek için **hiçbir veriyi kullanıcı onayı olmadan dışarı göndermeyen**, kaynağın bütünlüğü/şema sürümü ve geri dönüş/iptal güvenliğini doğrulayan tasarım ayrı PR olmalı. Native QA Issue #2'de ertelendi.

Yeni sohbet:

> Vardiyum repo https://github.com/hilmiguner/vardiyum. Önce main SHA, PR/Issue, Actions ve docs/STATUS.md, docs/HANDOFF.md, docs/DECISIONS.md, docs/ROADMAP.md oku. Issue #16/PR #18 immutable ücret profili v2+ düzeltme, SQLite v8, geçmiş sürümle güncel çalışma verisinden yeniden hesap **main'de**; merge sonrası CI #43718105350 SUCCESS. Eski görüntülenmiş raporun anlık görüntüsü saklanmıyor. Kontrollü içe alma/şifreli yedek Issue #16'da açık. Cihaz testleri Issue #2'de ertelendi. CI/merge doğrulayarak GitHub'a kaydet, devam et.

## 2026-11-15 — Issue #16 / PR #19 offline backup devir notu

- **PR #19 main'e merge edildi:** SHA `1686a844b5c9ee723fea6fc104093695ce5e612b`; [main CI #43722072994](https://github.com/hilmiguner/vardiyum/actions/runs/43722072994) SUCCESS, 119 Node test ve iki platform JS export. Sonraki sohbette en güncel SHA'yı tekrar doğrula.
- **Kod CI:** [#43721507257](https://github.com/hilmiguner/vardiyum/actions/runs/43721507257) SUCCESS; 119/119 Node test, Expo compatibility, Prettier/ESLint/TS ve Android/iOS **JavaScript export**.
- **Kod:** `src/domain/backup-archive.ts` 18 SQLite v8 tablo allowlist, row/columns/UTF-8, auth payload/digest/limit; `src/data/backup-repository.ts` consistent read-only DB snapshot; `src/services/encrypted-backup.ts` AES-256-GCM, 256bit random secret ve doğrulama; `src/services/encrypted-backup-files.ts` encrypted cache, Expo share/picker; `src/components/encrypted-backup-panel.tsx` Ayarlar TR/EN arayüz; `tests/backup-archive.test.mjs` SQLite inventory, SHA, format, Unicode, Node AES-GCM tamper/yanlış key testleri.
- **Gizlilik:** Anahtar plaintext olarak sadece ekranda (user kendisi güvenle saklar), asla şifreli dosyaya/SQLite settings'e eklenmez. Kaybolursa dosya **kurtarılamaz**; PBKDF2/parola kurtarma yok. Yalnızca kullanıcı onaylı sistem share. 4M açık veri/8M zarf karakter limiti, aşan reddedilir. Otomatik bulut gönderimi yok.
- **KRİTİK:** Bu PR **geri yükleme değildir**. `BackupPreview.canRestore=false`; gelen dosya anahtarla **yalnızca doğrulanır/sayılır**, SQLite üzerine yazma/merge/replace yok. Import'a ilişkin ‘tamamlandı’ iddiasında bulunma. Native cihazda AES/file/share/picker ve restore hiç test edilmedi; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi.
- **Issue #16 AÇIK:** Kayıpsız atomik restore için [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açıldı; clean-target, transactional rollback, FK/integrity, permission ve native kabul gerekir. Özel maaş dönemi ayrıca bekliyor. Elektronik tablolar/finansal raporlar resmî bordro değil.

Yeni sohbet prompt'u:

> Vardiyum https://github.com/hilmiguner/vardiyum. Önce main SHA/CI, açık PR/Issue ve docs/STATUS.md, docs/HANDOFF.md, docs/DECISIONS.md, docs/ROADMAP.md kontrol et. Issue #16/PR #19 AES-GCM şifreli SQLite v8 18 tablo export ve salt-okunur import preview **main'de** (CI #43722072994 SUCCESS, 119/119 Node). Geri yükleme hâlâ yok; Issue #20 atomik restore, Issue #2 cihaz QA. Gerçek restore/import-yazma henüz yok; key dosyadan ayrı ve kaybolursa kurtarılmaz. Native cihaz testleri Issue #2'de ertelendi. CI/merge kanıtıyla GitHub üzerinden ilerle, verileri silmeden transactional restore tasarımına geç.

## 2026-11-15 — Issue #20 / PR #21 (en yeni devir)

- **PR #21 main'e merged:** `de110794d9f71c8bfa81e978b0141ead74fb3e35`; [merge sonrası main CI #43725429338](https://github.com/hilmiguner/vardiyum/actions/runs/43725429338) SUCCESS (127 Node test, Android+iOS JS export).
- **Kod CI:** [#43724855020](https://github.com/hilmiguner/vardiyum/actions/runs/43724855020) SUCCESS, **127/127 Node** + Android/iOS JS export, Expo/format/lint/TS.
- **Kod:** `src/domain/backup-restore.ts` temiz hedef/fail-closed tek transaction ve row-by-row audit; `src/data/backup-restore-repository.ts` Expo SQLite exclusive tx adaptörü, FK check/integrity check; `src/services/encrypted-backup.ts` decrypt+validated snapshot; `src/components/encrypted-backup-panel.tsx` TR/EN typed RESTORE + confirmation, clear sensitive state and reload.
- **Koruma:** Kaynak AES-GCM/AAD+SHA256 ile doğrulanmış 18 tablo SQLite v8 olmalı; hedef yalnız dokunulmamış **dört seed template** ve diğer tablolar tamamen boş olmalı. Dolu/özelleştirilmiş DB'ye **asla overwrite/merge yok**. İşlemin hepsi atomik transaction'da; readback + FK postcheck (Expo ayrı bağlantıda PRAGMA FK miras alınmayabilir) + integrity öncesi COMMIT yasak. Başarısızlıkta rollback.
- **Bilinçli dönüşüm:** Bildirim opt-in 0 reset; restore marker ekle ve repeat import reddet. Orijinal gerçek UTC çalışma, rutin event, profil sürümü/mola audit korunur.
- **KRİTİK QA:** Node SQLite restore rehearsal başarılı olsa da native iOS/Android cihazda şifreleme, FS/Share, SQLite restore, persistence, force-kill/low-disk, ikinci cihaz **henüz yapılmadı**. Ürün/cihaz kurtarma güvencesi verilmez; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi; [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık tutulur. Dolu DB merge veya özel maaş dönemi [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık.
- **Sıradaki:** Clean-target restore kodu/CI main'de. [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) gerçek cihaz QA ve düşük disk/crash için açık; kullanıcı native testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de erteledi. Native izin yoksa [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) içinde özel maaş dönemi veya başka non-native MVP kabul işine ilerle. Dolu DB merge/overwrite ekleme.

Yeni sohbet prompt:

> Vardiyum https://github.com/hilmiguner/vardiyum. Önce main SHA, PR/Issue/Actions ve docs/STATUS.md, HANDOFF.md, ROADMAP.md, DECISIONS.md oku. Issue #20 PR #21: AES-GCM/SHA256 validated backup, yalnız pristine 4 seed template ve diğer 17 tablo boş SQLite v8 hedefe typed RESTORE + ikinci onay, atomik import, FK postcheck, integrity_check, rollback, reminder consent reset; main merge SHA de110794, CI #43725429338 SUCCESS (127 Node ve iki platform JS). **native cihaz testleri yapılmadı (Issue #2)**, Issue #20 açık kalsın. Issue #16 dolu DB merge/özel maaş dönemi açık. PR merge/main CI doğrulayıp GitHub'da yol haritasını güncelle, geliştirmeye devam et.

**Yeni açık iş:** [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) — saatlik/tam ay modeli için kullanıcı belirli maaş dönemi (26→25 dahil). Önce takvim ayı ile özel dönemi ayıran saf model/özel IANA UTC dilimlemesi ve testlerle ilerle; yasal fazla mesai oranı icat etme. Issue #20 native QA ve Issue #2 ertelemesi sürüyor. Son docs/main CI [#43725596755](https://github.com/hilmiguner/vardiyum/actions/runs/43725596755) SUCCESS.

## 2026-11-15 — Issue #22 özel maaş dönemi ilk geliştirme, yeni sohbet devri

- **Son doğrulanan başlangıç main:** `18d3a01c699fa904dc63f3d177f6bb962335a6ac`; [Actions #43725845586](https://github.com/hilmiguner/vardiyum/actions/runs/43725845586) **SUCCESS**. PR #21 restore daha önce merge edildi; ana dalda yeni özel maaş dönemi henüz yok.
- **Feature branch:** `feat/configurable-pay-period-domain`; saf motor `src/domain/pay-period.ts`, Node test `tests/pay-period.test.mjs`, tasarım `docs/PAY-PERIOD-DESIGN.md`. Bu **birinci dilim**, tam Issue #22 çözümü değil.
- **Semantik:** Başlangıç günü sadece 1–28; 26 Ekim–25 Kasım = `periodKey=2026-10, startDay=26`; yerel 00:00 kaydedilmiş orijinal IANA zone ile UTC'ye çevrilir, DST gap/fold asla sessiz seçilmez. Gerçek UTC oturumu referanstır; molası olan sınır aşımına ayrı kullanıcı dağılımı gerekir. Ayın 1'i mevcut takvim ayı matematiğiyle uyumludur.
- **Kritik sınırlama:** SQLite sürümü hâlen 8, backup 18 tablo. Kalıcı özel dönem seçimi, custom break audit, karışık efektif profil, manuel düzeltmeler, sabit dönem tabanı, TR/EN UI ve dışa aktarımlar **henüz bağlanmadı**. Başarılmış gibi yazma. Mevcut rapor hâlen takvim ayı, geçmiş kayıtlar korunmalı.
- **Sonraki:** Açılan PR'nin Actions sonucunu doğrula, kalite sorununu düzelt; daha sonra ayrı güvenli PR ile kullanıcı seçimi + SQLite/migration/backup uyumluluğu ve açık profil politikası üzerine git. Cihaz testleri kullanıcı tarafından [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi; restore QA [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık.

Yeni sohbet prompt'u:

> Vardiyum https://github.com/hilmiguner/vardiyum. Önce main SHA, PR/Issue/Actions ve docs/STATUS.md, docs/HANDOFF.md, docs/ROADMAP.md, docs/DECISIONS.md oku. Issue #22 için `feat/configurable-pay-period-domain` başlangıç adımı: 1–28 başlangıç günüyle 26→25 döneminde UTC/IANA süre bölme ve kaynak doğrulamalı manuel mola; henüz SQLite/UI/rapora bağlı değil. Son CI/PR durumunu kontrol et. v8 şifreli backup/restore'u bozma, native Issue #2/#20 açık, resmi bordro/SGK/net yok. Sonraki güvenli entegrasyona devam et.

## 2026-11-15 — PR #23 birleşimi ve özel maaş dönemi tercihi geliştirmesi

- **PR #23 merged:** main SHA `d85f63f0c468f15692aef0f78f13d0a2e695d4c3`; [main Actions #43728968056](https://github.com/hilmiguner/vardiyum/actions/runs/43728968056) **SUCCESS** (137 Node test, Android+iOS JS export). `src/domain/pay-period.ts` saf 26→25 UTC/IANA dönem bölme main'de.
- **Geliştirme (feature, merge edilmedi):** `feat/pay-period-persisted-setting`. `src/domain/pay-period-settings.ts` SQLite v8 app_settings key üzerinden default 1, strict 1–28 ve fail-closed okuma/yazma; `src/data/pay-period-repository.ts`; `src/components/pay-period-settings-panel.tsx` ve Settings TR/EN seçim + preview; `tests/pay-period-settings.test.mjs`.
- **ÇOK ÖNEMLİ:** Tercih **hazırlık** olarak saklanıyor; mevcut kazanç raporu/CSV/JSON halen takvim ayına bağlı. V8 şema (18 tablo), AES export/clean restore ve tarihsel data yapısı aynen kaldı. V8 backup, app_settings satırını otomatik içerir, fakat yeni setting'in native round-trip'i henüz cihazda denenmedi.
- **Devam:** Önce feature PR CI testleri; yeşil olursa inceleme/merge ve merge CI. Sonra özel kazanç hesap motoru ve cross-boundary profil/fixed-model/adjustment politikası için yeni ayrı PR. Dolu database restore veya sessiz veri aktarımı yok. Native QA Issue #2/#20 erteli açık.

Yeni sohbet komutu:

> Vardiyum https://github.com/hilmiguner/vardiyum. main/PR/Issue/Actions ve STATUS/HANDOFF/ROADMAP/DECISIONS kontrol et. PR #23 main SHA d85f63f0, CI #43728968056 başarılı; custom 26→25 domain var. Sonraki branch feat/pay-period-persisted-setting: v8 app_settings tek anahtar strict 1–28, Settings TR/EN seçim/önizleme, eski v8 encrypted backup formatı değişmiyor. Bu henüz gerçek özel dönem kazanç raporu DEĞİL. CI/merge kontrolünden sonra mixed effective-date rates, dönem mola audit, manuel adjustments, fixed salary ve CSV/JSON entegrasyonuna geç. Issue #22/#16 açık, native #2/#20 erteli.

## 2026-11-15 — En güncel devretme checkpoint'i: PR #23 + PR #24 main

- **main kod teslim kanıtı:** [PR #23](https://github.com/hilmiguner/vardiyum/pull/23) `d85f63f0c468f15692aef0f78f13d0a2e695d4c3` (domain 26→25 UTC/IANA partition); [main Actions #43728968056](https://github.com/hilmiguner/vardiyum/actions/runs/43728968056) SUCCESS (137 Node).
- **[PR #24](https://github.com/hilmiguner/vardiyum/pull/24) MERGED**: `456415cdcf5a7ce6ef8d6487a0678d01818b8106`; [PR Actions #43729824011](https://github.com/hilmiguner/vardiyum/actions/runs/43729824011) SUCCESS, [main Actions #43729927452](https://github.com/hilmiguner/vardiyum/actions/runs/43729927452) SUCCESS (**142/142 Node**, prettier/lint/TS/Expo/Android+iOS JS export).
- **Yeni modüller:** `src/domain/pay-period-settings.ts` (strict 1–28 + default1 / invalid fail-closed; SQLite app_settings adapter); `src/data/pay-period-repository.ts`; `src/components/pay-period-settings-panel.tsx`; Settings TR/EN + saved IANA date preview; `tests/pay-period-settings.test.mjs` v1→v8 migration/schema/FK/data checks. V8 **18 tablo AES backup/restore şeması değişmedi**; existing `app_settings` ayarı full backup'a dahildir.
- **DİKKAT:** Mevcut `loadEarningsReport` ve `earnings-engine.ts`, CSV/JSON Kazanç sekmesi **sadece takvim ayı**. Kullanıcının kaydettiği özel başlangıç günü henüz ücret hesaplamasını değiştirmez. Gerçek özel dönem hesaplaması olmadan Issue #22 kapatılmaz. İşveren imzalı bordro, SGK, net maaş, ülkeye özgü vergi katsayısı yok.
- **Sıradaki bağımsız PR:** özel dönemi gerçek kazanç ekranında açmadan önce (1) persisted custom-break allocation ve audit (mevcut monthly break'ten ayrı), (2) dönem içinde ayın 1'inde değişen effective profile için açık politika, (3) fixed-month salary + adjustments attribution, (4) kesir/kuruş doğruluğu/eşik ve CSV/JSON kaynak çizgileri. Her adımda v8 backup uyumu korunmalı; gerekirse v9 migrasyon ve v8 backup dönüşümü aynı değişiklik içinde, fail-closed testli tasarlanmalı. [PAY-PERIOD-DESIGN](./PAY-PERIOD-DESIGN.md).
- Native test [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) erteli, restore kabulü [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık. Kod CI PASS = gerçek telefon PASS değildir.

**Yeni sohbete aktarılacak komut:**

> Vardiyum https://github.com/hilmiguner/vardiyum. Önce main SHA, PR/Issue/Actions ve docs/STATUS.md, docs/HANDOFF.md, docs/ROADMAP.md, docs/DECISIONS.md oku. PR #23 26→25 dönem domain main d85f63f0; PR #24 SQLite v8 app_settings içinde 1–28 kalıcı seçim, TR/EN Ayarlar preview main 456415cd; main CI #43729927452 SUCCESS (142 test/Android+iOS JS). Özel gün ayarı HENÜZ kazanç raporunu etkilemiyor. Issue #22/#16 açık; sırada custom mola audit ve mixed profile/fixed pay/adjustments/CSV-JSON kazanç entegrasyonu, mevcut 18-tablosu AES v8 backup korunacak. Native QA Issue #2/#20 ertelendi. Devam ederken yeni main SHA ve CI'yi tekrar doğrula.

## 2026-11-15 — Issue #22 / özel dönem mola audit (en yeni feature checkpoint)

- **Başlangıç main:** `a1ee96da6ff07b632788f6c33687c386e11d7073`, [Actions #43730144090](https://github.com/hilmiguner/vardiyum/actions/runs/43730144090) SUCCESS (142 Node + Android&iOS JS). Önceki [PR #23](https://github.com/hilmiguner/vardiyum/pull/23) ve [PR #24](https://github.com/hilmiguner/vardiyum/pull/24) main'de. Issue #22 yanlışlıkla closed göründü, tamamlanmadığından **reopened**.
- **Yeni branch:** `feat/pay-period-break-audit-v8` — saf `src/domain/custom-pay-break-audit.ts` event/validasyon ve `custom-pay-break-store.ts` testlenebilir transaction adapter; Expo `src/data/custom-pay-break-repository.ts`; bağımsız `src/components/custom-pay-break-panel.tsx`, Kazanç ekranında TR/EN mola beyan paneli. `tests/custom-pay-break-audit.test.mjs` içinde Node SQLite v1→v8 regresyonu.
- **Semantik:** yalnız 2–28 custom başlangıç günü, eski `earnings_month_break_allocations` asla yeniden kullanılmaz. Sonuç iki dönemde net saniye toplamı orijinal gerçek UTC saniye - toplam mola ile eşleşmedikçe kaydedilemez. Event key her düzeltmede yalnız INSERT, head işaretçisi aynı exclusive tx içinde; expectedRevision optimistic lock ve kaynak UTC/zaman dilimi kontrolleri. Ayar değişince eski gün audit'i korunur ama yeni gün için uygulanmaz. `app_settings` 18 tablo v8 AES backup'a dahildir; backup şeması değişmedi.
- **Sınırlar:** Buradaki event audit *uygulama seviyesinde* append-only, SQL dosyasını doğrudan değiştiren aktöre karşı kriptografik garanti değil. **Şimdilik gerçek özel dönem kazanç raporu yok**; aylık rapor/ücret/CSV/JSON değişmedi. Native cihaz testleri Issue #2/#20 erteli. Ekran JS export cihaz QA değildir.
- **Sıradaki:** PR Actions Prettier/TS/Node/JS sonuçlarını doğrula, sorunları düzelt; PR merge ve main CI sonrası docs kanıtını güncelle. Daha sonra karışık efektif ücret profili (ayın 1'i döneme düşüyorsa fail-closed veya kullanıcı onaylı ayrıştırma), sabit ücret dönemi, adjustments ve yeni period report üzerinde ilerle.

Yeni sohbet:

> Vardiyum https://github.com/hilmiguner/vardiyum. Önce main SHA, açık PR/Issue/Actions ve STATUS/HANDOFF/ROADMAP/DECISIONS oku. PR #23/#24 26→25 domain + v8 settings main'de, CI #43730144090 SUCCESS. Issue #22 reopened, feature feat/pay-period-break-audit-v8 yeni custom molalı vardiya split event'lerini SQLite v8 app_settings'te exclusive tx/append-only record, stale source/revision fail closed, TR/EN hazırlık paneli ile geliştiriyor. PR/CI kontrol et, tamamlanmamış işleri kapatma. Gerçek özel dönem kazanç/CSV/JSON henüz yok, native Issue #2/#20 ertelendi. Yedek 18 tablo v8 uyumluluğunu koru; sonraki profile-period earnings politika işlerine geç.
