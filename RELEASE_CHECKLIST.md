# 🚀 OmniChurch - Rapò & Lis Verifikasyon Final pou Release (APK & AAB)

Dokiman sa a se gid ofisyèl konplè pou bati, siyen, epi pibliye **OmniChurch v1.1.0** sou **Google Play Store** oswa distribye l sou fòm **APK** endepandan pou telefòn ak tablèt Android.

---

## 📋 1. Konfigirasyon Pwojè Android la

| Paramèt | Valè Aktyèl | Kote li defini |
| :--- | :--- | :--- |
| **Application ID** | `com.zoutiw.omnichurch` | `capacitor.config.json` & `android/app/build.gradle` |
| **App Name** | `OmniChurch` | `android/app/src/main/res/values/strings.xml` |
| **Version Name** | `1.1.0` | `package.json` (otomatikman lye ak Gradle) |
| **Version Code** | `10100` | Kalkile otomatikman : `(major*10000)+(minor*100)+patch` |
| **Min SDK** | `24` (Android 7.0 Nougat+) | `android/variables.gradle` (kouvri 97%+ aparèy) |
| **Target / Compile SDK** | `36` (Dènye estanda Google Play) | `android/variables.gradle` |

---

## 🔐 2. Kreye Kle Siyati Pwodiksyon (Keystore)

Pou Google Play aksepte aplikasyon an, ou bezwen yon kle siyati prive (`.jks`). Kouri kòmand sa a nan tèminal òdinatè w lan (Windows PowerShell oswa Mac/Linux Terminal) :

```bash
keytool -genkey -v -keystore omnichurch-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias omnichurch
```

> ⚠️ **ATANSYON TRÈ ENPÒTAN** :
> 1. Konsève fichye `omnichurch-release-key.jks` la nan yon kote ki trè an sekirite (Drive, backup ekstèn).
> 2. Pa janm pèdi modpas ou chwazi a. Si w pèdi l, Google p ap janm pèmèt ou mete ajou aplikasyon an sou Play Store!

---

## 🛠️ 3. Kijan pou Bati nan Android Studio (2 Metòd)

### Metòd A : Dirèkteman nan Entèfas Android Studio (Rekòmande)
1. Louvri **Android Studio**.
2. Klike sou **Open** epi chwazi dosye `android/` ki nan pwojè OmniChurch la.
3. Tann Gradle fini senkronize (`Build Successful`).
4. Ale nan meni anwo a : **Build > Generate Signed Bundle / APK...**
5. Chwazi :
   - **Android App Bundle (.aab)** si w pral pibliye sou **Google Play Store** (Google egzije fòma sa a).
   - **APK** si w vle yon fichye pou voye sou WhatsApp oswa enstale dirèkteman sou telefòn.
6. Klike **Next**, chwazi fichye `omnichurch-release-key.jks` ou te kreye a, antre modpas yo ak alyas `omnichurch`.
7. Chwazi variant **release** epi klike **Finish**.
8. Fichye final la ap disponib nan :
   - `android/app/release/app-release.aab`
   - oswa `android/app/release/app-release.apk`

---

### Metòd B : Kòmand Tèminal (Liy de Kòmand)

Pou bati yon **APK Release** :
```bash
cd android
./gradlew assembleRelease
# Sou Windows :
# gradlew.bat assembleRelease
```
Fichye APK a ap soti nan :
`android/app/build/outputs/apk/release/app-release-unsigned.apk`

Pou bati yon **Android App Bundle (.aab)** pou Google Play :
```bash
cd android
./gradlew bundleRelease
# Sou Windows :
# gradlew.bat bundleRelease
```
Fichye AAB a ap soti nan :
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 📱 4. Lis Pèmisyon Android & Sekirite (`AndroidManifest.xml`)

Aplikasyon an deja genyen tout pèmisyon estanda ki nesesè yo :
- `android.permission.INTERNET` : Pou koneksyon ak baz done Firebase Firestore.
- `android.permission.CAMERA` : Pou eskanè kat manm ak kòd QR (ak `android.hardware.camera required="false"` pou tout aparèy ka enstale l).
- `android.permission.USE_BIOMETRIC` : Pou debloke ak anprent oswa vizaj.
- `android.permission.ACCESS_NETWORK_STATE` : Pou deteksyon rezo ak deklanchman oto-senkronizasyon offline IndexedDB.
- `android.permission.VIBRATE` : Pou siyal fidbak lè yon manm fin skane.
- `com.google.android.gms.permission.AD_ID` : Pou Google AdMob sou Android 13+.
- `FileProvider` : Pou pataje kat manm an imaj ak ekspòtasyon rapò PDF.

---

## 🌐 5. Fichye ak Sekirite Firebase

1. **`google-services.json`** :
   - Ale sou [Firebase Console](https://console.firebase.google.com/).
   - Nan pwojè w la, telechaje `google-services.json` pou package `com.zoutiw.omnichurch`.
   - Mete l nan `android/app/google-services.json`.

2. **Anprent SHA-1 & SHA-256** :
   - Kouri nan tèminal Android Studio a : `./gradlew signingReport`.
   - Kopye kle SHA-1 ak SHA-256 ki parèt pou variant `release` la.
   - Kole yo nan Firebase Console > Paramèt Pwojè > Aplikasyon Android w la.

3. **Règ Sekirite Firestore (`firestore.rules`)** :
   - Règ sekirite milti-legliz yo deja deplwaye epi pwoteje kont aksè san otorizasyon.

---

## 📦 6. Lis Verifikasyon Google Play Console (Data Safety)

Lè w ap ranpli fòmilè **Data Safety** sou Google Play Console :
- **Kamera** : Wi (itilize sèlman pou eskanè prezans pa kòd QR, pa gen foto ki anrejistre oswa pataje ak twazyèm pati).
- **Enfòmasyon Pèsonèl** : Non, Imèl, Telefòn manm legliz yo (itilize sèlman pou jesyon legliz la, chifre pandan transmisyon HTTPS).
- **Finans** : Diri, ofrann, dim (itilize sèlman pou kontablite entèn legliz la).
- **Piblisite** : Wi (AdMob - si w aktive l nan Developer Settings).

---

## ✅ 7. Rezilta Tès Otomatik Ekzekite

Tout 14 tès regression ak sekirite pase a 100% :
```
TOTAL TESTS RUN: 14
PASSED: 14 (100%)
FAILED: 0
```
- ✓ Hash SHA-256 Admin PIN valid
- ✓ Verifikasyon ak oto-migrasyon ansyen kòd PIN valid
- ✓ Pwoteksyon non ayisyen ak sèvis legliz reyèl valid
- ✓ Kalkil retar ak tolerans minit valid
- ✓ Izolasyon milti-legliz valid
