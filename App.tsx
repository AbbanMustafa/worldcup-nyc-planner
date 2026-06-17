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
import { FilterId, MatchdayPassport, Spot, filters, matchPicks, matchdayPassports, spots } from './src/data';

const airbnbRed = '#FF385C';
const ink = '#1F1F1F';
const muted = '#717171';
const sand = '#FFF8F3';

const countryFlags: Record<string, string> = {
  Algeria: '🇩🇿',
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  Brazil: '🇧🇷',
  Colombia: '🇨🇴',
  Croatia: '🇭🇷',
  Czechia: '🇨🇿',
  Ecuador: '🇪🇨',
  Egypt: '🇪🇬',
  England: '🏴',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Ghana: '🇬🇭',
  Iraq: '🇮🇶',
  Japan: '🇯🇵',
  'Korea Republic': '🇰🇷',
  Mexico: '🇲🇽',
  Morocco: '🇲🇦',
  Norway: '🇳🇴',
  Panama: '🇵🇦',
  Paraguay: '🇵🇾',
  Senegal: '🇸🇳',
  'South Africa': '🇿🇦',
  Spain: '🇪🇸',
  Tunisia: '🇹🇳',
  Uruguay: '🇺🇾',
  USA: '🇺🇸',
  'All teams': '🌎',
  'Finalists TBD': '🏆'
};

const iconGlyphs = {
  ball: '⚽',
  heart: '♡',
  search: '⌕',
  close: '×',
  options: '≡',
  map: '⌖',
  info: 'i',
  walk: '↟',
  trophy: '🏆',
  tv: '▣',
  star: '★',
  time: '◷',
  people: '◎',
  ticket: '#',
  train: 'T',
  calendar: '▦'
} as const;

type AppIconName = keyof typeof iconGlyphs;

function formatCountry(country: string) {
  return `${countryFlags[country] ?? '🏳️'} ${country}`;
}

function formatFixture(fixture: string) {
  if (fixture === 'World Cup Final') {
    return '🏆 World Cup Final';
  }

  return fixture.split(' vs ').map(formatCountry).join(' vs ');
}

