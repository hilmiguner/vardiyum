# Vardiyum — Test ve Kabul Stratejisi

**Durum:** Henüz testler yazılmadı; aşağıdakiler **planlanan** doğrulamalardır.

## 1. Birim testleri — saf motorlar

### Vardiya motoru
- Döngü: 2 sabah, 2 akşam, 2 gece, 2 izin; 8. günden sonraki ilk gün doğru.
- 1 günlük, 7 günlük, 8 günlük, 21 günlük ve daha uzun döngüler.
- Başlangıç tarihinden önceki günlerde pozitif modulo ve doğru vardiya.
- 29 Şubat, yıl değişimi, 30/31 gün, pazar/pazartesi haftası.
- 23:00–07:00 ve 24 saatlik vardiyalarda sonraki güne sarkan bitiş.
- Yerel takvim günü hesabı, DST geçişinde 23/25 saatli günler.
- Bir günlük izin/değişiklik istisnası yalnızca ilgili günü etkiler.
- İstisnanın silinmesi normal döngüye dönülmesini sağlar.
- Plan güncellense bile gerçekleşen çalışma geçmişi korunur.
- Kullanıcı hatalı vardiya saati, boş döngü, tekrarlanan/verisi bozuk öğelerde uygun uyarı alır.

### Rutin motoru
- Vardiya filtresi, hafta günü filtresi ve döngü gününe göre görev seçimi.
- Aynı gün ve kural için çift görev üretmeme.
- İzin gününde sadece koşulu karşılayan görevleri gösterme.
- Tamamlanan görev tarihsel kayıtlarının kural düzenlenmesinde bozulmaması.
- Başka zaman dilimine geçiş ve gece vardiyası gününe bağlama kuralı.

### Kazanç motoru
- Aylık maaş + ekstra mesai; saatlik ücret × gerçekleşen saat.
- Çarpan, prim, kesinti, sıfır saat, ay sonu taşıma.
- Para/kuruş hassasiyeti, ondalık girişler, ara/toplam yuvarlama.
- Geçerlilik tarihine göre ücret oranı; geçmiş dönem değişmemeli.
- Aynı hesap girdilerinden aynı sonucun ve satır dökümünün elde edilmesi.
- Vergi/SGK/resmi bordro hesaplaması olduğu izlenimi yaratılmaması.

## 2. SQLite / veri bütünlüğü
- Boş veritabanı ilk kurulum; uygulama güncellemesi için versiyonlu migration.
- Uygulama kapanıp açılınca kayıtların korunması.
- Yerel yedek -> farklı temiz kurulum -> geri alma; veri sayısı ve içerik eşleşmesi.
- Bozuk/eski yedek dosyasının güvenli reddi.
- Foreign key, benzersiz görev tamamlama ve tarih/kural doğrulama.

## 3. Mobil ve bildirim testleri
- Türkçe/İngilizce, açık/koyu tema, büyük font, TalkBack/VoiceOver.
- Android ve iOS gerçek cihazda açılış, ilk kurulum, takvim ve veri girişi.
- Uçak modunda tam kullanım.
- Bildirim izni açık/kapalı, saat değişikliği, düzen değişikliği, uygulama kapalıyken hatırlatma.
- Bildirim API/OS sınırlamaları nedeniyle tam zaman garantisi **test sonucu olarak varsayılmaz**.

## 4. CI ve yayın kapıları
- PR: format/lint, typecheck, domain unit test; bilinen kritik hatalar yok.
- Faz sonu: entegrasyon, E2E smoke ve temel performans kontrolü.
- Yayın adayı: iki platformda cihaz testi, yedek restore testi, erişilebilirlik, gizlilik metni ve mağaza uygunluğu kontrolü.

## 5. Beta kabul hedefleri

- Farklı sektörlerden **hedef 20** gönüllü test kullanıcısı.
- Kullanıcının ilk vardiya döngüsünü **hedef 3 dakikada** oluşturması.
- Kritik vardiya hesaplama hatası: **0**.
- Veri kaybı: **0**.
- Bu eşikler planlanan hedeflerdir; başarılar ancak test sonuçları kaydedilince doğrulanır.
