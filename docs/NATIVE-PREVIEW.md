# Vardiyum — MVP 2. Aşama: Kurulabilir Native Önizleme ve Gerçek Cihaz Doğrulaması

> **2026-11-25 — Local JS bundles PASS after Expo SDK57 auto-fix; exact-source gate PENDING:** User created clean detached `C:\vardiyum-bundle-qa` at `7ba4a50`, Node 24.18.0, npm ci PASS. Interactive `expo install --check` accepted six patch updates (expo .33→.34, constants .24→.25, notifications .25→.26, router .31→.32, sharing .26→.27, sqlite .5→.7) and added expo-sharing config plugin. On the resulting modified working tree, format/typecheck PASS, lint 0 errors/29 warnings, Node 369/369 PASS, Android Hermes export 3.8 MB and iOS 3.5 MB PASS. Git status: modified app.json, package.json, package-lock.json. These results are NOT immutable PR HEAD parity; exact diff and resolved lock/config need review, then commit and fresh noninteractive `CI=1` install/check and both exports. npm reports 12 audit findings (9 moderate, 3 high); inspect full and production-only reports before standalone preview, no blind audit fix/force. Preserve both emulator data and native QA worktree; do not rerun builds until dependency evidence reviewed. PR #46 open, workflow_dispatch-only until Dec 1, no Actions/merge; no native build or physical acceptance claimed.

> **EN GÜNCEL 2026-11-20:** Yeni EAS Android APK `db787de4-e2d5-46f6-91e3-7c5c554e63d8` (source `dc6a4e19300d361939794f98f5c17bce0d68fc9c`) **Galaxy A02s SM-A025F/DS Android 12 (ARM32)** üzerinde SQLite açılışı, Bugün/Takvim/Rutin/Kazanç ekranları ve Ayarlar'da kaydedilen döngünün kapat/aç kalıcılığı **GERÇEK CİHAZ PASS**. Önceki `NativeDatabaseBinding` hatası bu cihazda kayboldu. **Galaxy A23 SM-A235F/DSN Android 14 yeni APK yeniden test BEKLİYOR; Android platform D01 genel sonuç PARTIAL**, D02–D10 ve iOS NOT_TESTED. [PR #46](https://github.com/hilmiguner/vardiyum/pull/46) **OPEN, MERGE YOK**, [CI #44788647775](https://github.com/hilmiguner/vardiyum/actions/runs/44788647775) SUCCESS, [#43](https://github.com/hilmiguner/vardiyum/issues/43) / [#38](https://github.com/hilmiguner/vardiyum/issues/38) açık, beta yok. Tarihsel eski durum kayıtları aşağıda korunuyor.

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

## 2026-11-16 — Native Android EAS build FINISHED; henüz telefona kurulmadı (en güncel)

- **İlk fiziksel Android'e yönelik internal APK cloud derlemesi TAMAMLANDI:** Expo [build ID `d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48`](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48), durum **`finished`**, `preview`/`internal`, app 0.1.0, SDK 57, versionCode 1. Expo build source **`13e7ba4fbbf53e4bdf28a708841379baccdf7857`**, fingerprint `46af7d6a58d5896a4af547fd70a2414d9103adac`. Oluşturma: 2026-11-16 20:01:06 → 21:12:02 (kullanıcının EAS CLI görüntüsü). [Gerçek APK artifact](https://expo.dev/artifacts/eas/jDU3ANofiAfAwsp_O5xyvh3Fw0qlQkrFjyV1AqKAAm8.apk).
- **Kanıt sınırı:** Native Android **cloud build PASS**; **Android telefona APK yükleme/açma henüz TEST EDİLMEDİ**, bu yüzden [DEVICE-SMOKE.md](DEVICE-SMOKE.md) D01 Android hâlâ `NOT_TESTED` ve kalan Android D02–D10 + iOS D01–D10 `NOT_TESTED`. Expo Go, Android build ve fiziksel cihaz PASS birbirine karıştırılmaz. Beta/mağaza hazır değil.
- **Hemen sonraki işlem:** APK'yi Android telefona yalnız Expo bağlantısından kur, `Vardiyum` uygulamasını aç, Bugün/Takvim/Rutinler/Kazanç/Ayarlar ekranlarını gez, ilk kurulum CTA + 8 günlük döngüyü test et, cihaz/Android sürümüyle PASS/FAIL bildirimini [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38)/[#2](https://github.com/hilmiguner/vardiyum/issues/2)'ye kaydet. İlk cihaz testinden sonra offline, SQLite kalıcılık ve diğer D02–D10.
- **Expo bağlantı notu:** `@hilmiguner/vardiyum` gerçek `extra.eas.projectId=0ec5a8c3-f277-43d0-82c7-8b822835a4c2`; kullanıcının `C:\vardiyum\app.json` dosyasında `eas init` ile değişmiş, ancak GitHub main'deki app.json **henüz bağlı değil**. Yerel diff doğrulanıp ayrı PR ile takip edilmeli, `git reset --hard` veya Expo secrets/keystore sızıntısı yapma.
- Kullanıcı sorunu: İlk build queue yaklaşık 71 dakika sürmüş ama sonunda başarıyla bitti; tekrar build/keystore üretme. Android fiziksel D01 sonucu gelmeden yeni özellik veya ücret/OT/FX kapsamı açma; Issue #38 aşama 2 ACTIVE.

## 2026-11-20 — ARM32 SQLite native library missing: build-source mitigation pending physical retest

