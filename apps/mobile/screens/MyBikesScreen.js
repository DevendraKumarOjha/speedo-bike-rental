import React,
{
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from 'react-native';

import {
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';

import api from '../services/api';
import getFriendlyErrorMessage from '../utils/getFriendlyErrorMessage';

const statusColor = {
  AVAILABLE: '#15803D',
  BOOKED: '#DC2626',
  MAINTENANCE: '#B45309',
  UNAVAILABLE: '#6B7280',
};

export default function MyBikesScreen({
  adminMobile,
  onBack,
}) {

  const [bikes, setBikes] =
    useState([]);
  const [selectedBike, setSelectedBike] =
    useState(null);
  const [bikeBookings, setBikeBookings] =
    useState([]);
  const [form, setForm] =
    useState({});

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    loadBikes();
  }, []);

  const loadBikes =
    async () => {
      try {
        const response =
          await api.get(
            `/admin/bikes/${adminMobile}`
          );

        setBikes(response.data);
      } catch (error) {
        Alert.alert(
          'Unable To Load Bikes',
          getFriendlyErrorMessage(
            error,
            'Unable to load your bikes. Please try again.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

  const selectBike =
    async (bike) => {
      setSelectedBike(bike);
      setForm({
        bikeName: bike.bikeName,
        bikeNumber: bike.bikeNumber,
        hotelName: bike.hotelName,
        city: bike.city,
        pricePerHour:
          String(bike.pricePerHour),
        category: bike.category || 'Sports',
        imageUrl: bike.imageUrl || '',
        hotelImageUrl: bike.hotelImageUrl || '',
      });

      try {
        const response =
          await api.get(
            `/admin/bikes/${bike.id}/bookings`
          );

        setBikeBookings(response.data);
      } catch (error) {
        setBikeBookings([]);
      }
    };

  const updateForm =
    (key, value) => {
      setForm({
        ...form,
        [key]: value,
      });
    };

  const saveBike =
    async () => {
      try {
        setSaving(true);

        const response =
          await api.put(
            `/admin/bikes/${selectedBike.id}`,
            {
              ...form,
              pricePerHour:
                Number(form.pricePerHour),
            }
          );

        Alert.alert(
          'Success',
          response.data.message
        );

        setSelectedBike(null);
        loadBikes();
      } catch (error) {
        Alert.alert(
          'Error',
          getFriendlyErrorMessage(
            error,
            'Unable to update bike'
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const changeStatus =
    async (status) => {
      try {
        setSaving(true);

        const response =
          await api.patch(
            `/admin/bikes/${selectedBike.id}/status`,
            {
              status,
            }
          );

        Alert.alert(
          'Success',
          response.data.message
        );

        setSelectedBike(null);
        loadBikes();
      } catch (error) {
        Alert.alert(
          'Error',
          getFriendlyErrorMessage(
            error,
            'Unable to update status'
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const deleteBike =
    () => {
      Alert.alert(
        'Delete Bike',
        'This removes the bike if it has no upcoming or active booking.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.delete(
                  `/admin/bikes/${selectedBike.id}`
                );
                Alert.alert(
                  'Success',
                  'Bike deleted successfully'
                );
                setSelectedBike(null);
                loadBikes();
              } catch (error) {
                Alert.alert(
                  'Error',
                  getFriendlyErrorMessage(
                    error,
                    'Unable to delete bike'
                  )
                );
              }
            },
          },
        ]
      );
    };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F7F7F7',
          padding: 20,
          paddingTop: 56,
        }}
      >
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={{
              height: 118,
              backgroundColor: '#ECECEC',
              borderRadius: 18,
              marginBottom: 12,
            }}
          />
        ))}
      </View>
    );
  }

  if (selectedBike) {
    return (
      <ScrollView
        style={{
          flex: 1,
          backgroundColor: '#F7F7F7',
        }}
        contentContainerStyle={{
          padding: 20,
          paddingTop: 56,
          paddingBottom: 34,
        }}
      >
        <Text
          style={{
            color: '#111111',
            fontSize: 26,
            fontWeight: '900',
            marginBottom: 16,
          }}
        >
          Manage Bike
        </Text>

        {form.imageUrl ? (
          <Image
            source={{ uri: form.imageUrl }}
            style={{
              height: 170,
              borderRadius: 18,
              marginBottom: 14,
              backgroundColor: '#ECECEC',
            }}
          />
        ) : (
          <View
            style={{
              height: 170,
              borderRadius: 18,
              marginBottom: 14,
              backgroundColor: '#111111',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name="motorbike"
              size={60}
              color="#F5C400"
            />
          </View>
        )}

        {[
          ['bikeName', 'Bike Name'],
          ['bikeNumber', 'Bike Number'],
          ['hotelName', 'Hotel Name'],
          ['city', 'City'],
          ['pricePerHour', 'Price Per Hour'],
          ['category', 'Category'],
          ['imageUrl', 'Bike Image URL'],
          ['hotelImageUrl', 'Hotel Image URL'],
        ].map(([key, label]) => (
          <TextInput
            key={key}
            placeholder={label}
            value={form[key]}
            onChangeText={(value) =>
              updateForm(key, value)
            }
            keyboardType={
              key === 'pricePerHour'
                ? 'numeric'
                : 'default'
            }
            autoCapitalize="none"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 15,
              marginBottom: 12,
              borderColor: '#ECECEC',
              borderWidth: 1,
            }}
          />
        ))}

        <TouchableOpacity
          onPress={saveBike}
          disabled={saving}
          style={{
            backgroundColor: '#22C55E',
            padding: 16,
            borderRadius: 16,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '900',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() =>
                changeStatus(status)
              }
              style={{
                flex: 1,
                backgroundColor:
                  status === 'AVAILABLE'
                    ? '#DCFCE7'
                    : '#FFFFFF',
                borderRadius: 12,
                padding: 12,
                borderColor: '#ECECEC',
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  color:
                    statusColor[status],
                  textAlign: 'center',
                  fontWeight: '900',
                  fontSize: 11,
                }}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text
          style={{
            color: '#111111',
            fontSize: 18,
            fontWeight: '900',
            marginBottom: 10,
          }}
        >
          Bookings For This Bike
        </Text>

        {bikeBookings.length === 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: '#777777',
                fontWeight: '800',
                textAlign: 'center',
              }}
            >
              No bookings yet.
            </Text>
          </View>
        ) : (
          bikeBookings.map((booking) => (
            <View
              key={booking.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: '#111111',
                  fontWeight: '900',
                }}
              >
                #{booking.id} - {booking.status}
              </Text>
              <Text>
                User: {booking.userMobile}
              </Text>
              <Text>
                Amount: Rs {booking.grossAmount}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          onPress={deleteBike}
          style={{
            backgroundColor: '#FEE2E2',
            padding: 16,
            borderRadius: 16,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: '#DC2626',
              fontWeight: '900',
            }}
          >
            Delete Bike
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            setSelectedBike(null)
          }
          style={{
            backgroundColor: '#111111',
            padding: 16,
            borderRadius: 16,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '900',
            }}
          >
            Back To Bikes
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          '#F7F7F7',
        padding: 20,
        paddingTop: 56,
      }}
    >
      <Text
        style={{
          color: '#111111',
          fontSize: 28,
          fontWeight: '900',
          marginBottom: 20,
        }}
      >
        My Bikes
      </Text>

      <FlatList
        data={bikes}
        contentContainerStyle={{
          paddingBottom: 86,
        }}
        keyExtractor={item =>
          item.id.toString()
        }
        ListEmptyComponent={
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons
              name="garage"
              size={44}
              color="#F5C400"
            />
            <Text
              style={{
                color: '#111111',
                fontWeight: '900',
                marginTop: 10,
              }}
            >
              No bikes registered yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              selectBike(item)
            }
            style={{
              backgroundColor:
                '#FFFFFF',
              borderRadius: 18,
              padding: 14,
              marginBottom: 12,
              borderColor: '#ECECEC',
              borderWidth: 1,
              flexDirection: 'row',
              gap: 12,
            }}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 14,
                  backgroundColor: '#ECECEC',
                }}
              />
            ) : (
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 14,
                  backgroundColor: '#111111',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="motorbike"
                  size={38}
                  color="#F5C400"
                />
              </View>
            )}
            <View
              style={{
                flex: 1,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    color: '#111111',
                    fontSize: 17,
                    fontWeight: '900',
                    flex: 1,
                  }}
                >
                  {item.bikeName}
                </Text>
                <Feather
                  name="edit-2"
                  size={16}
                  color="#777777"
                />
              </View>
              <Text
                style={{
                  color: '#666666',
                  marginTop: 5,
                }}
              >
                {item.bikeNumber} | {item.hotelName}
              </Text>
              <Text
                style={{
                  color: '#111111',
                  marginTop: 8,
                  fontWeight: '800',
                }}
              >
                Rs {item.pricePerHour}/hour | {item.category || 'Sports'}
              </Text>
              <Text
                style={{
                  color:
                    statusColor[item.status] ||
                    '#777777',
                  marginTop: 8,
                  fontWeight: '900',
                }}
              >
                {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        onPress={onBack}
        style={{
          backgroundColor: '#111111',
          padding: 16,
          borderRadius: 16,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: '900',
          }}
        >
          Back
        </Text>
      </TouchableOpacity>
    </View>
  );
}
