# Firestore Setup

Use this guide when bringing the live MK Hatch Pilot Firebase project up to the same level as the current app.

Primary config files:

- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`
- `.firebaserc`

## Publish Rules

In Firebase Console:

1. Open `Build -> Firestore Database`.
2. Open the `Rules` tab.
3. Replace the current rules with the contents of `firestore.rules`.
4. Click `Publish`.

Or from the project root after logging in with Firebase CLI:

- `npm run firebase:rules`

The current rules cover these collections:

- `users`
- `batches`
- `dailyLogs`
- `candlingRecords`
- `marketplaceListings`
- `listingInquiries`
- `marketplaceMessages`
- `savedMarketplaceListings`
- `sellerVerificationRequests`

## Create Indexes

In Firebase Console:

1. Open `Build -> Firestore Database`.
2. Open the `Indexes` tab.
3. Create any missing composite indexes from `firestore.indexes.json`.

Or from the project root after logging in with Firebase CLI:

- `npm run firebase:indexes`
- or `npm run firebase:firestore` to push both rules and indexes

Current composite indexes:

- `batches`: `ownerId ASC`, `startDate DESC`
- `dailyLogs`: `ownerId ASC`, `loggedAt DESC`
- `marketplaceListings`: `sellerId ASC`, `createdAt DESC`
- `candlingRecords`: `ownerId ASC`, `createdAt DESC`

Notes:

- Firebase may still auto-prompt for extra indexes later if you change queries.
- `savedMarketplaceListings`, `listingInquiries`, `marketplaceMessages`, and `sellerVerificationRequests` currently rely on single-field or array indexes that Firestore usually creates automatically.

## Current Collection Purposes

### `users`

Stores account profile data, roles, seller verification status, reminder preferences, and MeekyCart order-linking email.

Important fields:

- `fullName`
- `phoneNumber`
- `location`
- `roles`
- `farmName`
- `experienceLevel`
- `onboardingComplete`
- `verificationStatus`
- `marketplaceContactPreference`
- `reminderPreferences`
- `meekyCartEmail`

### `batches`

Stores hatch batches and post-hatch results.

Important fields:

- `ownerId`
- `incubatorId`
- `eggType`
- `quantitySet`
- `fertileCount`
- `startDate`
- `expectedHatchDate`
- `status`
- `currentDay`
- `totalDays`
- `incubatorName`
- `targetTemp`
- `targetHumidity`
- `nextTask`
- `hatchedCount`
- `weakCount`
- `unhatchedCount`
- `hatchNotes`
- `completedAt`

### `dailyLogs`

Stores day-by-day incubation readings.

Important fields:

- `ownerId`
- `batchId`
- `loggedAt`
- `dayNumber`
- `temperatureC`
- `humidityPercent`
- `eggsTurned`
- `waterAdded`
- `notes`

### `candlingRecords`

Stores candling results, fertility counts, removals, and egg-by-egg notes.

Important fields:

- `ownerId`
- `batchId`
- `dayNumber`
- `fertileCount`
- `clearCount`
- `removedCount`
- `notes`
- `eggFindings`
- `createdAt`

### `marketplaceListings`

Stores draft, live, and sold marketplace listings.

Important fields:

- `sellerId`
- `sourceBatchId`
- `title`
- `category`
- `quantity`
- `price`
- `currency`
- `location`
- `status`
- `createdAt`
- `displayPrice`
- `imageUrl`
- `description`
- `availableFrom`
- `sellerName`
- `sellerPhone`
- `sellerFarmName`
- `sellerVerificationStatus`
- `contactPreference`
- `deliveryOption`
- `commissionRate`
- `grossRevenue`
- `sellerNetAmount`

### `listingInquiries`

Stores the initial buyer-to-seller inquiry thread metadata.

Important fields:

- `listingId`
- `listingTitle`
- `sellerId`
- `buyerId`
- `participantIds`
- `buyerName`
- `buyerPhone`
- `message`
- `status`
- `lastMessage`
- `lastMessageAt`
- `createdAt`

### `marketplaceMessages`

Stores message history inside buyer/seller conversations.

Important fields:

- `threadId`
- `listingId`
- `sellerId`
- `buyerId`
- `participantIds`
- `senderId`
- `senderName`
- `senderRole`
- `message`
- `createdAt`

### `savedMarketplaceListings`

Stores buyer favorites.

Important fields:

- `ownerId`
- `listingId`
- `createdAt`

### `sellerVerificationRequests`

Stores verification requests submitted by hatchers and reviewed by admins.

Important fields:

- `userId`
- `fullName`
- `farmName`
- `phoneNumber`
- `location`
- `businessType`
- `notes`
- `idDocumentReady`
- `proofOfLocationReady`
- `submittedAt`
- `status`
- `reviewNotes`
- `reviewedAt`
- `reviewerId`

## Live Setup Checklist

Use this order when finishing a fresh Firebase project:

1. Enable Authentication providers you want to use.
   Current app path:
   - anonymous auth
   - Google sign-in once Android client ID is finished
2. Publish the latest `firestore.rules`.
3. Create the composite indexes from `firestore.indexes.json`.
4. Open the app and run the Profile tools:
   - `Run Firebase rules check`
   - `Seed starter data`
5. Confirm these live flows work:
   - save profile
   - create batch
   - create daily log
   - create candling record
   - complete hatch summary
   - create marketplace listing
   - send inquiry
   - save listing

## Permission Trouble Guide

If the app banner says Firebase is connected but some features show permission problems:

- make sure the newest `firestore.rules` were published
- check whether the missing feature uses a newer collection such as:
  - `candlingRecords`
  - `savedMarketplaceListings`
  - `listingInquiries`
  - `marketplaceMessages`
  - `sellerVerificationRequests`
- create any missing indexes Firebase asks for

If a collection is still not ready, the app now falls back more softly for several optional marketplace features, but publishing the rules is still the correct fix.
