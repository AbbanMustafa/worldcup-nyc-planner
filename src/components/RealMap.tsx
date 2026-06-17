import { useEffect, useMemo, useRef } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE, type LatLng, type Region } from 'react-native-maps';
import { Platform, StyleSheet } from 'react-native';

import type { Spot } from '../data';

type RealMapProps = {
  spots: Spot[];
  selectedId: string;
  onSelect: (spotId: string) => void;
};

const initialRegion: Region = {
  latitude: 40.72,
  longitude: -73.99,
  latitudeDelta: 0.24,
  longitudeDelta: 0.36
};

export default function RealMap({ spots, selectedId, onSelect }: RealMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const visibleSpotKey = useMemo(() => spots.map((spot) => spot.id).join('|'), [spots]);

  useEffect(() => {
    if (!mapRef.current || spots.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        spots.map((spot) => ({
          latitude: spot.coordinates.latitude,
          longitude: spot.coordinates.longitude
        })),
        {
          animated: true,
          edgePadding: { top: 58, right: 36, bottom: 58, left: 36 }
        }
      );
    }, 120);

    return () => clearTimeout(timer);
  }, [spots, visibleSpotKey]);

  return (
    <MapView
      ref={mapRef}
      testID="real-map"
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      style={styles.map}
      initialRegion={initialRegion}
      showsCompass
      showsScale
    >
      {spots.map((spot) => {
        const selected = selectedId === spot.id;
        const coordinate: LatLng = {
          latitude: spot.coordinates.latitude,
          longitude: spot.coordinates.longitude
        };

        return (
          <Marker
            key={spot.id}
            coordinate={coordinate}
            onPress={() => onSelect(spot.id)}
            pinColor={spot.accent}
            title={spot.name}
            description={`${spot.neighborhood} - ${spot.borough}`}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    minHeight: 430
  }
});
