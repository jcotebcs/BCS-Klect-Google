
/**
 * TACTICAL GOOGLE DRIVE & PHOTOS INTEGRATION SERVICE
 * Manages OAuth2 flows and Google Picker instantiation for cloud asset retrieval.
 */

declare const gapi: any;
declare const google: any;

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/photoslibrary.readonly';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

let tokenClient: any;
let accessToken: string | null = null;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl?: string;
  url?: string;
  isPhotoLibrary?: boolean;
}

export async function initGoogleApi() {
  return new Promise<void>((resolve, reject) => {
    try {
      const gapiScript = document.createElement('script');
      gapiScript.src = "https://apis.google.com/js/api.js";
      gapiScript.onload = () => {
        gapi.load('client:picker', async () => {
          await gapi.client.init({
            apiKey: process.env.API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
          resolve();
        });
      };
      document.head.appendChild(gapiScript);

      const gsiScript = document.createElement('script');
      gsiScript.src = "https://accounts.google.com/gsi/client";
      gsiScript.onload = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: '855423164104-p0q82h3969h73v49o0582t8shl5unskd.apps.googleusercontent.com', 
          scope: SCOPES,
          callback: '', 
        });
      };
      document.head.appendChild(gsiScript);
    } catch (err) {
      reject(err);
    }
  });
}

export async function authenticateDrive(): Promise<string> {
  if (accessToken) return accessToken;
  
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("GSI Client not initialized"));
      return;
    }

    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        reject(response);
      }
      accessToken = response.access_token;
      resolve(response.access_token);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

function createPicker(token: string, viewId: any, callback: (data: any) => void) {
  const picker = new google.picker.PickerBuilder()
    .addView(viewId)
    .setOAuthToken(token)
    .setDeveloperKey(process.env.API_KEY)
    .setCallback(callback)
    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    .build();
  picker.setVisible(true);
}

export async function openDrivePicker(): Promise<DriveFile[]> {
  const token = await authenticateDrive();
  return new Promise((resolve) => {
    createPicker(token, google.picker.ViewId.DOCS_IMAGES, (data: any) => {
      if (data.action === google.picker.Action.PICKED) {
        resolve(data.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          thumbnailUrl: doc.thumbnails?.[0]?.url || doc.url,
          isPhotoLibrary: false
        })));
      } else if (data.action === google.picker.Action.CANCEL) {
        resolve([]);
      }
    });
  });
}

export async function openPhotosPicker(): Promise<DriveFile[]> {
  const token = await authenticateDrive();
  return new Promise((resolve) => {
    const photosView = new google.picker.PhotosView()
      .setMultiSelectEnabled(true)
      .setType(google.picker.PhotosView.Type.PHOTOS);
      
    createPicker(token, photosView, (data: any) => {
      if (data.action === google.picker.Action.PICKED) {
        resolve(data.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name || 'Photo Asset',
          mimeType: 'image/jpeg',
          thumbnailUrl: doc.thumbnails?.[0]?.url || doc.url,
          url: doc.url,
          isPhotoLibrary: true
        })));
      } else if (data.action === google.picker.Action.CANCEL) {
        resolve([]);
      }
    });
  });
}

export async function downloadDriveFileAsBase64(file: DriveFile): Promise<string> {
  const token = await authenticateDrive();
  
  // For Photos, we might have a direct URL or need to fetch via MediaItems API
  // Simplification for this environment: If it has a URL and is from Photos, try fetching direct
  const fetchUrl = file.isPhotoLibrary 
    ? (file.url || `https://photoslibrary.googleapis.com/v1/mediaItems/${file.id}`)
    : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  const response = await fetch(fetchUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
