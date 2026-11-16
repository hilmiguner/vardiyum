# Vardiyum — MVP 2. Aşama: Kurulabilir Native Önizleme ve Gerçek Cihaz Doğrulaması

**2026-11-16 GÜNCEL DURUM:** PR #42 **MERGED** `main=c3b737fd54e15266c8831ee8fff4f7470b1857e1` ([CI #43880960771](https://github.com/hilmiguner/vardiyum/actions/runs/43880960771) SUCCESS 342/342 Node + Android/iOS JS). `preview` profili main'de; Expo proje hesabı/projectId/Android native APK build veya iOS native IPA **henüz oluşturulmadı**. Telefon testleri D01–D10 Android/iOS **20/20 NOT_TESTED**. Aşağıdaki tarihsel açıklamalar PR öncesi durumu anlatır; bu satır en güncel kayıttır.

**Windows ilk adımı (repo henüz klonlu değilse `git clone https://github.com/hilmiguner/vardiyum.git C:\\vardiyum`; sonra `cd C:\\vardiyum`)**. Windows'ta zaten klon varsa yalnız repo köküne geç. Expo giriş bilgisi ve Apple/keystore secret'larını sohbet/issue'ya KOPYALAMA. `eas init` proje kimliğini oluşturduktan sonra gerçek projectId/app.json değişikliğini ve build sayfası bağlantısını gizli anahtar olmadan raporla. EAS hesap bağlantısını bizim GitHub aracımız otomatik yapamıyor.

