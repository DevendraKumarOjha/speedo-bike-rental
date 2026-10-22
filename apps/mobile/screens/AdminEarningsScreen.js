import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import api from '../services/api';

export default function AdminEarningsScreen({
  adminMobile,
  onBack,
}) {

  const [summary, setSummary] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let isCurrent = true;

    api.get(`/admin/earnings/${adminMobile}`)
      .then((response) => {
        if (isCurrent) {
          setSummary(response.data);
        }
      })
      .catch((error) => {
        console.log(
          'ADMIN EARNINGS ERROR',
          error?.response?.data || error
        );
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [adminMobile]);

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
        Earnings
      </Text>

      <View
        style={{
          backgroundColor: '#111111',
          borderRadius: 20,
          padding: 18,
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
          Wallet Balance
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 34,
            fontWeight: '900',
          }}
        >
          Rs {summary?.wallet?.balance || 0}
        </Text>
        <Text
          style={{
            color: '#D7D7D7',
            marginTop: 6,
          }}
        >
          Rs {summary?.pendingSettlementAmount || 0} pending weekly payout
        </Text>
        <Text
          style={{
            color: '#D7D7D7',
            marginTop: 6,
          }}
        >
          Earnings shown below are after the{' '}
          {Math.round((summary?.commissionRate || 0) * 100)}% platform fee.
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          ['Gross ride amount', summary?.totalGrossAmount || 0],
          [
            `Platform fee (${Math.round((summary?.commissionRate || 0) * 100)}%)`,
            summary?.totalPlatformCommission || 0,
          ],
          ['Net earnings after fee', summary?.totalEarnings || 0],
          ['Pending payout', summary?.pendingSettlementAmount || 0],
          ['Settled', summary?.settledAmount || 0],
        ].map(([label, value]) => (
          <View
            key={label}
            style={{
              width: '48%',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 14,
              borderColor: '#ECECEC',
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                color: '#777777',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                color: '#111111',
                fontSize: 18,
                fontWeight: '900',
                marginTop: 8,
              }}
            >
              Rs {value}
            </Text>
          </View>
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
        Booked Bikes
      </Text>

      <FlatList
        data={summary?.bookings || []}
        contentContainerStyle={{
          paddingBottom: 86,
        }}
        keyExtractor={item =>
          item.id.toString()
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 15,
              marginBottom: 10,
              borderColor: '#ECECEC',
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                color: '#111111',
                fontWeight: '900',
                fontSize: 16,
              }}
            >
              {item.bikeName}
            </Text>
            <Text>Ride amount: Rs {item.grossAmount || 0}</Text>
            <Text>
              Platform fee ({Math.round((summary?.commissionRate || 0) * 100)}%): Rs{' '}
              {item.superAdminCommission || 0}
            </Text>
            <Text>Admin net amount: Rs {item.adminAmount || 0}</Text>
            <Text
              style={{
                color:
                  item.settlementStatus === 'SETTLED'
                    ? '#15803D'
                    : '#B45309',
                fontWeight: '900',
                marginTop: 6,
              }}
            >
              {item.settlementStatus}
            </Text>
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
