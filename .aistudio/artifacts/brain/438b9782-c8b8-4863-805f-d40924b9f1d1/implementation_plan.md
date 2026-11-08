# Plan Enjenieri Mèt OmniChurch — 100% Pare pou Mache & Zewo Danje

## 1. Rezime Egzekitif & Vizyon Pwojè a
Objektif plan sa a se transfòme OmniChurch an yon aplikasyon pwodiksyon wo-nivo ki pare pou mache a ak nivo danje **0 (Zero Vulnerability)**. Tout feblès sekirite, konfli depandans sou Android Studio, ak fragilite achitekti yo divize an 4 faz estratejik pou nou egzekite san kouri epi san kraze sa ki deja ap mache.

---

## 2. Faz 1 : Sekirizasyon Imedya & Aliyman Capacitor 8 pou Android Studio
*(Priyorite Imedya — Repons Itilizatè a)*

### A. Sekirite Firestore (Nivo Danje: 0)
- **Pwoblèm Kounye a:** `firestore.rules` gen `allow read, write: if true;` sou tout koleksyon yo. Nenpòt moun ka modifye oswa efase baz done legliz yo.
- **Aksyon:**
  1. Ranfòse règ Firestore yo avèk validasyon strik milti-tenant:
     - Chak dokiman dwe verifye apatenans legliz la (`request.auth != null` oswa validasyon `churchId`).
     - Koleksyon manm (`members`), sèvis (`services`), prezans (`attendances`), ak anons (`announcements`) izole pa legliz.
     - Bloke efase masif san otorizasyon.
  2. Pwoteje modpas admin (`adminPasscode`):
     - Elimine modpas an klè nan dokiman Firestore ak nan `localStorage`.
     - Aplike fonksyon chifreman/hashing modèn (Web Crypto API avèk SHA-256 + salt legliz la) anvan anrejistreman oswa konparezon.

### B. Aliyman Capacitor 8 pou Android Studio (Zewo Konfli Depandans)
- **Pwoblèm Kounye a:** Pwojè a itilize `@capacitor/core@8.5.1` pandan kèk plugin tankou `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` mande Capacitor 6, sa ki fòse `--legacy-peer-deps` e ki ka kreye erè pandan senkronizasyon Gradle nan Android Studio (`npx cap sync android`).
- **Aksyon:**
  1. Ranplase plugin otantifikasyon Google Capacitor ki demode a ak vèsyon ofisyèl oswa solisyon natif konpatib ak Capacitor 8 (pa egzanp, `@capacitor-community/google-auth` konpatib oswa entegrasyon natif san konfli peer dependency).
  2. Garanti ke kòmand `npm install` pase san `--legacy-peer-deps` oswa `--force`.
  3. Verifye ke fichye Android Studio yo (`android/app/build.gradle`, `variables.gradle`) konpatib ak dènye vèsyon SDK Android (Compile SDK 34/35) san konfli bibliyotèk.

---

## 3. Faz 2 : Achitekti Done Reaktif & File Offline (IndexedDB)
*(Mizajou Modèn pou Fyabilite sou Mobil & Web)*

### A. Store Reaktif Santralize (Zustand)
- **Pwoblèm Kounye a:** Aplikasyon an ap itilize `window.dispatchEvent(new CustomEvent('church_data_updated'))` ak `localStorage` gaye nan plizyè milye liy kòd, sa ki ka lakòz de-sinkronizasyon ant ekran yo.
- **Aksyon:**
  1. Kreye yon store reaktif avèk **Zustand** ki jere:
     - Eta aktif legliz la (`currentChurch`).
     - Lis manm aktif yo ak filtè rechèch rapid.
     - Sesyon sèvis aktif la ak estati prezans yo.
  2. Ranplase koutim evènman DOM yo ak abònman reaktif dirèk.

### B. File Offline Entelijan pou Skanè Mobil (IndexedDB / Local Queue)
- **Aksyon:**
  1. Kreye yon mekanis *Offline Sync Queue*:
     - Lè yon responsab ap skane kat manm nan yon zòn kote entènèt pa bon, prezans lan anrejistre imedyatman nan IndexedDB lokal.
     - Dèske koneksyon an tounen (`navigator.onLine` detekte), sistèm nan voye pakèt prezans yo nan Firestore san bloke itilizatè a epi san kreye doub prezans (`transaction` / `atomic batch`).
  2. Netwaye filtaj tèks referansye ansyen demo (`isLegacyDemoMember`) nan `firestoreService.ts` pou izole done reyèl sèlman.

---

## 4. Faz 3 : Modilarizasyon Kòd & Tès Otomatik
*(Retire Monolitik & Garanti Zewo Regresyon)*

### A. Dekonpozisyon Fichye Monolitik yo
- **Pwoblèm Kounye a:** `src/utils/storage.ts` gen plis pase 3,600 liy kòd; `src/App.tsx` gen plis pase 2,200 liy kòd; `AdminAttendance.tsx` gen plis pase 1,500 liy kòd.
- **Aksyon:**
  1. Separe `storage.ts` an modil dedye:
     - `src/services/memberService.ts` (Jesyon manm, kreyasyon, modifikasyon, foto).
     - `src/services/attendanceService.ts` (Skan prezans, kalkil absans otomatik, orè, estati a lè / an reta).
     - `src/services/churchService.ts` (Enfòmasyon legliz, konfigirasyon, depatman).
  2. Dekoupe modil UI yo an konpozan pi lejè ak fasil pou kenbe.

### B. Tès Otomatisasyon (Vitest)
- **Aksyon:**
  1. Enstale ak konfigire `vitest` pou pwojè a.
  2. Ekri tès inite pou lojik biznis kritik yo:
     - Prevansyon doub prezans sou menm sèvis la.
     - Verifikasyon ke yon sèvis ki pa t janm ouvè pa ka jenere absans otomatik.
     - Kalkil otomatik estati (Prezan, An Reta, Eskize, Absan).
     - Validasyon chifreman ak verifikasyon modpas admin.

---

## 5. Faz 4 : Pwodiksyon Android Studio (AAB/APK) & Release Windows

### A. Android Studio Pwodiksyon (Google Play Ready)
- **Aksyon:**
  1. Asire estrikti pwojè Android la konplè (`android/` folder) avèk tout pèmisyon kamera (`CAMERA`, `FLASHLIGHT`) ak rezo.
  2. Prepare konfigirasyon pou siyati kle (Release Keystore) ak jenerasyon Android App Bundle (`.aab`) pou Google Play ak `.apk` pou tès dirèk sou aparèy.
  3. Dokimante pwosedi senp pou ouvri pwojè a nan Android Studio epi bati l san okenn erè.

### B. Vèsyon Desktop (Windows NSIS)
- **Aksyon:**
  1. Kenbe konpatibilite Electron 33.2.1 pou bati fichye enstalasyon Windows (x64 ak ia32/32-bit).
  2. Verifye ke bati a pwodui `.exe` san okenn erè depandans.

---

## 6. Lòd Egzekisyon & Pwochen Etap
Nou pral kòmanse touswit avèk **Faz 1**:
1. Ranfòse règ Firestore yo epi aplike chifreman sekirize sou modpas admin.
2. Netwaye epi aliye depandans Capacitor yo pou Android Studio bati san okenn konfli.
3. Verifye konpilasyon ak lint san okenn avètisman oswa erè.

*Klike sou bouton **Proceed** pou apwouve plan an pou nou ka kòmanse Faz 1 imedyatman.*
