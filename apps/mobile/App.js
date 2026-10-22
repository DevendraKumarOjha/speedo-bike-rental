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
  const [password, setPassword] = useState('');
  const [registrationPassword, setRegistrationPassword] = useState('');
  const [registrationPasswordConfirmation, setRegistrationPasswordConfirmation] = useState('');
  const [registrationRole, setRegistrationRole] = useState('USER');
  const [authMode, setAuthMode] = useState('password');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('LOGIN');
  const [currentUser, setCurrentUser] = useState(null);
  const [latestBooking, setLatestBooking] = useState(null);
  const [selectedBike, setSelectedBike] = useState(null);
  const indianMobileRegex = /^[6-9]\d{9}$/;

  const routeUser = (user) => {
    if (user.role === 'ADMIN') {
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

        const savedSession =
          JSON.parse(savedUser);

        if (!savedSession.token || !savedSession.user) {
          await AsyncStorage.removeItem('user');
          return;
        }

        const { user, token } = savedSession;
        if (user.role === 'SUPER_ADMIN') {
          await AsyncStorage.removeItem('user');
          return;
        }

        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setCurrentUser(user);
        setIsLoggedIn(true);
        routeUser(user);
      } catch {
        await AsyncStorage.removeItem('user');
        delete api.defaults.headers.common.Authorization;
      }
    };

    restoreSession();
  }, []);

  const resetLoginState = () => {
    setMobile('');
    setPassword('');
    setRegistrationPassword('');
    setRegistrationPasswordConfirmation('');
    setLoading(false);
    setIsLoggedIn(false);
    setCurrentUser(null);
    delete api.defaults.headers.common.Authorization;
    setLatestBooking(null);
    setSelectedBike(null);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    resetLoginState();
    setScreen('LOGIN');
  };

  const completeLogin = async (user, token) => {
    if (user.role === 'SUPER_ADMIN') {
      Alert.alert(
        'Use the Super Admin app',
        'Platform management is available in the separate Super Admin app.'
      );
      return;
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setCurrentUser(user);
    routeUser(user);
    await AsyncStorage.setItem(
      'user',
      JSON.stringify({ user, token })
    );
    setIsLoggedIn(true);
    setPassword('');
    setRegistrationPassword('');
    setRegistrationPasswordConfirmation('');
    Alert.alert('Success', `Welcome ${user.mobile}`);
  };

  const loginWithPassword = async () => {
    if (!indianMobileRegex.test(mobile.trim())) {
      Alert.alert('Validation', 'Please enter a valid 10 digit Indian mobile number');
      return;
    }

    if (!password) {
      Alert.alert('Validation', 'Please enter your password');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/login', {
        mobile: mobile.trim(),
        password,
      });
      await completeLogin(response.data.user, response.data.token);
    } catch (error) {
      Alert.alert(
        'Login failed',
        getFriendlyErrorMessage(
          error,
          'Invalid mobile number or password.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const registerWithPassword = async () => {
    if (!indianMobileRegex.test(mobile.trim())) {
      Alert.alert('Validation', 'Please enter a valid 10 digit Indian mobile number');
      return;
    }

    if (registrationPassword.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters');
      return;
    }

    if (registrationPassword !== registrationPasswordConfirmation) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/register', {
        mobile: mobile.trim(),
        role: registrationRole,
        password: registrationPassword,
      });
      await completeLogin(response.data.user, response.data.token);
    } catch (error) {
      Alert.alert(
        'Registration failed',
        getFriendlyErrorMessage(
          error,
          'Unable to create your account. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
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
            Sign in or create an account with your mobile number and password.
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
          placeholder="Mobile number (username)"
          placeholderTextColor="#777"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={(value) => {
            setMobile(
              value.replace(/\D/g, '').slice(0, 10)
            );
            setPassword('');
            setIsLoggedIn(false);
          }}
          editable={!loading}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 18,
            marginBottom: 14,
            fontSize: 16,
          }}
        />

        {authMode === 'password' && (
          <TextInput
            placeholder="Password"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            onSubmitEditing={loginWithPassword}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 18,
              fontSize: 16,
            }}
          />
        )}

        {authMode === 'register' && (
          <>
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: '700',
                marginBottom: 10,
              }}
            >
              Choose how to use BikeRental
            </Text>
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                { label: 'Rent a bike', value: 'USER' },
                { label: 'Register your bike', value: 'ADMIN' },
              ].map((role) => (
                <TouchableOpacity
                  key={role.value}
                  onPress={() => setRegistrationRole(role.value)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                    borderRadius: 10,
                    backgroundColor:
                      registrationRole === role.value
                        ? '#F5C400'
                        : '#2A2A2A',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color:
                        registrationRole === role.value
                          ? '#111111'
                          : '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Create password (min 8 characters)"
              placeholderTextColor="#777"
              value={registrationPassword}
              onChangeText={setRegistrationPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 18,
                marginBottom: 14,
                fontSize: 16,
              }}
            />
            <TextInput
              placeholder="Confirm password"
              placeholderTextColor="#777"
              value={registrationPasswordConfirmation}
              onChangeText={setRegistrationPasswordConfirmation}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 18,
                marginBottom:
                  registrationRole === 'USER' ? 0 : 14,
                fontSize: 16,
              }}
            />
          </>
        )}

          </View>

        <TouchableOpacity
          onPress={authMode === 'register' ? registerWithPassword : loginWithPassword}
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
              ? authMode === 'register' ? 'Creating account...' : 'Signing in...'
              : authMode === 'register' ? 'Create account' : 'Sign in'}
          </Text>
        </TouchableOpacity>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            {[
              { mode: 'password', label: 'Already have an account? Sign in' },
              { mode: 'register', role: 'USER', label: 'Rent a bike' },
              { mode: 'register', role: 'ADMIN', label: 'Register your bike' },
            ]
              .filter((option) =>
                option.mode !== authMode ||
                (option.mode === 'register' && option.role !== registrationRole)
              )
              .map((option) => (
                <TouchableOpacity
                  key={`${option.mode}-${option.role || 'login'}`}
                  onPress={() => {
                    setAuthMode(option.mode);
                    if (option.role) {
                      setRegistrationRole(option.role);
                    }
                    setPassword('');
                    setRegistrationPassword('');
                    setRegistrationPasswordConfirmation('');
                  }}
                  disabled={loading}
                  style={{
                    padding: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#F5C400',
                      fontWeight: '600',
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
          <Text
            style={{
              color: '#777',
              textAlign: 'center',
              marginTop: 16,
              fontSize: 12,
            }}
          >
            {authMode === 'register'
              ? 'Create your account with a mobile number and password.'
              : 'Use your mobile number as your username.'}
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
