# 📱 Gid Konfigirasyon & Pèmisyon Natif pou Android (OmniChurch)

Gid sa a eksplike etap pa etap kijan pou konfigire pwojè w la nan **Android Studio** pou tout bagay mache pafètman, espesyalman **Koneksyon Google Natif (Google Sign-In)**, eskanè kamera, ak pèmisyon yo.

---

## 🔑 1. Konfigirasyon Google Sign-In Natif sou Android (Google Play Services)

> **Poukisa sa enpòtan ?**
> Google pa otorize koneksyon Google anndan WebView senp pou rezon sekirite (`disallowed_useragent`). Se poutèt sa aplikasyon an prepare kounye a ak plugin natif `@codetrix-studio/capacitor-google-auth`. Lè yon itilizatè klike sou "Konekte ak Google", telefòn Android lan ouvri fenèt natif Google Play Services la dirèkteman pou chwazi kont lan, epi Firebase valide sesyon an san okenn pwoblèm.

### A. Mete `server_client_id` nan `strings.xml`
Nan Android Studio, louvri fichye:
`android/app/src/main/res/values/strings.xml`

Asire w gen liy sa a ladan l:
```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">OmniChurch</string>
    <string name="title_activity_main">OmniChurch</string>
    <string name="package_name">com.omnichurch.app</string>
    <string name="custom_url_scheme">com.omnichurch.app</string>

    <!-- 🌐 OAuth Client ID Firebase pou Google Sign-In -->
    <string name="server_client_id">770562747895-9u95tikk4ae0u1prn4rmvcl12ubcrd9i.apps.googleusercontent.com</string>
</resources>
```

---

### B. Telechaje epi mete `google-services.json`
1. Ale sou [Firebase Console](https://console.firebase.google.com/) nan pwojè w la: **`gen-lang-client-0674712996`**
2. Ale nan **Project Settings** (⚙️ Paramèt Pwojè)
3. Nan seksyon **Your apps**, si w poko gen yon aplikasyon Android ki anrejistre, klike **Add app > Android**:
   - **Package name**: `com.omnichurch.app`
   - **App nickname**: `OmniChurch`
4. Telechaje fichye **`google-services.json`** la.
5. Kole fichye sa a dirèkteman nan dosye:
   📁 **`android/app/google-services.json`**

---

### C. Jwenn anprent SHA-1 ou nan Android Studio (Obligatwa pou Google)
Pou Google Play Services ka aksepte koneksyon an soti nan aplikasyon w lan:
1. Nan **Android Studio**, louvri onglet **Gradle** ki adwat anwo a.
2. Ale nan: **`OmniChurch > Tasks > android > signingReport`** (oswa louvri tèminal Android Studio a epi tape: `./gradlew signingReport`).
3. Gade nan rezilta a, kopye kòd **`SHA-1`** ak **`SHA-256`** la (pou `Variant: debugUnitTest` oswa `release`).
4. Retounen nan **Firebase Console > Project Settings > Your apps (com.omnichurch.app)**:
   - Klike sou **Add fingerprint**
   - Kole kòd SHA-1 la epi sove.

---

### D. Verifye `build.gradle`
1. Nan fichye **`android/build.gradle`** (Root):
```groovy
buildscript {
    dependencies {
        // ...
        classpath 'com.google.gms:google-services:4.4.2'
    }
}
```

2. Nan fichye **`android/app/build.gradle`** (App module):
Mete liy sa a tout anba nèt:
```groovy
apply plugin: 'com.google.gms.google-services'
```

---

### E. Enskri Plugin la nan `MainActivity.java`
Nan `android/app/src/main/java/com/omnichurch/app/MainActivity.java`:

```java
package com.omnichurch.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 1. Enskri Plugin Google Auth Natif
        registerPlugin(GoogleAuth.class);

        // 2. Otorize kamera ak mikwofòn dirèkteman nan WebView pou eskanè QR
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    request.grant(request.getResources());
                }
            });
        }
    }
}
```

---

## 2. Pèmisyon nan `AndroidManifest.xml`
Louvri `android/app/src/main/AndroidManifest.xml` epi mete pèmisyon sa yo anba `<manifest>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.zoutiw.omnichurch">

    <!-- 🌐 Pèmisyon Entènèt & Rezo (Pou baz done ak senkronizasyon) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- 📸 Pèmisyon Kamera (Pou eskanè QR ak foto pwofil manm) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- 📁 Pèmisyon Depo & Galeri Foto (Pou telechaje kat manm, ekspòte rapò ak foto) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" tools:ignore="ScopedStorage" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <!-- 📳 Pèmisyon Vibrasyon (Pou fidbak lè eskanè QR reyisi) -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- 🧬 Pèmisyon Byometri Natif Android (Pou Anprent / Face ID avèk @capacitor/biometric-auth) -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" android:maxSdkVersion="28" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="OmniChurch"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="OmniChurch"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 🧬 3. Otantifikasyon Byometrik Natif (Anprent Dwèt & Face ID)

Aplikasyon an ekipe ak `@capacitor/biometric-auth` (via `@aparajita/capacitor-biometric-auth`), ki sèvi ak **Android BiometricPrompt API** natif pou an sekirite done manm yo ak aksè administrasyon an.

### A. Kisa Plugin sa a pote pou legliz la ?
1. **Pwoteksyon Maksimòm Done:** Aksè manm yo ak fonksyon administratè (PIN mèt legliz la) ka debloke dirèkteman ak detèktè anprent oswa Face Unlock telefòn lan.
2. **Koneksyon Rapid nan 1 Touche:** Manm yo ak pastè yo pa bezwen tape kòd PIN yo chak fwa yo ouvri app la.
3. **Konpatibilite Ibrid:** Lè app la kouri sou Android natif, li itilize BiometricPrompt Google la; lè li kouri sou Web/Desktop, li chanje otomatikman pou itilize WebAuthn (Windows Hello / Touch ID / Face ID).

### B. Kijan pou teste Byometri a nan Android Studio ?
1. **Sou yon telefòn fizik:** Asire w telefòn ou gen yon anprent oswa figi anrejistre nan *Paramèt Telefòn > Sekirite & Byometri*.
2. **Sou Emilatè Android Studio:**
   - Nan fenèt emilatè a, ale nan *Settings > Security > Fingerprint* epi anrejistre yon anprent tès.
   - Pou simulation yon anprent dwèt pandan aplikasyon an mande l: klike sou twa ti pwen `...` sou bò emilatè a > **Fingerprint** > klike sou **Touch Sensor**.

---

## 🎨 4. Logo & Ikòn Android
- Fichye logo ofisyèl yo pare nan `/public/icon.png` ak `/public/omnichurch-logo.png`.
- Nan **Android Studio**, pou mete logo a kòm ikòn aplikasyon an nan tout gwosè otomatikman:
  1. Fè klike-dwa sou dosye **`app/res`**
  2. Chwazi **New > Image Asset**
  3. Nan *Asset Type*, chwazi **Launcher Icons (Adaptive and Legacy)**
  4. Nan *Path*, chwazi fichye `public/icon.png` an
  5. Klike sou **Next** epi **Finish**.

---

## 🚀 5. Kòmand pou bati ak senkronize

Chak fwa ou vle voye dènye chanjman yo nan Android Studio:
```bash
# 1. Bati epi senkronize tout fichye yo ak Android:
npm run cap:sync

# 2. Ouvri pwojè a dirèkteman nan Android Studio:
npm run cap:android
```
Ou ka klike dirèkteman sou bouton vèt **Run App (▶️)** nan Android Studio pou teste l sou yon telefòn fizik oswa Emilatè!
