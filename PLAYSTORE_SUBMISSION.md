# Play Store Submission Prep

Package name:

- `com.mkhatchpilot`

Current public web URL:

- `https://mkhatch-pilot.web.app`

Privacy policy URL after web deploy:

- `https://mkhatch-pilot.web.app/privacy-policy.html`

## Recommended Release Flow

1. Push the latest release-ready code to `master`
2. Build a release APK for final device testing
3. Build an Android App Bundle (`.aab`) for Play Store upload
4. Upload to Play Console internal testing first
5. Verify sign-in, profile, hatch flow, marketplace flow, and notifications
6. Promote to production only after internal testing passes

## GitHub Secrets Needed For Android Builds

Add these GitHub Actions secrets in the repository settings:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

## Play Console Details To Prepare

- App name: `MK Hatch Pilot`
- Default language
- App category
- Support email
- Privacy policy URL
- Data safety answers
- Content rating answers
- Target audience information

## Android Assets To Prepare

- App icon: `512 x 512`
- Feature graphic: `1024 x 500`
- At least 2 to 8 phone screenshots

Recommended screenshots:

- Today dashboard
- Batch creation
- Daily log
- Candling tracker
- Hatch summary and brooding guidance
- Marketplace listing creation
- Buyer board

## Final Product Checks Before Submission

- No demo data for new live users
- Google sign-in works on release build
- Firebase rules and indexes are already deployed
- MeekyCart product feed loads in production
- Public marketplace listings open correctly
- Seller verification flow works
- New user onboarding/profile save works
