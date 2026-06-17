import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';

import RealMap from './src/components/RealMap';
import { FilterId, Spot, filters, matchPicks, spots } from './src/data';

const airbnbRed = '#FF385C';
const ink = '#1F1F1F';
const muted = '#717171';
const sand = '#FFF8F3';

export default function App() {
  const { width } = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(spots[0].id);

  const filteredSpots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return spots.filter((spot) => {
      const matchesFilter = activeFilter === 'all' || spot.kind === activeFilter;
      const searchable = [
        spot.name,
        spot.borough,
        spot.neighborhood,
        spot.countries.join(' '),
        spot.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase();

      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeFilter, query]);

  const selectedSpot = filteredSpots.find((spot) => spot.id === selectedId) ?? filteredSpots[0] ?? spots[0];

  const handleFilterChange = (filterId: FilterId) => {
    setActiveFilter(filterId);
    const nextSpot = spots.find((spot) => filterId === 'all' || spot.kind === filterId);
    if (nextSpot) {
      setSelectedId(nextSpot.id);
    }
  };

  const compact = width < 760;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Ionicons name="football-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>NYC match-day planner</Text>
            <Text style={styles.title}>World Cup stays local.</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityLabel="Open saved plans">
            <Ionicons name="heart-outline" size={21} color={ink} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search teams, boroughs, vibes"
            placeholderTextColor="#8A8A8A"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close" size={18} color={muted} />
            </Pressable>
          ) : (
            <Ionicons name="options-outline" size={19} color={muted} />
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((filter) => {
            const selected = activeFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => handleFilterChange(filter.id)}
                style={[styles.filterPill, selected && styles.filterPillActive]}
              >
                <Text style={[styles.filterLabel, selected && styles.filterLabelActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.mapAndCard, !compact && styles.mapAndCardWide]}>
          <InteractiveMap
            spots={filteredSpots}
            selectedId={selectedSpot.id}
            onSelect={setSelectedId}
          />
          <SpotDetailCard spot={selectedSpot} compact={compact} />
        </View>

        <SectionHeader
          icon="calendar-outline"
          title="Best upcoming pairings"
          actionLabel={`${matchPicks.length} picks`}
        />
        <FlatList
          data={matchPicks}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matchList}
          renderItem={({ item }) => (
            <Pressable
              style={styles.matchCard}
              onPress={() => {
                const matchSpot = spots.find((spot) => spot.name === item.neighborhoodMatch);
                if (matchSpot) {
                  setActiveFilter('all');
                  setSelectedId(matchSpot.id);
                }
              }}
            >
              <View style={[styles.matchColor, { backgroundColor: item.color }]} />
              <Text style={styles.matchDate}>{item.date} - {item.time}</Text>
              <Text style={styles.matchFixture}>{item.fixture}</Text>
              <Text style={styles.matchMeta}>{item.venue}</Text>
              <View style={styles.matchFooter}>
                <Ionicons name="map-outline" size={16} color={airbnbRed} />
                <Text style={styles.matchNeighborhood}>{item.neighborhoodMatch}</Text>
              </View>
              <Text style={styles.matchReason}>{item.reason}</Text>
            </Pressable>
          )}
        />

        <SectionHeader icon="walk-outline" title="Culture-first routes" actionLabel="No ticket needed" />
        <View style={styles.routeGrid}>
          {spots
            .filter((spot) => spot.kind === 'culture')
            .map((spot) => (
              <Pressable
                key={spot.id}
                style={styles.routeCard}
                onPress={() => {
                  setActiveFilter('culture');
                  setSelectedId(spot.id);
                }}
              >
                <View style={[styles.routeSwatch, { backgroundColor: spot.accent }]} />
                <Text style={styles.routeName}>{spot.name}</Text>
                <Text style={styles.routeMeta}>{spot.neighborhood} - {spot.borough}</Text>
                <Text style={styles.routeCountries} numberOfLines={2}>
                  {spot.countries.join(', ')}
                </Text>
              </Pressable>
            ))}
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={20} color={airbnbRed} />
          <Text style={styles.noteText}>
            Seeded with public June 2026 event information and neighborhood planning ideas. Verify tickets,
            hours, capacity, and match audio before heading out.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InteractiveMap({
  spots: visibleSpots,
  selectedId,
  onSelect
}: {
  spots: Spot[];
  selectedId: string;
  onSelect: (spotId: string) => void;
}) {
  return (
    <View style={styles.mapShell}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.mapTitle}>NYC culture map</Text>
          <Text style={styles.mapSubtitle}>{visibleSpots.length} active pins</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live plan</Text>
        </View>
      </View>

      <View style={styles.mapCanvas}>
        <RealMap spots={visibleSpots} selectedId={selectedId} onSelect={onSelect} />
      </View>
    </View>
  );
}

function SpotDetailCard({ spot, compact }: { spot: Spot; compact: boolean }) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailTopRow}>
        <View style={[styles.kindBadge, { backgroundColor: spot.accent }]}>
          <Ionicons
            name={spot.kind === 'culture' ? 'walk-outline' : spot.kind === 'final' ? 'trophy-outline' : 'tv-outline'}
            size={15}
            color="#FFFFFF"
          />
          <Text style={styles.kindText}>{spot.kind}</Text>
        </View>
        <View style={styles.ratingWrap}>
          <Ionicons name="star" size={14} color="#FFB400" />
          <Text style={styles.ratingText}>Plan pick</Text>
        </View>
      </View>

      <Text style={styles.detailTitle}>{spot.name}</Text>
      <Text style={styles.detailPlace}>{spot.neighborhood} - {spot.borough}</Text>
      <Text style={styles.detailHeadline}>{spot.headline}</Text>
      <Text style={styles.detailBody}>{spot.details}</Text>

      <View style={styles.factGrid}>
        <Fact icon="time-outline" label="Window" value={spot.nextWindow} />
        <Fact icon="people-outline" label="Crowd" value={spot.crowd} />
        <Fact icon="ticket-outline" label="Cost" value={spot.price} />
        <Fact icon="train-outline" label="Transit" value={spot.transit} />
      </View>

      <Text style={styles.microHeading}>Countries to follow</Text>
      <View style={styles.chipRow}>
        {spot.countries.map((country) => (
          <View key={country} style={styles.countryChip}>
            <View style={[styles.countryDot, { backgroundColor: spot.accent }]} />
            <Text style={styles.countryText}>{country}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.tipRow, compact && styles.tipRowCompact]}>
        {spot.tips.map((tip) => (
          <View key={tip} style={styles.tipChip}>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={airbnbRed} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  actionLabel
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  actionLabel: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <Ionicons name={icon} size={20} color={ink} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionAction}>{actionLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: sand
  },
  screen: {
    paddingHorizontal: 18,
    paddingTop: Platform.select({ ios: 4, android: 24, default: 18 }),
    paddingBottom: 36,
    gap: 18
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: airbnbRed,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  headerCopy: {
    flex: 1
  },
  kicker: {
    color: muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0
  },
  title: {
    color: ink,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: 0
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  searchWrap: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  searchInput: {
    flex: 1,
    color: ink,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 0
  },
  filterRow: {
    gap: 10,
    paddingRight: 18
  },
  filterPill: {
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5'
  },
  filterPillActive: {
    backgroundColor: ink,
    borderColor: ink
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: ink
  },
  filterLabelActive: {
    color: '#FFFFFF'
  },
  mapAndCard: {
    gap: 14
  },
  mapAndCardWide: {
    flexDirection: 'row',
    alignItems: 'stretch'
  },
  mapShell: {
    flex: 1.1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#ECE7E2',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  mapHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  mapTitle: {
    color: ink,
    fontSize: 19,
    fontWeight: '800'
  },
  mapSubtitle: {
    color: muted,
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600'
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F7F7F7'
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A699'
  },
  liveText: {
    color: ink,
    fontSize: 12,
    fontWeight: '800'
  },
  mapCanvas: {
    height: 430,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#DDF3F5'
  },
  detailCard: {
    flex: 0.9,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECE7E2',
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    height: 32,
    borderRadius: 16
  },
  kindText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ratingText: {
    color: ink,
    fontSize: 12,
    fontWeight: '800'
  },
  detailTitle: {
    color: ink,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900'
  },
  detailPlace: {
    color: muted,
    fontSize: 14,
    fontWeight: '700'
  },
  detailHeadline: {
    color: ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800'
  },
  detailBody: {
    color: '#4E4E4E',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500'
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  fact: {
    width: '47%',
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    padding: 12,
    gap: 4
  },
  factLabel: {
    color: muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  factValue: {
    color: ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800'
  },
  microHeading: {
    color: ink,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#F7F7F7'
  },
  countryDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  countryText: {
    color: ink,
    fontSize: 12,
    fontWeight: '800'
  },
  tipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tipRowCompact: {
    paddingBottom: 2
  },
  tipChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFF0F3'
  },
  tipText: {
    color: '#B4233E',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  sectionTitle: {
    color: ink,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900'
  },
  sectionAction: {
    color: airbnbRed,
    fontSize: 13,
    fontWeight: '900'
  },
  matchList: {
    gap: 12,
    paddingRight: 18
  },
  matchCard: {
    width: 250,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7E2'
  },
  matchColor: {
    width: 40,
    height: 5,
    borderRadius: 3
  },
  matchDate: {
    color: muted,
    fontSize: 12,
    fontWeight: '800'
  },
  matchFixture: {
    color: ink,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900'
  },
  matchMeta: {
    color: '#4A4A4A',
    fontSize: 13,
    fontWeight: '700'
  },
  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  matchNeighborhood: {
    color: airbnbRed,
    fontSize: 13,
    fontWeight: '900',
    flex: 1
  },
  matchReason: {
    color: '#5F5F5F',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600'
  },
  routeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  routeCard: {
    width: '48%',
    minHeight: 156,
    borderRadius: 22,
    padding: 14,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7E2'
  },
  routeSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  routeName: {
    color: ink,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900'
  },
  routeMeta: {
    color: muted,
    fontSize: 12,
    fontWeight: '800'
  },
  routeCountries: {
    color: '#4E4E4E',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600'
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D8DE'
  },
  noteText: {
    flex: 1,
    color: '#5F3B42',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700'
  }
});
