# Vardiyum — Ürün Tanımı (MVP)

**Son gözden geçirme:** 2026-11-15  
**Durum:** Planlama, ürün kapsamı mutabık; geliştirme başlamadı.

## 1. Vizyon ve konumlandırma

Vardiyum, *her sektörden vardiyalı çalışanların kişisel vardiya, günlük rutin ve tahmini kazanç asistanıdır*. Temel değer önerisi: **Vardiyanı bil. Gününü planla. Kazancını takip et.**

Sorular:
1. Ne zaman çalışıyorum?
2. Bugün vardiyama göre ne yapmalıyım?
3. Bu dönem yaklaşık ne kadar kazanacağım?

Hedef: iOS ve Android, başlangıçtan itibaren sektör bağımsız. İşverenin personel yönetim sistemi **değil**; çalışanın kendi kişisel planlayıcısı.

## 2. Kullanıcılar ve çalışma tipleri

Fabrika, sağlık, güvenlik, lojistik, perakende, turizm/konaklama ve özel çalışma düzenleri olan diğer sektörler.

Örnekler:
- Haftalık sabah/akşam/gece dönüşümleri
- 2 sabah + 2 akşam + 2 gece + 2 izin (sekiz günlük döngü)
- 12 saatlik veya gece yarısını aşan vardiyalar
- 24 saat çalışma / 48 saat dinlenme
- Öngörülebilir ana düzenin üstüne günlük değişiklikler, mesailer ve izinler
- Henüz düzeni belli olmayan günler için elle takvim girişi (döngü dışı istisna)

Çözüm belirli saatleri, vardiya adlarını ya da 7 günlük tekrar periyodunu zorunlu kılmamalı.

## 3. MVP — P0 kapsamı ve kabul kriterleri

### 3.1 Vardiya tanımlama ve hesaplama
- [ ] Kullanıcı vardiya türleri (ad, renk, başlangıç/bitiş yerel saati, izin) oluşturabilir.
- [ ] En az 1 günlük, isteğe göre uzunlukta tekrarlayan döngü tanımlayabilir; belirli bir başlangıç günü seçebilir.
- [ ] Herhangi bir geçmiş / gelecek tarih için beklenen vardiya gösterilir.
- [ ] Tek güne özel vardiya/izin/çalışma değişikliği döngünün diğer günlerini etkilemez.
- [ ] Gece yarısını geçen vardiya, yerel takvim tarihi ve saat dilimi ile doğru temsil edilir.
- [ ] Tekrarı olmayan geçici programlar için gün bazlı istisna kaydı mümkün olur.
- [ ] Döngü düzenlemek, geçmiş gerçekleşmiş çalışma kayıtlarını sessizce değiştirmez.

### 3.2 Takvim ve kayıtlar
- [ ] Gün, hafta ve ay görünümü.
- [ ] Vardiya renkleri, çalışma/izin/mesai işaretleri.
- [ ] İleri-geri tarihe gidilebilir; internet zorunlu değildir.
- [ ] İzin, fazla mesai ve gerçekleşen çalışma kayıtları planlanan vardiyadan ayrı tutulur.

### 3.3 Vardiyaya bağlı rutinler
- [ ] Günlük iş/kişisel görev tanımlama, düzenleme ve silme.
- [ ] Görevleri vardiya türü, haftanın günü veya döngü gününe göre eşleştirme.
- [ ] Bugün için geçerli görevler doğru listelenir.
- [ ] Tamamlanan görevler tarih ve görev kimliğiyle kaydedilir; geçmiş görülebilir.
- [ ] Kural değişikliği önceden tamamlanan kayıtları kaybettirmez.

### 3.4 Hatırlatmalar
- [ ] İzin verildiğinde yaklaşan vardiyaya ve rutine yerel bildirim kurulabilir.
- [ ] Vardiya değişikliklerinde ilgili bildirimler yeniden planlanır.
- [ ] Bildirim izni reddedilse bile uygulama eksiksiz kullanılabilir.
- [ ] İşletim sistemi ve cihaz kısıtlarından dolayı kesin zaman garantisi verilmeyecek; gerçek cihazlarda test edilecek.

