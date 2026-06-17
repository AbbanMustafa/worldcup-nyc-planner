import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Spot } from '../data';

type RealMapProps = {
  spots: Spot[];
  selectedId: string;
  onSelect: (spotId: string) => void;
};

type Tile = {
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

const tileZoom = 11;
const tileRange = {
  minX: 602,
  maxX: 604,
  minY: 768,
  maxY: 771
};

const tileBounds = {
  minX: tileRange.minX,
  maxX: tileRange.maxX + 1,
  minY: tileRange.minY,
  maxY: tileRange.maxY + 1
};

const tiles = buildTiles();

export default function RealMap({ spots, selectedId, onSelect }: RealMapProps) {
  return (
    <View
      testID="real-map"
      accessibilityLabel="Real OpenStreetMap view of New York City with World Cup watch party pins"
      style={styles.map}
    >
      <View style={styles.tileLayer} pointerEvents="none">
        {tiles.map((tile) => (
          <Image
            key={`${tile.x}-${tile.y}`}
            source={{ uri: `https://tile.openstreetmap.org/${tileZoom}/${tile.x}/${tile.y}.png` }}
            resizeMode="stretch"
            style={[
              styles.tile,
              {
                left: `${tile.left}%`,
                top: `${tile.top}%`,
                width: `${tile.width}%`,
                height: `${tile.height}%`
              }
            ]}
          />
        ))}
      </View>

      <View style={styles.mapTint} pointerEvents="none" />
      <View style={styles.boroughLabelQueens} pointerEvents="none">
        <Text style={styles.boroughText}>QUEENS</Text>
      </View>
      <View style={styles.boroughLabelBrooklyn} pointerEvents="none">
        <Text style={styles.boroughText}>BROOKLYN</Text>
      </View>
      <View style={styles.boroughLabelManhattan} pointerEvents="none">
        <Text style={styles.boroughText}>MANHATTAN</Text>
      </View>

      {spots.map((spot) => {
        const selected = selectedId === spot.id;
        const position = projectCoordinate(spot.coordinates.latitude, spot.coordinates.longitude);

        return (
          <Pressable
            key={spot.id}
            testID={`map-pin-${spot.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${spot.name}, ${spot.neighborhood}, ${spot.borough}`}
            onPress={() => onSelect(spot.id)}
            style={[
              styles.pinWrap,
              {
                left: `${position.left}%`,
                top: `${position.top}%`
              },
              selected && styles.pinWrapSelected
            ]}
          >
            <View style={[styles.pin, { backgroundColor: spot.accent }, selected && styles.pinSelected]}>
              <Text style={styles.pinText}>{spot.countries[0]?.slice(0, 2).toUpperCase() ?? 'WC'}</Text>
            </View>
            <View style={[styles.pinLabel, selected && styles.pinLabelSelected]}>
              <Text style={[styles.pinLabelText, selected && styles.pinLabelTextSelected]} numberOfLines={1}>
                {spot.neighborhood}
              </Text>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionText}>OpenStreetMap</Text>
      </View>
    </View>
  );
}

function buildTiles() {
  const output: Tile[] = [];
  const width = 100 / (tileRange.maxX - tileRange.minX + 1);
  const height = 100 / (tileRange.maxY - tileRange.minY + 1);

  for (let y = tileRange.minY; y <= tileRange.maxY; y += 1) {
    for (let x = tileRange.minX; x <= tileRange.maxX; x += 1) {
      output.push({
        x,
        y,
        left: (x - tileRange.minX) * width,
        top: (y - tileRange.minY) * height,
        width,
        height
      });
    }
  }

  return output;
}

function projectCoordinate(latitude: number, longitude: number) {
  const worldSize = 2 ** tileZoom;
  const x = ((longitude + 180) / 360) * worldSize;
  const latRadians = (latitude * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) * worldSize;

  return {
    left: clamp(((x - tileBounds.minX) / (tileBounds.maxX - tileBounds.minX)) * 100, 4, 96),
    top: clamp(((y - tileBounds.minY) / (tileBounds.maxY - tileBounds.minY)) * 100, 5, 95)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    minHeight: 430,
    overflow: 'hidden',
    backgroundColor: '#D9E8E1'
  },
  tileLayer: {
    ...StyleSheet.absoluteFillObject
  },
  tile: {
    position: 'absolute'
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 243, 0.08)'
  },
  boroughLabelQueens: {
    position: 'absolute',
    top: '34%',
    right: '12%'
  },
  boroughLabelBrooklyn: {
    position: 'absolute',
    bottom: '22%',
    right: '24%'
  },
  boroughLabelManhattan: {
    position: 'absolute',
    top: '28%',
    left: '18%',
    transform: [{ rotate: '-16deg' }]
  },
  boroughText: {
    color: 'rgba(31, 31, 31, 0.36)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0
  },
  pinWrap: {
    position: 'absolute',
    alignItems: 'center',
    minWidth: 80,
    transform: [{ translateX: -40 }, { translateY: -20 }]
  },
  pinWrapSelected: {
    zIndex: 10
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  pinSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 4
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900'
  },
  pinLabel: {
    marginTop: 4,
    maxWidth: 104,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(31, 31, 31, 0.08)'
  },
  pinLabelSelected: {
    backgroundColor: '#1F1F1F',
    borderColor: '#1F1F1F'
  },
  pinLabelText: {
    color: '#1F1F1F',
    fontSize: 11,
    fontWeight: '800'
  },
  pinLabelTextSelected: {
    color: '#FFFFFF'
  },
  attribution: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)'
  },
  attributionText: {
    color: '#4E4E4E',
    fontSize: 10,
    fontWeight: '700'
  }
});
