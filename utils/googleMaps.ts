
/**
 * Google Maps API Utilities
 * 
 * Provides utilities for geocoding addresses and generating static map images
 * using the Google Maps API.
 * 
 * Features:
 * - Geocode addresses to latitude/longitude coordinates
 * - Generate static map image URLs
 * - Error handling and logging
 * 
 * Usage:
 * 1. Configure GOOGLE_MAPS_API_KEY in app.json under expo.extra.googleMapsApiKey
 * 2. Use geocodeAddress() to convert addresses to coordinates
 * 3. Use getStaticMapUrl() to generate map image URLs
 */

import Constants from 'expo-constants';

/**
 * Google Maps API key from app.json configuration
 */
export const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';

/**
 * Check if Google Maps API is properly configured
 */
export const isGoogleMapsConfigured = (): boolean => {
  const isConfigured = !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.length > 0;
  if (!isConfigured) {
    console.warn('[Google Maps] API key is not configured! Please add it to app.json');
  }
  return isConfigured;
};

/**
 * Geocoding API response interface
 */
interface GeocodeResult {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  }>;
  status: string;
  error_message?: string;
}

/**
 * Location coordinates interface
 */
export interface Location {
  lat: number;
  lng: number;
}

/**
 * Geocode an address to latitude/longitude coordinates
 * 
 * @param address - The address to geocode (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
 * @returns Location object with lat/lng or null if geocoding fails
 */
export const geocodeAddress = async (address: string): Promise<Location | null> => {
  if (!isGoogleMapsConfigured()) {
    console.error('[Google Maps] Cannot geocode: API key not configured');
    return null;
  }

  if (!address || address.trim().length === 0) {
    console.error('[Google Maps] Cannot geocode: Address is empty');
    return null;
  }

  const encodedAddress = encodeURIComponent(address.trim());
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

  console.log('[Google Maps] Geocoding address:', address);

  try {
    const response = await fetch(url);
    const data: GeocodeResult = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('[Google Maps] Geocoding successful:', location);
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.error('[Google Maps] Geocoding failed:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('[Google Maps] Geocoding error:', error);
    return null;
  }
};

/**
 * Generate a static map image URL
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @param zoom - Zoom level (1-20, default: 15)
 * @param width - Image width in pixels (default: 600)
 * @param height - Image height in pixels (default: 300)
 * @param markers - Optional array of marker locations to display
 * @returns URL string for the static map image
 */
export const getStaticMapUrl = (
  lat: number,
  lng: number,
  zoom: number = 15,
  width: number = 600,
  height: number = 300,
  markers?: Location[]
): string => {
  if (!isGoogleMapsConfigured()) {
    console.error('[Google Maps] Cannot generate map URL: API key not configured');
    return '';
  }

  const size = `${width}x${height}`;
  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&key=${GOOGLE_MAPS_API_KEY}`;

  // Add markers if provided
  if (markers && markers.length > 0) {
    const markerParams = markers.map(m => `${m.lat},${m.lng}`).join('|');
    url += `&markers=color:red|${markerParams}`;
  } else {
    // Add a marker at the center location
    url += `&markers=color:red|${lat},${lng}`;
  }

  console.log('[Google Maps] Generated static map URL');
  return url;
};

/**
 * Generate a static map URL for multiple locations
 * Automatically fits all markers in the view
 * 
 * @param locations - Array of locations to display
 * @param width - Image width in pixels (default: 600)
 * @param height - Image height in pixels (default: 300)
 * @returns URL string for the static map image
 */
export const getStaticMapUrlForMultipleLocations = (
  locations: Location[],
  width: number = 600,
  height: number = 300
): string => {
  if (!isGoogleMapsConfigured()) {
    console.error('[Google Maps] Cannot generate map URL: API key not configured');
    return '';
  }

  if (!locations || locations.length === 0) {
    console.error('[Google Maps] Cannot generate map: No locations provided');
    return '';
  }

  const size = `${width}x${height}`;
  const markerParams = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
  
  // Use auto zoom/center by not specifying center and zoom
  const url = `https://maps.googleapis.com/maps/api/staticmap?size=${size}&markers=color:red|${markerParams}&key=${GOOGLE_MAPS_API_KEY}`;

  console.log('[Google Maps] Generated static map URL for', locations.length, 'locations');
  return url;
};

/**
 * Batch geocode multiple addresses
 * 
 * @param addresses - Array of addresses to geocode
 * @returns Array of locations (null for failed geocoding)
 */
export const batchGeocodeAddresses = async (
  addresses: string[]
): Promise<(Location | null)[]> => {
  console.log('[Google Maps] Batch geocoding', addresses.length, 'addresses');
  
  const results = await Promise.all(
    addresses.map(address => geocodeAddress(address))
  );

  const successCount = results.filter(r => r !== null).length;
  console.log('[Google Maps] Batch geocoding complete:', successCount, '/', addresses.length, 'successful');

  return results;
};
