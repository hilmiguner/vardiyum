# Vardiyum — Gerçek Cihaz Kabul Listesi

> **EN GÜNCEL 2026-11-21 / A23 GERÇEK CİHAZ:** Galaxy A02s Android12 ARM32 SQLite ilk açılış/kalıcılık PASS. Galaxy A23 Android14'te yeni APK ile eski veriler KORUNDU, varsayılan Sabah/Akşam/Gece/İzin silme seçenekleri VAR, kullanılmayan şablon silme + Kaydet + yeniden açma PASS; alt sekmelere dokunuluyor ve OS navigasyonuyla önceki çakışma görünmüyor. **Kalan:** Bugün sekmesindeki geniş gri aktif arka plan/ikon hizası; 00:23 ekranında Bugün 2026-11-20 görünmesi (yerel IANA tarih yenileme olası kusuru). PR #46 dalında bu iki sorun için **YENİ KOD DÜZELTMELERİ VAR AMA YENİ APK/PHYSICAL RETEST YOK**. Bu bildirimde EAS build ID/SHA verilmedi. PR #46 OPEN/merge onayı yok; final CI doğrulanmalı. Android D01 PARTIAL, diğer Android D02-D10 ve tüm iOS QA AÇIK, beta/store yok.

## 2026-11-16 — GÜNCEL MVP 2. aşama / tek gerçek cihaz kabul oturumu (Issue #38, #2, #20)

**Önkoşul:** PR #41 kullanıcı onayıyla merge ve main CI başarılı olduktan sonra aşağıdaki testleri **Android ve iOS gerçek native derlemelerde ayrı ayrı** kaydet. JS export/Expo Go/Mac simülatör yalnız sınırlı kanıttır; native standalone/offline, OS bildirimleri ve AES dosya yaşam döngüsü gerçek OS üzerinde doğrulanmalıdır. Tüm kutular **henüz test edilmedi**. Aşağıdaki sonuçları kişisel finans, recovery key veya hassas vardiya notlarını paylaşmadan kaydet.

