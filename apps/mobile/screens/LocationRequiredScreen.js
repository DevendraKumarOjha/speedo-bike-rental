import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function LocationRequiredScreen({
  status,
  canAskAgain,
  errorMessage,
  onEnable,
  onOpenSettings,
  onRetry,
}) {
  const needsSettings =
    status === 'services-disabled' ||
    (status === 'permission-denied' && !canAskAgain);
  const message =
    status === 'services-disabled'
      ? 'Turn on your phone’s Location/GPS setting to continue.'
      : status === 'permission-denied'
        ? 'Allow location access so we can show bikes available in your city.'
        : status === 'address-unavailable'
          ? 'We could not identify your city. Check your connection and try again.'
          : status === 'error'
            ? errorMessage || 'Unable to get your location. Please try again.'
            : 'Your current location is required to find bikes available in your city.';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F7F7F7',
        justifyContent: 'center',
        padding: 28,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
        }}
      >
        {status === 'loading' ? (
          <ActivityIndicator size="large" color="#F5C400" />
        ) : (
          <Feather name="map-pin" size={42} color="#F5C400" />
        )}
        <Text
          style={{
            color: '#111111',
            fontSize: 22,
            fontWeight: '900',
            marginTop: 18,
            textAlign: 'center',
          }}
        >
          Location required
        </Text>
        <Text
          style={{
            color: '#666666',
            fontSize: 15,
            lineHeight: 22,
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
        <TouchableOpacity
          disabled={status === 'loading'}
          onPress={needsSettings ? onOpenSettings : onEnable}
          style={{
            backgroundColor: '#F5C400',
            borderRadius: 14,
            marginTop: 22,
            paddingHorizontal: 20,
            paddingVertical: 14,
            width: '100%',
          }}
        >
          <Text
            style={{
              color: '#111111',
              fontWeight: '900',
              textAlign: 'center',
            }}
          >
            {needsSettings ? 'Open location settings' : 'Enable location'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={status === 'loading'}
          onPress={onRetry}
          style={{
            marginTop: 12,
            padding: 12,
          }}
        >
          <Text style={{ color: '#555555', fontWeight: '800' }}>
            I’ve enabled it — check again
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
