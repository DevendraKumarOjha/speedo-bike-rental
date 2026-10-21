import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../services/api';
import getFriendlyErrorMessage from '../utils/getFriendlyErrorMessage';

const inputStyle = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E5E5E5',
  borderWidth: 1,
  borderRadius: 12,
  padding: 15,
  marginTop: 12,
  fontSize: 15,
};

export default function UserProfileScreen({ user, onBack, onSave }) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/profile');
        const profile = response.data.user;
        setFullName(profile.fullName || '');
        setEmail(profile.email || '');
        setCity(profile.city || '');
        setAddress(profile.address || '');
      } catch (error) {
        Alert.alert(
          'Unable to load profile',
          getFriendlyErrorMessage(
            error,
            'Please try opening your profile again.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/profile', {
        fullName: fullName.trim(),
        email: email.trim(),
        city: city.trim(),
        address: address.trim(),
      });
      await onSave(response.data.user);
      Alert.alert('Profile saved', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert(
        'Unable to save profile',
        getFriendlyErrorMessage(
          error,
          'Please check your details and try again.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
      >
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 24 }}>
          <Text style={{ color: '#111111', fontSize: 16, fontWeight: '800' }}>
            ‹ Back
          </Text>
        </TouchableOpacity>

        <Text style={{ color: '#111111', fontSize: 28, fontWeight: '900' }}>
          User profile
        </Text>
        <Text style={{ color: '#777777', marginTop: 6, marginBottom: 18 }}>
          Your profile is securely saved to your account.
        </Text>

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            borderColor: '#E8E8E8',
            borderWidth: 1,
          }}
        >
          <Text style={{ color: '#444444', fontWeight: '700' }}>Mobile number</Text>
          <TextInput
            value={user?.mobile || ''}
            editable={false}
            style={{ ...inputStyle, backgroundColor: '#F1F1F1', color: '#777777' }}
          />
          <TextInput
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
            maxLength={100}
            editable={!loading && !saving}
            style={inputStyle}
          />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={254}
            editable={!loading && !saving}
            style={inputStyle}
          />
          <TextInput
            placeholder="City"
            value={city}
            onChangeText={setCity}
            maxLength={100}
            editable={!loading && !saving}
            style={inputStyle}
          />
          <TextInput
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
            maxLength={255}
            multiline
            editable={!loading && !saving}
            style={{ ...inputStyle, minHeight: 90, textAlignVertical: 'top' }}
          />
        </View>

        <TouchableOpacity
          onPress={saveProfile}
          disabled={loading || saving}
          style={{
            backgroundColor: '#F5C400',
            borderRadius: 14,
            padding: 17,
            marginTop: 18,
            alignItems: 'center',
            opacity: loading || saving ? 0.7 : 1,
          }}
        >
          {loading || saving ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <Text style={{ color: '#111111', fontWeight: '900', fontSize: 16 }}>
              Save profile
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
