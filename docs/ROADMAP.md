# Vardiyum — Yol Haritası

**Güncelleme:** 2026-11-15; doğrulanmış durum için [STATUS.md](STATUS.md).

| Faz | İçerik | Durum |
| --- | --- | --- |
| 0 | Ürün, mimari ve proje hafızası belgeleri | ✅ PR #1 ile tamamlandı |
| 1 | Expo iskeleti, SQLite, i18n, tema, CI | PR #3 main'e alındı; Issue #2 native test açık |
| 2 | Esnek vardiya motoru, istisnalar ve takvim | PR #5/#7/#9 main'de; cihaz testleri/sürümleme açık |
| 3 | Rutinler, görev geçmişi, bildirimler | PR #11/#13 main'de; native bildirim teslimi/QA açık |
| 4 | Mesai ve tahmini kazanç | PR #15/#17/#18 main'de; kontrollü içe alma/şifreli yedek Issue #16 açık |
| 5 | Yedekleme, gerçek cihazlar, beta | PR #19/#21 main'de; clean restore Node kanıtlı, native QA Issue #20/#2 açık |
| 6 | App Store ve Google Play yayını | Planlandı |

## Faz 1 — [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)

**Kod durumu:** PR #3 main'e squash merge edildi (`84afe3dfb9bc112af47f084f85717bf2a44744e1`); fiziksel cihaz kabulü açık.