### 3.5 Mesai ve tahmini kazanç
- [ ] Kullanıcı sabit aylık ücret veya saatlik ücret modeli tanımlar.
- [ ] Ek çalışma, katsayı, prim ve kullanıcı tanımlı kesinti girdilerini ekler.
- [ ] Ay/dönem bazlı tahmini toplam ve girdilere göre açıklanabilir döküm görür.
- [ ] Para birimi seçilebilir; parasal hesaplar kayan noktalı sayılarla yapılmaz.
- [ ] Ücret oranlarının geçerlilik tarihleri korunur; geçmiş dönemler beklenmedik şekilde değişmez.
- [ ] Hesaplamalar **tahmini** olarak etiketlenir; otomatik vergisel veya yasal bordro doğruluğu iddia edilmez.

### 3.6 Çekirdek deneyim
- [ ] Türkçe + İngilizce arayüz.
- [ ] Ana sayfa: bugünkü vardiya, sıradaki vardiya, bugün yapılacaklar ve tahmini kazanç özeti.
- [ ] Dört sekme: Bugün, Takvim, Rutinler, Kazanç. Ayarlar ayrı açılır.
- [ ] Hesap açmak zorunlu değil, yerel veriler çevrimdışı erişilebilir.
- [ ] Temel veri dışa aktarma / geri alma akışı tasarlanır ve test edilir.
- [ ] Erişilebilir etiketler, okunabilir kontrast, dinamik yazı boyutları.

## 4. İlk kurulum akışı

1. Vardiya düzeni için şablon seç veya özel düzen oluştur.
2. Günlük vardiya türlerini ve saatlerini tanımla.
3. Döngü başlangıç tarihini belirle; önizlemeyi doğrula.
4. İsteğe bağlı bildirim ayarını seç.
5. Takvime ve bugünkü özet ekranına geç; rutin ve maaş bilgileri sonradan girilebilir.

**UX hedefi (doğrulanmamış):** İlk vardiya düzenini 3 dakika içerisinde kurabilmek.

## 5. MVP dışında

- Şirketlerin personel atama, puantaj onayı, ücret ödeme ve yönetim paneli
- Sosyal ağ / ortak vardiya arkadaş takvimi
- Zorunlu üyelik, sürekli internet, sunucuya bağımlı çekirdek özellikler
- Ülke/işveren bazında eksiksiz bordro-vergi motoru ve resmi bordro yerine geçen çıktı
- Çoklu cihaz senkronizasyonu, gelişmiş raporlama, widget'lar (P1 adayları)

## 6. Ürün ve ticari hipotezler

- Temel takvim ve rutinlerin ücretsiz olması benimsenen başlangıç yaklaşımıdır.
- İleride Premium için detaylı analizler, gelişmiş otomasyon ve isteğe bağlı senkronizasyon değerlendirilecek.
- Ücret, abonelik koşulları ve uygulama içi satın alma altyapısı **kararlaştırılmadı**.
- Beta sırasında hedef: farklı sektörlerden en az 20 tester, 3 dakika kurulum, sıfır kritik vardiya hatası ve sıfır veri kaybı. Bu metrikler hedef; gerçekleşen sonuç değil.

## 7. Güven ve gizlilik

Kullanıcıya ait çalışma ve ücret verileri hassastır. Varsayılan kayıt cihazda tutulur. Veri aktarımı ve ilerideki bulut seçenekleri açık onayla çalışmalı; veri dışa aktarma ve silme işlevleri planlanmalıdır. Hukuki ve mağaza gizlilik şartları yayın öncesinde teyit edilecektir.

## 8. Marka

**Vardiyum** seçilen çalışma adı. Kullanım, tescil, alan adı ve mağaza uygunluğu henüz doğrulanmadı. Uygulama mağazası alt açıklaması için “Vardiya Takvimi, Rutin ve Mesai” adaydır.
