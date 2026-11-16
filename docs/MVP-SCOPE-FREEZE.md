# Vardiyum — MVP Kapsam Dondurma ve Çıkış Kapıları

**Tarih:** 2026-11-16  
**Durum:** Kullanıcı tarafından ONAYLANDI — yeni kapsam kararına kadar bağlayıcı P0 önceliği  
**Takip:** [Issue #38 — MVP çıkış kapısı](https://github.com/hilmiguner/vardiyum/issues/38)  
**Başlangıç kanıtı:** [PR #37](https://github.com/hilmiguner/vardiyum/pull/37) MERGED, main `a246dba2b500edc039ac04c86f4e220a59a5921d`; [main CI #43844467382](https://github.com/hilmiguner/vardiyum/actions/runs/43844467382) SUCCESS (319/319 Node, Prettier, ESLint, TypeScript, Android/iOS **JS** paketleri). Bu, **native cihaz / ürün / mağaza kabulü değildir**.

## Nihai hedef ve değişmez sınır

Vardiyum'un ilk ürünü tüm sektörlerden vardiyalı çalışanlar için TR/EN, iOS/Android, offline-first **kişisel vardiya + rutin + kullanıcı beyanına dayalı yaklaşık kazanç** uygulamasıdır. Amacımız yeni mikro-özellikler veya bitmeyen ücret hesaplama kuralları eklemek değil, çalışan çekirdeği güvenilir biçimde **kullanılabilir kapalı beta**ya, sonra **App Store ve Google Play üretim yayını**na ulaştırmaktır.

- **Kapalı beta için başlangıç planı 3 teslim aşaması; birinci aşamanın kaynak-kod/CI denetimi 2026-11-16 tamamlandı, ikinci aşama gerçek cihaz ve üçüncü aşama kapalı beta henüz yapılmadı.**
- **Her iki mağazada yayın dahil başlangıç planı toplam 4 aşama (birinci aşama kod kabulü tamam; iki beta kapısı ve mağaza kapısı açık).**
- Bu **PR sayısı / net süre / garantili teslim tarihi değildir**. Kritik hata ortaya çıkarsa ilgili aşamada düzeltilir; yeni aşama sayılmaz.
- MVP kapsamında yeni bir özelliğe ancak **kanıtlanmış P0 kullanıcı akışı, güvenlik, veri kaybı veya hesaplama doğruluğu** problemi çözüyorsa girilebilir; diğerleri v1.1+.
- Mevcut `blocked` / yeniden kaynak onayı gerektiren hesaplama korumalarını **gevşetme veya otomatik tahmin yapma**. Eksik destek kapsamını kullanıcıya net açıkla.

## Dört nihai teslim aşaması (tek kontrol listesi: Issue #38)

### 1. P0 ürün tamamlama — kapsam dondurulmuş
- [ ] Bugün, Takvim, Rutinler, Kazanç ve Ayarlar ekranlarında gerçek ilk kurulum, temel döngü/gün istisnası, görev kaydı, bildirim izni, girişli gerçek çalışma ve tahmini kazanç **uçtan uca akışı** gözden geçir.
- [ ] Yalnız P0 fonksiyonel/UX sorunları, temel TR/EN erişilebilirlik/kontrast/boş-veri/izin-hata açıklamaları ve kritik gizlilik/çevrimdışı uyarıları düzelt.
- [ ] Desteklenen maaş modelleri için doğruluk ve tutar kaynağı; desteklenmeyen özel modeller için **yanıltıcı tutar yerine BLOCKED/açıklama**. Native kabul tamamlanana kadar “MVP yayın hazır” deme.
- [ ] Her düzeltme için test ve CI, çekirdek akışlara regresyon yok.

### 2. Gerçek cihaz Android + iOS kabulü (önceden kullanıcı tarafından ertelendi; beta öncesi ZORUNLU)
- [ ] İki platformda **gerçek native derleme/başlatma**, offline, kapanış/yeniden açılış, veri koruma, SQLite v1→v8/migrasyon.
- [ ] Rutin/yerel bildirim izin+teslim/yeniden planlama, IANA/DST, saat dilimi, gerçek iş kayıtları.
- [ ] AES-256-GCM yedek, sadece temiz hedefe atomik geri yükleme, wrong-key/invalid, OS CSV/JSON mahremiyet ve geçici plaintext dosya cleanup, low disk/crash/process kill.
- [ ] Tespit edilen veri kaybı, yanlış hesap, native crash veya kritik hatalar kapatılır; sadece JS bundle/test bunların kanıtı **değildir**.
- [ ] [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) + [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) bu aşamada kullanılır. Erteleme geçmişi korunur ancak **yayın için atlanamaz**.

### 3. Kapalı beta çıkışı
- [ ] Gerçek kullanıcı kurulum, plan, rutin ve kazanç senaryoları; geçmiş ürün hedefi 20 testçi **hedef** olup fiilen test edildiği iddia edilmez.
- [ ] **Açık P0 = 0:** yanlış vardiya/yanıltıcı ücret/izinsiz hassas paylaşım/veri kaybı/kritik açılış-çökme.
- [ ] Beta dağıtım paketi ve sürüm adayı doğrulanır. Bu aşama bitince **kapalı beta MVP** tamamdır; henüz her iki mağazada halka açık üretim yayını tamam değildir.

### 4. App Store + Google Play yayın
- [ ] Geliştirici hesapları, imzalama/app kimliği, güncel mağaza ve gizlilik gereklilikleri, izin bildirimleri.
- [ ] Store listing, açıklama, erişilebilir görseller, privacy policy URL ve veri beyanları; native production build, iki mağaza inceleme.
- [ ] İki mağaza onaylandıysa yayın sonucu kayda geçer; gönderim ≠ onay ≠ yayın.

## MVP'de KALAN ile MVP SONRASI ayrımı

**P0 (bu dört kapı kapsamında):** kullanıcı vardiya döngüsü + tek gün düzeltmeleri + takvim, rutin/görev kaydı/bildirim izni, aylık ve **mevcut desteklenen** özel dönemlerde self-reported **vergi öncesi tahmini** kazanç; offline SQLite, TR/EN, kaynak doğrulaması, temel şifreli backup/clean restore, koşullu CSV/JSON kullanıcı onaylı paylaşım. Doğru hesap veremediğin durumda BLOCKED.

**v1.1+ / P1, İLK MVP'YE ŞART DEĞİL:** custom period **fixed→fixed** için gerçek work + OT ücretlendirme motoru / birleşik export (PR #37 şu an **yalnız onay politikası**, tutar değil), fixed↔hourly efektif profil geçişi, FX/çoklu para birimi tek toplam, ek özel bordro modelleri, gelişmiş ücretli izin/işveren doğrulama, yeni istisnai maaş hesapları, gelişmiş şablon silme/sürümleme, analitik, widget, çoklu cihaz/senkronizasyon, resmi bordro/vergi/SGK/net ücret.

**Güvenlik gerçeği:** Eski takvim aylık ve desteklenen özel dönem hesabı + CSV/JSON kendi doğrulanmış kapsamı içinde çalışmaya devam eder; `monthly_fixed→monthly_fixed` özel dönemde iki BASE beyannamesi ve iki profilli fazla mesai kararı kaydedilebilir ama **gerçek iki sabit ücretli fazla mesai tutarı / combined total / CSV/JSON hâlâ BLOCKED**. Buna rağmen P0 kapıları sağlanırsa MVP'nin kapalı betaya çıkması engellenmez; ekrandaki sınırlama kullanıcıya açık anlatılır. **Resmi bordro, vergi, net/SGK ve işveren onayı iddiası yok.**

## Açık issue sınıflandırması / süreç

| Kaynak | Karar |
| --- | --- |
| [#38](https://github.com/hilmiguner/vardiyum/issues/38) | **Yeni tek MVP teslim ve exit-gate takipçisi.** |
| [#2](https://github.com/hilmiguner/vardiyum/issues/2), [#20](https://github.com/hilmiguner/vardiyum/issues/20) | P0 **aşama 2** native cihaz, AES restore, share, SQLite ve bildirim testleri; kullanıcı ertelemesi nedeniyle **henüz PASS değil**. |
| [#4](https://github.com/hilmiguner/vardiyum/issues/4) | Kök vardiya özelliğinde **yalnız P0 kırık akış** düzeltmeleri; genişletilmiş şablon ve geçmiş sürümleme P1. |
| [#16](https://github.com/hilmiguner/vardiyum/issues/16), [#22](https://github.com/hilmiguner/vardiyum/issues/22) | Tarihsel geniş maaş epic'leri **AÇIK** kalabilir fakat tamamının bitmesi P0 blokörü değildir. Destek dışı mixed fixed/fixed-hourly fiyatlandırma P1. |
| Önceki yol haritasındaki “NEXT” geliştirmeleri | Bu **2026-11-16 kapsam dondurma** kararına ters düştükleri ölçüde tarihi nottur, yeni bir P0 zorunluluğu yaratmaz. |

## Her yeni sohbette zorunlu operasyon

1. Önce `main` SHA + son GitHub Actions + açık issue/PR, `docs/MVP-SCOPE-FREEZE.md`, `HANDOFF.md`, `STATUS.md`, `ROADMAP.md`, `DECISIONS.md` oku.
2. **#38'de ilk tamamlanmamış kapıdan ilerle**. Kullanıcı tekrar 'sonraki geliştirmeye geç' dese bile P1 maaş senaryosu PR'ı otomatik açma.
3. **Sadece kullanıcı yeni bir açık karar verirse** kapsam dondurmayı aç veya mevcut P0 güvenlik/doğruluk sorunu kanıtlandıysa önceliklendir. Her aşama tamamlanmadan 'hazır', 'native geçti' veya 'mağazada' denmez.
4. Her ilerlemede issue #38 checklist, bu kapsam kaydı, STATUS/HANDOFF, test kanıtı ve GitHub Actions sonucu güncel tut.

## 2026-11-16 — Aşama 2 için kanıt sınırı

- [PR #39](https://github.com/hilmiguner/vardiyum/pull/39), [PR #40](https://github.com/hilmiguner/vardiyum/pull/40), [PR #41](https://github.com/hilmiguner/vardiyum/pull/41) **main üzerinde merged**, `main=8b72b55625eee5c4f278f467a5d45df20dc3bfd0`, [main CI #43877499033](https://github.com/hilmiguner/vardiyum/actions/runs/43877499033) SUCCESS 338/338 Node; kaynak-kod P0 denetiminde açık bulgu bırakılmadı. Bu **gerçek iOS/Android UX/erişilebilirlik testinin tamamlandığı anlamına gelmez**.
- **Sıradaki tek kapı:** [NATIVE-PREVIEW.md](NATIVE-PREVIEW.md) EAS Preview ve [DEVICE-SMOKE.md](DEVICE-SMOKE.md) D01–D10 × Android/iOS. Expo projesi, Apple hesabı/UDID, native build ve fiziksel test sonuçları henüz yok. Testte P0 çıkarsa yalnız düzeltme; yeni maaş özelliği yok.
