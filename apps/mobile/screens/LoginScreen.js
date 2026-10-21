import React, {
  useState,
} from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import api from '../services/api';

export default function LoginScreen() {

  const [mobile, setMobile] =
    useState('');

  const [otp, setOtp] =
    useState('');

  const [step, setStep] =
    useState(1);

  const sendOtp = async () => {

    try {

      const response =
        await api.post(
          '/auth/send-otp',
          {
            mobile,
          }
        );

      alert(
        `OTP: ${response.data.otp}`
      );

      setStep(2);

    } catch (error) {
      alert('Failed to send OTP');
    }
  };

  const verifyOtp = async () => {

    try {

      const response =
        await api.post(
          '/auth/verify-otp',
          {
            mobile,
            otp,
          }
        );

      alert('Login successful');

      console.log(response.data);

    } catch (error) {
      alert('Invalid OTP');
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#111111',
        justifyContent: 'center',
        padding: 20,
      }}
    >

      <Text
        style={{
          color: '#F5C400',
          fontSize: 32,
          fontWeight: 'bold',
          marginBottom: 30,
        }}
      >
        Bike Rental
      </Text>

      <TextInput
        placeholder="Mobile Number"
        placeholderTextColor="#999"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
        style={{
          backgroundColor: 'white',
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
        }}
      />

      {step === 2 && (
        <TextInput
          placeholder="Enter OTP"
          placeholderTextColor="#999"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          style={{
            backgroundColor: 'white',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
          }}
        />
      )}

      {step === 1 ? (
        <TouchableOpacity
          onPress={sendOtp}
          style={{
            backgroundColor: '#F5C400',
            padding: 18,
            borderRadius: 14,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#111',
              fontWeight: 'bold',
            }}
          >
            Send OTP
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={verifyOtp}
          style={{
            backgroundColor: '#22C55E',
            padding: 18,
            borderRadius: 14,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            Verify OTP
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}