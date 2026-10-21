import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import {
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import api from '../services/api';
import getFriendlyErrorMessage from '../utils/getFriendlyErrorMessage';

export default function AddBikeScreen({
  onBack,
  adminMobile,
}) {
  console.log('onBack = ', onBack);

  const [bikeName, setBikeName] = useState('');
  const [bikeNumber, setBikeNumber] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [city, setCity] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [category, setCategory] = useState('Sports');
  const [imageUrl, setImageUrl] = useState('');
  const [hotelImageUrl, setHotelImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const registerBike = async () => {

    try {

      if (
        !adminMobile ||
        !bikeName ||
        !bikeNumber ||
        !hotelName ||
        !city ||
        !pricePerHour
      ) {
        Alert.alert(
          'Validation',
          'Please fill all fields'
        );
        return;
      }

      setLoading(true);

      const response = await api.post(
        '/admin/bikes',
        {
          bikeName,
          bikeNumber,
          hotelName,
          city,
          pricePerHour: Number(pricePerHour),
          adminMobile,
          category,
          imageUrl,
          hotelImageUrl,
        }
      );

      console.log(
        'BIKE CREATED',
        response.data
      );

      Alert.alert(
        'Success',
        'Bike Registered Successfully'
      );

      setBikeName('');
      setBikeNumber('');
      setHotelName('');
      setCity('');
      setPricePerHour('');
      setCategory('Sports');
      setImageUrl('');
      setHotelImageUrl('');

    } catch (error) {

      console.log(
        'ADD BIKE ERROR',
        error?.response?.data || error
      );

      Alert.alert(
        'Error',
        getFriendlyErrorMessage(
          error,
          'Unable to register bike. Please try again.'
        )
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#111111',
      }}
    >
      <View
        style={{
          padding: 24,
          paddingBottom: 34,
        }}
      >
        <Text
          style={{
            color: '#F5C400',
            fontSize: 30,
            fontWeight: 'bold',
            marginBottom: 20,
          }}
        >
          Register Bike
        </Text>

        <TextInput
          placeholder="Bike Name"
          placeholderTextColor="#999"
          value={bikeName}
          onChangeText={setBikeName}
          style={styles.input}
        />

        <TextInput
          placeholder="Bike Number"
          placeholderTextColor="#999"
          value={bikeNumber}
          onChangeText={setBikeNumber}
          style={styles.input}
        />

        <TextInput
          placeholder="Hotel Name"
          placeholderTextColor="#999"
          value={hotelName}
          onChangeText={setHotelName}
          style={styles.input}
        />

        <TextInput
          placeholder="City"
          placeholderTextColor="#999"
          value={city}
          onChangeText={setCity}
          style={styles.input}
        />

        <TextInput
          placeholder="Price Per Hour"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={pricePerHour}
          onChangeText={setPricePerHour}
          style={styles.input}
        />

        <TextInput
          placeholder="Category (Sports, Cruiser, Scooter)"
          placeholderTextColor="#999"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
        />

        <TextInput
          placeholder="Bike Image URL"
          placeholderTextColor="#999"
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          placeholder="Hotel Image URL"
          placeholderTextColor="#999"
          value={hotelImageUrl}
          onChangeText={setHotelImageUrl}
          autoCapitalize="none"
          style={styles.input}
        />

        <View
          style={{
            backgroundColor: '#1F1F1F',
            borderRadius: 16,
            padding: 16,
            marginBottom: 15,
          }}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{
                height: 130,
                borderRadius: 14,
                marginBottom: 10,
              }}
            />
          ) : (
            <View
              style={{
                height: 130,
                borderRadius: 14,
                backgroundColor: '#2A2A2A',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <MaterialCommunityIcons
                name="motorbike"
                size={42}
                color="#F5C400"
              />
            </View>
          )}
          <Text
            style={{
              color: '#B8B8B8',
              fontWeight: '700',
            }}
          >
            Add an image URL to make your bike card look real in the customer app.
          </Text>
        </View>

        <TouchableOpacity
          onPress={registerBike}
          disabled={loading}
          style={{
            backgroundColor: '#22C55E',
            padding: 18,
            borderRadius: 16,
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            {loading
              ? 'Registering...'
              : 'Register Bike'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            console.log('BACK PRESSED');
            onBack && onBack();
          }}
          style={{
            backgroundColor: '#FFFFFF',
            padding: 16,
            marginTop: 14,
            borderRadius: 16,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#111111',
              fontSize: 16,
              fontWeight: '900',
            }}
          >
            Back To Dashboard
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = {
  input: {
    backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 15,
    fontSize: 16,
  },
};
