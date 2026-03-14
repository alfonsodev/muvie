# Deploying Muvie to TestFlight (without Expo Go)

## Option A — EAS Build (recommended, builds in the cloud)

### 1. Prerequisites
- Apple Developer account ($99/year)
- App registered in [App Store Connect](https://appstoreconnect.apple.com) with bundle ID `com.muvie.chat`

### 2. Install & configure EAS
```bash
npm install -g eas-cli
eas login
cd apps/mobile
eas build:configure   # generates eas.json
```

### 3. `eas.json` — add a production profile
```json
{
  "build": {
    "production": {
      "ios": {
        "distribution": "store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      }
    }
  }
}
```

### 4. Set up Associated Domains (for passkeys)
Your `app.json` needs this before building:
```json
"ios": {
  "bundleIdentifier": "com.muvie.chat",
  "associatedDomains": ["webcredentials:muvie.chat", "applinks:muvie.chat"]
}
```
And `muvie.chat/.well-known/apple-app-site-association` must exist (it likely already does for passkeys).

### 5. Build
```bash
eas build --platform ios --profile production
```
EAS will prompt you to log into Apple and handle certificates/provisioning profiles automatically.

### 6. Submit to TestFlight
```bash
eas submit --platform ios --latest
```
Or combine build + submit in one shot:
```bash
eas build --platform ios --profile production --auto-submit
```

### 7. Add testers
In App Store Connect → TestFlight → add internal/external testers.

---

## Option B — Local Xcode build (no EAS, needs a Mac)

### 1. Generate the native project
```bash
cd apps/mobile
npx expo prebuild --platform ios --clean
```

### 2. Install pods
```bash
cd ios && pod install && cd ..
```

### 3. Open in Xcode
```bash
open ios/muvie.xcworkspace
```

### 4. Configure signing
- Select your team under **Signing & Capabilities**
- Verify bundle ID is `com.muvie.chat`
- Check **Associated Domains** capability is present (`webcredentials:muvie.chat`)

### 5. Archive
- Set scheme to **Release**, destination to **Any iOS Device**
- **Product → Archive**

### 6. Upload
- In the Organizer, click **Distribute App → App Store Connect → Upload**
- Wait for processing (~10 min), then add testers in TestFlight

---

## Which to choose

| | EAS Build | Local Xcode |
|---|---|---|
| Mac required | No | Yes |
| Build time | ~15 min (cloud) | ~5 min (local) |
| Certificate management | Automatic | Manual |
| Cost | Free tier: 30 builds/month | Free |
| `react-native-passkey` | ✓ | ✓ |

**EAS is the path of least resistance** unless you already have Xcode set up and prefer full control.

> **Note:** Since the app uses `react-native-passkey` (a native module), Expo Go won't work anyway — you need a proper build either way.
