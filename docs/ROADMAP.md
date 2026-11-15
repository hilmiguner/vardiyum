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
