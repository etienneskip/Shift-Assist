
# Google Maps Integration Guide

This guide explains how to set up and use Google Maps for geocoding and map display in the Support Worker Shift app.

## Overview

The app integrates Google Maps API for:
- **Geocoding**: Converting client addresses to latitude/longitude coordinates
- **Static Maps**: Displaying client locations on map images

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Geocoding API
   - Maps Static API
4. Create credentials (API Key)
5. Restrict the API key (recommended):
   - For Geocoding API: Restrict to your server IP or use HTTP referrer restrictions
   - For Static Maps API: Restrict to your app's bundle identifier

### 2. Configure the API Key

Add your Google Maps API key to `app.json`:

```json
{
  "expo": {
    "extra": {
      "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
    }
  }
}
```

**Important**: Never commit your actual API key to version control. Use environment variables or secure configuration management.

### 3. Rebuild the App

After adding the API key, rebuild your app:

```bash
# For development
npm run dev

# For production builds
eas build --platform ios
eas build --platform android
```

## Features

### Client Management (`/clients`)

Service providers can:
- Add new clients with name, address, phone, email, and notes
- Automatically geocode addresses to get coordinates
- View client locations on individual static maps
- Delete clients
- See which clients have valid locations

**Geocoding Process**:
1. User enters client address
2. App calls Google Geocoding API
3. If successful, coordinates are saved with the client
4. If failed, user can choose to add client without location

### Clients Map View (`/clients-map`)

Service providers can:
- View all clients with valid locations on a single map
- See a list of clients with and without locations
- Navigate to client management screen

**Map Generation**:
- Automatically fits all client markers in view
- Shows count of locations
- Updates when clients are added/removed

## API Utilities

### `utils/googleMaps.ts`

#### `geocodeAddress(address: string): Promise<Location | null>`

Converts an address string to latitude/longitude coordinates.

```typescript
import { geocodeAddress } from '@/utils/googleMaps';

const location = await geocodeAddress('1600 Amphitheatre Parkway, Mountain View, CA');
if (location) {
  console.log(`Lat: ${location.lat}, Lng: ${location.lng}`);
}
```

#### `getStaticMapUrl(lat, lng, zoom?, width?, height?, markers?): string`

Generates a URL for a static map image centered on a location.

```typescript
import { getStaticMapUrl } from '@/utils/googleMaps';

const mapUrl = getStaticMapUrl(37.4220, -122.0841, 15, 600, 300);
// Use mapUrl in an <Image> component
```

#### `getStaticMapUrlForMultipleLocations(locations, width?, height?): string`

Generates a URL for a static map showing multiple locations with auto-fit zoom.

```typescript
import { getStaticMapUrlForMultipleLocations } from '@/utils/googleMaps';

const locations = [
  { lat: 37.4220, lng: -122.0841 },
  { lat: 37.7749, lng: -122.4194 },
];
const mapUrl = getStaticMapUrlForMultipleLocations(locations, 600, 400);
```

#### `batchGeocodeAddresses(addresses: string[]): Promise<(Location | null)[]>`

Geocodes multiple addresses in parallel.

```typescript
import { batchGeocodeAddresses } from '@/utils/googleMaps';

const addresses = [
  '1600 Amphitheatre Parkway, Mountain View, CA',
  '1 Apple Park Way, Cupertino, CA',
];
const locations = await batchGeocodeAddresses(addresses);
```

## Backend Integration

The backend provides CRUD endpoints for clients:

- `GET /api/clients` - Get all clients for authenticated service provider
- `POST /api/clients` - Create new client with optional coordinates
- `GET /api/clients/:id` - Get single client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

**Database Schema**:
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  serviceProviderId UUID REFERENCES users(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Usage Examples

### Adding a Client with Geocoding

```typescript
import { geocodeAddress } from '@/utils/googleMaps';
import { authenticatedPost } from '@/utils/api';

const addClient = async (name: string, address: string) => {
  // Geocode the address
  const location = await geocodeAddress(address);
  
  // Create client with coordinates
  const client = await authenticatedPost('/api/clients', {
    name,
    address,
    latitude: location?.lat,
    longitude: location?.lng,
  });
  
  return client;
};
```

### Displaying a Client Location

```typescript
import { Image } from 'react-native';
import { getStaticMapUrl } from '@/utils/googleMaps';

const ClientMap = ({ client }) => {
  if (!client.latitude || !client.longitude) {
    return <Text>No location available</Text>;
  }
  
  const mapUrl = getStaticMapUrl(
    client.latitude,
    client.longitude,
    15,
    600,
    300
  );
  
  return (
    <Image
      source={{ uri: mapUrl }}
      style={{ width: '100%', height: 300 }}
      resizeMode="cover"
    />
  );
};
```

## Error Handling

The utilities include comprehensive error handling:

- **API Key Not Configured**: Logs warning and returns null/empty string
- **Invalid Address**: Returns null from geocoding
- **Network Errors**: Catches and logs errors, returns null
- **API Errors**: Logs status and error messages

## Best Practices

1. **Cache Geocoding Results**: Store coordinates in database to avoid repeated API calls
2. **Validate Addresses**: Prompt users to verify geocoded locations
3. **Handle Failures Gracefully**: Allow users to add clients even if geocoding fails
4. **Rate Limiting**: Be aware of Google Maps API rate limits
5. **API Key Security**: Never expose API keys in client-side code for production

## Limitations

- **Static Maps Only**: This implementation uses static map images, not interactive maps
- **No react-native-maps**: Interactive maps with react-native-maps are not supported in this environment
- **Web Support**: Static maps work on all platforms (iOS, Android, Web)

## Troubleshooting

### Geocoding Returns Null

- Check that API key is configured in `app.json`
- Verify Geocoding API is enabled in Google Cloud Console
- Check API key restrictions
- Ensure address format is valid

### Maps Not Displaying

- Check that Maps Static API is enabled
- Verify API key has proper permissions
- Check network connectivity
- Look for errors in console logs

### API Key Issues

- Ensure API key is added to `app.json` under `expo.extra.googleMapsApiKey`
- Rebuild the app after adding the key
- Check that the key has no leading/trailing spaces

## Support

For issues with:
- **Google Maps API**: Check [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- **App Integration**: Review the code in `utils/googleMaps.ts` and `app/clients.tsx`
- **Backend Issues**: Check backend logs and API responses
