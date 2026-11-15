# Vardiyum — Mimari ve Ürün Karar Kaydı

Kararlar 2026-11-15 itibarıyla konuşulan hedefleri belgeler. Geliştirme sırasında değişen kararlar tarih ve gerekçeyle eklenecek; eski girdiler iz bırakacak.

| ID | Durum | Karar | Gerekçe |
| --- | --- | --- | --- |
| D-001 | Onaylı | Başlangıçtan itibaren tüm vardiyalı çalışanlar hedeflenecek | Fabrika/sağlık/güvenlik dahil sektör bağımsız büyüme |
| D-002 | Onaylı | Ürün bir kişisel vardiya asistanı: takvim + rutin + kazanç | Sadece takvim sunan rakiplerden ayrışma |
| D-003 | Onaylı | iOS ve Android aynı ürünün hedef platformları | Geniş erişim |
| D-004 | Planlanan teknik yön | React Native + Expo + TypeScript | Tek kod tabanı, hızlı doğrulama |
| D-005 | Planlanan teknik yön | Offline-first, ilk sürümde zorunlu hesap veya bağımsız backend yok | Gizlilik, düşük işletim maliyeti, internetsiz kullanım |
| D-006 | Planlanan teknik yön | Saf vardiya/rutin/kazanç motorları, SQLite kalıcılık | Test edilebilirlik, gelecekte senkronizasyona hazırlık |
| D-007 | MVP kapsamı | Döngü + tek gün istisna mekanizması | Sektörlerden bağımsız esneklik |
| D-008 | MVP kapsamı | Vardiya ve günlere bağlanan görevler | Ana ürün farklılaştırıcısı |
| D-009 | MVP kapsamı | Kazançlar ilk sürümde açıkça **tahmini**; ülkeye özgü otomatik bordro iddiası yok | Yanıltıcı ücret hesaplamasından kaçınma |
| D-010 | Planlanan kapsam | TR/EN, dört ana sekme, basit onboarding | Global başlangıç ve odaklı UX |
| D-011 | Ertelenen | Supabase hesabı/senkronizasyonu, widget, sosyal ve gelişmiş analizler P1+ | MVP'yi küçültme |
| D-012 | Önerilen | Temel takvim ücretsiz; Premium sonradan, fiyat belirlenmedi | Edinim ve geri bildirime öncelik |
| D-013 | Çalışma adı | Vardiyum | Henüz marka/mağaza/domaine ilişkin kullanılabilirlik onayı yok |
| D-014 | Operasyonel | GitHub belgeleri proje hafızasının kaynağı; doğrulanmamış iş 'tamamlandı' yazılmaz | Sohbetler arasında güvenilir devam |

## Açık kararlar

- [ ] İsim/marka/alan adı ve mağaza adının uygunluk taraması
- [ ] Lisans (açık kaynak veya kapalı), CONTRIBUTING ve sürüm politikası
- [ ] Expo ve paket sürümleri (kurulum tarihinde uyumluluk)
- [ ] Zaman dilimi değiştiren kullanıcıda vardiya ankorunun davranışı
- [ ] Rutin filtrelerinin AND/OR birleştirme semantiği
- [ ] Yedek formatı, şifreleme ve geri yükleme çakışma kuralı
- [ ] Kazanç dönemi / kesintiler / vergi varsayımları ve kullanılacak para birimi biçimlendirmesi
- [ ] İlk sürümde elle planlanan (döngüsüz) takvim düzenleme akışı
- [ ] Gizlilik metni ve mağaza yayınına ilişkin güncel kurallar

## Değişiklik süreci

Önemli karar değişikliğinde yeni tarihli kayıt ve PR bağlantısı eklenir. Önceki karar sessizce silinmez. Dosyalar ve GitHub PR geçmişi birlikte izlenir.

## 2026-11-15 — Uygulama tercihleri

- **D-015 (uygulandı):** İlk prototipte Expo SDK 57, React Native 0.86 ve React 19.2 kullanıldı. SDK 58 güncel kararlı sürüm; SDK 57 Expo Go ile erken test kolaylığı için seçildi. Yükseltme ayrı test/PR ile ele alınacak.
- **D-016 (uygulandı):** Npm lock dosyası depoya eklendi, CI `npm ci` kullanır. İki platformun JS bundle sonucu gerçek native build veya cihaz testi değildir.

## 2026-11-15 — Faz 2 uygulama kararları

