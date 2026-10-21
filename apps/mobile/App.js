import React, {
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AdminDashboard from './screens/AdminDashboard';
import UserDashboard from './screens/UserDashboard';
import AddBikeScreen from './screens/AddBikeScreen';
import MyBikesScreen from './screens/MyBikesScreen';
import AvailableBikesScreen from './screens/AvailableBikesScreen';
import AdminEarningsScreen from './screens/AdminEarningsScreen';
import SuperAdminDashboard from './screens/SuperAdminDashboard';
import BookingConfirmedScreen from './screens/BookingConfirmedScreen';
import UserBookingsScreen from './screens/UserBookingsScreen';
import MockPaymentScreen from './screens/MockPaymentScreen';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import api from './services/api';
import getFriendlyErrorMessage from './utils/getFriendlyErrorMessage';

export default function App() {
  //Screen State
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('LOGIN');
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [latestBooking, setLatestBooking] = useState(null);
  const [selectedBike, setSelectedBike] = useState(null);
  const indianMobileRegex = /^[6-9]\d{9}$/;

  const routeUser = (user) => {
    if (user.role === 'SUPER_ADMIN') {
      setScreen('SUPER_ADMIN');
    } else if (user.role === 'ADMIN') {
      setScreen('ADMIN');
    } else {
      setScreen('USER');
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedUser =
          await AsyncStorage.getItem('user');

        if (!savedUser) {
          return;
        }

        const user =
          JSON.parse(savedUser);

        setCurrentUser(user);
        setUserRole(user.role);
        setIsLoggedIn(true);
        routeUser(user);
      } catch (error) {
        await AsyncStorage.removeItem('user');
      }
    };

    restoreSession();
  }, []);

  const resetLoginState = () => {
    setMobile('');
    setOtp('');
    setStep(1);
    setLoading(false);
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentUser(null);
    setLatestBooking(null);
    setSelectedBike(null);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    resetLoginState();
    setScreen('LOGIN');
  };

if (screen === 'ADMIN_EARNINGS') {
  return (
    <AdminEarningsScreen
      adminMobile={currentUser?.mobile}
      onBack={() =>
        setScreen('ADMIN')
      }
    />
  );
}

if (screen === 'SUPER_ADMIN') {
  return (
    <SuperAdminDashboard
      onLogout={() =>
        handleLogout()
      }
    />
  );
}

if (screen === 'BOOKING_CONFIRMED') {
  return (
    <BookingConfirmedScreen
      booking={latestBooking}
      onHome={() =>
        setScreen('USER')
      }
      onBrowse={() =>
        setScreen('AVAILABLE_BIKES')
      }
    />
  );
}

if (screen === 'MOCK_PAYMENT') {
  return (
    <MockPaymentScreen
      bike={selectedBike}
      userMobile={currentUser?.mobile}
      onBack={() =>
        setScreen('AVAILABLE_BIKES')
      }
      onPaymentComplete={(booking) => {
        setLatestBooking(booking);
        setSelectedBike(null);
        setScreen('BOOKING_CONFIRMED');
      }}
    />
  );
}

if (screen === 'USER_BOOKINGS') {
  return (
    <UserBookingsScreen
      userMobile={currentUser?.mobile}
      onBack={() =>
        setScreen('USER')
      }
    />
  );
}
 
if (screen === 'MY_BIKES') {
  return (
    <MyBikesScreen
      adminMobile={currentUser?.mobile}
      onBack={() =>
        setScreen('ADMIN')
      }
    />
  );
}

  if (screen === 'ADMIN') {
  return (
 <AdminDashboard
  adminMobile={currentUser?.mobile}
  onAddBike={() =>
    setScreen(
      'ADD_BIKE'
    )
  }
  onMyBikes={() =>
    setScreen(
      'MY_BIKES'
    )
  }
  onEarnings={() =>
    setScreen(
      'ADMIN_EARNINGS'
    )
  }
  onLogout={() =>
    handleLogout()
  }
/>
  );
}

if (screen === 'ADD_BIKE') {
  return (
    <AddBikeScreen
      adminMobile={currentUser?.mobile}
      onBack={() =>
        setScreen('ADMIN')
      }
    />
  );
}

if (screen === 'USER') {
  return (
    <UserDashboard
      onBrowseBikes={() =>
        setScreen(
          'AVAILABLE_BIKES'
        )
      }
      onBookings={() =>
        setScreen(
          'USER_BOOKINGS'
        )
      }
      onLogout={() =>
        handleLogout()
      }
    />
  );
}