**Physical evidence:** Galaxy A02s SM-A025F/DS (Android 12) runs `zygote32`, ABI `armeabi-v7a,armeabi` only. Extracted original first preview APK `d15da9f3-a19c-4b2c-9bc4-e3bb159c5a48` directly from installed device (`adb shell pm path` / `adb pull`): among **22 ARM32 .so libraries**, `lib/armeabi-v7a/libexpo-sqlite.so=MISSING` while `libexpo-modules-core.so`, `libreactnative.so`, `libc++_shared.so` are PRESENT. Native runtime previously reported `java.lang.NoClassDefFoundError: expo.modules.sqlite.NativeDatabaseBinding`. For Expo SDK57 source, `NativeDatabaseBinding` calls `System.loadLibrary("expo-sqlite")` in companion initializer, so the missing architecture-specific .so is the strong concrete explanation. A23 SM-A235F/DSN Android14 opens SQLite (likely arm64, **not yet direct APK ABI inventory**). No data wipe is warranted.

**SDK 57 source findings:** `packages/expo-sqlite/android/shouldUsePublication.groovy` chooses a *prebuilt/published AAR* by default; if `expo.sqlite.enableFTS` Gradle property is explicitly set, it instead builds from native source. `packages/expo-sqlite/android/build.gradle` local native CMake `abiFilters (*reactNativeArchitectures())` includes `armeabi-v7a` in the defaults. SDK57 SQLite plugin `android.enableFTS: true` sets the Gradle property; FTS was already enabled by default and SQLCipher is NOT enabled. [Expo SDK57 SQLite config docs](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/); [Expo SDK57 source](https://github.com/expo/expo/blob/sdk-57/packages/expo-sqlite/android/shouldUsePublication.groovy).

**Candidate fix — OPEN PR #46, NOT MERGED:** Set `app.json` SQLite plugin `["expo-sqlite", {"android":{"enableFTS":true}}]`, forcing native compilation for the same SQL backend rather than relying on published Android binary. Add regression test `tests/native-preview-config.test.mjs` checking source-build guard and `scripts/verify-android-apk-native.ps1` to fail if `libexpo-sqlite.so` is absent for either ARM32 or ARM64 in generated APK. No changes to `src/data/database.ts`, migrations, saved data or encryption. **This is an unverified fix hypothesis until a new EAS preview APK is built, checked by script and installed on both actual devices.** Do not claim final native P0 resolved based only on JS CI.

**Next:** wait for PR #46 code CI, then safely build a preview APK from that PR branch (preferred: fresh worktree or separate clone, preserve user's existing local `C:\vardiyum\app.json` created by `eas init`). On Windows: `powershell -File scripts/verify-android-apk-native.ps1 -ApkPath <finished APK>`; require `armeabi-v7a SQLITE=True` and `arm64-v8a SQLITE=True`, then physically retest SQLite startup/persistence A02s and A23. Keep PR OPEN / D01 FAIL until real evidence; user approves merge separately. iOS physical remains NOT_TESTED. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43), [Issue #38](https://github.com/hilmiguner/vardiyum/issues/38), [PR #46](https://github.com/hilmiguner/vardiyum/pull/46).


## 2026-11-20 — İlk ARM32 gerçek cihaz SQLite PASS, A23 bekliyor

- **Gerçek cihaz:** Samsung Galaxy A02s `SM-A025F/DS`, Android 12, `zygote32` / `armeabi-v7a`; EAS preview build [`db787de4-e2d5-46f6-91e3-7c5c554e63d8`](https://expo.dev/accounts/hilmiguner/projects/vardiyum/builds/db787de4-e2d5-46f6-91e3-7c5c554e63d8), kaynak commit `dc6a4e19300d361939794f98f5c17bce0d68fc9c`, APK SHA256 `1B88EE921F4AB584D17890F4B592B11C73667AAD9078DEEB942B3FD6D0D9702C`.
- **Kullanıcının doğrudan test sonucu:** (1) `Yerel veriler açılmadı` / `NativeDatabaseBinding` hatası tekrar etmiyor, (2) Bugün, Takvim, Rutinler, Kazanç açılıyor, (3) Ayarlar'da döngü kaydı yapıldı ve uygulama tamamen kapatılıp yeniden açıldığında **kalıcı**. **A02s SQLite P0 teşhis edilen cihazda düzeldi (PASS)**.
- ARM32 + ARM64 native SQLite kütüphaneleri aynı yeni APK'da `NATIVE_SQLITE_ABI=PASS`. Önceki APK'da ARM32 SQLite .so eksikti; Expo SQLite kaynak derleme ayarı bu eksikliği gidermiş görünüyor ve fiziksel cihazda doğrulandı.
- **Sıradaki cihaz:** Samsung Galaxy A23 `SM-A235F/DSN`, Android 14. **Yeni APK'nın** üzerine kurulumunun, eski kayıtların kalıcılığının, bottom-safe-area, vardiya/izin ekle-sil, şehir bazlı zone picker, ücret profili formu göster/gizle ve kaldırılmış örnek döngünün gerçek cihaz testi **BEKLİYOR**. `adb install -r C:\vardiyum-native-qa\vardiyum-test.apk`; önceki uygulamayı uninstall/clear etme, imza uyuşmazlığında dur.
- **MVP gate:** D01 Android `PARTIAL` (A02s ilk açılış ve SQLite kalıcılık PASS; A23 yeniden test bekliyor), Android kalan D02–D10 ve iOS D01–D10 NOT_TESTED. [PR #46](https://github.com/hilmiguner/vardiyum/pull/46) **OPEN**; explicit user merge onayı yok. [Issue #43](https://github.com/hilmiguner/vardiyum/issues/43) kök neden + cihaz kapsamı, [#38](https://github.com/hilmiguner/vardiyum/issues/38) takip. Beta/store henüz yok.
