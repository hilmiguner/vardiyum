# Vardiyum — Yeni Sohbet / Geliştirici Devir Notu

**Önce bu dosyayı, sonra [STATUS.md](STATUS.md), [ROADMAP.md](ROADMAP.md) ve [DECISIONS.md](DECISIONS.md) dosyalarını oku.**  
**Repo:** https://github.com/hilmiguner/vardiyum  
**Referans tarihi:** 2026-11-15.

## Projenin amacı

Vardiyum, **başlangıçtan itibaren tüm vardiyalı çalışanları** hedefleyen kişisel iOS/Android uygulamasıdır. Bir personel yönetimi ürünü değil.

Üç çekirdek değer:
1. Değişken/periyodik vardiya düzeni, günlük istisnalar ve takvim.
2. Vardiyaya, haftanın gününe veya döngü gününe göre kişisel/iş rutinleri ve bildirimler.
3. Fazla mesai, taban maaş ve girilen kurallardan **tahmini** dönem kazancı.

Marka sloganı adayı: “Vardiyanı bil. Gününü planla. Kazancını takip et.”

## Karar verilen ürün yönü

- Tüm sektörler: fabrika, sağlık, güvenlik, lojistik, perakende vb.
- iOS + Android, ilk diller TR + EN.
- Offline-first; zorunlu hesap yok. İlk MVP'de bağımsız backend yok.
- React Native + Expo + TypeScript; Expo Router, SQLite, Zustand, Zod, expo-notifications.
- Saf ve test edilebilir vardiya, rutin ve kazanç motorları.
- Ana ekran: güncel vardiya, sıradaki vardiya, bugün yapılacaklar, tahmini kazanç.
- Sekmeler: Bugün / Takvim / Rutinler / Kazanç.
- Temel özellikleri ücretsiz sunma yaklaşımı; Premium fiyat ve içerik kesin değil.
- Widget, bulut senkronizasyonu (Supabase adayı), arkadaş takvimi, gelişmiş bordro sonraki sürümler.
- “Vardiyum” adı çalışma adıdır; tescil/mağaza/domain kullanılabilirliği henüz onaylanmadı.

## Önemli teknik sınırlar

- Kullanıcı tanımlı döngüler sabit 7 günlük takvimle sınırlandırılmayacak.
- Bir günlük vardiya istisnası sonraki döngüyü kaydırmayacak.
- 23:00–07:00 / 24 saatlik vardiyalar, tarih sınırı ve DST güvenilir hesaplanmalı.
- Planlanan vardiyalar, gerçekten çalışılan saatlerden ve mesai kayıtlarından ayrı.
- Geçmiş ücret oranları ve görev tamamlanmaları korunacak.
- İlk ücret hesaplama mevzuata göre resmi bordro değil, kullanıcı kurallarına göre açıklanabilir tahmin.
- Yerel bildirimler OS sınırlamalarına tabi; izin reddi uygulamayı engellememeli.

## Doğrulanmış ilerleme ve yapılmayanlar

2026-11-15 tarihinde GitHub deposu **boş** olarak doğrulandı. README.md başlangıç commit'i **42239462fb9a21d7a642ddc30d04657c2cd86a96** ile oluşturuldu; ürün/mimari/devir dokümanları **PR #1** ile main dalına squash merge edildi (**8a29a3a6f908d234326c53307ce6b18ae16223a5**). **Mobil uygulama kodu, CI, test, native build veya mağaza yayını henüz yapılmış değil.**

**Bu dosya kalıcı bir durum kaydıdır ama eskimeye açıktır:** yeni oturumda mutlaka güncel main SHA, branch'ler, açık PR'lar ve CI sonuçlarına bakılmalı. [STATUS.md](STATUS.md) daha güncel ise onu esas al.

## Sıradaki en yararlı adım

1. Repo main üzerinde PR #1 (dokümantasyon) durumunu ve varsa daha yeni commit/PR'ları doğrula.
2. main üzerinde Expo + TS uygulama iskeletini başlat; platform uyumlu bağımlılıkları seç.
3. Expo Router dört sekme, TR/EN ve temel tema, SQLite migrasyon altyapısı, test runner ve GitHub Actions CI'ı kur.
4. Ayrı bir PR ile vardiya engine sözleşmesini, 8 günlük örnek döngü ve tarih/istisna sınır durumlarını testlerle uygula.
5. Her PR sonrasında STATUS, ROADMAP ve bu HANDOFF'u güncelle.

## Yeni sohbet için kopyalanabilir başlangıç mesajı

> Vardiyum projemize kaldığımız yerden devam edelim. GitHub repomuz: https://github.com/hilmiguner/vardiyum. Önce main üzerindeki docs/HANDOFF.md, docs/STATUS.md, docs/ROADMAP.md, docs/DECISIONS.md, docs/ARCHITECTURE.md dosyalarını ve güncel branch/PR/CI durumunu oku. Kanıtlanmış tamamlanma durumlarını ayır. Sonra sıradaki açık MVP işini uygun branch/PR ile ilerlet; yaptığın geliştirmeleri, kararları ve test kanıtlarını GitHub dokümantasyonuna işle. Vardiyum tüm sektörlerdeki vardiyalı çalışanlar içindir; offline-first iOS/Android, vardiya döngüsü + rutin + tahmini kazanç üzerine kuruludur.

## Çalışma disiplini

- Her yeni işten önce mevcut dal/PR/CI ve en son değişiklikleri kontrol et.
- Kullanıcı onayı gerektiren dış yayın/ücretli servis/mağaza işlemlerini varsayma.
- Gizli anahtar, token veya kişisel maaş/veri örneklerini GitHub'a kaydetme.
- Doğrulanmamış planları ilerleme veya geçilmiş test gibi raporlama.
- Önemli kapsam/mimari değişiklikleri DECISIONS.md'ye gerekçesiyle ekle.
