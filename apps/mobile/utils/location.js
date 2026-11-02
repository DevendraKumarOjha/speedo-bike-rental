import * as Location from 'expo-location';

export async function getCurrentLocation(requestPermission = false) {
  const permission = requestPermission
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();

  if (!permission.granted) {
    return {
      status: 'permission-denied',
      canAskAgain: permission.canAskAgain,
    };
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    return { status: 'services-disabled' };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  let place = null;
  try {
    [place] = await Location.reverseGeocodeAsync(position.coords);
  } catch (error) {
    console.warn(
      '[LOCATION GEOCODING UNAVAILABLE]',
      error?.message || 'Could not resolve the current city.'
    );
  }

  const city = place?.city || place?.district || place?.subregion;
  const region = place?.region || '';

  return {
    status: 'ready',
    location: {
      city: city || null,
      district: place?.district || '',
      subregion: place?.subregion || '',
      region,
      displayName: city
        ? [city, region].filter(Boolean).join(', ')
        : 'Current location (city unavailable)',
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    },
  };
}

const normalizeLocationName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function bikeIsInLocation(bike, location) {
  if (!bike?.city || !location?.city) {
    return false;
  }

  const bikeCityParts = String(bike.city)
    .split(/[,/|]/)
    .map(normalizeLocationName)
    .filter(Boolean);
  const locationNames = [
    location.city,
    location.district,
    location.subregion,
  ]
    .map(normalizeLocationName)
    .filter(Boolean);

  return bikeCityParts.some((bikeCity) =>
    locationNames.some(
      (locationName) =>
        bikeCity === locationName ||
        bikeCity.startsWith(`${locationName} `)
    )
  );
}