- [x] Expo SDK 57 / TypeScript proje dosyaları yazıldı.
- [x] Dört ana ekran + Ayarlar ekranı yazıldı.
- [x] TR/EN çeviri ve tema altyapısı yazıldı.
- [x] Yerel SQLite veritabanı şema/migrasyon kodu yazıldı.
- [x] Saf vardiya döngüsü ve birim test senaryoları yazıldı.
- [x] GitHub Actions lint/typecheck/test workflow dosyası yazıldı.
- [x] npm bağımlılık kilidi GitHub Actions üzerinden üretildi ve branch'e eklendi.
- [x] Expo paket sürüm kontrolü başarılı: Actions #43697865419.
- [x] CI: lint/typecheck/test ve iki platform JS export PASS (#43697865419).
- [ ] Android ve iOS smoke testlerinin kaydı.
- [ ] Yerel veri persistansının cihaz test kanıtı.
- [x] Faz 1 PR #3 merge edildi; main başlangıç SHA: `84afe3dfb9bc112af47f084f85717bf2a44744e1`.

**Kod var ≠ test geçti / yayınlandı.** Gerçek doğrulama olmadan üstteki kabul kutuları kapatılmaz.

## Faz 2 — Gerçek vardiya esnekliği

**Takip:** [Issue #4](https://github.com/hilmiguner/vardiyum/issues/4), [PR #5](https://github.com/hilmiguner/vardiyum/pull/5) (özel şablonlar, aylık takvim ve istisnalar main'e merge edildi: d321be3e; son PR CI #43700862285 SUCCESS).

- [x] Kullanıcı tanımlı saatler, vardiya türleri, 12/24 saatlik planlama kodu ve birim testleri PR #5.
- [x] Döngüden bağımsız tek gün vardiya/izin override ve geri alma PR #5.
- [x] Gerçekleşmiş giriş/çıkış, mola ve not **kullanıcı beyanı olarak** ayrı kayıt akışı PR #9 (kod/CI).
- [ ] Ücretlendirilebilir mesai ve işveren onayı; Faz 4 ve açık tarihsel sürümleme kapsamında.
- [x] Döngü indeksi ve takvim günü için DST / IANA tarih senaryoları test edildi.
- [x] IANA saat dilimiyle gerçek UTC aralığı ve geçen saniye; DST gap/fold fail-closed kuralı, otomatik testler **PR #7 main'e merge edildi** (`5d4e1f9f`), main CI [#43702715736](https://github.com/hilmiguner/vardiyum/actions/runs/43702715736) SUCCESS.
- [ ] Gerçek cihaz ICU/tzdb sınır durumları: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) (kullanıcı isteğiyle ertelendi).
- [x] Bir gün için ayrı DST fold seçimi ve şablon/saat dilimi imzası; fiilî çalışma kayıtları ve açık saat dilimi değişim UI'si [PR #9](https://github.com/hilmiguner/vardiyum/pull/9) main'e merge edildi (`a4fcb627`); main CI [#43704664276](https://github.com/hilmiguner/vardiyum/actions/runs/43704664276) SUCCESS.
- [ ] Native cihazda DST, SQLite v3 kalıcılığı ve UTC kayıt doğrulaması: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi.
- [x] Aylık takvim, ay gezinme, gün seçimi ve günlük override PR #5.
- [ ] İleri düzey filtreleme.
- [x] SQLite v1→v2 ve eski kayıt koruma Node testleri PR #5.
- [ ] Gerçek cihazda veritabanı yükseltme/yeniden açma/bozuk veri testleri.
- [ ] Şablon silme ve sürümleme stratejisi.

## Faz 3 — Rutinler

**İlerleme:** [Issue #10](https://github.com/hilmiguner/vardiyum/issues/10) / [PR #11](https://github.com/hilmiguner/vardiyum/pull/11) **main'e merge edildi**, `e336bf4d`; main [CI #43706843264](https://github.com/hilmiguner/vardiyum/actions/runs/43706843264) SUCCESS. Yerel bildirimler için [Issue #12](https://github.com/hilmiguner/vardiyum/issues/12) açık; native cihaz testi ertelendi.

- [x] Haftanın günü, vardiya türü, izin ve herhangi uzunluktaki döngü günü filtre motoru (PR #11).
- [x] Bugün/Rutinler checklist, tarih seçimi, tamamlama/geri alma, arşiv ve hareket geçmişi (PR #11).
- [x] Lokal hatırlatma planlayıcı/izin/yeniden senkronizasyonu [PR #13](https://github.com/hilmiguner/vardiyum/pull/13) main'e merge edildi (`cc708c8d`); main [CI #43708986995](https://github.com/hilmiguner/vardiyum/actions/runs/43708986995) SUCCESS.
- [ ] Android/iOS gerçek cihazda izin, kilit ekranı, boot, DST ve teslim testi: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) (ertelendi).

## Faz 4 — Mesai ve tahmini kazanç

**İlerleme:** [Issue #14](https://github.com/hilmiguner/vardiyum/issues/14) / [PR #15](https://github.com/hilmiguner/vardiyum/pull/15) **main'e merge edildi** (`510f4ee8`); [main CI #43710791686](https://github.com/hilmiguner/vardiyum/actions/runs/43710791686) SUCCESS (84 test, Android&iOS JS export). Sıradaki [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) ay sınırı, profil sürümü, dışa aktarma.

- [x] Kullanıcı beyanlı gerçek UTC çalışma kayıtlarının kazanç tahmininde okunması PR #15.
- [ ] Ücretlendirilebilir izin günü, işveren doğrulaması ve ay sınırını geçen vardiya dağıtımı.
- [x] Sabit tam ay/saatlik ücret, kullanıcı eşiği/mesai katsayısı, prim-kesinti-düzeltme PR #15.
- [x] Integer/BigInt para hesabı, kalem kalem kaynaklı dönem raporu, geçersiz kayıtta bloklama PR #15.
- [x] UTC/IANA ay sınırında gece vardiyası bölünmesi, açık mola dağılımı/revizyon izi ve kullanıcı onaylı CSV/JSON metin paylaşımı: [PR #17](https://github.com/hilmiguner/vardiyum/pull/17) main merge `07deee63`; [main CI #43713571844](https://github.com/hilmiguner/vardiyum/actions/runs/43713571844) SUCCESS.
- [x] Aynı efektif ay için gerekçeli, silinmeyen ücret profil sürümleri ve eski sürümle yeniden hesaplama: [PR #18](https://github.com/hilmiguner/vardiyum/pull/18), SQLite v8; merge `01f781ac`, [main CI #43718105350](https://github.com/hilmiguner/vardiyum/actions/runs/43718105350) SUCCESS.
- [x] AES-256-GCM **şifreli dışa aktarma** ve dosya/key doğrulamalı **salt-okunur** preview: [PR #19](https://github.com/hilmiguner/vardiyum/pull/19) main merge `1686a844`; [CI #43722072994](https://github.com/hilmiguner/vardiyum/actions/runs/43722072994) SUCCESS.
- [x] **Yalnız temiz kurulum için** atomic restore ve Node rollback/invalid-FK testleri: [PR #21](https://github.com/hilmiguner/vardiyum/pull/21) merge `de110794`; [main CI #43725429338](https://github.com/hilmiguner/vardiyum/actions/runs/43725429338) SUCCESS, 127/127 Node test.
- [ ] Native Android/iOS gerçek kurtarma, düşük disk/crash ve persistans kabulü: [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) / [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2). Dolu DB merge ve özel maaş dönemi tamamlanmadı.
- [ ] Native Android/iOS SQLite v7, kazanç paylaşım ekranı ve çevrimdışı kalıcılık: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) (kullanıcı isteğiyle ertelendi).

## Faz 5 — Beta

- [x] Şifreli AES-GCM backup dosyasını oluşturma ve read-only import doğrulama (PR #19).
- [x] Clean-target transactional restore **kod ve Node testleri** (PR #21).
- [ ] Native/low-disk/crash ve iki gerçek telefon arasında restore kanıtı: [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20); kullanıcı ertelenmiş cihaz kabulü [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2).
- [ ] Android/iOS cihaz matrisi ve veri kaybı testleri
- [ ] Çeşitli sektörlerden 20 kişiyle hedef kullanıcı testi
- [ ] Gizlilik/beyan ve erişilebilirlik kontrolleri

## Faz 6 — Mağaza yayını

- [ ] Geliştirici hesapları ve mağaza önkoşulları
- [ ] Mağaza varlıkları, gizlilik beyanları ve beta kabul süreçleri
- [ ] İki mağazaya üretim sürümünün gönderimi

V1.1+ adayları: widget, detaylı analiz, isteğe bağlı hesap ve senkronizasyon, bordro karşılaştırma, arkadaş takvimi. İlk 10–16 hafta varsayımı teslim garantisi değildir.

**Takip açıldı:** [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) — kullanıcıya göre maaş dönemi başlangıcı/kapanışı, farklı aylar ve IANA/DST çalışmayı iki dönemde çift saymama; Node/JS testleri gereklidir. Önceki takvim-ayına göre kazanç motoru geriye uyumlu kalacak. Native cihaz testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi.

## 2026-11-15 — Issue #22 özel maaş dönemine hazırlık (kısmi)

- [x] **İlk saf domain dilimi feature branch'te:** 1–28 başlangıç günü, 26→25 period key, tarih/UTC/IANA sınırları, manuel mola doğrulama, DST/Şubat ve yıl geçişi test senaryoları. [Tasarım](./PAY-PERIOD-DESIGN.md).
- [ ] CI onayı ve PR merge doğrulaması; yeni branch kodu otomatik olarak main değildir.
- [ ] Persisted seçim, migration ve AES v8 backup/restore uyumu, karışık ücret profili politikası, sabit özel dönem ücreti, dönem bazlı adjustments, TR/EN ekran ve CSV/JSON özel dönem raporu.
- [ ] Native cihaz kabulü: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2), restore [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20). Issue #22 bu adımda kapanmaz.

## 2026-11-15 — Issue #22 uygulama tercihi ve v8 yedek uyumu

- [x] [PR #23](https://github.com/hilmiguner/vardiyum/pull/23) domain foundation main; [CI #43728968056](https://github.com/hilmiguner/vardiyum/actions/runs/43728968056) SUCCESS.
- [ ] `feat/pay-period-persisted-setting`: şemayı v8'de tutarak `app_settings` içinde kayıtlı 1–28 başlangıç günü, TR/EN ayar ekranı ve 26→25 tarih önizlemesi, bozuk değerde fail closed, Node SQLite schema/backup uyumluluk testleri. PR / CI / merge bekleniyor.
- [ ] Özel dönemi etkin Kazanç raporuna bağlamak, karşılıklı dönem mola/audit, effective profile geçiş politikası, sabit ücret ve manuel düzeltme kararı, CSV/JSON gerçek dönem raporu; çalışma/dönem çifte sayımı olmaz.
- [ ] Native QA halen [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) / [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20).

## 2026-11-15 — PR #24 kesin teslim

- [x] [PR #23](https://github.com/hilmiguner/vardiyum/pull/23) özel dönem saf UTC/IANA motoru main, CI #43728968056 SUCCESS.
- [x] [PR #24](https://github.com/hilmiguner/vardiyum/pull/24) **merged `456415cd`**: kullanıcı 1–28 başlangıç günü v8 app_settings persist ve TR/EN Ayarlar önizlemesi. [main CI #43729927452](https://github.com/hilmiguner/vardiyum/actions/runs/43729927452) SUCCESS, **142/142 Node test** + 2 JS bundle.
- [ ] Gerçek özel dönem kazanç motoru/UI, ayrı custom break audit, effective profile geçişi, sabit ücret ve adjustments, CSV/JSON. Tercih henüz aylık raporu değiştirmez; Issue #22 açık.
- [ ] Android/iOS native kalıcılık, restore & DST kabulü Issue #2/#20 ertelendi.

## 2026-11-15 — Özel dönem mola audit dilimi (PR incelemesi bekleniyor)

- [x] PR #23 custom UTC/IANA sınır motoru, PR #24 v8 kalıcı 1–28 tercih main'de; [main CI #43730144090](https://github.com/hilmiguner/vardiyum/actions/runs/43730144090) SUCCESS.
- [ ] `feat/pay-period-break-audit-v8`: eski 18 tablo/v8 AES yedeği değiştirmeden app_settings event/head ile özel dönem mola audit'i, exclusive transaction + rollback/stale/source testleri, bağımsız TR/EN Kazanç hazırlık paneli; PR CI / merge bekleniyor.
- [ ] Mevcut aylık earnings engine'i varsayılan bırak; mid-period efektif profil geçişi, sabit ücret, adjustments, custom overtime/CSV/JSON güvenli ele alınana kadar özel dönem kazancı etkinleşmesin. Issue #22 açık.
- [ ] Native Android/iOS QA ve restore Issue #2/#20 ertelendi.

## 2026-11-15 — PR #25 tamamlandı, sıradaki Faz 4 işi

- [x] [PR #25](https://github.com/hilmiguner/vardiyum/pull/25) SQLite v8 mevcut app_settings içine custom period mola audit'i/ilk dönem payı; gerekçeli append-only sürüm başlıkları, exclusive transaction/rollback ve Kazanç'ta ayrı TR/EN hazırlık paneli. Merge `624eae81`, [main CI #43732513262](https://github.com/hilmiguner/vardiyum/actions/runs/43732513262) SUCCESS, **150/150 Node** + 2 JS export.
- [ ] Özel maaş dönemi tahmini kazanç: profil ayın 1'inde değişiyorsa açık ve kaynağa bağlı segment kararı; BigInt/kuruş, bağımsız dönem mesai eşiği, sabit tam dönem tutarı ve manual adjustment attribution. Her belirsizlikte fail closed; CSV/JSON aktarımı ancak gerçek rapor hazırsa.
- [ ] Özel dönemin native persistansı / AES round-trip / restore düşük disk/crash: [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2), [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20). [Issue #22](https://github.com/hilmiguner/vardiyum/issues/22) ve üst [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) açık.

## 2026-11-15 — Ücret geçişi politika önizlemesi (PR CI/merge bekleniyor)

- [x] PR #23 UTC/IANA custom period, #24 v8 settings başlangıç günü ve #25 özel dönem kaynak bağlı mola audit; [main CI #43732734275](https://github.com/hilmiguner/vardiyum/actions/runs/43732734275) SUCCESS 150 Node + Android/iOS JS export.
- [ ] `feat/custom-pay-profile-transition-preview`: ayın 1'inde değişen immutable profil/sürüm/para birimi/modelin 26→25 aralığına göre segmentlenmesi ve **review_required**; profile yok/missing revision = fail-closed; monthly_fixed tam/partial dönem varsayımı olmadan hesap yok; read-only kaynaklı TR/EN UI ve SQLite v8/UTC/DST Node testleri. PR CI ve merge bekliyor.
- [ ] **Gerçek** custom salary estimate: güncel profili her çalışma kaydının orijinal IANA zone/UTC kesitinde uygulamak, eşik ve kuruş BigInt, sınırdaki hem profil hem dönem molası için yeni kullanıcı beyanı, fixed tam/partial politika, period-specific adjustment/CSV/JSON. Takvim-aylı legacy rapor korunacak. Issue #22 açık.
- [ ] Native telefon/şifreli restore/crash/low-disk kabulü Issue #2/#20 erteli.

## 2026-11-15 — PR #26 rate transition teslim ve hesaplama adımları

- [x] [PR #26](https://github.com/hilmiguner/vardiyum/pull/26) **merged** main `b4cd8c9cda15040fb3b7d7206d91c38cd35ea1ed` — 26→25 içinde effective-month ücret profili, son immutable revision, para birimi/model ve schedule-IANA UTC segmenti **salt-okunur** TR/EN Kazanç paneli. [main CI #43747264298](https://github.com/hilmiguner/vardiyum/actions/runs/43747264298) SUCCESS (**163/163 Node**, Android/iOS JS export).
- [ ] Gerçek custom earnings: her kullanıcı çalışma UTC/IANA aralığını custom period ve varsa profil sınırlarında kes, sınırları aşan molalarda ayrı kaynak beyanı/fail-closed; dönemlik bağımsız fazla mesai eşiği, BigInt oran ve kuruş toplamı; mixed rate döneme explicit politika ve fixed salary full/partial varsayımı; period-keyed adjustments/CSV+JSON. **Mevcut takvim-ay raporu unchanged.** Issue #22/#16 açık.
- [ ] Native Android/iOS gerçek kayıt + encrypted backup/restore + DST/low disk/crash kabulü Issue #2/#20 erteli.

## 2026-11-15 — Gerçek tek-rate özel dönem saatlik çalışma tahmini (PR #27 bekleniyor)

- [x] PR #23–#26 main: özel dönem UTC/IANA domain, kalıcı 1–28 tercih, ayrı custom mola geçmişi, efektif ay profil değişiminin read-only önizlemesi (main CI #43747540464 SUCCESS, 163 Node).
- [ ] [PR #27](https://github.com/hilmiguner/vardiyum/pull/27) tek ve değişmeyen saatlik profil altında 26→25 dönemi için **ilk kaynak-bağlı brüt çalışma ücreti tahmini**, gerçek UTC çalışma ve ayrı mola audit, dönemlik OT eşik reset, BigInt kuruş, duplicate/overlap fail-closed, TR/EN ayrı panel. Aylık adjustments varsa hesap tamamen bloke. PR CI/merge ve main kanıtı bekleniyor.
- [ ] Mixed pay profile profile-boundary mola split/review policy; fixed full/partial dönem ödeme varsayımı; custom period adjustment attribution ve CSV/JSON contract. Çalışma ücreti tahmini net/tam maaş değildir. Issue #22/#16 açık.
- [ ] Native iOS/Android SQLite/restore/düşük disk/DST kabulü Issue #2/#20 erteli.

## 2026-11-15 — PR #27 GERÇEK custom hourly tutar (sınırlı kapsam) main'de

- [x] [PR #27](https://github.com/hilmiguner/vardiyum/pull/27) **merged** code main `9965a9b904250bc5fbcfb113f07a9ce09cd4c26e`; [main CI #43749478876](https://github.com/hilmiguner/vardiyum/actions/runs/43749478876) **SUCCESS 177/177 Node** ve Android/iOS JS. Sadece dönem genelinde **tek değişmeyen hourly** profil ve gerçek çalışma varsa kaynak bazlı USD/TRY/EUR/GBP cent+rational net saat/fazla mesai tahmini. Sınır mola allocation PR #25 ayrı audit, 26→25 double count yok; TR/EN ayrı Kazanç paneli.
- [ ] Mixed monthly-effective pay profile değişimi olan dönemde kaynak UTC/IANA segmentleri, özel sınır molası kullanıcı beyanı ve oran/eşik ilişkisi açık politika; `monthly_fixed` tam/partial ödeme varsayımı kullanıcıdan; custom calendar adjustments explicit attribution ve kapsamlı custom CSV/JSON.
- [ ] Native device/integrity/backup-restore/DST/low disk/process-kill issue #2/#20 erteli. Issue #22 ve parent #16 açık; custom work-only ücret resmi/eksiksiz maaş değildir.

## 2026-11-15 — Karma efektif saatlik ücret segmenti (feature PR/CI bekliyor)

- [x] PR #23–#27: custom payroll UTC period, user start-day setting, ayrı custom period-break audit, immutable effective pay preview ve tek-rate gerçek hourly work-only tahmin. [main CI #43749767124](https://github.com/hilmiguner/vardiyum/actions/runs/43749767124) SUCCESS 177 Node.
- [ ] `feat/custom-mixed-hourly-rates`: 26→25 içinde ayın 1'inde yeni hourly rate = **orijinal work IANA 00:00 UTC split**; aynı currency/period threshold, her profil özgün OT multiplier ve kaynak ID/revision. Rate-midnight >0 mola, mixed currency/threshold/fixed, missing audit, calendar adjustments fail closed. TR/EN UI ve Node DST/money/v8 regresyonu; PR CI/merge bekliyor.
- [ ] Rate-boundary break allocation için ayrı açık kullanıcı beyanı ve snapshot provenance tasarımı, fixed salary full/partial, custom period prim/kesinti atfı, gerçek özel dönem kaynaklı CSV/JSON. Issue #22/#16.
- [ ] Gerçek iOS/Android native + AES clean restore/low disk/process-kill Issue #2/#20 erteli.

## 2026-11-15 — PR #28 karma hourly rate tamamlandı

- [x] [PR #28](https://github.com/hilmiguner/vardiyum/pull/28) MERGED main code `dfc6664f10eb963ad20713f79fe5e37b27442807`, [main CI #43751705225](https://github.com/hilmiguner/vardiyum/actions/runs/43751705225) SUCCESS **192/192 Node**, Android+iOS JS. Özel pay period içinde iki user-entered hourly profil, kendi kayıtlı IANA UTC rate midnight, aynı currency/period OT threshold, efektif profil bazlı rate/multiplier ve kaynak satırları, 0-break midnight split, BigInt kümülatif kuruş. Eski tek-hourly ve aylık rapor korunur.
- [ ] Ayrı **ücret değişimi sınırındaki mola** kullanıcının pozitif dakika beyanı ve append-only kaynağa bağlı audit; PR #25 period audit'i bu ayrımı içermez. Mixed currency/threshold/fixed otomatik hesaplanmaz.
- [ ] Full/partial fixed monthly custom pay assumption + period-keyed manual bonus/deduction/correction attribution + source-linked custom CSV/JSON. Issue #22/#16 açık.
- [ ] Native iOS/Android SQLite/AES/restore/process kill/low disk QA #2/#20 erteli.

## 2026-11-15 — PR #29 rate-midnight mola beyanı MERGED

- [x] [PR #29](https://github.com/hilmiguner/vardiyum/pull/29) merged main code `3ecfe1701e5cfef6e0ad836d8809923f3077354b`, [main CI #43754910798](https://github.com/hilmiguner/vardiyum/actions/runs/43754910798) **SUCCESS 204/204 Node** + Android/iOS JS. Kullanıcı tarafından ücret değişim sınırındaki pozitif molanın eski/yeni rate tarafına explicit paylaştırılması, source-bound UTC/IANA, revizyon, reason, exclusive SQLite v8 atomic head+event ve TR/EN UI; uygun iki hourly oranlı özel dönemin work-only tahmini artık bu beyanı kullanır.
- [ ] Aynı kaynak vardiya hem custom **pay period** sınırı hem **effective rate** midnight aşıyorsa iki farklı mola atfı arasındaki bağıntı/uzlaştırma tasarımı ve fail-closed testleri.
- [ ] `monthly_fixed` special period full/partial user assumption ve overtime koşulları; `earnings_adjustments` için ayrı custom-period atıf ve kaynaklı CSV/JSON. Issue #22 ve üst #16 açık.
- [ ] Native iOS/Android gerçek SQLite/backup/clean restore/low disk/process crash/DST QA Issue #2/#20 erteli; JS export native QA sayılmaz.

## 2026-11-15 — PR #30 iki sınır mola uzlaştırması main'de

- [x] [PR #30](https://github.com/hilmiguner/vardiyum/pull/30) merged code SHA `fb8ed3b7a48bd0d103f4e9c520e335ad5613e064`; [main CI #43757686602](https://github.com/hilmiguner/vardiyum/actions/runs/43757686602) **SUCCESS 217/217 Node** + Android/iOS JS. Aynı work, özel pay-period + ayın 1'i efektif rate midnight'ını aşınca explicit 2 adımlı toplam mola atfı, eski pay-audit revision'a bağlı ikinci immutable event, düzeltmede stale fail-closed, kaynak UTC/IANA ve per period+rate net seconds conservation, TR/EN UI ve kaynak audit line version; SQLite v8 18 tables AES archive unchanged.
- [ ] **Sıradaki:** `monthly_fixed` custom full/partial salary modelinin kullanıcı onaylı, explicit ödeme/prorate varsayımı + saatlik ek mesai ilişkisi ve kaynak revizyonu (sessiz oranlama YOK); karma hourly/fixed model geçişi ayrıca politika gerektirir.
- [ ] Eski `earnings_adjustments` ay bazlı olduğundan custom period'larda bonus/deduction/correction için yeni **period-keyed, source-bound** atıf ve v8 uyumlu kayıt/revision. Özel dönem kaynaklı CSV+JSON bunlardan sonra açılabilir.
- [ ] Native Android/iOS SQLite/AES restore/DST/low disk/process-kill gerçek cihaz Issue #2/#20 erteli; Issue #22/#16 açık. Pre-tax work-only ≠ full payroll.

## 2026-11-15 — PR #31 fixed base-only kullanıcı varsayımı MERGED

- [x] [PR #31](https://github.com/hilmiguner/vardiyum/pull/31) main code `3eaa0876224224919b4ccf1d9b97886d11297048`, [main Actions #43760758921](https://github.com/hilmiguner/vardiyum/actions/runs/43760758921) **SUCCESS 232/232 Node** + Android/iOS JS. Tek immutable `monthly_fixed` profilin 2–28 özel dönemi için kullanıcı seçimi: tam kaynak sabit ana tutarı veya 0..tam tutardan küçük **kullanıcı manuel eksik dönem ana tutarı**. Otomatik günlük/saatlik proration YOK. Canonical kaynak/revizyon bağlı app_settings v8 append-only events + CAS head, stale profile/timezone fail-closed, TR/EN UI, eski aylık rapor unchanged, AES v8 18 tablo.
- [ ] Sabit **ana ücretin üzerine fazla mesai** için açık product/kullanıcı eşik ve gerçek çalışma kaynak politikasını tamamla; bu PR sadece BASE ONLY ve mevcut overtime kayıtlarını içermiyor. Mixed fixed→fixed/hourly rate change için açık alternatif politika; asla sessizce iki maaş birleştirme.
- [ ] Ay bazlı `earnings_adjustments` kayıtlarını 26–25 gibi custom period'lara açık kullanıcı kaynak/period atfı olmadan taşımama; bonus/deduction/correction için ayrı sözleşme/revizyon ve rapor satırları. Ardından gerçek custom period CSV/JSON export ve privacy/backup acceptance.
- [ ] Native Android/iOS gerçek SQLite/settings/notification/AES clean restore/DST/low disk/process kill Issue #2/#20 erteli; Node+JS export ≠ native QA. Issue #22/#16 AÇIK.

## 2026-11-16 — PR #32 sabit maaş için onaylı gerçek çalışma fazla mesaisi main'de

- [x] [PR #32](https://github.com/hilmiguner/vardiyum/pull/32) MERGED code SHA `39f3ac22d2f7a34d173ce9416ceb85e56adc250b`. [main CI #43764652681](https://github.com/hilmiguner/vardiyum/actions/runs/43764652681) **SUCCESS 249/249 Node** + Android/iOS JS. Tek `monthly_fixed` profil, kullanıcı full/partial base choice PR #31 sonrasında **yeni ayrı include/exclude overtime consent**; dependent base revision/source + v8 app_settings event history; user-chosen threshold per custom period & overtime hourly multiplier, gerçek kaynak IANA UTC pay period and break audits, no regular hours double pay, cumulative BigInt cents. No implicit tax/legal payroll.
- [ ] **Öncelikli sıradaki:** mevcut `earnings_adjustments` (takvim-aylı) kayıtlarının özel 26–25 döneme **otomatik taşınması yasak**; kullanıcı açık bonus/deduction/correction **source + period attribution**, immutable revisions, çift sayma koruması ve net-of-claims doğrulaması. Sonra özel maaş dönemi CSV/JSON, source lines, confirmed privacy policy.
- [ ] Mixed `monthly_fixed`→`monthly_fixed` ya da fixed→hourly **effective-month** geçişi özel day2–28 dönemlerde yeni user-authorized base/OT attribution policy gerektirir, şu anda BLOCKED.
- [ ] Fiziksel Android/iOS SQLite persistent/auth restore/low disk/DST/process kill QA Issue #2/#20 kullanıcı isteğiyle erteli; JS bundling native PASS değildir. Issue #22/#16 açık.

## 2026-11-16 — PR #33 source-linked özel dönem bonus/kesinti/düzeltme atfı MERGED

- [x] [PR #33](https://github.com/hilmiguner/vardiyum/pull/33) code SHA `277ab98683bab26c05cc218bea0931a7a91817b9`, [main CI #43766839777](https://github.com/hilmiguner/vardiyum/actions/runs/43766839777) **SUCCESS 267/267 Node**, Android+iOS JS. Calendar-month `earnings_adjustments` kaynakları duplicate/edit OLMADAN custom startDay2–28 için earlier/later **tek kaynak-level immutable snapshot** ve user-entered signed integer cents split (sum original) ile atanıyor. V8 app_settings separate append-only revision/CAS head; source changes stale; pending source NO totals; TR/EN form, per-currency adjustment-only subtotals, calendar-month earnings/export unchanged. Valid verified splits old hourly/fixed base/overtime *attribution unknown* blokajını kaldırabilir, fakat **ek tutarlar bu saf ücret tahminlerine eklenmez**.
- [ ] **Sıradaki ana MVP konusu:** user-reported **custom period birleşik total** için kaynak-bağlı salary+overtime+signed adjustments, mixed currencies/day1/partial controls ve duplicate calendar-vs-custom display koruması. Tamamlandıktan sonra **explicit privacy confirmation** ve source/revision/UTC/amount detaylarıyla special-period CSV+JSON export.
- [ ] Monthly-fixed→monthly-fixed ve fixed→hourly efektif yeni ücret profil geçişleri için ayrı kullanıcı onaylı özel dönem politika/senaryoları, henüz BLOCKED. Başka legal/net/SGK/bordro iddiası yok.
- [ ] Native gerçek Android+iOS SQLite persistence, AES encrypted backup restore, DST, offline, crash/low-disk acceptance Issue #2/#20 kullanıcı kararıyla ertelendi; Node+JS export native QA değildir. Issue #22/üst #16 AÇIK.

## 2026-11-16 — PR #34 special pay period single combined PRE-TAX estimate MERGED

- [x] [PR #34](https://github.com/hilmiguner/vardiyum/pull/34) code `db8875817fb0e6d054ee50aa5263d5379f45a3f0`, [merge main CI #43820987714](https://github.com/hilmiguner/vardiyum/actions/runs/43820987714) **SUCCESS 290/290 Node** + Android+iOS JS (NOT native). ONE SQLite snapshot, source-verified **hourly one/two effective rate actual work** OR **user-selected fixed BASE+separately consented OT**, + PR33 exactly attributed signed calendar-month original bonus/deduction/correction. BigInt cents, source IANA UTC/profile/break/attribution revisions, no FX, no double count, negative/invalid amounts/overflows blocked. Fixed overtime PR33 false block count corrected. TR/EN source itemized combined report; old calendar-month earnings/CSV+JSON, SQLite v8 18 tables/AES archive unchanged.
- [ ] **NEXT:** privacy-confirmed custom-period CSV/JSON (read-only fresh snapshot, full source provenance, signed exact minor units, source profile+work UTC+IANA+break/attribution revisions, CSV formula-injection protection, explicit sensitive-data sharing warning, not legal/net payroll). No auto-export/auto-email/background sharing.
- [ ] Mixed fixed→fixed and fixed→hourly effective monthly transition in a special payroll period: separate **explicit user-confirmed amount/prorate** product policy, no silent assumptions (currently blocked).
- [ ] Physical Android/iOS SQLite persist+notification, AES encrypted archive/restore clean target, DST/process kill/low disk QA #2/#20 user-deferred. Issue #22 and parent #16 OPEN until scope and native criteria resolved.

## 2026-11-16 — Özel dönem CSV/JSON, PR #35 (inceleme / CI)

- [ ] [PR #35](https://github.com/hilmiguner/vardiyum/pull/35): açık kullanıcının mahremiyet onayı + fresh validated combined custom report; JSON v1/CSV source audit/dönem UTC/IANA ve full minor unit, spreadsheet injection guard, ephemeral OS share + cache cleanup; Node regresyonu ve TR/EN. **PR CI #43826687695 SUCCESS, 298/298 Node + Android/iOS JS; merge kullanıcı onayı bekleniyor.**
- [ ] Custom `monthly_fixed→monthly_fixed` ve `monthly_fixed↔hourly` efektif ay geçişi: kullanıcıya açık ayrı full/partial BASE+overtime attribution politikası, silent prorata ve double-count kesin yasak. Issue #22/#16 açık.
- [ ] iOS/Android gerçek cihaz SQLite ve OS paylaşımı/temizliği, DST, AES clean restore, low-disk/crash QA Issue #2/#20; kullanıcı kararıyla erteli.

## 2026-11-16 — Sabit→sabit ücret geçişi, kullanıcı kaynak payları PR #36

- [x] [PR #35](https://github.com/hilmiguner/vardiyum/pull/35) privacy-confirmed special-period CSV/JSON **MERGED** `dcbdcc2d`, [main CI #43829741653](https://github.com/hilmiguner/vardiyum/actions/runs/43829741653) SUCCESS, **298 Node**, Android+iOS JS export.
- [ ] [PR #36](https://github.com/hilmiguner/vardiyum/pull/36): iki kaynak `monthly_fixed` effective-month geçişinde 2–28 özel pay period için kullanıcı tarafından explicit **her iki profilin BASE-only ana tutarı**; UTC/IANA segment izleri, immutable kaynak/profile revision + stale redecision, v8 `app_settings` atomic CAS, TR/EN UI ve gerçek SQLite regresyon. [PR CI #43831061577](https://github.com/hilmiguner/vardiyum/actions/runs/43831061577) **SUCCESS 309/309 Node, Android+iOS JS**; merge kullanıcı onayı bekliyor.
- [ ] İki sabit ücrete geçişte gerçek çalışma için **ayrı overtime eşiği/rate/consent politikası** ve eski-yeni kaynak ilişkisi; fixed→hourly ayrıca; signed adjustment atfı+combined/export kapısı ancak bütün kaynaklar doğrulandıktan sonra. Sessiz gün/saat oranlama ya da çift sayım YOK. Issue #22/#16 açık.
- [ ] Erteli fiziksel iOS/Android SQLite migration/persist, AES clean restore, OS CSV paylaşım-temizleme, bildirim, DST/low disk/process kill Issue #2/#20.
