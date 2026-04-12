# MK Hatch Pilot Launch Checklist

Use this before calling the app ready for real users.

## Firebase

- Publish the latest `firestore.rules`
- Create the composite indexes in `firestore.indexes.json`
- Confirm `users`, `batches`, `dailyLogs`, `candlingRecords`, `marketplaceListings`, `listingInquiries`, `marketplaceMessages`, `savedMarketplaceListings`, and `sellerVerificationRequests` work live
- Run the in-app Profile tools:
  - `Run Firebase rules check`
  - `Seed starter data`

## Authentication

- Confirm anonymous auth works on web and Android
- Add `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- Re-test Google account upgrade flow
- Confirm sign-out and account return flow behave correctly

## Hatch Flow

- Create a batch
- Save a daily log
- Save a candling record with egg-by-egg findings
- Complete a hatch summary
- Confirm brooding guidance appears

## Marketplace Flow

- Create a draft listing
- Add an image
- Publish a listing live
- Save a listing as a buyer
- Send an inquiry
- Reply in conversation thread
- Mark a listing sold

## MeekyCart Integration

- Confirm the `meeky-hatch` collection feed loads
- Confirm product links open correctly
- Confirm MeekyCart purchase lookup finds the right hatch orders
- Confirm linked purchases surface setup guidance in the app

## Device Testing

- Test on local web
- Test on Android phone
- Test notification permissions on a real device
- Test image picking on a real device
- Confirm there are no startup crashes

## Storefront / Deployment

- Run `npm run build:web`
- Run `npm run firebase:hosting` or `npm run firebase:web`
- Build a fresh Android APK
- Re-test the APK on phone
- Decide whether to host the web build publicly
- If hosting web, verify Firebase auth and Firestore still behave correctly in production

## Admin / Operations

- Confirm seller verification request submit flow works
- Confirm admin approval flow works
- Decide how offline commission tracking will be recorded operationally
- Decide how scam reports or listing moderation will be handled

## Final Polish

- Replace any remaining raw Firebase/setup wording in the UI
- Clean up placeholder/demo text where needed
- Re-check app naming, brand text, and contact details
- Make one final pass on empty states and loading states
