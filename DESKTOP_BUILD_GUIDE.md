# 🖥️ Gid Konplè pou Kreye .EXE ak Pataje OmniChurch sou Sit la

Gid sa a eksplike etap pa etap kijan ou ka fasilman jenere fichye **`.exe` (Windows Executable / Installer)** pou **OmniChurch Pro** epi pataje l bay manm ak lidè legliz yo sou sit la.

---

## ⚡ Metòd 1: Kreyasyon Otomatik ak 1-Klike (Fasil pou Windows)

Si w telechaje kòd la oswa w gen pwojè a sou PC Windows ou:
1. **Double-klike sou fichye `build-windows-exe.bat`** ki nan rasin pwojè a.
2. Script la ap otomatikman:
   - Verifye Node.js
   - Fè `npm run build`
   - Jenere fichye `.exe` a nan dosye `dist_electron/` oswa `dist/`.
3. Ou fini! W ap jwenn:
   - `OmniChurch Pro Setup 1.0.0.exe` (Enstalatè Windows)
   - `OmniChurch Pro 1.0.0.exe` (Vèsyon Portable ki ouvri dirèkteman)

---

## 🛠️ Metòd 2: Kreyasyon Atravè Liy Kòmand (Terminal / PowerShell)

Louvri tèminal nan dosye pwojè a epi egzekite kòmand sa yo:

```bash
# 1. Enstale depandans yo si w fèk klone pwojè a
npm install

# 2. Bati vèsyon wèb la
npm run build

# 3. Jenere fichye .EXE pou Windows
npm run build:exe
```

Oswa pou vèsyon pòtab san enstalasyon:
```bash
npm run package:win
```

---

## 🌐 Kijan pou Pataje Fichye .EXE a sou Sit Wèb la

1. **Depoze fichye `.exe` a sou yon sèvis depo sou nwaj**:
   - **Google Drive**: Monte fichye `.exe` a, mete aksè sou *"Nenpòt moun ki gen lyen an ka telechaje"*, epi kopye lyen dirèk la.
   - **Dropbox / OneDrive**: Monte fichye a epi kopye lyen telechajman an.
   - **GitHub Releases**: Si pwojè a sou GitHub, monte `.exe` a nan seksyon *Releases*.
   - **Firebase Storage** oswa pwòp hosting pa w.

2. **Kole Lyen an nan Paramèt Legliz la sou Sit la**:
   - Ale nan meni **Paramèt (Settings) -> Desktop App (.exe) & Pataj**.
   - Kole lyen telechajman an nan espas **"Lyen Telechajman .EXE"**.
   - Klike sou **"Anrejistre Lyen an"**.

3. **Rezilta**:
   - Tout manm ak administratè ap wè yon bouton klè **"Telechaje pou Windows (.exe)"** nan ba navigasyon an ak nan sant pataj la pou yo ka telechaje l dirèkteman!
