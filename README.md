# Vardiyum

**Vardiyanı bil. Gününü planla. Kazancını takip et.**

Vardiyum, tüm sektörlerdeki vardiyalı çalışanlar için tasarlanan iOS/Android kişisel vardiya asistanıdır. Hedefi kullanıcıya vardiyasını, o güne düşen rutinlerini ve dönemlik **tahmini** kazancını tek yerden göstermektir. Ürün planı için [docs/PRODUCT.md](docs/PRODUCT.md), teknik sınırlar için [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> **Durum (2026-11-15):** Offline vardiya/rutin/gerçek UTC çalışma, açıklanabilir tahmini kazanç ve şifreli yedek (PR #3/#5/#7/#9/#11/#13/#15/#17/#18/#19) ile **temiz kurulumda atomik geri yükleme PR #21** main'de. PR #21 merge `de110794d9f71c8bfa81e978b0141ead74fb3e35`, [main CI #43725429338](https://github.com/hilmiguner/vardiyum/actions/runs/43725429338) **SUCCESS** (**127 Node testi**, Android/iOS JS export). **Gerçek cihaz kabulü YAPILMADI**: [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) açık; [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) ertelendi. Dolu DB merge/overwrite veya resmî bordro/net/vergi hesabı yok.

## Geliştirme kurulumu

**Gereksinimler:** Node.js 22.13+ (önerilen 22 LTS), npm, Android Emulator veya fiziksel telefon; iOS yerel derlemesi için macOS/Xcode ya da uygun Expo EAS hesabı.

```bash
git clone https://github.com/hilmiguner/vardiyum.git
cd vardiyum
npm ci
npx expo install --check
npm start
```

Android veya iOS için Expo CLI ekranındaki yönlendirmeler kullanılabilir. Geliştirici bilgisayarında Expo Go veya development build seçimi cihaz ve SDK uyumuna göre kontrol edilmelidir. İlk kod sürümü **Expo SDK 57** (React Native 0.86 / React 19.2) ile planlandı. SDK 58'e geçiş ayrı test/PR gerektirir.

```bash
npm run lint
npm run typecheck
npm test
npm run format
```

> **Bağımlılık kilidi:** `package-lock.json` GitHub Actions kullanılarak üretildi ve geliştirme dalına eklendi. CI artık `npm ci` ile tam bu kilit dosyasını kullanır. Android ve iOS JavaScript paketleme kontrolleri [Actions #43697865419](https://github.com/hilmiguner/vardiyum/actions/runs/43697865419) ile başarılı; native cihaz doğrulaması açık.

## Şu anda uygulamada neler var?

- Expo Router: Bugün / Takvim / Rutinler / Kazanç sekmeleri ve Ayarlar
- Sistem dilinden TR/EN seçimi ve açık/koyu tema renkleri
- SQLite açılış migrasyonu ve yerel vardiya döngüsü kalıcılığı
- Ayarlardan döngü günü ekleme/çıkarma, özel vardiya türü/saat/mola tanımlama ve 8 günlük örnek düzen
- Bugünkü vardiya ve aylık takvim; bir güne özel değişiklik yapma ve normal döngüye döndürme
- IANA saat dilimine göre **planlanan saat aralığı / gerçek geçen süre** karşılaştırması; DST boşlukları ve tekrar eden saatler için açık uyarı (PR #7)
- Saf, çevrimdışı test edilebilir takvim günü hesaplama motoru

**Kısıt:** Faz 2'de özel şablon, aylık takvim ve günlük istisna kodu PR #5; saat dilimi geçişi çözümleyicisi PR #7 ile eklenmiştir. Şablon silme/gerçekleşmiş çalışma kaydı, DST'de gerçek geçen süre ve native cihaz kabulü açık. Rutin ve kazanç ekranları henüz işlevsel değildir.

## Temel prensipler

- **Offline-first:** İlk sürümde zorunlu hesap veya sunucu bulunmaz.
- **Doğru takvim:** Döngü güne bağlıdır; DST değişiminde geçen milisaniyeye bağlı olarak ilerlemez.
- **Açıklanabilir kazanç:** Gelecekteki kazanç hesapları yasal bordro yerine geçmez.
- **Proje hafızası:** Kodun durumu ve planlanan işler GitHub belgeleri/PR'larla doğrulanır; sohbet geçmişi tek kaynak değildir.

## Belge dizini

- [Ürün ve MVP](docs/PRODUCT.md)
- [Mimari ve veri modeli](docs/ARCHITECTURE.md)
- [Yol haritası](docs/ROADMAP.md)
- [Kararlar](docs/DECISIONS.md)
- [Test planı](docs/TEST-PLAN.md)
- [Durum](docs/STATUS.md)
- [Yeni sohbet devir notu](docs/HANDOFF.md)
- [Gerçek cihaz test listesi](docs/DEVICE-SMOKE.md)

## Lisans ve marka

Lisans henüz seçilmedi. **Vardiyum** çalışma adıdır; marka, alan adı ve mağaza adı uygunluğu teyit edilmemiştir.

## Gerçek çalışma ve saat dilimi — Faz 2 / PR #9

- Aylık takvimde belirsiz saatler için **o tarihe özgü** `earlier/later` seçimleri saklanabilir. Vardiya saatleri veya program saat dilimi değişince eski seçim otomatik uygulanmaz.
- Takvimden **kendi giriş/çıkış saatlerin ve fiilî mola süren** girilebilir. Kaydedilen iki UTC anı, girişteki saat dilimi ve yerel saatler birlikte saklanır. Çakışan çalışma aralıkları reddedilir; kayıtlar silinebilir.
- Ayarlardan kayıtlı IANA saat dilimi, eski ve yeni UTC başlangıç örneği karşılaştırılarak **açık onayla** değiştirilebilir. Takvim döngüsünün yerel tarih/saatleri değişmez; geçmiş gerçek kayıtlar korunur.
- Tüm gerçek çalışmalar **kullanıcı beyanıdır**: işveren doğrulaması, otomatik maaş hesaplaması veya resmi bordro yerine geçmez.
- Yerel SQLite v3 migrasyonu v1/v2 vardiya ve eski `work_entries` satırlarını silmez; yeni kayıtlar ayrı `actual_work_sessions` tablosundadır.
- **Cihaz testleri:** yalnızca CI ve JS paketleme kanıtlandı; [docs/DEVICE-SMOKE.md](docs/DEVICE-SMOKE.md) gerçek cihaz testi ileride yapılacak.

## Faz 3 — Offline rutinler (PR #11)

- Rutinler ekranında rutin oluşturma, düzenleme, devre dışı bırakma, arşivleme ve arşivden geri alma.
- Vardiya türü, ISO haftanın günü, herhangi uzunlukta döngü günü ve izin günü filtreleri; aynı filtre grubunda **VEYA**, gruplar arasında **VE**. Boş filtre = tüm günler.
- Bugün ve Rutinler ekranlarında seçili günün görevleri, tamamlandı/geri al işaretleri ve geçmiş hareketler.
- Günlük vardiya istisnaları dikkate alınır; gece vardiyası görevi, vardiyanın **başladığı** takvim gününe bağlanır.
- SQLite v4 eski `routine_rules` ve `task_completions` verilerini korur, eski tamamlanmaları `routine_completion_events` geçmişine taşır. Bir rutini arşivlemek geçmişini **silmez**.
- Yerel bildirimler ve native cihaz testleri **henüz yapılmadı**; Faz 3'ün ayrı işleri.

## Faz 3 — Yerel rutin hatırlatmaları / PR #13

- Rutin başına isteğe bağlı `HH:mm` saat, programın **kaydedilmiş IANA saat dilimi** ve rutin revizyonu ile bağlı.
- Kullanıcı **Bildirimleri etkinleştir** düğmesine basmadan izin istenmez. İzin verilmez veya geri alınırsa görev listeleri etkilenmez.
- Yaklaşan **14 sivil gün** için bir defalık saatli bildirimler planlanır; toplam en fazla **48**, günde en fazla **6**. Tamamlanan görevler, kapatılan/arşivlenen rutinler, vardiya istisnaları ve yeni saat dilimi plana yansır.
- DST geçişinde **iki farklı UTC ana karşılık gelen veya var olmayan saatler atlanır**; otomatik tahmin yapılmaz. Planlayıcı yalnızca Vardiyum'a ait bildirimleri iptal/yeniler.
- Android'de **kesin alarm izni istenmez**; zamanlama best-effort'tur. İzin, teslim süresi ve yeniden başlatma sonrası teslim **gerçek cihazda doğrulanmadı**.
- SQLite v5 önceki tüm rutin, çalışma ve vardiya verilerini koruyan eklemeli migrasyondur. Bildirim izni kullanıcı eylemi olmadan varsayılan kapalıdır.

## Faz 4 — Tahmini kazanç / PR #15

- **Saatlik veya sabit aylık** kullanıcı ücret profili, her profil için ilk gününden başlayan ayrı geçerlilik ayı; önceki profili sessizce güncellemek yerine yeni geçerlilik tarihiyle yeni kayıt açılır.
- Dönemdeki **kullanıcı beyanı** gerçek UTC giriş/çıkış ve mola kayıtlarından hesaplama. Planlanan vardiya otomatik "çalışıldı" sayılmaz.
- Fazla mesai eşiği (dakika) ve oranı kullanıcı tarafından **pay/payda** şeklinde açık tanımlanır; otomatik yasal katsayı atanmaz. Eşik yoksa saatlik tüm çalışmalar normal sayılır; sabit aylık tutar kendiliğinden azaltılmaz.
- Para aritmetiğinde **kuruş/cent tam sayısı** ve **BigInt kesirli çarpma / yuvarlama** kullanılır. İlk sürümde yalnızca **TRY, USD, EUR, GBP** (iki ondalık basamak); döviz çevrimi veya vergi/SGK hesaplama yok.
- Manuel **prim, kesinti ve düzeltme** kayıtları kaynak id, zaman ve açıklamayla korunur; hata varsa yeni ters işaretli düzeltme girilir.
- **Açıklanabilir rapor:** hangi ücret profili/sürümü, hangi çalışma kaydı, hangi tutar ve tahmin kalemi. Bir aya sarkan gece vardiyası veya çakışan/bozuk kayıt varsa **hesap bloklanır**: sessizce ayırma ya da uydurma yok.
- **SQLite v6:** eski vardiya/rutin/gerçek çalışma ve eski finansal taslak tabloları korunur. Önceki `compensation_profiles`/`pay_adjustments` otomatik onaylı bordro veya yeni kazanç kabul edilmez.
- **Güncel kapsam:** Aylar arası çalışma bölünmesi ve CSV/JSON **kullanıcı onaylı metin paylaşımı** PR #17 ile eklendi (alttaki açıklama). Eksik kalan: geçmiş ücret profili düzeltme/revizyonları, kontrollü içe alma, şifreli yedek, PDF dosyası, işveren doğrulaması, ülke/vergi kuralları ve cihaz testleri.

## Faz 4 devam — Ay sınırı ve güvenli paylaşım / PR #17

- Kullanıcının kaydettiği gerçek UTC giriş/çıkış, **o oturumun kendi IANA saat diliminde** ilgili takvim aylarının 00:00 sınırlarında ayrılır. Yaz/kış saati, 30/45 dakikalık UTC ofsetleri ve gece vardiyası gerçek geçen saniyeye göre işlenir. Aynı çalışma iki ayda **çifte sayılmaz**.
- **Mola yoksa** bölme otomatik. Mola iki ayı kapsıyorsa zamanı bilinmediğinden otomatik paylaştırılmaz; kullanıcı **başlangıç ayına düşen mola dakikasını** girer. Kalanını sonraki ay kullanırız. Her iki UTC diliminin süresini aşan beyan reddedilir. Aynı dağılım kararı her iki aya uygulanır.
- **SQLite v7** eski v1–v6 verisini değiştirmeden dağılım kararını ve sonraki düzeltmelerin **append-only olay/revizyon izini** tutar. Kazanç kaleminde orijinal `workId`, kesilen UTC alt dilim ve geçerli ücret profili izlenebilir.
- Fazla mesai eşiği her ay baştan hesaplanır; Kasım ve Aralık farklı kullanıcı ücret profili kullanabilir. Saatlik para hesabı tam sayı kuruş ve BigInt ile sürer.
- Hesap geçerliyse kullanıcı açık onay vererek **CSV/JSON metnini** iOS/Android paylaşım ekranına aktarabilir. Başka bir uygulamayı seçmek kullanıcıya aittir. **Otomatik ağ gönderimi, şifreli yedekleme, dosyaya yazma veya otomatik içe aktarma yoktur**. CSV'de formül gibi başlayabilecek hücreler korumalıdır.
- **Güncel:** Aynı ay için düzeltme ve sürüm geçmişi PR #18 ile eklendi; kontrollü güvenli içe alma ve şifreli yedek [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16)'da henüz yapılmadı. Cihaz testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

## Faz 4 devam — Düzeltilebilir fakat silinmeyen ücret profili / PR #18

- Yeni ücret profili **ilk kayıt (v1)** `earnings_profiles` tablosunda kalır. Kullanıcı aynı efektif ayın ücretinde hata fark ederse mevcut kaydı değiştirmez; bir **düzeltme gerekçesi (3–160 karakter)** ile yeni `v2,v3,...` tam kopya yazar.
- **SQLite v8** `earnings_profile_revisions` tablosunu ekler. Eski profil ve önceki düzeltmeler **değiştirilmez/silinmez** (SQLite UPDATE/DELETE engelleyen trigger'lar). Aynı profil kimliği ve efektif ay korunur; başka ayda yeni profil açma işlemi ayrı kalır.
- Bir aylık tahmin en yeni geçerli ücret profil sürümünü kullanır. Kazanç ekranında **sürüm geçmişi ve eski bir sürümün ücretiyle yeniden hesaplama** bulunur; CSV/JSON çıktısı kullanılan profil kimliği ve sürümünü belirtir.
- **Önemli:** Eski sürüme dönerek yapılan hesap, ***bugünkü*** gerçek çalışma ve prim/kesinti kayıtlarını kullanır. Geçmişte ekranda görülmüş tahminin birebir dondurulmuş kaydı, işveren bordrosu veya net ödeme garantisi değildir.
- Çok eski uygulama kayıtları SQLite v1–v7 korunur; native cihaz kabulü [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi. Kontrollü içe alma/şifreli yedek [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16)'da açık.

## Güvenli veri taşınabilirliği — PR #19 (yalnızca şifreli yedek ve önizleme)

- **Ayarlar > Şifreli yedek:** Uygulama SQLite **v8** veritabanındaki **18 tanımlı tabloyu** sabit bir SQLite okuma işlemi içinde JSON snapshot'a alır. Şablonlar, vardiyalar, gerçek UTC çalışma, rutin geçmişi, tahmini kazanç ve tüm profil/mola revizyonlarının kayıtları kapsamdadır. 4 milyon karakterlik açık veri sınırı vardır; aşılırsa **kesilmeden hata verir**.
- Her yedek için rastgele **256-bit AES-GCM anahtarı** üretilir. Şifrelenmiş `.vdb` dosyasının içinde **anahtar yoktur**; anahtarı **ayrı yerde** güvenli saklaman gerekir. Anahtar kaybolursa Vardiyum yedeği açamaz. Anahtar yalnızca ekranda gösterilir; otomatik ağ aktarımı veya parola/kurtarma servisi yoktur.
- Kullanıcı anahtarı ayrı kaydettiğini onaylamadan cihazın paylaşım ekranına geçemez. Paylaşılan dosya **yalnızca şifreli veri** içerir; kullanıcı hangi uygulamaya göndereceğini seçer. Kaynak SQLite dosyası/WAL veya düz metin snapshot paylaşıma yazılmaz.
- **Yedek seç ve doğrula:** AES-GCM/SHA-256 ve SQLite v8 tablo/kolon/satır denetimi, kayıtlara dokunmadan **salt-okunur önizleme** üretir. **PR #21** ile ancak bu önizlemeden sonra, kullanıcının RESTORE yazıp ikinci kez onaylaması üzerine ayrı bir **temiz kurulum geri yükleme** işlemi başlatılabilir. Dolu/özelleştirilmiş cihazlar reddedilir; gerçek cihaz testi ertelendi.
- Güncel: Temiz kuruluma atomik geri yükleme kodu PR #21 ile eklendi, fakat **gerçek Android/iOS cihaz kabulü ve düşük disk/crash testleri henüz YAPILMADI**. Dolu veritabanına birleştirme/üzerine yazma kapsam dışı. [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) / [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık.

## Temiz kurulumda deneysel geri yükleme — PR #21

- Şifreli `.vdb` dosyası önce **ayrı anahtarla AES-256-GCM/SHA-256 ve 18 tablo SQLite v8 şema doğrulamasından geçer**. Önizleme tek başına geri yükleme başlatmaz.
- Kullanıcı yalnızca **RESTORE** yazarak ve ikinci sistem uyarısını onaylayarak işlemi başlatabilir. Geri yükleme ancak **dört varsayılan şablondan başka kayıt barındırmayan tamamen temiz veritabanında** çalışır. Varsayılan bir şablonun bile adı değiştirilmişse veya tek bir kullanıcı/ayar kaydı varsa **tüm işlem reddedilir**.
- SQLite'ın **tek exclusive transaction** işlemi içinde 18 tablonun kayıtları yerleştirilir; öncesinde tam temiz hedef kontrolü, sonrasında tam satır karşılaştırması, `PRAGMA foreign_key_check` ve `integrity_check` yapılır. Hata alınırsa transaction geri alınır, eski dört şablon korunur. Expo'nun exclusive bağlantısında `foreign_keys=ON` ayarı taşınmayabileceğinden **commit öncesi FK denetimi şarttır**.
- Kaynağın `routine_reminders_opted_in=1` olması bildirimleri otomatik açmaz: bu değer **0** olarak aktarılır. Kullanıcı cihazda tekrar bilerek izin vermelidir. İç `backup_restore_consumed` işareti aynı temiz cihaza ikinci kez geri yükleme yapmayı önler.
- **Sınır:** Yerel Node SQLite testleri **127/127 başarılı**, ancak native Android/iOS şifreli dosya/import/SQLite transaction, cihazı kapat-aç, düşük disk alanı ve proses çökmesi **test edilmedi**. Bu nedenle gerçek verilerin için ilk kurtarma yöntemi olarak güvenme. Dolu/verili cihaz üstüne merge/replace, çoklu sürüm migration ve hesap/senkronizasyon yoktur. Yedeğini ve kurtarma anahtarını ayrı yerde koru.