**Durum (2026-11-16):** Hazırlık konfigürasyonu PR kapsamındadır; EAS Expo hesabına bağlanma, Android APK/iOS IPA bulut derlemesi, telefona kurulum ve test sonuçlarının **hiçbiri henüz doğrulanmadı**. Son kaynak kodu: [PR #41](https://github.com/hilmiguner/vardiyum/pull/41) kullanıcı onayıyla main'e MERGED, `8b72b55625eee5c4f278f467a5d45df20dc3bfd0`, [main CI #43877499033](https://github.com/hilmiguner/vardiyum/actions/runs/43877499033) SUCCESS **338/338 Node** ve Android/iOS **JavaScript bundle** (native binary değil).

**Tek takip:** [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38) / [#2](https://github.com/hilmiguner/vardiyum/issues/2) / [#20](https://github.com/hilmiguner/vardiyum/issues/20), [DEVICE-SMOKE.md](DEVICE-SMOKE.md) D01–D10 × Android/iOS. Önce [MVP-SCOPE-FREEZE.md](MVP-SCOPE-FREEZE.md). Yeni maaş/OT özelliklerine dönme.

## Bu PR'ın sınırları

- `eas.json`: yalnız **preview internal** profili; Android `apk` (telefona kurulabilir), iOS `simulator: false` (fiziksel Apple cihazı için ad hoc imzalı `.ipa`). Expo Go veya Metro'ya bağlı development client değildir.
- `tests/native-preview-config.test.mjs`: 4 source configuration testi. Bir native derleme değildir; kurulumun yapılabildiğini kanıtlamaz.
- Uygulamanın tanımlı Android package ve iOS bundle ID değerleri değiştirilmez. Apple/Expo hesap bilgileri, signing anahtarları ve token dosyaları **repo'ya eklenmez**.
- Henüz Expo EAS projesine bağlantı yok: `app.json` içerisinde `extra.eas.projectId` **BULUNMUYOR**. Bunu yalnız kullanıcının kendi Expo hesabında çalıştıracağı `eas init` oluşturabilir. Rastgele ID ekleme.
- `eas build` komutlarını kullanıcı kendi oturumunda çalıştırır. Gerekli Expo/Apple erişimi olmadan bulut build'ini oluşturuldu veya yüklendi sayma.

## A. Android cihaz paketi (Windows PowerShell, ilk gerçek oturum)

PR merge ve main CI doğrulandıktan sonra repo kökünde:

```powershell
git switch main
git pull --ff-only origin main
node --version
npm ci
npx expo install --check
npm test
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

- `eas init` sırasında **kullanıcı kendi Expo hesabındaki yeni/mevcut doğru Vardiyum projesini seçer**. Oluşturulan `extra.eas.projectId` repo'ya ayrıca gözden geçirilerek kaydedilir. Otomatik olarak hesap/tenant uydurulmaz.
- İlk Android build'de EAS signing anahtarı oluşturma/konfigürasyon soruları sorabilir. Parola/token/keystore dosyalarını PR'a, issue'ya veya sohbet mesajına yapıştırma.
- `preview` profili **APK** üretmeyi amaçlar; `.aab` Android telefona doğrudan kurulmaz. EAS'in verdiği **gerçek build linki** ve dağıtılan APK ile cihazda yükleme yap. Sadece Expo Go testi cihaz kabulü değildir.
- Paketi aç: `Bugün → Takvim → Rutinler → Kazanç → Ayarlar`, boş ilk kurulum CTA, 8 günlük şablon ve kapat/aç. `DEVICE-SMOKE.md` **D01 / Android** hücresine cihaz, sürüm, commit ve gerçek sonuç kaydet; sonuç görülene kadar `NOT_TESTED` kalır.
- Standalone APK'da Metro çalıştırmadan internet bağlantısını kapatıp SQLite/veri kalıcılığını ayrı doğrula. Expo Go veya Metro ile çalışan debug oturumu **offline PASS değildir**.

## B. iOS gerçek cihaz paketi (ayrı, zorunlu kabul)

Önkoşul: **Apple Developer Program** erişimi ve ad hoc provisioning için gerçek iPhone/iPad cihaz kaydı. Bu, Android APK'nın başarılı olmasıyla otomatik sağlanmaz. EAS bulut derlemesi Windows'tan başlatılabilir ama Apple hesabı, sertifika/provisioning ve iOS cihaz yükleme adımları yine gereklidir.

```powershell
npx eas-cli@latest login
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

- `device:create`: iOS cihaz UDID'si Expo/Apple sistemlerine kullanıcı izniyle kaydedilir. Cihaz ad hoc provisioning listesine **build öncesinde** dahil edilmeli. Sonradan eklenen cihaz için eski IPA otomatik çalışmaz.
- EAS/Apple signing prompts kullanıcı hesabında tamamlanır. `ios.simulator:false` olduğu için bu paket **iOS simulator build'i değil gerçek cihaz** içindir.
- iOS 16+ için **Developer Mode** gerekebilir. Kurulumdan sonra ilk açılış/kapanış, izin/dış paylaşım, SQLite, yedek/restore, DST ve erişilebilirlik aynı test matrisiyle **ayrı** değerlendirilir.
- Apple hesabı veya iPhone erişimi yoksa iOS sütunu `BLOCKED` / `NOT_TESTED` kalır; Android PASS iOS PASS sayılmaz. Alternatif native simülatör deneyi riskleri azaltabilir ama fiziksel iPhone kabulünü tamamlamaz.

## C. Tek test kaydı şablonu

```text
D-ID: D01
Platform: Android / iOS
Test commit SHA: <exact native source commit>
EAS build ID / build page: <gerçek bağlantı>
Binary kind: Android APK / iOS ad hoc IPA
Model / OS / app version: <tam sürümler>
Tarih / tester: <date, kişi kimliği/özel bilgi ifşa etmeyen not>
Başlangıç veri durumu: temiz kurulum / güvenli sentetik fixture
Beklenen: <net kabul>
Gözlenen: <fiili davranış>
Sonuç: PASS / FAIL / BLOCKED / NOT_TESTED
Risk: P0 / P1 / none
Issue: <yalnız gerçek hata bulunursa link>
Kanıt: <kişisel kazanç, kimlik, recovery key, özel rutin veya PII olmayan kayıt>
```

**Kritik veri güvenliği:** Testler **sentetik ücret/mesai/rutin verileri** ile yapılmalı. Recovery key, gerçek maaş, fatura, aile/işyeri bilgisi, imzalama tokenları ve gizli anahtarları issue, CI logu veya ekran görüntüsünde gösterme. Yedek/restore testi yalnız temiz hedefe; dolu telefona geri yükleme denemesi yapma. Cihaz verisini silen/bozan hata görülürse testi durdur ve P0 issue oluştur.

## D. Bitirme ölçütü

1. Bu hazırlık PR'ı CI + ayrı kullanıcı merge onayıyla main'e alınır.
2. Gerçek EAS Android ve iOS native build ID/link ve install/launch sonucu kayda geçer; **şu an yok**.
3. [DEVICE-SMOKE.md](DEVICE-SMOKE.md) D01–D10 **iki platformda** gerçek PASS/FAIL/BLOCKED şeklinde doldurulur; SQLite v1→v8, offline, bildirim izin/teslim, DST, AES clean restore, OS share cleanup, low disk/crash dahil.
4. **P0=0** ve temel verilerin korunduğu kanıtlanmadan [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38) aşama 3 kapalı betaya geçilmez. Hatalar çıkarsa sadece P0 düzeltme PR'ları oluştur, yeni özellik geliştirme.
5. Kapalı beta ve mağaza yayın aşamaları **ayrı** kalır; APK/IPA iç dağıtımı mağazaya yayın değildir.

Kaynaklar: [EAS preview internal](https://docs.expo.dev/build/eas-json/), [Android APK](https://docs.expo.dev/build-reference/apk/), [iOS ad hoc ve cihaz kaydı](https://docs.expo.dev/build/internal-distribution/), [EAS init](https://docs.expo.dev/tutorial/eas/configure-development-build/).
