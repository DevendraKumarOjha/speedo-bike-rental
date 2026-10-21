import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import api from '../services/api';

export default function UserDashboard({
  onBrowseBikes,
  onBookings,
  onLogout,
}) {

  const [availableCount, setAvailableCount] =
    useState(0);

  const [topBike, setTopBike] =
    useState(null);

  useEffect(() => {
    const loadBikes = async () => {
      try {
        const response =
          await api.get('/bikes');

        const available =
          response.data.filter(
            bike =>
              bike.status === 'AVAILABLE'
          );

        setAvailableCount(available.length);
        setTopBike(available[0] || null);
      } catch (error) {
        console.log(
          'USER HOME ERROR',
          error?.response?.data || error
        );
      }
    };

    loadBikes();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F7F7F7',
      }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingTop: 56,
          paddingBottom: 96,
        }}
      >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Feather
              name="map-pin"
              size={15}
              color="#111111"
            />
          <Text
            style={{
              color: '#111111',
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            Jaipur, Rajasthan
          </Text>
          </View>
          <Text
            style={{
              color: '#777777',
              marginTop: 4,
            }}
          >
            Find your next ride
          </Text>
        </View>

        <TouchableOpacity
          onPress={onLogout}
          style={{
            backgroundColor: '#111111',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '800',
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: '#111111',
          borderRadius: 20,
          padding: 20,
          marginBottom: 22,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '800',
            marginBottom: 8,
          }}
        >
          WEEKEND OFFER
        </Text>
        <Text
          style={{
            color: '#F5C400',
            fontSize: 30,
            fontWeight: '900',
          }}
        >
          Flat 20% OFF
        </Text>
        <Text
          style={{
            color: '#D7D7D7',
            marginTop: 6,
            marginBottom: 18,
          }}
        >
          on all city bikes
        </Text>
        <TouchableOpacity
          onPress={onBrowseBikes}
          style={{
            backgroundColor: '#22C55E',
            borderRadius: 12,
            padding: 14,
            alignSelf: 'flex-start',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '900',
            }}
          >
            Book Now
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 22,
        }}
      >
        {[
          ['All Bikes', availableCount],
          ['Sports', topBike ? 1 : 0],
          ['Cruiser', 0],
        ].map(([label, count]) => (
          <View
            key={label}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#F5C400',
                fontSize: 22,
                fontWeight: '900',
              }}
            >
              {count}
            </Text>
            <Text
              style={{
                color: '#111111',
                fontSize: 12,
                fontWeight: '700',
                marginTop: 4,
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <Text
        style={{
          color: '#111111',
          fontSize: 18,
          fontWeight: '900',
          marginBottom: 12,
        }}
      >
        Nearby Hotels
      </Text>

      <TouchableOpacity
        onPress={onBrowseBikes}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          padding: 16,
          marginBottom: 20,
          borderColor: '#E8E8E8',
          borderWidth: 1,
        }}
      >
        {topBike?.imageUrl ? (
          <Image
            source={{ uri: topBike.imageUrl }}
            style={{
              height: 130,
              borderRadius: 16,
              marginBottom: 12,
              backgroundColor: '#222222',
            }}
          />
        ) : (
          <MaterialCommunityIcons
            name="motorbike"
            size={60}
            color="#F5C400"
          />
        )}
        <Text
          style={{
            color: '#111111',
            fontWeight: '900',
            fontSize: 16,
          }}
        >
          {topBike?.hotelName || 'The Royal Palace Hotel'}
        </Text>
        <Text
          style={{
            color: '#777777',
            marginTop: 6,
          }}
        >
          4.5 rating | {availableCount} bikes available
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onBrowseBikes}
        style={{
          backgroundColor: '#F5C400',
          borderRadius: 16,
          padding: 18,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#111111',
            fontWeight: '900',
            fontSize: 16,
          }}
        >
          Explore Available Bikes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onBookings}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 18,
          alignItems: 'center',
          borderColor: '#E8E8E8',
          borderWidth: 1,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: '#111111',
            fontWeight: '900',
            fontSize: 16,
          }}
        >
          My Bookings
        </Text>
      </TouchableOpacity>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          backgroundColor: '#111111',
          borderRadius: 22,
          padding: 12,
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}
      >
        <TouchableOpacity
          onPress={onBrowseBikes}
          style={{
            alignItems: 'center',
            flex: 1,
          }}
        >
          <MaterialCommunityIcons
            name="motorbike"
            size={22}
            color="#F5C400"
          />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '800',
              marginTop: 3,
            }}
          >
            Bikes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBookings}
          style={{
            alignItems: 'center',
            flex: 1,
          }}
        >
          <Feather
            name="calendar"
            size={22}
            color="#FFFFFF"
          />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '800',
              marginTop: 3,
            }}
          >
            Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onLogout}
          style={{
            alignItems: 'center',
            flex: 1,
          }}
        >
          <Feather
            name="user"
            size={22}
            color="#FFFFFF"
          />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '800',
              marginTop: 3,
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
