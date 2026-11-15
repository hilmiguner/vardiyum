# Vardiyum — Faz 1 Gerçek Cihaz Kontrol Listesi

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
