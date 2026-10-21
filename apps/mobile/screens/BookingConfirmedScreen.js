import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

export default function BookingConfirmedScreen({
  booking,
  onHome,
  onBrowse,
}) {

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F7F7F7',
      }}
    >
      <View
        style={{
          backgroundColor: '#078A3D',
          padding: 28,
          paddingTop: 70,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            borderColor: '#FFFFFF',
            borderWidth: 3,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 36,
              fontWeight: '900',
            }}
          >
            OK
          </Text>
        </View>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 26,
            fontWeight: '900',
          }}
        >
          Booking Confirmed
        </Text>
        <Text
          style={{
            color: '#D8FFE8',
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          Your booking is upcoming. Start the trip from My Bookings when you pick up the bike.
        </Text>
      </View>

      <View
        style={{
          margin: 20,
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          padding: 18,
          borderColor: '#ECECEC',
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            color: '#777777',
            fontSize: 12,
            fontWeight: '800',
          }}
        >
          Booking ID
        </Text>
        <Text
          style={{
            color: '#111111',
            fontSize: 18,
            fontWeight: '900',
            marginBottom: 16,
          }}
        >
          #{booking?.id}
        </Text>

        <Text
          style={{
            color: '#111111',
            fontSize: 20,
            fontWeight: '900',
          }}
        >
          {booking?.bike?.bikeName || booking?.bikeName}
        </Text>
        <Text
          style={{
            color: '#666666',
            marginTop: 6,
          }}
        >
          Pickup Location
        </Text>
        <Text
          style={{
            color: '#111111',
            fontWeight: '800',
            marginTop: 3,
          }}
        >
          {booking?.bike?.hotelName}
        </Text>

        <View
          style={{
            height: 1,
            backgroundColor: '#ECECEC',
            marginVertical: 16,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text>
            Total Paid
          </Text>
          <Text
            style={{
              fontWeight: '900',
            }}
          >
            Rs {booking?.grossAmount || 0}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text>
            Booking Status
          </Text>
          <Text
            style={{
              color: '#15803D',
              fontWeight: '900',
            }}
          >
            {booking?.status || 'UPCOMING'}
          </Text>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={onBrowse}
          style={{
            backgroundColor: '#078A3D',
            padding: 16,
            borderRadius: 14,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              textAlign: 'center',
              fontWeight: '900',
            }}
          >
            Browse More Bikes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onHome}
          style={{
            backgroundColor: '#FFFFFF',
            padding: 16,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              color: '#111111',
              textAlign: 'center',
              fontWeight: '900',
            }}
          >
            Go to Home
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