if (screen === 'AVAILABLE_BIKES') {
  return (
    <AvailableBikesScreen
      userMobile={currentUser?.mobile}
      onBack={() =>
        setScreen('USER')
      }
      onBookBike={(bike) => {
        setSelectedBike(bike);
        setScreen('MOCK_PAYMENT');
      }}
    />
  );
}
  const sendOtp = async () => {
    try {
      const trimmedMobile =
        mobile.trim();

      if (!trimmedMobile) {
        Alert.alert(
          'Validation',
          'Please enter mobile number'
        );
        return;
      }

      if (!indianMobileRegex.test(trimmedMobile)) {
        Alert.alert(
          'Validation',
          'Please enter a valid 10 digit Indian mobile number'
        );
        return;
      }

      setLoading(true);

      const response = await api.post(
        '/auth/send-otp',
        {
          mobile: trimmedMobile,
        }
      );

      console.log(
        'SEND OTP RESPONSE',
        response.data
      );

      Alert.alert(
        'OTP Sent',
        response.data.otp
          ? `Local mock OTP: ${response.data.otp}`
          : 'Please check your SMS for the OTP'
      );

      setStep(2);
    } catch (error) {
      console.log(
        'SEND OTP ERROR',
        error?.response?.data || error
      );

      Alert.alert(
        'Error',
        getFriendlyErrorMessage(
          error,
          'Unable to send OTP right now. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      if (!otp) {
        Alert.alert(
          'Validation',
          'Please enter OTP'
        );
        return;
      }

      setLoading(true);

      const response = await api.post(
        '/auth/verify-otp',
        {
          mobile,
          otp,
        }
      );

      console.log(
        'VERIFY RESPONSE',
        response.data
      );

      const user = response.data.user;
      setUserRole(user.role);
      setCurrentUser(user);

routeUser(user);

await AsyncStorage.setItem(
  'user',
  JSON.stringify(user)
);

setIsLoggedIn(true);

Alert.alert(
  'Success',
  `Welcome ${user.mobile}`
);
    } catch (error) {
      console.log(
        'VERIFY ERROR',
        error?.response?.data || error
      );

      Alert.alert(
        'Error',
        getFriendlyErrorMessage(
          error,
          'OTP verification failed. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#070707',
      }}
    >
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={{
          flex: 1,
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
          justifyContent: 'space-between',
          padding: 24,
            paddingBottom: 34,
        }}
      >
        <View
          style={{
            marginTop: 30,
          }}
        >
          <Text
            style={{
              color: '#F5C400',
              fontSize: 18,
              fontWeight: '900',
              marginBottom: 50,
            }}
          >
            BikeRental
          </Text>

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 42,
              fontWeight: '900',
              lineHeight: 48,
            }}
          >
            RIDE MORE
          </Text>
          <Text
            style={{
              color: '#F5C400',
              fontSize: 42,
              fontWeight: '900',
              lineHeight: 48,
              marginBottom: 12,
            }}
          >
            PAY LESS
          </Text>
          <Text
            style={{
              color: '#B8B8B8',
              fontSize: 16,
              lineHeight: 24,
              maxWidth: 280,
            }}
          >
            Explore bikes, hotels and city rides with instant OTP login.
          </Text>
        </View>

{isLoggedIn && (
  <Text
    style={{
      color: '#22C55E',
      fontSize: 16,
      marginBottom: 20,
      fontWeight: 'bold',
    }}
  >
    Logged In Successfully
  </Text>
)}

        <View>
          <View
            style={{
              backgroundColor: '#151515',
              borderColor: '#2A2A2A',
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
            }}
          >

        <TextInput
          placeholder="Enter Mobile Number"
          placeholderTextColor="#777"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={(value) => {
            setMobile(
              value.replace(/\D/g, '').slice(0, 10)
            );
            setOtp('');
            setStep(1);
            setIsLoggedIn(false);
          }}
          editable={!loading}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 18,
            marginBottom: step === 2 ? 14 : 0,
            fontSize: 16,
          }}
        />

        {step === 2 && (
          <TextInput
            placeholder="Enter OTP"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            editable={!loading}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 18,
              fontSize: 16,
            }}
          />
        )}
          </View>

        {step === 1 ? (
          <TouchableOpacity
            onPress={sendOtp}
            disabled={loading}
            style={{
              backgroundColor: '#F5C400',
              padding: 18,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#111111',
                fontWeight: 'bold',
                fontSize: 16,
              }}
            >
              {loading
                ? 'Sending OTP...'
                : 'Send OTP'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={verifyOtp}
             disabled={loading || isLoggedIn}
            style={{
              backgroundColor: '#22C55E',
              padding: 18,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: 16,
              }}
            >
              {loading
                ? 'Verifying...'
                : 'Verify OTP'}
            </Text>
          </TouchableOpacity>
        )}
          <Text
            style={{
              color: '#777',
              textAlign: 'center',
              marginTop: 16,
              fontSize: 12,
            }}
          >
            Admin: 9986328111 | Super Admin: 9999999999
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
