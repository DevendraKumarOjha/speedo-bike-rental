import React,
{
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';

import {
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import api from '../services/api';
import getFriendlyErrorMessage from '../utils/getFriendlyErrorMessage';

const categories = [
  'All',
  'Sports',
  'Cruiser',
  'Scooter',
];

const sorts = [
  'Nearby',
  'Top Rated',
  'Low Price',
];

export default function AvailableBikesScreen({
  userMobile,
  onBack,
  onBookBike,
}) {

  const [bikes, setBikes] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [selectedCity, setSelectedCity] =
    useState('All Cities');
  const [search, setSearch] =
    useState('');
  const [category, setCategory] =
    useState('All');
  const [maxPrice, setMaxPrice] =
    useState('');
  const [sort, setSort] =
    useState('Nearby');
  const [loadError, setLoadError] =
    useState('');

  const loadBikes =
    async () => {
      try {
        setLoadError('');
        const response =
          await api.get('/bikes');

        setBikes(response.data);
      } catch (error) {
        console.log(error);
        setLoadError(
          getFriendlyErrorMessage(
            error,
            'Unable to load bikes. Please try again.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadBikes();
  }, []);

  const cities =
    useMemo(() => {
      const uniqueCities =
        Array.from(
          new Set(
            bikes
              .map((bike) => bike.city)
              .filter(Boolean)
          )
        );

      return [
        'All Cities',
        ...uniqueCities,
      ];
    }, [bikes]);

  const filteredBikes =
    useMemo(() => {
      const searchText =
        search.trim().toLowerCase();

      let result =
        bikes.filter(
          bike =>
            bike.status === 'AVAILABLE'
        );

      if (selectedCity !== 'All Cities') {
        result =
          result.filter(
            bike =>
              bike.city === selectedCity
          );
      }

      if (category !== 'All') {
        result =
          result.filter(
            bike =>
              (bike.category || '').toLowerCase() ===
              category.toLowerCase()
          );
      }

      if (maxPrice) {
        result =
          result.filter(
            bike =>
              Number(bike.pricePerHour) <=
              Number(maxPrice)
          );
      }

      if (searchText) {
        result =
          result.filter(
            bike =>
              `${bike.bikeName} ${bike.hotelName} ${bike.city} ${bike.category}`
                .toLowerCase()
                .includes(searchText)
          );
      }

      return result.sort((a, b) => {
        if (sort === 'Low Price') {
          return a.pricePerHour - b.pricePerHour;
        }

        if (sort === 'Top Rated') {
          return (b.rating || 0) - (a.rating || 0);
        }

        return (a.distanceKm || 99) - (b.distanceKm || 99);
      });
    }, [
      bikes,
      selectedCity,
      search,
      category,
      maxPrice,
      sort,
    ]);

  const renderSkeleton = () => (
    <View>
      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={{
            height: 138,
            backgroundColor: '#ECECEC',
            borderRadius: 18,
            marginBottom: 12,
          }}
        />
      ))}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          '#F7F7F7',
        padding: 20,
        paddingTop: 56,
      }}
    >

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Feather
          name="map-pin"
          size={18}
          color="#111111"
        />
        <Text
          style={{
            color: '#111111',
            fontSize: 18,
            fontWeight: '900',
          }}
        >
          Select City
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          maxHeight: 52,
          marginBottom: 12,
        }}
        contentContainerStyle={{
          alignItems: 'center',
          paddingVertical: 2,
        }}
      >
        {cities.map((city) => (
          <TouchableOpacity
            key={city}
            onPress={() =>
              setSelectedCity(city)
            }
            style={{
              backgroundColor:
                selectedCity === city
                  ? '#111111'
                  : '#FFFFFF',
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 14,
              marginRight: 8,
              borderColor: '#ECECEC',
              borderWidth: 1,
              minHeight: 44,
              justifyContent: 'center',
              minWidth: city === 'All Cities' ? 118 : 92,
            }}
          >
            <Text
              style={{
                color:
                  selectedCity === city
                    ? '#FFFFFF'
                    : '#111111',
                fontWeight: '800',
                fontSize: 14,
                lineHeight: 18,
              }}
              numberOfLines={1}
            >
              {city}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
          borderColor: '#ECECEC',
          borderWidth: 1,
          marginBottom: 12,
        }}
      >
        <Feather
          name="search"
          size={18}
          color="#777777"
        />
        <TextInput
          placeholder="Search bikes, hotels, cities"
          placeholderTextColor="#999999"
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            padding: 12,
            fontSize: 15,
          }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          maxHeight: 52,
          marginBottom: 12,
        }}
        contentContainerStyle={{
          alignItems: 'center',
          paddingVertical: 2,
        }}
      >
        {categories.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() =>
              setCategory(item)
            }
            style={{
              backgroundColor:
                category === item
                  ? '#F5C400'
                  : '#FFFFFF',
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 14,
              marginRight: 8,
              borderColor: '#ECECEC',
              borderWidth: 1,
              minHeight: 44,
              minWidth: 86,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#111111',
                fontWeight: '900',
                fontSize: 14,
                lineHeight: 18,
              }}
              numberOfLines={1}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View
        style={{
          marginBottom: 14,
        }}
      >
        <TextInput
          placeholder="Max price"
          placeholderTextColor="#999999"
          value={maxPrice}
          onChangeText={(value) =>
            setMaxPrice(
              value.replace(/\D/g, '')
            )
          }
          keyboardType="numeric"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 13,
            borderColor: '#ECECEC',
            borderWidth: 1,
            minHeight: 50,
            marginBottom: 10,
          }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            maxHeight: 52,
          }}
          contentContainerStyle={{
            alignItems: 'center',
            paddingVertical: 2,
          }}
        >
          {sorts.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() =>
                setSort(item)
              }
              style={{
                backgroundColor:
                  sort === item
                    ? '#111111'
                    : '#FFFFFF',
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 14,
                marginRight: 8,
                borderColor: '#ECECEC',
                borderWidth: 1,
                minHeight: 44,
                minWidth: item === 'Top Rated' ? 118 : 98,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color:
                    sort === item
                      ? '#FFFFFF'
                      : '#111111',
                  fontWeight: '800',
                  fontSize: 14,
                  lineHeight: 18,
                }}
                numberOfLines={1}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        renderSkeleton()
      ) : loadError ? (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 24,
            alignItems: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="server-network-off"
            size={46}
            color="#F5C400"
          />
          <Text
            style={{
              color: '#111111',
              fontWeight: '900',
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            Could not load bikes
          </Text>
          <Text
            style={{
              color: '#777777',
              textAlign: 'center',
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            {loadError}
          </Text>
          <TouchableOpacity
            onPress={loadBikes}
            style={{
              backgroundColor: '#F5C400',
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 18,
              marginTop: 14,
            }}
          >
            <Text
              style={{
                color: '#111111',
                fontWeight: '900',
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBikes}
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
                padding: 24,
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="motorbike-off"
                size={46}
                color="#F5C400"
              />
              <Text
                style={{
                  color: '#111111',
                  fontWeight: '900',
                  textAlign: 'center',
                  marginTop: 10,
                }}
              >
                No bikes available
              </Text>
              <Text
                style={{
                  color: '#777777',
                  textAlign: 'center',
                  marginTop: 6,
                }}
              >
                Try another city, category or price. If you are an admin, register a bike first.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor:
                  '#FFFFFF',
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                borderColor: '#ECECEC',
                borderWidth: 1,
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{
                    height: 150,
                    borderRadius: 16,
                    backgroundColor: '#ECECEC',
                    marginBottom: 12,
                  }}
                />
              ) : (
                <View
                  style={{
                    height: 150,
                    borderRadius: 16,
                    backgroundColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <MaterialCommunityIcons
                    name="motorbike"
                    size={64}
                    color="#F5C400"
                  />
                </View>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 10,
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
                      marginTop: 4,
                    }}
                  >
                    {item.hotelName}
                  </Text>
                  <Text
                    style={{
                      color: '#888888',
                      marginTop: 4,
                    }}
                  >
                    {item.city} | {item.category || 'Sports'}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: '#FFF7D6',
                    borderRadius: 14,
                    padding: 12,
                    minWidth: 82,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#111111',
                      fontWeight: '900',
                    }}
                  >
                    Rs {item.pricePerHour}
                  </Text>
                  <Text
                    style={{
                      color: '#777777',
                      fontSize: 11,
                    }}
                  >
                    per hour
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginVertical: 14,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  'Available',
                  `${item.rating || 4.5} rating`,
                  `${item.distanceKm || 1.2} km`,
                ].map((label) => (
                  <Text
                    key={label}
                    style={{
                      backgroundColor: '#ECFDF3',
                      color: '#15803D',
                      borderRadius: 10,
                      paddingVertical: 6,
                      paddingHorizontal: 9,
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {label}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                onPress={() =>
                  onBookBike &&
                  onBookBike(item)
                }
                style={{
                  backgroundColor:
                    '#F5C400',
                  padding: 14,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    color: '#111111',
                    textAlign:
                      'center',
                    fontWeight: '900',
                  }}
                >
                  Book Now
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

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
