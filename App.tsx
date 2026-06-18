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

const lightTheme = {
  accent: airbnbRed,
  background: sand,
  surface: '#FFFFFF',
  surfaceSoft: '#F7F7F7',
  text: ink,
  muted,
  body: '#4E4E4E',
  bodyMuted: '#5F5F5F',
  border: '#ECE7E2',
  inputBorder: '#E7E7E7',
  iconBorder: '#EEEEEE',
  badge: '#FFF0F3',
  badgeText: '#B4233E',
  mapCanvas: '#DDF3F5',
  noteBorder: '#F0D8DE',
  noteText: '#5F3B42',
  shadow: '#000000',
  statusBar: 'dark' as const,
  placeholder: '#8A8A8A'
};

const nightTheme = {
  accent: '#FF5A73',
  background: '#090D18',
  surface: '#121A2B',
  surfaceSoft: '#1A2540',
  text: '#F7FAFC',
  muted: '#A8B3C7',
  body: '#D6DEEC',
  bodyMuted: '#C2CBDC',
  border: '#27344F',
  inputBorder: '#32415F',
  iconBorder: '#34415D',
  badge: '#341826',
  badgeText: '#FF9AAF',
  mapCanvas: '#142237',
  noteBorder: '#473044',
  noteText: '#F4CBD5',
  shadow: '#000000',
  statusBar: 'light' as const,
  placeholder: '#8EA0BA'
};

type AppTheme = typeof lightTheme | typeof nightTheme;

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
  calendar: '▦',
  moon: '☾',
  sun: '☀'
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
  const [nightMode, setNightMode] = useState(false);
  const theme = nightMode ? nightTheme : lightTheme;

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} testID="worldcup-screen">
      <StatusBar style={theme.statusBar} />
      <ScrollView
        contentContainerStyle={[styles.screen, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <AppIcon name="ball" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: theme.muted }]}>Simulator QA demo</Text>
            <Text style={[styles.title, { color: theme.text }]}>World Cup stays local.</Text>
          </View>
          <Pressable
            testID="night-mode-toggle"
            accessibilityRole="switch"
            accessibilityLabel={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
            accessibilityState={{ checked: nightMode }}
            onPress={() => setNightMode((current) => !current)}
            style={[
              styles.iconButton,
              { backgroundColor: theme.surface, borderColor: theme.iconBorder }
            ]}
          >
            <AppIcon name={nightMode ? 'sun' : 'moon'} size={21} color={theme.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: theme.surface,
              borderColor: theme.inputBorder,
              shadowColor: theme.shadow
            }
          ]}
        >
          <AppIcon name="search" size={20} color={theme.muted} />
          <TextInput
            testID="search-input"
            accessibilityLabel="Search teams, boroughs, vibes"
            value={query}
            onChangeText={setQuery}
            placeholder="Search teams, boroughs, vibes"
            placeholderTextColor={theme.placeholder}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <AppIcon name="close" size={18} color={theme.muted} />
            </Pressable>
          ) : (
            <AppIcon name="options" size={19} color={theme.muted} />
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
                style={[
                  styles.filterPill,
                  { backgroundColor: theme.surface, borderColor: theme.inputBorder },
                  selected && [styles.filterPillActive, { backgroundColor: theme.text, borderColor: theme.text }]
                ]}
              >
                <Text style={[styles.filterLabel, { color: selected ? theme.background : theme.text }]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.mapAndCard, !compact && styles.mapAndCardWide]}>
          <InteractiveMap
            spots={filteredSpots}
            selectedId={selectedSpot.id}
            onSelect={setSelectedId}
            theme={theme}
            nightMode={nightMode}
          />
          <SpotDetailCard spot={selectedSpot} compact={compact} theme={theme} />
        </View>

        <SectionHeader
          icon="ticket"
          title="Matchday passports"
          actionLabel={`${matchdayPassports.length} ready`}
          theme={theme}
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
              theme={theme}
            />
          )}
        />
        <PassportDetailPanel passport={selectedPassport} theme={theme} />

        <SectionHeader
          icon="calendar"
          title="Best upcoming pairings"
          actionLabel={`${matchPicks.length} picks`}
          theme={theme}
        />
        <FlatList
          data={matchPicks}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matchList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.matchCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
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
              <Text style={[styles.matchDate, { color: theme.muted }]}>{item.date} - {item.time}</Text>
              <Text style={[styles.matchFixture, { color: theme.text }]}>{formatFixture(item.fixture)}</Text>
              <Text style={[styles.matchMeta, { color: theme.body }]}>{item.venue}</Text>
              <View style={styles.matchFooter}>
                <AppIcon name="map" size={16} color={theme.accent} />
                <Text style={[styles.matchNeighborhood, { color: theme.accent }]}>{item.neighborhoodMatch}</Text>
              </View>
              <Text style={[styles.matchReason, { color: theme.bodyMuted }]}>{item.reason}</Text>
            </Pressable>
          )}
        />

        <SectionHeader icon="walk" title="Culture-first routes" actionLabel="No ticket needed" theme={theme} />
        <View style={styles.routeGrid}>
          {spots
            .filter((spot) => spot.kind === 'culture')
            .map((spot) => (
              <Pressable
                key={spot.id}
                testID={`route-${spot.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${spot.name}, ${spot.neighborhood}, ${spot.borough}`}
                style={[styles.routeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  setActiveFilter('culture');
                  setSelectedId(spot.id);
                }}
              >
                <View style={[styles.routeSwatch, { backgroundColor: spot.accent }]} />
                <Text style={[styles.routeName, { color: theme.text }]}>{spot.name}</Text>
                <Text style={[styles.routeMeta, { color: theme.muted }]}>{spot.neighborhood} - {spot.borough}</Text>
                <Text style={[styles.routeCountries, { color: theme.body }]} numberOfLines={2}>
                  {spot.countries.map(formatCountry).join(', ')}
                </Text>
              </Pressable>
            ))}
        </View>

        <View style={[styles.noteBox, { backgroundColor: theme.surface, borderColor: theme.noteBorder }]}>
          <AppIcon name="info" size={20} color={theme.accent} />
          <Text style={[styles.noteText, { color: theme.noteText }]}>
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
  onSelect,
  theme,
  nightMode
}: {
  spots: Spot[];
  selectedId: string;
  onSelect: (spotId: string) => void;
  theme: AppTheme;
  nightMode: boolean;
}) {
  return (
    <View
      style={[
        styles.mapShell,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }
      ]}
      testID="map-shell"
      accessibilityLabel={`${visibleSpots.length} active World Cup map pins`}
    >
      <View style={styles.mapHeader}>
        <View>
          <Text style={[styles.mapTitle, { color: theme.text }]}>NYC culture map</Text>
          <Text style={[styles.mapSubtitle, { color: theme.muted }]}>{visibleSpots.length} active pins</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: theme.surfaceSoft }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: theme.text }]}>Live plan</Text>
        </View>
      </View>

      <View style={[styles.mapCanvas, { backgroundColor: theme.mapCanvas }]}>
        <RealMap spots={visibleSpots} selectedId={selectedId} onSelect={onSelect} nightMode={nightMode} />
      </View>
    </View>
  );
}

