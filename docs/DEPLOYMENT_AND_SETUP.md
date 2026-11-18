# SaveSmart — Setup, Security, Testing & Deployment Guide

## 1. Platform Overview
SaveSmart consists of two connected applications sharing a single Firebase Authentication and Cloud Firestore backend (`hip-mountain-8f6jr`, Firestore database `ai-studio-9b77afd0-b35e-4b29-890a-328841dbecb6`):
- **Web Application**: React + TypeScript + Tailwind CSS v4 + Express server (`server.ts`)
- **Native Android Companion**: Kotlin + Jetpack Compose under `/android-companion/` (`in.savesmart.app`)

## 2. Environment Variables
Configure via **Settings > Secrets** (never commit secrets to git):
- `GEMINI_API_KEY`: Required on the Express server (`/api/ai/assistant`) for the Gemini AI Financial Assistant (`gemini-4-hydrogen`).
- `PREMIUM_PRICE_INR` *(optional, defaults to `99`)*: Configurable monthly price for SaveSmart Premium.
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` *(optional)*: Payment processing remains disabled until real merchant credentials are configured.

## 3. Firebase Authentication & Firestore Setup
1. Google Sign-In is pre-provisioned in Firebase Authentication.
2. **To enable Email & Password Registration / Login / Reset**:
   - Open Firebase Console for project `hip-mountain-8f6jr`.
   - Go to **Authentication > Sign-in method > Add new provider > Email/Password** and enable it.
3. **Firestore Security Rules**:
   - Hardened rules are stored in `/firestore.rules` and audited with `@firebase/eslint-plugin-security-rules`.
   - Every financial subcollection (`expenses`, `income`, `budgets`, `goals`, `notifications`, `preferences`, `private`) is strictly owner-isolated (`request.auth.uid == uid` and `email_verified == true`).
   - Administrators can inspect non-PII aggregate metrics in `/users/{uid}` without accessing private user transactions.
4. **Firebase App Check** *(recommended before public launch)*:
   - Register your web domain (reCAPTCHA Enterprise) and Android app (Play Integrity) in Firebase Console > App Check.

## 4. Local Web Development & Production Deployment
```bash
npm install
npm run lint
npm run build
npm start
```
To deploy static frontend + rules to **Firebase Hosting**:
1. Initialize Firebase Hosting (`firebase init hosting`) pointing `public` to `dist` with SPA rewrites.
2. Deploy rules and hosting (`firebase deploy --only firestore:rules,hosting`).
3. Configure your custom domain (`savesmart.in`) under **Firebase Hosting > Add custom domain** and verify DNS TXT/A records.
4. Point `/api/*` requests to your Cloud Run container running `server.ts` so `GEMINI_API_KEY` remains server-side.

## 5. Native Android Companion Build (`/android-companion`)
1. Register Android app `in.savesmart.app` in Firebase Console project `hip-mountain-8f6jr` and download `google-services.json` into `/android-companion/app/google-services.json`.
2. Open `/android-companion` in Android Studio Ladybug+ (JDK 17).
3. Build a debug APK for testing:
   ```bash
   ./gradlew assembleDebug
   ```
4. Configure a release keystore in `keystore.properties` and build a signed Android App Bundle (AAB) for Google Play:
   ```bash
   ./gradlew bundleRelease
   ```
