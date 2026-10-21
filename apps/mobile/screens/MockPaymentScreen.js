import React, {
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import api from '../services/api';
import getFriendlyErrorMessage from '../utils/getFriendlyErrorMessage';

export default function MockPaymentScreen({
  bike,
  userMobile,
  onBack,
  onPaymentComplete,
}) {

  const [loading, setLoading] =
    useState(false);

  const amount =
    Number(bike?.pricePerHour || 0);

  const runPayment =
    async (status) => {
      try {
        setLoading(true);

        const paymentResponse =
          await api.post(
            '/payments/mock',
            {
              bikeId: bike.id,
              userMobile,
              amount,
              status,
            }
          );

        if (
          paymentResponse.data.payment.status ===
          'FAILED'
        ) {
          Alert.alert(
            'Payment Failed',
            'This is a local mock failure. Try success to continue.'
          );
          return;
        }

        const bookingResponse =
          await api.post(
            '/bookings',
            {
              bikeId: bike.id,
              userMobile,
              paymentId:
                paymentResponse.data.payment.id,
            }
          );

        onPaymentComplete &&
          onPaymentComplete({
            ...bookingResponse.data.booking,
            bike,
            payment:
              paymentResponse.data.payment,
          });
      } catch (error) {
        Alert.alert(
          'Payment Error',
          getFriendlyErrorMessage(
            error,
            'Unable to complete mock payment. Please try again.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

  if (!bike) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F7F7F7',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontWeight: '900',
          }}
        >
          No bike selected.
        </Text>
        <TouchableOpacity
          onPress={onBack}
          style={{
            backgroundColor: '#111111',
            padding: 16,
            borderRadius: 16,
            marginTop: 18,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              textAlign: 'center',
              fontWeight: '900',
            }}
          >
            Back
          </Text>
        </TouchableOpacity>
      </View>
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
        Mock Payment
      </Text>

      <View
        style={{
          backgroundColor: '#111111',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: '#F5C400',
            fontWeight: '900',
            marginBottom: 8,
          }}
        >
          Local Testing Mode
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '900',
          }}
        >
          {bike.bikeName}
        </Text>
        <Text
          style={{
            color: '#D7D7D7',
            marginTop: 6,
          }}
        >
          {bike.hotelName}, {bike.city}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          padding: 18,
          borderColor: '#ECECEC',
          borderWidth: 1,
          marginBottom: 18,
        }}
      >
        <Text
          style={{
            color: '#777777',
            fontWeight: '800',
          }}
        >
          Total Payable
        </Text>
        <Text
          style={{
            color: '#111111',
            fontSize: 34,
            fontWeight: '900',
            marginTop: 6,
          }}
        >
          Rs {amount}
        </Text>
        <Text
          style={{
            color: '#777777',
            marginTop: 8,
          }}
        >
          This does not charge real money. It creates a local mock payment record.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#F5C400"
        />
      ) : (
        <>
          <TouchableOpacity
            onPress={() =>
              runPayment('SUCCESS')
            }
            style={{
              backgroundColor: '#22C55E',
              padding: 18,
              borderRadius: 16,
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
              Simulate Payment Success
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              runPayment('FAILED')
            }
            style={{
              backgroundColor: '#FFFFFF',
              padding: 18,
              borderRadius: 16,
              borderColor: '#FECACA',
              borderWidth: 1,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: '#DC2626',
                textAlign: 'center',
                fontWeight: '900',
              }}
            >
              Simulate Payment Failure
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={onBack}
        disabled={loading}
        style={{
          backgroundColor: '#111111',
          padding: 16,
          borderRadius: 16,
          alignItems: 'center',
          marginTop: 'auto',
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