function SpotDetailCard({ spot, compact, theme }: { spot: Spot; compact: boolean; theme: AppTheme }) {
  return (
    <View
      style={[
        styles.detailCard,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }
      ]}
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
          <Text style={[styles.ratingText, { color: theme.text }]}>Plan pick</Text>
        </View>
      </View>

      <Text style={[styles.detailTitle, { color: theme.text }]}>{spot.name}</Text>
      <Text style={[styles.detailPlace, { color: theme.muted }]}>{spot.neighborhood} - {spot.borough}</Text>
      <Text style={[styles.detailHeadline, { color: theme.text }]}>{spot.headline}</Text>
      <Text style={[styles.detailBody, { color: theme.body }]}>{spot.details}</Text>

      <View style={styles.factGrid}>
        <Fact icon="time" label="Window" value={spot.nextWindow} theme={theme} />
        <Fact icon="people" label="Crowd" value={spot.crowd} theme={theme} />
        <Fact icon="ticket" label="Cost" value={spot.price} theme={theme} />
        <Fact icon="train" label="Transit" value={spot.transit} theme={theme} />
      </View>

      <Text style={[styles.microHeading, { color: theme.text }]}>Countries to follow</Text>
      <View style={styles.chipRow}>
        {spot.countries.map((country) => (
          <View key={country} style={[styles.countryChip, { backgroundColor: theme.surfaceSoft }]}>
            <Text style={styles.countryFlag}>{countryFlags[country] ?? '🏳️'}</Text>
            <Text style={[styles.countryText, { color: theme.text }]}>{country}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.tipRow, compact && styles.tipRowCompact]}>
        {spot.tips.map((tip) => (
          <View key={tip} style={[styles.tipChip, { backgroundColor: theme.badge }]}>
            <Text style={[styles.tipText, { color: theme.badgeText }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PassportCard({
  passport,
  selected,
  onPress,
  theme
}: {
  passport: MatchdayPassport;
  selected: boolean;
  onPress: () => void;
  theme: AppTheme;
}) {
  return (
    <Pressable
      testID={`passport-card-${passport.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${passport.title}, ${passport.neighborhood}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.passportCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        selected && [styles.passportCardSelected, { borderColor: theme.accent, shadowColor: theme.shadow }]
      ]}
    >
      <View style={styles.passportTopRow}>
        <View style={[styles.passportFlagWrap, { backgroundColor: passport.color }]}>
          <Text style={styles.passportFlag}>{countryFlags[passport.country] ?? '🏳️'}</Text>
        </View>
        <View style={[styles.passportBadge, { backgroundColor: theme.badge }]}>
          <AppIcon name="ticket" size={13} color={theme.accent} />
          <Text style={[styles.passportBadgeText, { color: theme.accent }]}>Passport</Text>
        </View>
      </View>
      <Text style={[styles.passportCountry, { color: theme.muted }]}>{formatCountry(passport.country)}</Text>
      <Text style={[styles.passportTitle, { color: theme.text }]}>{passport.title}</Text>
      <Text style={[styles.passportFixture, { color: theme.accent }]}>{passport.fixture}</Text>
      <Text style={[styles.passportHero, { color: theme.body }]} numberOfLines={3}>
        {passport.hero}
      </Text>
      <View style={styles.passportFooter}>
        <AppIcon name="map" size={15} color={selected ? theme.accent : theme.muted} />
        <Text
          style={[
            styles.passportNeighborhood,
            { color: selected ? theme.accent : theme.muted }
          ]}
        >
          {passport.neighborhood}
        </Text>
      </View>
    </Pressable>
  );
}

function PassportDetailPanel({ passport, theme }: { passport: MatchdayPassport; theme: AppTheme }) {
  return (
    <View
      testID={`passport-detail-${passport.id}`}
      accessibilityLabel={`${passport.title} itinerary`}
      style={[styles.passportPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.passportPanelHeader}>
        <View style={[styles.passportPanelMark, { backgroundColor: passport.color }]}>
          <Text style={styles.passportPanelFlag}>{countryFlags[passport.country] ?? '🏳️'}</Text>
        </View>
        <View style={styles.passportPanelCopy}>
          <Text style={[styles.passportPanelEyebrow, { color: theme.muted }]}>Selected passport</Text>
          <Text style={[styles.passportPanelTitle, { color: theme.text }]}>{passport.title}</Text>
        </View>
      </View>

      <Text style={[styles.passportPanelSummary, { color: theme.body }]}>{passport.hero}</Text>

      <View style={styles.passportPlanGrid}>
        <PassportFact label="Watch" value={passport.watchParty} theme={theme} />
        <PassportFact label="Eat" value={passport.foodPlan} theme={theme} />
        <PassportFact label="Explore" value={passport.cultureStop} theme={theme} />
        <PassportFact label="Transit" value={passport.transitPlan} theme={theme} />
      </View>

      <View style={[styles.passportBudgetRow, { backgroundColor: theme.badge }]}>
        <AppIcon name="ticket" size={16} color={theme.accent} />
        <Text style={[styles.passportBudgetText, { color: theme.badgeText }]}>{passport.budget}</Text>
      </View>

      <View style={styles.passportTimeline}>
        {passport.stops.map((stop) => (
          <View
            key={stop.id}
            testID={`passport-stop-${passport.id}-${stop.id}`}
            style={styles.passportStop}
          >
            <View style={styles.passportStopRail}>
              <View style={[styles.passportStopDot, { backgroundColor: passport.color, borderColor: theme.surface }]} />
            </View>
            <View style={styles.passportStopContent}>
              <Text style={[styles.passportStopTime, { color: theme.muted }]}>{stop.time}</Text>
              <Text style={[styles.passportStopTitle, { color: theme.text }]}>{stop.title}</Text>
              <Text style={[styles.passportStopDetail, { color: theme.bodyMuted }]}>{stop.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PassportFact({ label, value, theme }: { label: string; value: string; theme: AppTheme }) {
  return (
    <View style={[styles.passportFact, { backgroundColor: theme.surfaceSoft }]}>
      <Text style={[styles.passportFactLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.passportFactValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function Fact({ icon, label, value, theme }: { icon: AppIconName; label: string; value: string; theme: AppTheme }) {
  return (
    <View style={[styles.fact, { backgroundColor: theme.surfaceSoft }]}>
      <AppIcon name={icon} size={16} color={theme.accent} />
      <Text style={[styles.factLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.factValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  actionLabel,
  theme
}: {
  icon: AppIconName;
  title: string;
  actionLabel: string;
  theme: AppTheme;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <AppIcon name={icon} size={20} color={theme.text} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.sectionAction, { color: theme.accent }]}>{actionLabel}</Text>
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
