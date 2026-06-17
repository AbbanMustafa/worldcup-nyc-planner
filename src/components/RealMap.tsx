import { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';

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

type MapSize = {
  width: number;
  height: number;
};

type Viewport = {
  scale: number;
  translateX: number;
  translateY: number;
};

type ProjectedPosition = {
  left: number;
  top: number;
};

const tileZoom = 11;
const minZoom = 1;
const maxZoom = 3;
const zoomStep = 0.5;
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
  const [mapSize, setMapSize] = useState<MapSize>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({ scale: minZoom, translateX: 0, translateY: 0 });
  const viewportRef = useRef(viewport);
  const gestureStartRef = useRef({
    distance: 0,
    midpointX: 0,
    midpointY: 0,
    viewport
  });

  viewportRef.current = viewport;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponder: (event, gestureState) => {
          const isPinching = event.nativeEvent.touches.length >= 2;
          const isDraggingZoomedMap =
            viewportRef.current.scale > minZoom &&
            Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 6;

          return isPinching || isDraggingZoomedMap;
        },
        onMoveShouldSetPanResponderCapture: (event, gestureState) => {
          const isPinching = event.nativeEvent.touches.length >= 2;
          const isDraggingZoomedMap =
            viewportRef.current.scale > minZoom &&
            Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 6;

          return isPinching || isDraggingZoomedMap;
        },
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          const midpoint = getTouchMidpoint(touches);

          gestureStartRef.current = {
            distance: getTouchDistance(touches),
            midpointX: midpoint.x,
            midpointY: midpoint.y,
            viewport: viewportRef.current
          };
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          const start = gestureStartRef.current;

          if (touches.length >= 2 && start.distance > 0) {
            const distance = getTouchDistance(touches);
            const midpoint = getTouchMidpoint(touches);
            const nextScale = clamp(start.viewport.scale * (distance / start.distance), minZoom, maxZoom);

            setViewport(
              constrainViewport(
                {
                  scale: nextScale,
                  translateX: start.viewport.translateX + midpoint.x - start.midpointX,
                  translateY: start.viewport.translateY + midpoint.y - start.midpointY
                },
                mapSize
              )
            );
            return;
          }

          if (viewportRef.current.scale > minZoom) {
            setViewport(
              constrainViewport(
                {
                  ...start.viewport,
                  translateX: start.viewport.translateX + gestureState.dx,
                  translateY: start.viewport.translateY + gestureState.dy
                },
                mapSize
              )
            );
          }
        },
        onPanResponderRelease: () => {
          setViewport((current) => constrainViewport(current, mapSize));
        },
        onPanResponderTerminate: () => {
          setViewport((current) => constrainViewport(current, mapSize));
        },
        onPanResponderTerminationRequest: () => false
      }),
    [mapSize]
  );

  const adjustZoom = (amount: number) => {
    setViewport((current) =>
      constrainViewport(
        {
          ...current,
          scale: clamp(current.scale + amount, minZoom, maxZoom)
        },
        mapSize
      )
    );
  };

  return (
    <View
      testID="real-map"
      accessibilityLabel="Real OpenStreetMap view of New York City with World Cup watch party pins"
      style={styles.map}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setMapSize({ width, height });
      }}
    >
      <View style={styles.zoomSurface} {...panResponder.panHandlers}>
        <View
          style={[
            styles.zoomLayer,
            {
              transform: [
                { translateX: viewport.translateX },
                { translateY: viewport.translateY },
                { scale: viewport.scale }
              ]
            }
          ]}
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
        </View>
      </View>

      <View style={styles.pinLayer} pointerEvents="box-none">
        {spots.map((spot) => {
          const selected = selectedId === spot.id;
          const position = projectCoordinate(spot.coordinates.latitude, spot.coordinates.longitude);
          const screenPosition = projectViewportPosition(position, viewport, mapSize);

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
                  left: screenPosition.left,
                  top: screenPosition.top
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
      </View>

      <View style={styles.zoomControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom map in"
          testID="map-zoom-in"
          onPress={() => adjustZoom(zoomStep)}
          style={styles.zoomButton}
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom map out"
          testID="map-zoom-out"
          onPress={() => adjustZoom(-zoomStep)}
          style={styles.zoomButton}
        >
          <Text style={styles.zoomButtonText}>-</Text>
        </Pressable>
      </View>

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

function constrainViewport(viewport: Viewport, mapSize: MapSize): Viewport {
  if (viewport.scale <= minZoom || mapSize.width === 0 || mapSize.height === 0) {
    return {
      scale: minZoom,
      translateX: 0,
      translateY: 0
    };
  }

  const horizontalLimit = ((viewport.scale - 1) * mapSize.width) / 2;
  const verticalLimit = ((viewport.scale - 1) * mapSize.height) / 2;

  return {
    scale: viewport.scale,
    translateX: clamp(viewport.translateX, -horizontalLimit, horizontalLimit),
    translateY: clamp(viewport.translateY, -verticalLimit, verticalLimit)
  };
}

function projectViewportPosition(
  position: ProjectedPosition,
  viewport: Viewport,
  mapSize: MapSize
): { left: DimensionValue; top: DimensionValue } {
  if (mapSize.width === 0 || mapSize.height === 0) {
    return {
      left: `${position.left}%` as DimensionValue,
      top: `${position.top}%` as DimensionValue
    };
  }

  const x = (position.left / 100) * mapSize.width;
  const y = (position.top / 100) * mapSize.height;
  const centerX = mapSize.width / 2;
  const centerY = mapSize.height / 2;

  return {
    left: centerX + (x - centerX) * viewport.scale + viewport.translateX,
    top: centerY + (y - centerY) * viewport.scale + viewport.translateY
  };
}

function getTouchDistance(touches: Array<{ pageX: number; pageY: number }>) {
  if (touches.length < 2) {
    return 0;
  }

  const [first, second] = touches;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

function getTouchMidpoint(touches: Array<{ pageX: number; pageY: number }>) {
  if (touches.length < 2) {
    const [first] = touches;
    return {
      x: first?.pageX ?? 0,
      y: first?.pageY ?? 0
    };
  }

  const [first, second] = touches;
  return {
    x: (first.pageX + second.pageX) / 2,
    y: (first.pageY + second.pageY) / 2
  };
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    minHeight: 430,
    overflow: 'hidden',
    backgroundColor: '#D9E8E1'
  },
  zoomSurface: {
    ...StyleSheet.absoluteFillObject
  },
  zoomLayer: {
    ...StyleSheet.absoluteFillObject
  },
  pinLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden'
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
  },
  zoomControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    overflow: 'hidden',
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(31, 31, 31, 0.1)',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  zoomButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomButtonText: {
    color: '#1F1F1F',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24
  },
  zoomDivider: {
    height: 1,
    backgroundColor: 'rgba(31, 31, 31, 0.1)'
  }
});
