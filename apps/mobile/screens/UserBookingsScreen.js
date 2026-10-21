import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import api from '../services/api';
import getFriendlyErrorMessage from '../utils/getFriendlyErrorMessage';

const statusColor = {
  UPCOMING: '#2563EB',
  ACTIVE: '#15803D',
  COMPLETED: '#6B7280',
  CANCELLED: '#DC2626',
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

export default function UserBookingsScreen({
  userMobile,
  onBack,
}) {

  const [bookings, setBookings] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  const loadBookings =
    async () => {
      try {
        const response =
          await api.get(
            `/bookings/user/${userMobile}`
          );

        setBookings(response.data);
      } catch (error) {
        console.log(
          'USER BOOKINGS ERROR',
          error?.response?.data || error
        );
        Alert.alert(
          'Unable To Load Bookings',
          getFriendlyErrorMessage(
            error,
            'Unable to load your bookings. Please try again.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (userMobile) {
      loadBookings();
    }
  }, [userMobile]);

  const runBookingAction =
    async (
      bookingId,
      endpoint,
      fallbackMessage
    ) => {
      try {
        setActionLoading(true);

        const response =
          await api.post(
            `/bookings/${bookingId}/${endpoint}`
          );

        Alert.alert(
          'Success',
          response.data.message
        );

        loadBookings();
      } catch (error) {
        Alert.alert(
          'Error',
          getFriendlyErrorMessage(
            error,
            fallbackMessage
          )
        );
      } finally {
        setActionLoading(false);
      }
    };

  const confirmCancel =
    (bookingId) => {
      Alert.alert(
        'Cancel Booking',
        'Your mock payment will be marked refunded and the bike will become available again.',
        [
          {
            text: 'Keep Booking',
            style: 'cancel',
          },
          {
            text: 'Cancel Booking',
            style: 'destructive',
            onPress: () =>
              runBookingAction(
                bookingId,
                'cancel',
                'Unable to cancel booking'
              ),
          },
        ]
      );
    };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#F5C400"
      />
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F7F7F7',
        padding: 20,
        paddingTop: 56,
      }}
    >
      <Text
        style={{
          color: '#111111',
          fontSize: 28,
          fontWeight: '900',
          marginBottom: 16,
        }}
      >
        My Bookings
      </Text>

      <FlatList
        data={bookings}
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
              padding: 18,
            }}
          >
            <Text
              style={{
                color: '#111111',
                textAlign: 'center',
                fontWeight: '800',
              }}
            >
              You do not have any bookings yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              borderColor: '#ECECEC',
              borderWidth: 1,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color: '#111111',
                    fontSize: 18,
                    fontWeight: '900',
                  }}
                >
                  {item.bikeName}
                </Text>
                <Text
                  style={{
                    color: '#666666',
                    marginTop: 5,
                  }}
                >
                  {item.bike?.hotelName || 'Pickup hotel'}
                </Text>
              </View>

              <Text
                style={{
                  color:
                    statusColor[item.status] ||
                    '#777777',
                  fontWeight: '900',
                }}
              >
                {item.status}
              </Text>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: '#ECECEC',
                marginVertical: 14,
              }}
            />

            <Text
              style={{
                color: '#111111',
                fontWeight: '800',
              }}
            >
              Paid Rs {item.grossAmount}
            </Text>
            <Text
              style={{
                color: '#666666',
                marginTop: 6,
              }}
            >
              Rate: Rs {item.pricePerHour || item.bike?.pricePerHour || 0}/hour
            </Text>
            <Text
              style={{
                color: '#666666',
                marginTop: 6,
              }}
            >
              Booked: {formatDateTime(item.bookingTime)}
            </Text>
            <Text
              style={{
                color: '#666666',
                marginTop: 6,
              }}
            >
              Start: {formatDateTime(item.tripStartTime)}
            </Text>
            <Text
              style={{
                color: '#666666',
                marginTop: 6,
              }}
            >
              End: {formatDateTime(item.tripEndTime)}
            </Text>
            <Text
              style={{
                color: '#666666',
                marginTop: 6,
              }}
            >
              Duration: {item.durationMinutes || 0} min | Billable: {item.billableHours || 1} hr
            </Text>
            <Text
              style={{
                color:
                  item.refundStatus === 'REFUNDED' ||
                  item.refundStatus === 'PARTIAL_REFUND_DUE'
                    ? '#DC2626'
                    : '#777777',
                marginTop: 6,
                fontWeight: '800',
              }}
            >
              Refund: {item.refundStatus || 'NOT_APPLICABLE'}
            </Text>

            {item.status === 'UPCOMING' && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <TouchableOpacity
                  disabled={actionLoading}
                  onPress={() =>
                    runBookingAction(
                      item.id,
                      'start',
                      'Unable to start trip'
                    )
                  }
                  style={{
                    flex: 1,
                    backgroundColor: '#22C55E',
                    borderRadius: 14,
                    padding: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontWeight: '900',
                    }}
                  >
                    Start Trip
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={actionLoading}
                  onPress={() =>
                    confirmCancel(item.id)
                  }
                  style={{
                    flex: 1,
                    backgroundColor: '#FEE2E2',
                    borderRadius: 14,
                    padding: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#DC2626',
                      fontWeight: '900',
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {item.status === 'ACTIVE' && (
              <TouchableOpacity
                disabled={actionLoading}
                onPress={() =>
                  runBookingAction(
                    item.id,
                    'complete',
                    'Unable to complete trip'
                  )
                }
                style={{
                  backgroundColor: '#F5C400',
                  borderRadius: 14,
                  padding: 14,
                  marginTop: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#111111',
                    fontWeight: '900',
                  }}
                >
                  End Trip
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
