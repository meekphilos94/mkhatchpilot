# Firestore Setup

Use these files when configuring the MK Hatch Pilot Firebase project:

- `firestore.rules`
- `firestore.indexes.json`

## Rules

In Firebase Console:

1. Open `Build -> Firestore Database`.
2. Open the `Rules` tab.
3. Replace the default rules with the contents of `firestore.rules`.
4. Publish the rules.

These rules currently protect:

- `batches`
- `dailyLogs`
- `marketplaceListings`

Each signed-in user can only read and write their own documents.

## Indexes

In Firebase Console:

1. Open `Build -> Firestore Database`.
2. Open the `Indexes` tab.
3. Create the following composite indexes if Firebase prompts for them, or use the Firebase CLI later with `firestore.indexes.json`.

Required indexes:

- `batches`: `ownerId ASC`, `startDate DESC`
- `dailyLogs`: `ownerId ASC`, `loggedAt DESC`
- `marketplaceListings`: `sellerId ASC`, `createdAt DESC`

## Current Collections

### `batches`

Expected fields:

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

### `dailyLogs`

Expected fields:

- `ownerId`
- `batchId`
- `loggedAt`
- `dayNumber`
- `temperatureC`
- `humidityPercent`
- `eggsTurned`
- `waterAdded`
- `notes`

### `marketplaceListings`

Expected fields:

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