- **D-017 (uygulandı, PR #5):** Takvim günleri, ilk kurulumda kaydedilen IANA saat dilimine göre seçilir; gün/ay aritmetiğinde **sivil takvim günü** kullanılır. Seyahatte saat dilimini değiştirmeye yönelik ayar henüz yapılmadı.
- **D-018 (uygulandı, PR #5):** Vardiya şablonunda `startsAt`, `endsAt` ve `endDayOffset` tutulur; planlı duvar saati süresi, **gerçek UTC geçen süre** değildir. DST üzerinden gerçek çalışma süresi ve maaş hesapları sonraki ayrı karardır.
- **D-019 (uygulandı, PR #5):** `day_overrides` normal döngünün indeksini değiştirmez. `shift_templates` içindeki mevcut v1 satırları ve geçmiş döngü kayıtları v2 yükseltmesinde ezilmez.
- **D-020 (açık):** Şablon silme, günlük değişikliklerin zaman çizelgesi sürümleme ve tarihsel vardiya düzeni değişimlerine dair geçmiş koruma politikası henüz tamamlanmadı.

## 2026-11-15 — Issue #6 zaman aralığı kararları (PR #7)

- **D-021 (uygulandı):** Kullanıcının programı, ilk kaydedilen IANA saat dilimine bağlıdır. Cihaz/telefon saat dilimini değiştirmek geçmiş veya gelecek vardiyaların referans zaman dilimini sessizce değiştirmez. Program zaman dilimini bilinçli değiştiren UI ileride ayrı yapılır.
- **D-022 (uygulandı):** DST geçişinde mevcut olmayan yerel saatler `nonexistent` olarak **reddedilir**. Tekrarlanan yerel saatte varsayılan `reject` kullanılır; başlangıç ve bitişe ayrı, açık `earlier/later` seçimi mümkündür. Bu seçimlerin cihazda kalıcı kaydı/fiilî mesai ile bağlanması henüz yapılmadığı için belirsiz zamanlar ücret hesabına otomatik katılmaz.
- **D-023 (uygulandı):** `plannedWallMinutes` (yerel saat aralığı) ve `elapsedSeconds` (anlar arasındaki geçen saniye) ayrıdır. Planlanan mola, gerçekleşmiş çalışma ve ödeme hesabı olarak sunulmaz; bu PR bordro motorunu etkinleştirmez.
- **D-024 (açık):** Farklı mobil işletim sistemleri ve tzdb/ICU sürümleri için gerçek cihaz zaman dilimi kabul testi, fold seçimlerinin kalıcı saklanması ve gerçek bordroya bağlanması sonraki aşamada çözülür. Cihaz testleri kullanıcı tercihiyle ertelendi.

## 2026-11-15 — Issue #8 / PR #9 (planlanan ürün uygulaması)

- **D-025 (uygulandı):** DST katlanmasında `earlier/later` tercihi yalnızca **bir gün + vardiya kimliği/saatleri + kaydedilmiş IANA saat dilimi** imzasıyla geçerli olur. Şablonun saati/kimliği veya saat dilimi değiştiğinde önceki seçim uygulanmaz; yanlış süreyi sessiz aktarmayı önler.
- **D-026 (uygulandı):** Planlanan vardiya ile **kullanıcı tarafından girilen fiilî çalışma aralığı** ayrı SQLite tablolarında tutulur. Gerçek giriş/çıkış UTC olarak saklanır, mola beyanı ayrıca tutulur; tekrar eden veya kesişen gerçek kayıt reddedilir. Veri kaynağı `user_entered`; işveren doğrulaması yoktur.
- **D-027 (uygulandı):** Saat dilimi değişikliği, kullanıcının serbest metin IANA kimliği ve UTC önizlemesinden sonra onayıyla yapılır. Döngünün yerel tarih ve saatleri sabit kalır, geçmiş gerçek UTC kayıtları değişmez.
- **D-028 (uygulandı):** V2 `work_entries` satırları v3 ile silinmez veya otomatik “doğrulanmış” çalışma sayılmaz. Yeni gerçek kayıtlar `actual_work_sessions` tablosunda açık kullanıcı girdisidir; ücret motoruna otomatik bağlanmaz.
- **D-029 (açık):** Birden fazla iş/işverenin aynı saatte çalışılması, geçmiş vardiya şablonlarının zaman sürümü, işveren puantaj doğrulaması ve ülkeye özgü ücret hesaplama politikası ayrı tasarlanacak. Çakışan fiilî saatler bu MVP'de reddedilir.
- **D-030 (ertelendi):** iOS/Android gerçek cihazda SQLite v3 migrasyonu, arayüz ve tzdb testi kullanıcı tercihiyle ertelendi; Issue #2 açık.

## 2026-11-15 — Faz 3 / Issue #10 (PR #11)

- **D-031 (uygulandı):** Rutinin gün eşleşmesi, kayıtlı programın sivil tarihi, **override uygulanmış vardiya türü**, ISO hafta günü, döngü günü ve izin bayrağına bağlıdır. Gece vardiyası görevi bitiş değil **başlangıç gününe** aittir.
- **D-032 (uygulandı):** Her filtre grubunda OR, gruplar arasında AND; boş grup herhangi biri demektir. Rutin tekrar JSON v1 doğrulanır, belirsiz/bozuk veri sessizce göreve çevrilmez.
- **D-033 (uygulandı):** Rutin silme yerine soft archive. Tamamlandı/geri al olayları, o anki rutin başlığını ve filtre kopyasını bağımsız olay tablosuna ekler; checkbox geri alınsa bile geçmiş silinmez. Eski tamamlanmalar SQLite v4 yükseltmesinde korunur.
- **D-034 (uygulandı):** Rutin düzenleme ve etkinleştirme için `revision` kontrolü; arşivlenmiş/devre dışı/ilgili güne ait olmayan kural için checkbox hareketi reddedilir.
- **D-035 (açık):** Yerel bildirim izni, hatırlatıcı zamanlaması, izin reddi ve kural değiştiğinde yeniden planlama ayrı Faz 3 işidir. Native cihaz testleri kullanıcı tercihiyle ertelendi.

## 2026-11-15 — Issue #12 / PR #13 hatırlatma kararları

- **D-036 (uygulandı):** Hatırlatma saati rutin bazında **isteğe bağlı**. Uygulama ilk açılışta veya rutin kaydında otomatik **bildirim izni istemez**; yalnızca Rutinler ekranındaki etkinleştirme düğmesinde talep eder. Onay verilmezse checklist çalışır.
- **D-037 (uygulandı):** Hatırlatma planı kaydedilmiş program IANA zaman dilimine göre **bir defalık mutlak UTC anlarıyla** yapılır; cihazın saat dilimi sessizce karara girmez. DST fold/gap anları otomatik önce/sonra seçilmez, plan dışı bırakılır. Rutin revizyonu ve zone karara/anahtara bağlıdır.
- **D-038 (uygulandı):** OS kotası ve uygulama açılış yükünü sınırlamak için **14 günlük, toplam 48, gün başı 6** planlama. Bildirimler **best-effort**; Android exact alarm izni istemiyoruz. Uygulama arka planda hiç açılmadan 14 günden sonrası garanti değildir.
- **D-039 (uygulandı):** Yalnızca `vardiyum-routine-v1` sahibi pending bildirimler senkronize edilir; başka planlanmış sistem/modül bildirimleri topluca iptal edilmez. Vardiya döngüsü, tek gün istisna, rutin arşivleme, tamamlama/geri alma ve program zone değişikliği bildirim planını geçersiz kılar. İşlem UI/foreground sırasında tekrar hesaplanır.
- **D-040 (ertelendi):** Android/iOS bildirim izni, OS teslim davranışı, background/uygulama kapalı/yeniden başlatma ve ICU/tzdb gerçek cihaz testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) üzerinde açık; CI'da JS export geçmesi native teslim kanıtı değildir.

## 2026-11-15 — Issue #14 / PR #15 kazanç kararları

- **D-041 (uygulandı):** Para bütün hesap ve SQLite modelinde **integer minor units**, kesirli süre/çarpanlar için **BigInt rational**, satır bazında açık `half-away-from-zero` yuvarlamadır. İlk sürüm yalnızca iki ondalıklı TRY/USD/EUR/GBP destekler; FX dönüşümü yapmaz.
- **D-042 (uygulandı):** Ücret profili `YYYY-MM-01` tarihinden itibaren etkilidir, bir ayda tek yeni profil olur, mevcut profil sessiz düzenlenmez; kaynak kimliği ve revizyon rapor satırında görünür.
- **D-043 (uygulandı):** Saatlik model yalnızca **kullanıcının kaydettiği gerçek UTC çalışmayı** kullanır. Sabit aylık model **tam ay tutarı** üretir, eksik günü otomatik azaltmaz. Fazla mesai eşiği/çarpanı ve aylık modele özgü mesai saat ücreti tamamen kullanıcı girdisidir. Yasal katsayı/vergi/net maaş tahmini yapılmaz.
- **D-044 (uygulandı):** Ay değiştiren gece vardiyası, çakışan/bozuk çalışma, farklı para birimi ve kaynağı şüpheli tutarlar için toplam tahmin **bloklanır**. Sessiz aylar arası dağıtım ve bordro gibi kesin sonuç sunma yoktur.
- **D-045 (uygulandı):** Manuel prim/kesinti/düzeltmeler ayrı `user_entered` kaynaklı, tarihli, açıklamalı ve append-only tutulur; yanlış giriş düzeltme kalemiyle dengelenir. Önceki legacy finansal tablolar otomatik migre edilmez.
- **D-046 (açık):** Aylar arası vardiyanın oransal bölünmesi, sözleşmeye özgü mesai, fiilî izin, işveren doğrulaması, dönemden bağımsız farklı maaş kapanışı, CSV/PDF raporları, vergi ve ülke mevzuatı sonraki geliştirmeleridir. Cihaz testleri [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

## 2026-11-15 — Issue #16 / PR #17 (ilk güvenli dilim)

- **D-047 (uygulandı):** Dönemler arası gerçek çalışma, **kaydedilmiş UTC uçları** ve oturumdaki IANA saat diliminde ayın yerel başlangıç anına göre bölünür. Bitiş anı exclusive; tek orijinal çalışma kimliğinden ay başına ayrı UTC dilim çıkarılır, toplam saniyeler çift sayılmaz. DST gap/fold ay başlangıcı çözülemiyorsa tahmin bloke edilir.
- **D-048 (uygulandı):** Molalı vardiyada **mola dakikası aylar arasında otomatik dağıtılmaz**. Kullanıcı başlangıç ayına düşen dakikayı açık girer; kalanı ikinci aya gider ve ikisinin gerçek süresi aşılmamalıdır. Bu karar ve sonraki değişikliklerin sürüm izi SQLite v7'de saklanır; çalışma oturumu orijinal haliyle kalır.
- **D-049 (uygulandı):** Aylık kullanıcı fazla mesai eşiği/etkili ücret profili **her ay ayrı** uygulanır. Aynı çalışma kaynak kimliği iki raporda farklı UTC dilimleri ve farklı dönem profilleriyle gösterilebilir. Bordro veya işveren onayı üretilmez.
- **D-050 (uygulandı):** CSV/JSON **yalnızca kullanıcı onayıyla sistem paylaşım ekranına aktarılabilen metindir**. `blocked`/profilsiz rapor dışa verilmez; tehlikeli CSV başlangıçları hücrelerde kaçırılır. Kullanıcının seçtiği hedef finansal veriyi alabilir. Bu özellik **şifreli yedek, otomatik aktarım, disk dosyası veya güvenli içe alma değildir**.
- **D-051 (açık):** Geçmiş ücret profilini aynı ayda düzeltme/revizyonlama, resmî bordro kıyaslaması, şifreli yedek ve kontrollü içe alma ayrı kabul testleri ister; Issue #16 açık kalır. Native SQLite v7 ve paylaşım ekranı testi kullanıcı isteğiyle [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

## 2026-11-15 — Issue #16 / PR #18 ücret profili düzeltme kararları

- **D-052 (uygulandı):** Aynı efektif aya ait ücret profili hataları eski satırı UPDATE/DELETE ile değiştirmek yerine **append-only, tam kopya v2+** olarak kaydedilir. Aynı profil ID ve efektif ayı korumak zorunlu; düzeltme nedeni ve UTC kayıt zamanı bulunur.
- **D-053 (uygulandı):** Eski v1 ve bütün v2+ kayıtları SQL kısıtları/trigger'larıyla korunur. Yeni düzeltmede exclusive transaction, optimistic revision eşleştirmesi, eksik/sırasız versiyonlarda **fail-closed** kontrol. Yasal işveren onayıyla karıştırılmaz.
- **D-054 (uygulandı):** Varsayılan kazanç tahmini **en güncel sürümü** kullanır. Kullanıcı eski sürümü seçtiğinde **bugünkü** çalışma ve düzeltme kayıtlarıyla geçmiş ücret oranına göre yeniden hesap yapılır. Önceden gösterilen tahminler için dondurulmuş immutable finansal rapor snapshot'ı **tutulmaz**; eski sürüm raporu tam tarihsel bordro diye sunulmaz.
- **D-055 (açık):** Şifreli yedekleme, kontrollü içe alma ve doğrulanabilir sürüm/snapshot aktarım formatı [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16)'da halen açık. Native cihaz migrasyon ve rapor UI testi [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2)'de ertelendi.

## 2026-11-15 — Issue #16 / PR #19 güvenli yedek kararları

- **D-056 (uygulandı):** Kullanıcı açık eylemiyle tüm SQLite v8 kullanıcı/legacy tablo verilerini tek tutarlı salt-okunur snapshot'ta toplar. Şema sürümü **tam 8**, 18 tablo/kolon listesi **cihazın güvenilir şeması** ile doğrulanır. Bilinmeyen sürüm ve limit aşımı fail-closed; satır kesilmez.
- **D-057 (uygulandı):** Her backup dosyası için rastgele AES-256-GCM anahtarı oluşturulur, AAD ile bağlanır; anahtar **dosyaya eklenmez** ve ağ/cihaz tercihi/app_settings'e persist edilmez. Dosyanın paylaşımı kullanıcının açık tıklamasıyla ve **anahtarı ayrı sakladığını onaylaması** sonrasında mümkün. Şifreyi unutma reset/servis çözümü bulunmaz; **recovery key kaybı = yedek açılamaz**.
- **D-058 (uygulandı):** SHA-256 içerik kontrolü, AES-GCM doğrulama, schema/kolon karşılaştırması ve sayım **yalnızca içe alma önizlemesi** üretir. `BackupPreview.canRestore=false`; native hedef veritabanına **hiçbir kayıt yazılmaz**. Bu, kullanıcıya geri yükleme vaadi olarak sunulmaz.
- **D-059 (açık):** Atomik restore/clean target doğrulaması, eşzamanlı data mutasyonu, v8 sonrası sürüm dönüşümü, şifreli dosyanın hedef cihazdan paylaşım round-trip'i, önceden dolu SQLite çakışması, key saklama UX ve native Android/iOS testleri **tamamlanmadı**; [Issue #16](https://github.com/hilmiguner/vardiyum/issues/16) / [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2).

## 2026-11-15 — Issue #20 / PR #21 temiz hedef atomik geri yükleme kararları

- **D-060 (kodlandı, native QA bekliyor):** Yalnızca AES-GCM/SHA-256 + v8 tablo/kolon doğrulanmış yedek, açık `RESTORE` metni ve **ikinci kullanıcı onayı** ile restore adayına dönüşür. Şifreli dosya ve ayrı recovery key otomatik cloud/app_settings içine alınmaz; decrypted snapshot yalnızca bellektedir.
- **D-061 (kodlandı, native QA bekliyor):** Hedef **yalnız dört dokunulmamış seed shift templates, diğer 17 tablo tamamen boş** olmalıdır. Kullanıcı geçmişi olan, daha önce import edilmiş veya değiştirilmiş kurulum **fail closed**. Dolu DB'ye merge veya replace tasarlanmadı.
- **D-062 (kodlandı, native QA bekliyor):** Tek exclusive transaction içinde 18 tablonun kayıtlarını yükle, readback + `foreign_key_check` + `integrity_check` **commit öncesinde** doğrula. Expo exclusive bağlantı FK PRAGMA'sını miras almadığı için source FK enforcement varsayılmıyor. Her hata rollback ve eski seed'in korunması gerekir.
- **D-063 (kodlandı, native QA bekliyor):** Geri yüklenen bildirim opt-in **0** olur, cihazdan yeniden onay gerekir. `backup_restore_consumed` cihaz işareti, başarılı import sonrası aynı hedefe mükerrer import yapılmasını önler.
- **D-064 (açık):** Native iOS/Android AES, FileSystem, SQLite exclusive transaction, arşiv bütünlüğü/kalıcılık, düşük disk, process-kill ve app restart testleri yapılmadan güvenli cihaz kurtarma ilan edilmez. Bu nedenle [Issue #20](https://github.com/hilmiguner/vardiyum/issues/20) / [Issue #2](https://github.com/hilmiguner/vardiyum/issues/2) açık. Dolu DB birleştirme ayrı politika gerektirir.
