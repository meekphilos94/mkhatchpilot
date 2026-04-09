import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { getFirebaseStorage } from './firebase';

async function uriToBlob(uri: string) {
  const response = await fetch(uri);
  return response.blob();
}

export async function uploadMarketplaceImage(params: {
  ownerId: string;
  listingTitle: string;
  uri: string;
}) {
  const storage = getFirebaseStorage();

  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const safeTitle = params.listingTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const path = `marketplace/${params.ownerId}/${Date.now()}-${safeTitle || 'listing'}.jpg`;
  const storageRef = ref(storage, path);
  const blob = await uriToBlob(params.uri);

  await uploadBytes(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}
