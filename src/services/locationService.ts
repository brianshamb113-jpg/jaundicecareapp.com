import { openOfflineDb, putStoreItem, getStoreItem } from './offlineDb';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
  capturedAt: string;
  source: 'gps' | 'cached' | 'manual';
}

const LOCATION_KEY = 'current';

export async function getCachedLocation(): Promise<LocationData | null> {
  return getStoreItem<LocationData>('locations', LOCATION_KEY);
}

export async function cacheLocation(location: LocationData): Promise<void> {
  await putStoreItem('locations', { ...location, id: LOCATION_KEY });
}

export function getLocationPermission(): PermissionState | 'unsupported' {
  if (!navigator.permissions) return 'unsupported';
  return 'prompt';
}

export async function requestCurrentLocation(): Promise<LocationData> {
  if (!navigator.geolocation) throw new Error('Location services are not available on this device.');

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          address: '',
          capturedAt: new Date().toISOString(),
          source: 'gps',
        };
        await cacheLocation(location);
        resolve(location);
      },
      (error) => reject(new Error(getLocationError(error))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

export function watchLocation(
  onLocation: (location: LocationData) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!navigator.geolocation) {
    onError?.(new Error('Location services are not available on this device.'));
    return () => undefined;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const location: LocationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        address: '',
        capturedAt: new Date().toISOString(),
        source: 'gps',
      };
      void cacheLocation(location);
      onLocation(location);
    },
    (error) => onError?.(new Error(getLocationError(error))),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

export async function resolveLocation(): Promise<LocationData> {
  try {
    return await requestCurrentLocation();
  } catch (error) {
    const cached = await getCachedLocation();
    if (cached) return { ...cached, source: 'cached' };
    throw error;
  }
}

export function mapsUrl(location: Pick<LocationData, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
}

function getLocationError(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return 'Location permission was denied. You can enter your location manually instead.';
  if (error.code === error.POSITION_UNAVAILABLE) return 'Your current location could not be found. Try moving outdoors or enter it manually.';
  return 'Location detection timed out. Please try again or enter your location manually.';
}

export async function ensureOfflineDb(): Promise<void> {
  await openOfflineDb();
}