function AppIcon({ name, size, color }: { name: AppIconName; size: number; color: string }) {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.appIcon,
        {
          color,
          fontSize: size,
          lineHeight: size + 2,
          minWidth: size + 2
        }
      ]}
    >
      {iconGlyphs[name]}
    </Text>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(spots[0].id);
  const [selectedPassportId, setSelectedPassportId] = useState(matchdayPassports[0].id);

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
  const selectedPassport =
    matchdayPassports.find((passport) => passport.id === selectedPassportId) ?? matchdayPassports[0];

  const handleFilterChange = (filterId: FilterId) => {
    setActiveFilter(filterId);
    const nextSpot = spots.find((spot) => filterId === 'all' || spot.kind === filterId);
    if (nextSpot) {
      setSelectedId(nextSpot.id);
    }
  };

  const handlePassportSelect = (passport: MatchdayPassport) => {
    setSelectedPassportId(passport.id);
    setActiveFilter('all');
    setSelectedId(passport.anchorSpotId);
  };

  const compact = width < 760;

  return (
    <SafeAreaView style={styles.safeArea} testID="worldcup-screen">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <AppIcon name="ball" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Simulator QA demo</Text>
            <Text style={styles.title}>World Cup stays local.</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityLabel="Open saved plans">
            <AppIcon name="heart" size={21} color={ink} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <AppIcon name="search" size={20} color={muted} />
          <TextInput
            testID="search-input"
            accessibilityLabel="Search teams, boroughs, vibes"
            value={query}
            onChangeText={setQuery}
            placeholder="Search teams, boroughs, vibes"
            placeholderTextColor="#8A8A8A"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <AppIcon name="close" size={18} color={muted} />
            </Pressable>
          ) : (
            <AppIcon name="options" size={19} color={muted} />
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
                testID={`filter-${filter.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${filter.label} filter`}
                accessibilityState={{ selected }}
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
          icon="ticket"
          title="Matchday passports"
          actionLabel={`${matchdayPassports.length} ready`}
        />
        <FlatList
          testID="matchday-passports"
          data={matchdayPassports}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.passportList}
          renderItem={({ item }) => (
            <PassportCard
              passport={item}
              selected={selectedPassport.id === item.id}
              onPress={() => handlePassportSelect(item)}
            />
          )}
        />
        <PassportDetailPanel passport={selectedPassport} />

        <SectionHeader icon="calendar" title="Best upcoming pairings" actionLabel={`${matchPicks.length} picks`} />
        <FlatList
          data={matchPicks}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matchList}
          renderItem={({ item }) => (
            <Pressable
              style={styles.matchCard}
              accessibilityRole="button"
              accessibilityLabel={`${formatFixture(item.fixture)} at ${item.venue}`}
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
              <Text style={styles.matchFixture}>{formatFixture(item.fixture)}</Text>
              <Text style={styles.matchMeta}>{item.venue}</Text>
              <View style={styles.matchFooter}>
                <AppIcon name="map" size={16} color={airbnbRed} />
                <Text style={styles.matchNeighborhood}>{item.neighborhoodMatch}</Text>
              </View>
              <Text style={styles.matchReason}>{item.reason}</Text>
            </Pressable>
          )}
        />

        <SectionHeader icon="walk" title="Culture-first routes" actionLabel="No ticket needed" />
        <View style={styles.routeGrid}>
          {spots
            .filter((spot) => spot.kind === 'culture')
            .map((spot) => (
              <Pressable
                key={spot.id}
                testID={`route-${spot.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${spot.name}, ${spot.neighborhood}, ${spot.borough}`}
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
                  {spot.countries.map(formatCountry).join(', ')}
                </Text>
              </Pressable>
            ))}
        </View>

        <View style={styles.noteBox}>
          <AppIcon name="info" size={20} color={airbnbRed} />
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
    <View
      style={styles.mapShell}
      testID="map-shell"
      accessibilityLabel={`${visibleSpots.length} active World Cup map pins`}
    >
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
    <View
      style={styles.detailCard}
      testID="spot-detail-card"
      accessibilityLabel={`${spot.name}, ${spot.neighborhood}, ${spot.borough}`}
    >
      <View style={styles.detailTopRow}>
        <View style={[styles.kindBadge, { backgroundColor: spot.accent }]}>
          <AppIcon
            name={spot.kind === 'culture' ? 'walk' : spot.kind === 'final' ? 'trophy' : 'tv'}
            size={15}
            color="#FFFFFF"
          />
          <Text style={styles.kindText}>{spot.kind}</Text>
        </View>
        <View style={styles.ratingWrap}>
          <AppIcon name="star" size={14} color="#FFB400" />
          <Text style={styles.ratingText}>Plan pick</Text>
        </View>
      </View>

      <Text style={styles.detailTitle}>{spot.name}</Text>
      <Text style={styles.detailPlace}>{spot.neighborhood} - {spot.borough}</Text>
      <Text style={styles.detailHeadline}>{spot.headline}</Text>
      <Text style={styles.detailBody}>{spot.details}</Text>

      <View style={styles.factGrid}>
        <Fact icon="time" label="Window" value={spot.nextWindow} />
        <Fact icon="people" label="Crowd" value={spot.crowd} />
        <Fact icon="ticket" label="Cost" value={spot.price} />
        <Fact icon="train" label="Transit" value={spot.transit} />
      </View>

      <Text style={styles.microHeading}>Countries to follow</Text>
      <View style={styles.chipRow}>
        {spot.countries.map((country) => (
          <View key={country} style={styles.countryChip}>
            <Text style={styles.countryFlag}>{countryFlags[country] ?? '🏳️'}</Text>
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

function PassportCard({
  passport,
  selected,
  onPress
}: {
  passport: MatchdayPassport;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`passport-card-${passport.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${passport.title}, ${passport.neighborhood}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.passportCard, selected && styles.passportCardSelected]}
    >
      <View style={styles.passportTopRow}>
        <View style={[styles.passportFlagWrap, { backgroundColor: passport.color }]}>
          <Text style={styles.passportFlag}>{countryFlags[passport.country] ?? '🏳️'}</Text>
        </View>
        <View style={styles.passportBadge}>
          <AppIcon name="ticket" size={13} color={airbnbRed} />
          <Text style={styles.passportBadgeText}>Passport</Text>
        </View>
      </View>
      <Text style={styles.passportCountry}>{formatCountry(passport.country)}</Text>
      <Text style={styles.passportTitle}>{passport.title}</Text>
      <Text style={styles.passportFixture}>{passport.fixture}</Text>
      <Text style={styles.passportHero} numberOfLines={3}>
        {passport.hero}
      </Text>
      <View style={styles.passportFooter}>
        <AppIcon name="map" size={15} color={selected ? airbnbRed : muted} />
        <Text style={[styles.passportNeighborhood, selected && styles.passportNeighborhoodSelected]}>
          {passport.neighborhood}
        </Text>
      </View>
    </Pressable>
  );
}

function PassportDetailPanel({ passport }: { passport: MatchdayPassport }) {
  return (
    <View
      testID={`passport-detail-${passport.id}`}
      accessibilityLabel={`${passport.title} itinerary`}
      style={styles.passportPanel}
    >
      <View style={styles.passportPanelHeader}>
        <View style={[styles.passportPanelMark, { backgroundColor: passport.color }]}>
          <Text style={styles.passportPanelFlag}>{countryFlags[passport.country] ?? '🏳️'}</Text>
        </View>
        <View style={styles.passportPanelCopy}>
          <Text style={styles.passportPanelEyebrow}>Selected passport</Text>
          <Text style={styles.passportPanelTitle}>{passport.title}</Text>
        </View>
      </View>

      <Text style={styles.passportPanelSummary}>{passport.hero}</Text>

      <View style={styles.passportPlanGrid}>
        <PassportFact label="Watch" value={passport.watchParty} />
        <PassportFact label="Eat" value={passport.foodPlan} />
        <PassportFact label="Explore" value={passport.cultureStop} />
        <PassportFact label="Transit" value={passport.transitPlan} />
      </View>

      <View style={styles.passportBudgetRow}>
        <AppIcon name="ticket" size={16} color={airbnbRed} />
        <Text style={styles.passportBudgetText}>{passport.budget}</Text>
      </View>

      <View style={styles.passportTimeline}>
        {passport.stops.map((stop) => (
          <View
            key={stop.id}
            testID={`passport-stop-${passport.id}-${stop.id}`}
            style={styles.passportStop}
          >
            <View style={styles.passportStopRail}>
              <View style={[styles.passportStopDot, { backgroundColor: passport.color }]} />
            </View>
            <View style={styles.passportStopContent}>
              <Text style={styles.passportStopTime}>{stop.time}</Text>
              <Text style={styles.passportStopTitle}>{stop.title}</Text>
              <Text style={styles.passportStopDetail}>{stop.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PassportFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.passportFact}>
      <Text style={styles.passportFactLabel}>{label}</Text>
      <Text style={styles.passportFactValue}>{value}</Text>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppIcon name={icon} size={16} color={airbnbRed} />
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
  icon: AppIconName;
  title: string;
  actionLabel: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <AppIcon name={icon} size={20} color={ink} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionAction}>{actionLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    fontWeight: '900',
    textAlign: 'center'
  },
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
  countryFlag: {
    fontSize: 14,
    lineHeight: 17
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
  passportList: {
    gap: 12,
    paddingRight: 18
  },
  passportCard: {
    width: 282,
    minHeight: 238,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7E2'
  },
  passportCardSelected: {
    borderColor: airbnbRed,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  passportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  passportFlagWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center'
  },
  passportFlag: {
    fontSize: 25,
    lineHeight: 30
  },
  passportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#FFF0F3'
  },
  passportBadgeText: {
    color: airbnbRed,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  passportCountry: {
    color: muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  passportTitle: {
    color: ink,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900'
  },
  passportFixture: {
    color: airbnbRed,
    fontSize: 13,
    fontWeight: '900'
  },
  passportHero: {
    color: '#4E4E4E',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  },
  passportFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  passportNeighborhood: {
    flex: 1,
    color: muted,
    fontSize: 13,
    fontWeight: '900'
  },
  passportNeighborhoodSelected: {
    color: airbnbRed
  },
  passportPanel: {
    borderRadius: 24,
    padding: 16,
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7E2'
  },
  passportPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  passportPanelMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  passportPanelFlag: {
    fontSize: 29,
    lineHeight: 34
  },
  passportPanelCopy: {
    flex: 1,
    minWidth: 0
  },
  passportPanelEyebrow: {
    color: muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  passportPanelTitle: {
    color: ink,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900'
  },
  passportPanelSummary: {
    color: '#4E4E4E',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  passportPlanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  passportFact: {
    width: '47%',
    minHeight: 82,
    borderRadius: 16,
    padding: 12,
    gap: 5,
    backgroundColor: '#F7F7F7'
  },
  passportFactLabel: {
    color: muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  passportFactValue: {
    color: ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800'
  },
  passportBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: 14,
    backgroundColor: '#FFF0F3'
  },
  passportBudgetText: {
    color: '#B4233E',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900'
  },
  passportTimeline: {
    gap: 12
  },
  passportStop: {
    flexDirection: 'row',
    gap: 11
  },
  passportStopRail: {
    width: 18,
    alignItems: 'center',
    paddingTop: 3
  },
  passportStopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  passportStopContent: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 2
  },
  passportStopTime: {
    color: muted,
    fontSize: 11,
    fontWeight: '900'
  },
  passportStopTitle: {
    color: ink,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900'
  },
  passportStopDetail: {
    color: '#5F5F5F',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
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