| ID | Gerçek cihaz kabulü | Android | iOS |
| --- | --- | --- | --- |
| D01 | Native preview ilk açılış ve sekmeler; SQLite kayıt/kalıcılık; sistem navigasyonu | **PARTIAL** — A02s Android12 SQLite + sekmeler + döngü kalıcılığı PASS. A23 Android14 eski veriler PASS, saat dilimi ve profil geçişi PASS; alt bar sistem safe-area çakışması DEVAM. Yeni safe-area patch için APK RETEST PENDING (#43/#44). | NOT_TESTED |
| D02 | Vardiya döngüsü/renk/gece+1/mola/override→geri alma; aynı gün shift değişince eski gerçek çalışma saatleri default'ta kalmaz | NOT_TESTED | NOT_TESTED |
| D03 | Gerçek çalışma UTC, günlük görev tamamla/geri al/rutin arşiv; uygulamayı kapat/yeni aç; offline SQLite verisi aynı | NOT_TESTED | NOT_TESTED |
| D04 | SQLite v1→v8 ardışık migration, eski verinin korunumu, FK/integrity, WAL, temiz kurulum | NOT_TESTED | NOT_TESTED |
| D05 | OS bildirim izni kabul/ret, rutin opt-in/out, foreground/background, tekrar planlama, eski owned dışında hiçbir bildirimin silinmemesi | NOT_TESTED | NOT_TESTED |
| D06 | Saat dilimi, NYC DST gap/fold, Nepal +05:45, midnight crossing; planlı ≠ gerçek çalışma | NOT_TESTED | NOT_TESTED |
| D07 | Aylık ve 26–25 Bugün kaynağı, earnings BLOCKED/no profile/no work/FX durumlarında rakam gizleme; Türkçe+İngilizce | NOT_TESTED | NOT_TESTED |
| D08 | AES-256-GCM yedek ve 64 karakter anahtar; yanlış key/bozuk dosya, yalnız boş temiz hedef atomik restore, key gizliliği, OS dosya seçici | NOT_TESTED | NOT_TESTED |
| D09 | OS CSV/JSON paylaşımdan önce explicit consent, iptal, geçici plaintext cleanup, arka plan/kill/düşük disk sırasında yanlış paylaşım/veri kaybı olmaması | NOT_TESTED | NOT_TESTED |
| D10 | TalkBack/VoiceOver, büyük font/satır kayması, light/dark kontrast, uzun TR/EN metinleri, erişilebilir Retry/permission CTA | NOT_TESTED | NOT_TESTED |

**Her kayıt için:** commit SHA, uygulama sürümü/build ID, cihaz modeli/OS, tarih, tester, kurulum durumu, beklenen ve gözlenen, PASS/FAIL/BLOCKED/NOT_TESTED, ilgili GitHub issue, kişisel bilgi içermeyen kanıt. **Kritik P0 FAIL ile beta aşamasına geçilmez.** Android testi iOS PASS sayılmaz.

**Tarihsel eski Faz 1–4 listeleri aşağıda korunur; güncel teslim kontrolü bu tablo ve [MVP-SCOPE-FREEZE.md](MVP-SCOPE-FREEZE.md)'dir.**

**Durum:** 2026-11-15 itibarıyla henüz uygulanmadı. GitHub Actions #43697865419 Android/iOS **JavaScript** export doğrulaması yapmıştır; gerçek cihazda açılış kanıtı değildir.

## Hazırlık

1. Güncel Vardiyum dalını çek, Node 22 kullan ve `npm ci` çalıştır.
2. `npx expo install --check` ve `npx expo start --clear` ile Expo Go / uyumlu development build başlat.
3. Android fiziksel cihaz veya emulator; iOS fiziksel cihaz veya macOS simulator üzerinde aşağıdaki testleri ayrı ayrı kaydet.
4. **İnternetsiz kullanım:** Expo Go geliştirme sırasında Metro'ya ihtiyaç duyabilir. Ağsız işlevleri gerçek standalone pakette ayrıca test et; Expo Go testini çevrimdışı kanıtı sayma.

## Android ve iOS test senaryoları

- [ ] Açılış: Bugün, Takvim, Rutinler, Kazanç ve Ayarlar ekranlarına sorunsuz geçiş.
- [ ] İlk kullanımda döngü olmadığı mesajı ve Ayarlar'a yönlendirme.
- [ ] Ayarlardan 8 günlük örnek döngüyü yükle, kaydet; Bugün ve 14 gün listesinde doğru göründüğünü doğrula.
- [ ] Uygulamayı tamamen kapatıp yeniden aç; SQLite kaydının korunduğunu doğrula.
- [ ] Döngü gününe dokunup vardiyayı değiştir; gün ekle / kaldır; tekrar kaydet ve yeniden aç.
- [ ] Geçersiz başlangıç tarihi (ör. `2026-02-29`) gir; hata mesajı çıkmalı, uygulama çökmemeli.
- [ ] Sistem Türkçe/İngilizce olduğunda çeviriler ve açık/koyu temalar düzgün görünüyor.
- [ ] Erişilebilirlik: büyük yazı, TalkBack/VoiceOver, düğme etiketleri.
- [ ] Standalone paket varsa interneti kes; önceden girilmiş takvim ve veritabanı çalışmaya devam ediyor.

**Kapsam dışı:** Kişiselleştirilmiş vardiya saatleri, değişiklik istisnaları, rutin/mesai/kazanç ekranlarında gerçek işlemler (henüz geliştirilmedi).

## Test kanıtı

| Alan | Bilgi |
|---|---|
| Platform, OS ve cihaz | Android/iOS, model |
| Test commit SHA | SHA |
| Derleme türü | Expo Go / dev build / standalone |
| Tarih ve testi yapan | YYYY-MM-DD |
| Her madde | PASS/FAIL, açıklama |
| Hata bağlantısı | GitHub Issue / kişisel veri içermeyen ekran görüntüsü |

**Yayın/geliştirme sınırı:** Native test kaydı olmadan 'Android/iOS cihaz testleri tamamlandı' denmez.

## Faz 2 için ek cihaz testleri — PR #5 (henüz yapılmadı)

- [ ] V1'den yükselen telefonda eski döngü ve günlük değişiklik korunur; SQLite `user_version=2`.
- [ ] Özel vardiya ekle: 19:00–07:00, mola 30 dk; kapat/aç, değerler aynı.
- [ ] Aynı saat 07:00–07:00 gir: 24 saatlik planlı vardiya olarak görünmeli.
- [ ] Aylık takvimde rastgele bir günü "izin" olarak değiştir, sonraki döngü günü bozulmamalı.
- [ ] Değişiklik geri alınınca düzenli döngü görünür; kapat/aç sonrası kalıcıdır.
- [ ] Türkçe ve İngilizce metinler; Android/iOS açık/koyu tema ve TalkBack/VoiceOver erişimi.
- [ ] Kullanıcı geçersiz saat veya mola girince uygulama çökmemeli, kayıt reddedilmeli.

## Issue #8 — Gelecekteki cihaz kontrolü (kullanıcı tercihiyle ertelendi)

- [ ] iOS ve Android'de v2->v3 SQLite migrasyonu; pattern/override/eski work_entries korunur.
- [ ] NYC 2026-11-01 01:30 fold: erken/geç seçenekleri tek gün için saklanır; uygulama kapanıp açılınca yeniden yüklenir.
- [ ] Şablon saati veya program bölgesi değişince eski DST seçimi kullanılmaz.
- [ ] Planlanan ile gerçek giriş/çıkış farklı tutulur; gerçek mola girişi ve silme sonrası kalıcılık.
- [ ] Aynı gerçek UTC aralık çakışması reddedilir, ardışık aralıklara izin verilir.
- [ ] Program IANA saat dilimi değişim önizlemesi/açık onayı, geçmiş fiilî UTC kayıtlar değişmez.
- [ ] Geliştirme vs üretim build, çevrimdışı kullanım, uygulama kapanıp açılınca kayıtlar, TalkBack/VoiceOver.
- [ ] Hermes/ICU/tzdb sürümünden kaynaklanan DST farkları kaydedilir; ücret motoruna otomatik aktarılmaz.

**Durum:** Henüz gerçek cihaz testi yapılmadı. Bunlar planlanan, tamamlanmamış maddelerdir.

## Faz 3 / Issue #10 (planlandı, henüz yapılmadı)

- [ ] Android/iOS SQLite v3→v4 migrasyonu, rutin/checkbox ve eski work/shift/override verileri korunuyor.
- [ ] Rutin oluştur, vardiya/hafta/döngü/izin filtreleri ve gece vardiyası başlangıç günü doğru.
- [ ] Günlük istisna değiştiğinde günlük checklist değişiyor.
- [ ] Tamamlandı/geri al, kapat/aç kalıcılığı; arşiv/geri alma ve geçmiş snapshot korunuyor.
- [ ] Türkçe/İngilizce, TalkBack/VoiceOver, erişilebilir checklist ve büyük yazılar.
- [ ] Bildirimler henüz uygulanmadı; bu testin kapsamı değil.

**Kullanıcı cihaz testlerini erteledi; native PASS kanıtı yok.**

## Issue #12 — Gerçek cihaz bildirim smoke (henüz yapılmadı)

- [ ] iOS/Android v4→v5 SQLite migrasyonu, önceki rutin/checklist ve geçmiş kayıtları korunuyor.
- [ ] İzin etkinleştirmesi yalnızca düğmeye basıldığında soruluyor; reddetme, kalıcı red ve sonra Ayarlar'dan izin verme.
- [ ] Android 13+ kanal/POST_NOTIFICATIONS; Android 12–14 exact alarm verilmediğinde best-effort teslim; iOS yetki (provisional/authorized).
- [ ] Ekran önünde, arka planda, kilitli telefonda, uygulama kapalı/yeniden başlatılmışken yerel bildirim teslimi ve beklenen OS sınırlamaları.
- [ ] Günlük vardiya override, döngü değişimi, rutin etkinleştirme/arşivleme, tamamlandı/geri al ve zone değişimi sonrası pending owned bildirimleri yeniden senkronize.
- [ ] DST gap/fold, farklı IANA tzdb sürümleri ve seyahatte zone değişimi; yanlış saat veya çift hatırlatma olmamalı.
- [ ] 14 gün/48 toplam/6 günlük sınır, diğer sistem bildirimlerini silmeme ve telefonun pil/izin sınırlamaları.
- [ ] TR/EN arayüz, TalkBack/VoiceOver ve tamamlanmamış görevlerin çevrimdışı kalıcılığı.

**Durum:** Kullanıcı cihaz testlerini sonraya bırakmıştır; bu kutular tamamlanmış sayılmaz. JS bundle ve Node testleri native izin/teslim kanıtı değildir.

## Issue #14 — Kazanç ekranı ve SQLite v6 için ileride cihaz kabulü

- [ ] v5→v6 yükseltme sonrası eski shift/rutin/tamamlanma/gerçek giriş-çıkış ve hatırlatma kayıtlarının korunması, kapat-aç persistansı.
- [ ] TR/EN Kazanç sekmesinde ayrı ay seçimi, saatlik/tam aylık kullanıcı profili oluşturma, yeni geçerlilik ayı ve aynı ay ikinci profil reddi.
- [ ] Gerçek giriş/çıkış ve mola kaynaklı tutarın kalem kalem görünmesi; planlanan vardiyanın otomatik iş sayılmaması.
- [ ] Kullanıcının eşik, mesai oranı, prim, kesinti ve manuel düzeltme girdileri sonrası raporu yenileme.
- [ ] DST, ay sınırını aşan vardiya, örtüşen veri ve para birimi uyuşmazlığı halinde sahte toplam yerine blok uyarısı.
- [ ] Cihazda hatasız integer cent biçimi, büyük tutar/eksi miktar, çevrimdışı kullanım, uygulama kapanıp tekrar açılması, büyük font ve VoiceOver/TalkBack.
- [ ] Resmî net ücret/SGK/vergi sonuçlarının veya hukuki mevzuat varsayımının **sunulmadığı** onayı.

**Henüz yapılmadı:** Kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'ye ertelendi; Android/iOS JS export yalnızca paketlemeyi doğrular.

## Issue #16 / PR #17 — İleride yapılacak native ay bölme/paylaşım kabulü

- [ ] Android/iOS SQLite v6→v7 additive migrasyon ve eski gerçek çalışma/profil/ayarlama/rutin verilerinin, uygulama kapatılıp açıldıktan sonra korunması.
- [ ] Ayın son günü 23:00–07:00 gece vardiyasında (Türkiye) Kasım/Aralık farklı profile göre 1h/7h doğru hesap.
- [ ] New York DST geri/ileri, Nepal 45 dakika ve Adelaide yarım saat UTC offsetlerinde ay sınırı UTC bölünmesi.
- [ ] Mola 0 otomatik; mola >0 kullanıcı başlangıç ayı dk girip kaydedince iki ayda ayrı bölüm, tekrar açılışta aynı tercih, düzeltmede v7 audit izi.
- [ ] İmkânsız mola dağılımı, UTC uçlarının değişmesi, çakışma ve ay sınırı çözümsüzse kazanç tahmininin bloke edilmesi.
- [ ] Kullanıcı onayı olmadan rapor paylaşılmaması; Share sheet iptal, CSV/JSON metin, başka uygulama seçme, gizlilik uyarısı, iOS/Android UI.
- [ ] TalkBack/VoiceOver, TR/EN, uzun rakam/eksi para, erişilebilirlik ve çevrimdışı çalışma.
- [ ] **Gerçek resmî bordro/net ücret/vergisel uygunluk iddiası yapılmıyor.**

**Durum:** Kullanıcının tercihiyle native cihaz QA sonraya bırakıldı ([Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)). JS export, Share sheet/SQLite v7 cihaz davranışını doğrulamaz.

## Issue #16 / PR #18 — Native ücret profili düzeltme kabulü (ertelendi)

- [ ] Mevcut SQLite v7 verisini native cihazda v8'e yükselt, v1 profil/veri korunumu ve boş revision tablosunu doğrula.
- [ ] Aynı ayın yeni profil v2/v3 düzeltmesi için gerekçe sorulması, eski oran ve UTC kayıt anının okunabilmesi.
- [ ] Uygulama kapat/aç sonrası tüm sürümlerin korunması; bir başka ekrandaki eski açık formdan düzeltme yapıldığında stale-revision reddi.
- [ ] Önceki sürümü seçerek hesaplama yapılması, güncel rapora dönme, CSV/JSON çıktısında doğru `profileId/revision`, geçmiş raporun birebir kopyası olmadığı uyarısı.
- [ ] TR/EN, TalkBack/VoiceOver, büyük yazı ve offline ekran deneyimi.
- [ ] İşveren onayı, net maaş/vergi/SGK/yasal katsayı iddiası olmadığının doğrulanması.

**Durum:** Kullanıcı isteğiyle gerçek cihaz QA ertelendi ([Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)). JS export native migrasyon ve persistans kanıtı değildir.

## Issue #16 / PR #19 — Native şifreli yedek cihaz kabulü (ertelendi)

- [ ] iOS/Android gerçek cihazda SQLite v8 tüm 18 tabloyu şifreli backup'a alma, 4M plaintext/8M encrypted envelope limitini güvenli reddetme.
- [ ] `AESEncryptionKey.generate` kriptografik key oluşturma, AES-256-GCM + AAD ve native sealedData biçimi; aynı cihaz ve farklı cihazda .vdb dosyasını key ile doğrulama; yanlış key/bozuk dosyayı reddetme.
- [ ] Recovery key ekranda görülür, ayrı kaydedildiği onaylanmadan Share açılmaz, anahtar .vdb/cache/SQLite/loglara yazılmaz; uygulamadan çıkınca key yaşam döngüsü.
- [ ] Android/iOS sistem Share ve DocumentPicker izinleri, .vdb paylaşımı, düşük disk alanı, dosyanın yanlışlıkla silinmesi, target app iptali, büyük dosya, offline.
- [ ] Dosya/anahtar doğrulamasında tablo sayıları doğru; **mevcut veritabanı hiçbir şekilde değişmemeli** (read-only verification).
- [ ] Çökme/uygulama kapat-aç, TR/EN, TalkBack/VoiceOver, gizlilik ve finans verisi paylaşım onayı.
- [ ] **Gerçek atomik restore / temiz hedef üzerinden tüm kullanıcı verilerini geri getirme henüz mevcut değil**; ayrı tasarım, geliştirme ve QA ister.

**Durum:** Kullanıcı gerçek cihaz QA'yı [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de erteledi; JS bundle AES native çalışma, dosya paylaşımları veya data restore kanıtı değildir.

## Issue #20 / PR #21 — Native temiz kurulum restore kabulü (ertelendi)

- [ ] Gerçek iOS ve Android'de birinci cihazdan v8 AES-GCM .vdb dosyası oluştur, 64-char recovery key'i ayrı tut, dosyayı ikinci temiz cihazda DocumentPicker'dan al, doğru/yanlış key ve bozuk dosyayı doğrula.
- [ ] Önizleme hiçbir SQLite yazımı yapmamalı. `RESTORE` metni yazılmadan veya ikinci Alert onaylanmadan restore gerçekleşmemeli.
- [ ] Gerçek temiz hedef: sadece 4 dokunulmamış seed şablonu + diğer 17 tablo boş; kayıplı güncelleme olmadan 18 tablo yeniden yükleniyor; profil revizyonu/UTC sessions/rutin/mola event satırları korunuyor.
- [ ] İkinci import, değiştirilmiş seed template, geçmiş çalışma/rutin, var olan `app_settings` içeren cihazda işlemi reddet, hedef verileri başlangıçla karşılaştır.
- [ ] Kesilen yazma, düşük disk/space, uygulamayı zorla öldürme/cihaz yeniden başlatma sırasında rollback veya tam restore; SQLite `PRAGMA integrity_check` ve `foreign_key_check`, WAL dosyaları ile tekrar açılış.
- [ ] `routine_reminders_opted_in`=0 olmalı, OS bildirim izni/eski bildirim trigger'ları otomatik etkinleşmemeli; kullanıcı yeniden bilinçli onay vermeli.
- [ ] TR/EN, TalkBack/VoiceOver, büyük font, uzun key, açılan/kapanan ekranlarda secret clear, offline ve cache lifecycle QA.
- [ ] Çok büyük >4M/8M backup, unsupported v7/v9, FK bozuk tarihsel snapshot, farklı IANA timezone ve kopya profil verisi fail-closed.

**Durum:** kullanıcı isteğiyle gerçek cihaz QA [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi. JS export/Node SQLite testleri **native restore kanıtı değildir**; [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık.

## 2026-11-19 — İlk gerçek Android cihaz kabulü: P0 FAIL + kullanıcı UX bulguları (PR henüz merge değil)

- İlk Android EAS `preview` APK: [build d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48), kaynak `13e7ba4fbbf53e4bdf28a708841379baccdf7857`. Kullanıcı **iki fiziksel Android telefona kurdu, ikisinde de uygulama penceresi açıldı**. **Telefonda A:** SQLite local database `NativeDatabase.constructor` → `java.lang.NoClassDefFoundError: expo.modules.sqlite.NativeDatabaseBinding`; veriler yüklenemedi, **D01 Android platform kabulü FAIL**. **Telefonda B:** veriler açıldı ama UX sorunları var; diğer D02–D10 ve iOS testleri tamamlanmadı. Cihaz modelleri/Android sürümleri ve JNI cause-chain logları henüz bilinmiyor; native sınıf/ABI hata kökenini tahmin edip sürüm yükseltme veya wipe yapma. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43).
- B cihazında gözlenenler: 8 günlük örnek döngü gereksiz; yeni custom vardiya/izin türü silinemiyor; IANA zone serbest metin girişi karmaşık; `needs_profile` iken `showEditor || needs_profile` form gizlenemiyor; Android sistem geri/home düğmeleri ile tab çakışıyor. [Issue #44](https://github.com/hilmiguner/vardiyum/issues/44).
- Kullanıcının **ayrı ürün isteği**: normal OT x1,5 / bayram OT x2, kullanıcı tanımlı mesai türleri. Mevcut `overtimeAfterMinutes` dönem toplam kaydedilmiş fiili çalışma eşiği (dk); `overtimeMultiplierNumerator/Denominator` tek rasyonel katsayı `3/2=1,5`. **Mevcut gerçek çalışma satırlarında mesai türü olmadığı için** bu isteği sırf iki UI butonu ekleyip doğru para tahminiymiş gibi gösterme. [Issue #45](https://github.com/hilmiguner/vardiyum/issues/45) ayrı doğru veri modeli/tasarım/CI/native QA ister, eski FIXED/FX BLOCKED koşulları korunur.
- **Bu açık kod dalında kaynak P0/UX düzeltmeleri:** 8 günlük örnek CTA kaldır, ilk döngü başlangıç taslağı 1 gün; custom template silme açık onay + SQLite atomik referans kontrolü (cycle, override, routine) ve sadece gerçekten silme onayında; city-based aranabilir IANA modal; ücret formu hide doğru; mevcut tek OT katsayısını açıklayan TR/EN metinler; `useSafeAreaInsets` alt tab height/padding, stack Ayarlar bottom safe-area; EAS `extra.eas.projectId=0ec5a8c3-f277-43d0-82c7-8b822835a4c2` gerçek kullanıcıdan doğrulandı ve source config'e eklendi (token/secret yok). **Source/Node test + JavaScript paketleme gerçek cihaz PASS değildir**. Native SQLite root cause ve gerçek Android A/B sonrası yeni APK retesti **halen açık**.
- Sıradaki: PR CI başarılı + kullanıcının ayrı merge onayı; native SQLite için Android A/B model, OS API, CPU ABI ve güvenli logcat; ardından yeni EAS APK derlemesi gerçek D01 tekrar testi, iOS fiziksel ve tüm D02–D10. D01 FAIL varken Stage 3 beta/Stage 4 mağaza YOK. [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38) dört kapı, kapsam dondurma ancak açık kullanıcı isteği P0/UX düzeltmelerine uygulanır.

## 2026-11-20 — ARM32 SQLite native library missing: build-source mitigation pending physical retest

**Physical evidence:** Galaxy A02s SM-A025F/DS (Android 12) runs `zygote32`, ABI `armeabi-v7a,armeabi` only. Extracted original first preview APK `d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48` directly from installed device (`adb shell pm path` / `adb pull`): among **22 ARM32 .so libraries**, `lib/armeabi-v7a/libexpo-sqlite.so=MISSING` while `libexpo-modules-core.so`, `libreactnative.so`, `libc++_shared.so` are PRESENT. Native runtime previously reported `java.lang.NoClassDefFoundError: expo.modules.sqlite.NativeDatabaseBinding`. For Expo SDK57 source, `NativeDatabaseBinding` calls `System.loadLibrary("expo-sqlite")` in companion initializer, so the missing architecture-specific .so is the strong concrete explanation. A23 SM-A235F/DSN Android14 opens SQLite (likely arm64, **not yet direct APK ABI inventory**). No data wipe is warranted.

**SDK 57 source findings:** `packages/expo-sqlite/android/shouldUsePublication.groovy` chooses a *prebuilt/published AAR* by default; if `expo.sqlite.enableFTS` Gradle property is explicitly set, it instead builds from native source. `packages/expo-sqlite/android/build.gradle` local native CMake `abiFilters (*reactNativeArchitectures())` includes `armeabi-v7a` in the defaults. SDK57 SQLite plugin `android.enableFTS: true` sets the Gradle property; FTS was already enabled by default and SQLCipher is NOT enabled. [Expo SDK57 SQLite config docs](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/); [Expo SDK57 source](https://github.com/expo/expo/blob/sdk-57/packages/expo-sqlite/android/shouldUsePublication.groovy).

**Candidate fix — OPEN PR #46, NOT MERGED:** Set `app.json` SQLite plugin `["expo-sqlite", {"android":{"enableFTS":true}}]`, forcing native compilation for the same SQL backend rather than relying on published Android binary. Add regression test `tests/native-preview-config.test.mjs` checking source-build guard and `scripts/verify-android-apk-native.ps1` to fail if `libexpo-sqlite.so` is absent for either ARM32 or ARM64 in generated APK. No changes to `src/data/database.ts`, migrations, saved data or encryption. **This is an unverified fix hypothesis until a new EAS preview APK is built, checked by script and installed on both actual devices.** Do not claim final native P0 resolved based only on JS CI.

**Next:** wait for PR #46 code CI, then safely build a preview APK from that PR branch (preferred: fresh worktree or separate clone, preserve user's existing local `C:\vardiyum\app.json` created by `eas init`). On Windows: `powershell -File scripts/verify-android-apk-native.ps1 -ApkPath <finished APK>`; require `armeabi-v7a SQLITE=True` and `arm64-v8a SQLITE=True`, then physically retest SQLite startup/persistence A02s and A23. Keep PR OPEN / D01 FAIL until real evidence; user approves merge separately. iOS physical remains NOT_TESTED. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43), [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38), [PR #46](https://github.com/hilmiguner/vardiyum/pull/46).

## 2026-11-20 20:29 — Android native EAS second build artifact verified, REAL DEVICE RETEST PENDING

- Source PR [#46](https://github.com/hilmiguner/vardiyum/pull/46) HEAD `dc6a4e19300d361939794f98f5c17bce0d68fc9c` (OPEN, not merged), CI [#44776687512](https://github.com/hilmiguner/vardiyum/actions/runs/44776687512) 351/351 tests PASS.
- User completed **new APK native build** `db787de4-e2d5-46f6-91e3-7c5c554e63d8` [Expo build](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/db787de4-e2d5-46f6-91e3-7c5c554e63d8), [artifact APK](https://expo.dev/artifacts/eas/So6mToPJbRvAk__pXPEo-qz0Wa3euivrL0ExLJelU-U.apk); finished 2026-11-20 20:29:34; SDK 57, version 0.1.0, code 1.
- User downloaded into `C:\vardiyum-native-qa\vardiyum-test.apk`, ran checked-in `scripts/verify-android-apk-native.ps1` and got **`armeabi-v7a REACT_NATIVE=True SQLITE=True`**, **`arm64-v8a REACT_NATIVE=True SQLITE=True`**, **`NATIVE_SQLITE_ABI=PASS`**. SHA-256 `1B88EE921F4AB584D17890F4B592B11C73667AAD9078DEEB942B3FD6D0D9702C`.
- Strong evidence that previously **missing ARM32 `libexpo-sqlite.so`** in old physical A02s APK is now packaged. **DO NOT claim physical SQLite bug fixed or D01 pass until new APK installed and exercised on A02s (Android12 zygote32) and A23 (Android14)**. Install with `adb install -r C:\vardiyum-native-qa\vardiyum-test.apk`, same signing key, do not uninstall/clear app data if signature mismatch; test opens all tabs, schedule saves and survives force stop/reopen, existing A23 data persists; safe area and UX fixes. Keep Issue [#43](https://github.com/hilmiguner/vardiyum/issues/43) and [#38](https://github.com/hilmiguner/vardiyum/issues/38) open pending physical acceptance, #45 custom OT planned separately.


## 2026-11-20 — İlk ARM32 gerçek cihaz SQLite PASS, A23 bekliyor

- **Gerçek cihaz:** Samsung Galaxy A02s `SM-A025F/DS`, Android 12, `zygote32` / `armeabi-v7a`; EAS preview build [`db787de4-e2d5-46f6-91e3-7c5c554e63d8`](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/db787de4-e2d5-46f6-91e3-7c5c554e63d8), kaynak commit `dc6a4e19300d361939794f98f5c17bce0d68fc9c`, APK SHA256 `1B88EE921F4AB584D17890F4B592B11C73667AAD9078DEEB942B3FD6D0D9702C`.
- **Kullanıcının doğrudan test sonucu:** (1) `Yerel veriler açılmadı` / `NativeDatabaseBinding` hatası tekrar etmiyor, (2) Bugün, Takvim, Rutinler, Kazanç açılıyor, (3) Ayarlar'da döngü kaydı yapıldı ve uygulama tamamen kapatılıp yeniden açıldığında **kalıcı**. **A02s SQLite P0 teşhis edilen cihazda düzeldi (PASS)**.
- ARM32 + ARM64 native SQLite kütüphaneleri aynı yeni APK'da `NATIVE_SQLITE_ABI=PASS`. Önceki APK'da ARM32 SQLite .so eksikti; Expo SQLite kaynak derleme ayarı bu eksikliği gidermiş görünüyor ve fiziksel cihazda doğrulandı.
- **Sıradaki cihaz:** Samsung Galaxy A23 `SM-A235F/DSN`, Android 14. **Yeni APK'nın** üzerine kurulumunun, eski kayıtların kalıcılığının, bottom-safe-area, vardiya/izin ekle-sil, şehir bazlı zone picker, ücret profili formu göster/gizle ve kaldırılmış örnek döngünün gerçek cihaz testi **BEKLİYOR**. `adb install -r C:\vardiyum-native-qa\vardiyum-test.apk`; önceki uygulamayı uninstall/clear etme, imza uyuşmazlığında dur.
- **MVP gate:** D01 Android `PARTIAL` (A02s ilk açılış ve SQLite kalıcılık PASS; A23 yeniden test bekliyor), Android kalan D02–D10 ve iOS D01–D10 NOT_TESTED. [PR #46](https://github.com/hilmiguner/vardiyum/pull/46) **OPEN**; explicit user merge onayı yok. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43) kök neden + cihaz kapsamı, [#38](https://github.com/hilmiguner/vardiyum/issues/38) takip. Beta/store henüz yok.

## 2026-11-20 22:08 — Galaxy A23 gerçek cihaz UX retest + ikinci patch (build gerekiyor)

- **Cihaz:** Samsung Galaxy A23 `SM-A235F/DSN`, Android 14, yeni EAS internal Android APK `db787de4-e2d5-46f6-91e3-7c5c554e63d8` (source `dc6a4e19300d361939794f98f5c17bce0d68fc9c`). **Kullanıcı sonucu:** Eski veriler geri geldi (**PASS**); yeni özel vardiya ve izin türleri siliniyor (**PASS**); saat dilimi seçimi (**PASS**); ücret profili formunu göster/gizle (**PASS**). **SAFE AREA PARTIAL/FAIL:** alt sekmelerin zemin/dokunma alanı hâlâ sistem geri/ana ekran bölgesinde. **DEFAULT DELETE FAIL:** Sabah, Akşam, Gece, İzin türlerinin silme seçeneği yoktu.
- **A02s SM-A025F/DS Android12:** aynı yeni APK ile SQLite açılış PASS, 4 sekme PASS, döngü kaydet/kapat/aç kalıcılık PASS; ARM32 `libexpo-sqlite.so` source-build root cause giderildi, güvenli navigasyon/daha geniş D02–D10 native QA henüz tamamlanmadı.
- **PR #46 ilave kaynak düzeltmesi (yeni EAS APK'da henüz yok):** `src/app/(tabs)/_layout.tsx` Android'de `SafeAreaView edges={['bottom']}` ile Tabs navigator'ı fiziksel bottom safe area **dışına** alıyor; `tabBarStyle` kendi içinde ikinci kez Android inset eklemiyor. Galaxy A23 **3-button + gesture navigation** üzerinde gerçek yeniden test gerekir; kaynak CI PASS native retest kanıtı değildir.
- **Varsayılan türleri kaldırma:** `src/app/settings.tsx` silme kontrolünü tüm `Sabah/Akşam/Gece/İzin` dahil görünür kılar; `src/domain/shift-template-deletion.ts` ve `src/data/shift-repository.ts` artık `custom_` ön eki zorunluluğu uygulamaz. Onay + Kaydet, atomik SQLite işlem: eski cycle konumu yeni türlere dönüştürülmeden silinemez; day override ve rutin (arşivlenmiş dahil) referansı varsa silinemez; son kalan tür korunur; actual UTC çalışması/audit bozulmaz. TR/EN kullanım mesajları güncellendi. [#44](https://github.com/hilmiguner/vardiyum/issues/44).
- **CI:** Bu kod değişikliği [Actions #44800321106](https://github.com/hilmiguner/vardiyum/actions/runs/44800321106) **SUCCESS 351/351**, formatting, lint, types, Android/iOS JS bundles başarılı. Fiziksel yeni APK **henüz oluşturulmadı**. [PR #46](https://github.com/hilmiguner/vardiyum/pull/46) **OPEN** / main değişmemiş; kullanıcıdan ayrı merge onayı bekle.
- **Yerel QA klasörü:** Kullanıcı `C:\vardiyum-native-qa` silinsin mi diye sordu. **Şimdilik tutmak yararlı:** açık PR branch'inden bir sonraki APK'yi aynı ayrı klonda derleyebilir, eski APK ve kontrol betiği orada. Son başarılı cihaz retest / merge sonrası `git status --short` ve tekil dosya kontrolüyle opsiyonel silinebilir; ana `C:\vardiyum` çalışma alanı etkilenmez. Gizli anahtarları/keystore'ları silme/taşıma yok.
- **Gates:** Android D01 `PARTIAL` (SQLite PASS iki cihaz; A23 safe-area hâlâ FAIL), D02–D10 Android kısmen ilerledi ama tam kabul değil, iOS D01–D10 NOT_TESTED. Henüz beta/store yok. Mesai tipleri (#45) ayrı ürün işi.

## 2026-11-21 — Galaxy A23 ikinci APK: fiziksel cihaz testi ve kalan tab hizalaması

- **Samsung Galaxy A23 / Android 14, kullanıcı tarafından test edildi:** Yeni EAS preview APK yüklendi. (1) Sekmelere tıklanabiliyor; sistem tuşlarının altındaki önceki erişim çakışması görselde yok. (2) Varsayılan Sabah/Akşam/Gece/İzin şablonlarının Sil seçenekleri görünüyor. (3) Kullanılmayan şablon Sil + Kaydet sonrasında uygulamayı kapat/aç ile silinmiş kalıyor. (4) Önceki kayıtlar korunuyor. Bunlar **A23 fiziksel veri koruma + varsayılan şablon silme PASS** kanıtıdır.
- **Kalan görsel UX:** Kullanıcının ekran görüntüsünde Bugün sekmesinin gri aktif arka planı çok büyük ve Unicode ikon/etiketlerin dikey çizgisi görsel olarak tutarsız; sekmeler yatayda yaklaşık eşit dağıtılıyor. PR #46 üzerinde yeni bir **kaynak kozmetik adayı**: aktif/inaktif arka plan aynı kart rengi, sabit below-icon etiket, 28x28 icon center ve Android includeFontPadding=false. Ayrı statik regresyon testi eklendi. Bu yeni patch için native APK ve cihaz doğrulaması **YAPILMADI**.
- **Kanıt sınırı:** Bu turda kullanıcı yeni Expo build ID/SHA bildirmedi. Önceki yönergenin beklenen kod SHA'sı 438b2af4 idi, gerçek APK source SHA henüz bağımsız doğrulanmadı. Yalnız ekran görüntüsü ve kullanıcı fiziksel gözlemi kanıtlandı; Galaxy A02s önceki SQLite PASS sonucu geçerli ama bu son buildte tekrar edilmedi. Android D01 **PARTIAL**, Android D02-D10/iOS tam QA açık, beta/store hazır değil. PR #46 OPEN/unmerged; kullanıcıdan ayrı merge onayı gereklidir. Issue #43/#44/#38 açık takip.

### 2026-11-21 — Gece yarısı Bugün ekranı tarih yenilemesi (kaynak düzeltmesi, native test bekliyor)

- A23 ekran görüntüsünde telefon saati **00:23**, Bugünkü vardiya etiketi **2026-11-20**, program IANA zone **Europe/Istanbul**. Ekran görüntüsü bu yerel gece yarısından sonra alındıysa bugün 2026-11-21 olmalı. Kodda TodayScreen takvim tarihini render anında hesaplıyor; ekran gece yarısı boyunca açık kalırsa odak/clock değişikliği olmadan tarih yenilenmeyebilir. Cihazda ekranın ne zaman açıldığı bildirilmediği için bu **muhtemel kaynak kök neden** olarak ele alındı, kesin native regresyon kanıtı değil.
- PR #46 kaynak düzeltmesi: Bugün ekranı odaktayken 15 saniyelik düşük sıklıklı kontrol, tab odağına dönüşte ve AppState `active` anında `calendarDateInZone(schedule.timeZone)` değerini yeni instant ile yeniler. Gece yarısı/foreground tüm geçişlerinde mevcut IANA zone'u esas alır. SQLite/mali kaynak mutasyonu yok. `tests/shift-engine.test.mjs` İstanbul UTC 20 Kasım 21:00 = yerel 21 Kasım 00:00 geçiş sınırını doğrular. Native cihazda **henüz test edilmedi**; A23 ve A02s üzerinde gece yarısı/resume gereklidir.
- Önceki fiziksel PASS sonuçları etkilenmez; yeni tab hizalama + yeni gün yenileme patch'leri için APK retest ve en güncel CI gerekir. PR OPEN/unmerged, beta/store açık.
