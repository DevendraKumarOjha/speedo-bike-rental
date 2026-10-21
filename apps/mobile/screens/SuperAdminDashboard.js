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
  ScrollView,
} from 'react-native';

import api from '../services/api';

export default function SuperAdminDashboard({
  onLogout,
}) {

  const [bikes, setBikes] =
    useState([]);

  const [walletSummary, setWalletSummary] =
    useState(null);

  const loadData =
    async () => {

      try {

        const bikesResponse =
          await api.get(
            '/super-admin/bikes'
          );

        const walletResponse =
          await api.get(
            '/super-admin/wallet'
          );

        setBikes(bikesResponse.data);
        setWalletSummary(walletResponse.data);

      } catch (error) {

        console.log(
          'SUPER ADMIN ERROR',
          error?.response?.data || error
        );

      }
    };

  useEffect(() => {
    loadData();
  }, []);

  const settleWeekly =
    async () => {

      try {

        const response =
          await api.post(
            '/super-admin/settle-weekly'
          );

        Alert.alert(
          'Success',
          response.data.message
        );

        loadData();

      } catch (error) {

        Alert.alert(
          'Error',
          'Unable to settle weekly payout'
        );

      }
    };

  const citySummary =
    bikes.reduce((summary, bike) => {
      const city =
        bike.city || 'Unknown City';

      if (!summary[city]) {
        summary[city] = {
          city,
          hotels: new Set(),
          bikes: 0,
          bookings: 0,
          revenue: 0,
        };
      }

      summary[city].hotels.add(bike.hotelName);
      summary[city].bikes += 1;

      if (bike.booking) {
        summary[city].bookings += 1;
        summary[city].revenue +=
          bike.booking.grossAmount || 0;
      }

      return summary;
    }, {});

  const cities =
    Object.values(citySummary).map((city) => ({
      ...city,
      hotels: city.hotels.size,
    }));

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#0B0B0B',
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
              color: '#F5C400',
              fontSize: 13,
              fontWeight: '900',
            }}
          >
            SUPER ADMIN DASHBOARD
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: '900',
              marginTop: 4,
            }}
          >
            BikeRental HQ
          </Text>
        </View>

        <TouchableOpacity
          onPress={onLogout}
          style={{
            backgroundColor:'#EF4444',
            paddingVertical:10,
            paddingHorizontal:14,
            borderRadius:12,
          }}
        >
          <Text
            style={{
              color:'#FFF',
              fontWeight:'900',
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
          marginBottom: 18,
        }}
      >
        {[
          ['Total Revenue', `Rs ${walletSummary?.wallet?.totalGrossReceived || 0}`],
          ['Commission', `Rs ${walletSummary?.wallet?.totalCommission || 0}`],
          ['Payouts Due', `Rs ${walletSummary?.pendingPayouts || 0}`],
          ['Total Bikes', bikes.length],
        ].map(([label, value]) => (
          <View
            key={label}
            style={{
              width: '48%',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 15,
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
                fontSize: 20,
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
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: '#111111',
            fontSize: 18,
            fontWeight: '900',
            marginBottom: 12,
          }}
        >
          Wallet Overview
        </Text>
        <Text>
          Current Balance: Rs {walletSummary?.wallet?.balance || 0}
        </Text>
        <Text>
          Paid To Admins: Rs {walletSummary?.wallet?.totalPaidToAdmins || 0}
        </Text>
        <Text>
          Commission Rate: {(walletSummary?.commissionRate || 0) * 100}%
        </Text>
      </View>

      <TouchableOpacity
        onPress={settleWeekly}
        style={{
          backgroundColor:'#22C55E',
          padding:18,
          borderRadius:16,
          marginBottom:18,
        }}
      >
        <Text
          style={{
            color:'#FFF',
            textAlign:'center',
            fontWeight:'900',
          }}
        >
          Run Weekly Settlement
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          color: '#F5C400',
          fontSize: 20,
          fontWeight: '900',
          marginBottom: 10,
        }}
      >
        Cities Management
      </Text>

      {cities.map((city) => (
        <View
          key={city.city}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 15,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: '#111111',
              fontWeight: '900',
              fontSize: 16,
            }}
          >
            {city.city}
          </Text>
          <Text>
            Hotels: {city.hotels} | Bikes: {city.bikes}
          </Text>
          <Text>
            Bookings: {city.bookings} | Revenue: Rs {city.revenue}
          </Text>
        </View>
      ))}

      <Text
        style={{
          color: '#F5C400',
          fontSize: 20,
          fontWeight: '900',
          marginVertical: 10,
        }}
      >
        All Registered Bikes
      </Text>

      <FlatList
        data={bikes}
        scrollEnabled={false}
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
            }}
          >
            <Text
              style={{
                color: '#111111',
                fontWeight: '900',
              }}
            >
              {item.bikeName} - {item.bikeNumber}
            </Text>
            <Text>
              Admin: {item.adminMobile}
            </Text>
            <Text>
              {item.hotelName}, {item.city}
            </Text>
            <Text>
              Rs {item.pricePerHour}/day
            </Text>
            <Text
              style={{
                color:
                  item.status === 'AVAILABLE'
                    ? '#15803D'
                    : '#DC2626',
                fontWeight: '900',
                marginTop: 6,
              }}
            >
              {item.status}
            </Text>
            {item.booking && (
              <Text
                style={{
                  color: '#15803D',
                  fontWeight: '800',
                  marginTop: 6,
                }}
              >
                Booked: Rs {item.booking.grossAmount}
              </Text>
            )}
          </View>
        )}
      />
    </ScrollView>
  );
}
