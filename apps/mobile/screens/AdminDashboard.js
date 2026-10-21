import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import api from '../services/api';

export default function AdminDashboard({
  adminMobile,
  onAddBike,
  onMyBikes,
  onEarnings,
  onLogout,
}) {

  const [bikeCount, setBikeCount] =
    useState(0);

  const [activeBikes, setActiveBikes] =
    useState(0);

  const [earnings, setEarnings] =
    useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const bikesResponse =
          await api.get(
            `/admin/bikes/${adminMobile}`
          );
        const earningsResponse =
          await api.get(
            `/admin/earnings/${adminMobile}`
          );

        setBikeCount(bikesResponse.data.length);
        setActiveBikes(
          bikesResponse.data.filter(
            bike =>
              bike.status === 'AVAILABLE'
          ).length
        );
        setEarnings(earningsResponse.data);
      } catch (error) {
        console.log(
          'ADMIN DASHBOARD ERROR',
          error?.response?.data || error
        );
      }
    };

    if (adminMobile) {
      loadDashboard();
    }
  }, [adminMobile]);

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#F7F7F7',
      }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: 56,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <View>
          <Text
            style={{
              color: '#111111',
              fontSize: 24,
              fontWeight: '900',
            }}
          >
            Hotel Admin
          </Text>
          <Text
            style={{
              color: '#777777',
              marginTop: 4,
            }}
          >
            The Royal Palace Hotel
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
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          ['Total Bikes', bikeCount],
          ['Active Bikes', activeBikes],
          ['Booked Amount', `Rs ${earnings?.totalGross || 0}`],
          ['Payout Balance', `Rs ${earnings?.pendingSettlementAmount || 0}`],
          ['Wallet Balance', `Rs ${earnings?.wallet?.balance || 0}`],
        ].map(([label, value]) => (
          <View
            key={label}
            style={{
              width: '48%',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
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
                fontSize: 22,
                fontWeight: '900',
                marginTop: 8,
              }}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: '#111111',
          borderRadius: 18,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: '#F5C400',
            fontSize: 18,
            fontWeight: '900',
            marginBottom: 8,
          }}
        >
          Earnings Overview
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: '900',
          }}
        >
          Rs {earnings?.totalEarnings || 0}
        </Text>
        <Text
          style={{
            color: '#D7D7D7',
            marginTop: 6,
          }}
        >
          Rs {earnings?.pendingSettlementAmount || 0} pending weekly settlement
        </Text>
      </View>

      <TouchableOpacity
        onPress={onAddBike}
        style={{
          backgroundColor: '#F5C400',
          padding: 18,
          borderRadius: 16,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontWeight: '900',
            color: '#111111',
          }}
        >
          Register Bike
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onMyBikes}
        style={{
          backgroundColor:'#22C55E',
          padding:18,
          borderRadius:16,
          marginBottom:12,
        }}
      >
        <Text
          style={{
            textAlign:'center',
            fontWeight:'900',
            color:'#FFF',
          }}
        >
          My Bikes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onEarnings}
        style={{
          backgroundColor:'#FFFFFF',
          padding:18,
          borderRadius:16,
          borderColor: '#ECECEC',
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            textAlign:'center',
            fontWeight:'900',
            color:'#111111',
          }}
        >
          Earnings And Payouts
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
