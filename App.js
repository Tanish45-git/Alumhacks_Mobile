import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { demoDevices, demoNotices, GinjerClient, hasCoordinates, isMongoObjectId } from './src/api';

const C = {
  green: '#3E8055', greenDark: '#23563A', greenPale: '#E8F2E9', ink: '#17261D', muted: '#69786F',
  line: '#E4EBE4', canvas: '#F4F7F3', white: '#FFFFFF', red: '#C9554D', redPale: '#FCEDEA',
  amber: '#C58A2E', amberPale: '#FBF1DF', blue: '#347D96', bluePale: '#EAF3F6',
};
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const DEVICE_VISUALS = {
  snow: { icon: 'snowflake', color: '#3386A3', background: '#EAF5F8' },
  water: { icon: 'water-outline', color: '#398FAE', background: '#EAF4F7' },
  controller: { icon: 'tune-variant', color: C.greenDark, background: C.greenPale },
  alert: { icon: 'alarm-light-outline', color: C.red, background: C.redPale },
  air: { icon: 'air-filter', color: '#4B83A3', background: '#EEF4FA' },
  busylight: { icon: 'lightbulb-on-outline', color: '#B88424', background: C.amberPale },
  tektelic: { icon: 'access-point', color: '#6E65B6', background: '#F1EFFB' },
  agriculture: { icon: 'sprout', color: '#53864A', background: '#EEF5E8' },
  comfort: { icon: 'thermometer', color: '#C56B43', background: '#FFF0E8' },
  occupancy: { icon: 'motion-sensor', color: '#7370B8', background: '#F0EFFA' },
  access: { icon: 'door-closed', color: '#4E7DA9', background: '#EEF4FA' },
  fire: { icon: 'smoke-detector-outline', color: '#CB5248', background: '#FDEEEA' },
  energy: { icon: 'lightning-bolt', color: '#C78925', background: '#FFF5E3' },
  humidity: { icon: 'water-percent', color: '#4387A2', background: '#EAF4F7' },
  gateway: { icon: 'router-wireless', color: '#6F65AE', background: '#F1EFFB' },
};
const GENERIC_DEVICE_VISUALS = [
  { icon: 'chip', color: '#517B69', background: '#EDF4EF' },
  { icon: 'radar', color: '#5D78A1', background: '#EEF2F8' },
  { icon: 'access-point', color: '#6E65B6', background: '#F1EFFB' },
  { icon: 'chart-timeline-variant', color: '#3E8293', background: '#EAF4F5' },
  { icon: 'router-wireless', color: '#A16C43', background: '#F8F0E9' },
  { icon: 'devices', color: '#647A4A', background: '#F0F4E9' },
];
const NOTICE_IMAGES = {
  'notice-fill-critical': require('./assets/reference/notice-fill-critical.png'),
  'notice-fill-warning': require('./assets/reference/notice-fill-warning.png'),
  'notice-sos': require('./assets/reference/notice-sos.png'),
  'notice-safe': require('./assets/reference/notice-safe.png'),
  'notice-water-critical': require('./assets/reference/notice-water-critical.png'),
  'notice-water-safe': require('./assets/reference/notice-water-safe.png'),
  'notice-light': require('./assets/reference/notice-light.png'),
};
const AUTO_RULE_SEED = [
  { id: 'irrigation-1-auto', name: 'Irrigation - Zone 1 (Automatic)', solution: 'Default solution', output: 'Valve 1', mode: 'automatic', active: false, runs: 6 },
  { id: 'irrigation-1-manual', name: 'Irrigation - Zone 1 (Manual)', solution: 'Default solution', output: 'Valve 1', mode: 'manual', active: false, runs: 6 },
  { id: 'irrigation-2-auto', name: 'Irrigation - Zone 2 (Automatic)', solution: 'Default solution', output: 'Valve 2', mode: 'automatic', active: false, runs: 6 },
  { id: 'irrigation-2-manual', name: 'Irrigation - Zone 2 (Manual)', solution: 'Default solution', output: 'Valve 2', mode: 'manual', active: false, runs: 6 },
  { id: 'irrigation-3-auto', name: 'Irrigation - Zone 3 (Automatic)', solution: 'Default solution', output: 'Valve 3', mode: 'automatic', active: false, runs: 6 },
  { id: 'irrigation-3-manual', name: 'Irrigation - Zone 3 (Manual)', solution: 'Default solution', output: 'Valve 3', mode: 'manual', active: false, runs: 6 },
  { id: 'pump-auto', name: 'Pump Automation', solution: 'uPark solution', output: 'Pump', mode: 'automatic', active: false, runs: 4 },
  { id: 'pump-off', name: 'Pump Off', solution: 'uPark solution', output: 'Pump', mode: 'manual', active: false, runs: 2 },
  { id: 'pump-on', name: 'Pump On', solution: 'uPark solution', output: 'Pump', mode: 'manual', active: true, runs: 2, running: true },
];
const GOOGLE_MAPS_LIGHT_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#525b54' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eef3ea' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5d675f' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dcedd8' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4b7554' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fedda0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e7c588' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#808982' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c7e5f5' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#688d9e' }] },
];

const DEMO_PROFILE = { name: 'Shaheen Ansari', email: 'shaheenansari2519cs@gmail.com', primaryPhone: '', secondaryPhone: '', organization: 'SenRa IoT' };
const ALL_PROJECTS_ID = '__all_projects__';
const SESSION_STORAGE_KEY = 'alumhacks.ginjer.session.v1';
const DEMO_PROJECTS = [
  { _id: 'demo-default-solution', name: 'Default solution', isDemo: true },
  { _id: 'demo-upark-solution', name: 'uPark solution', isDemo: true },
];
const POPULAR_PLACES = {
  delhi: { latitude: 28.6139, longitude: 77.2090, name: 'Delhi, India' },
  'new delhi': { latitude: 28.6139, longitude: 77.2090, name: 'New Delhi, India' },
  mumbai: { latitude: 19.0760, longitude: 72.8777, name: 'Mumbai, Maharashtra' },
  jaipur: { latitude: 26.9124, longitude: 75.7873, name: 'Jaipur, Rajasthan' },
  bangalore: { latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka' },
  bengaluru: { latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka' },
  hyderabad: { latitude: 17.3850, longitude: 78.4867, name: 'Hyderabad, Telangana' },
  chennai: { latitude: 13.0827, longitude: 80.2707, name: 'Chennai, Tamil Nadu' },
  kolkata: { latitude: 22.5726, longitude: 88.3639, name: 'Kolkata, West Bengal' },
  pune: { latitude: 18.5204, longitude: 73.8567, name: 'Pune, Maharashtra' },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714, name: 'Ahmedabad, Gujarat' },
  lucknow: { latitude: 26.8467, longitude: 80.9462, name: 'Lucknow, Uttar Pradesh' },
  chandigarh: { latitude: 30.7333, longitude: 76.7794, name: 'Chandigarh, India' },
  indore: { latitude: 22.7196, longitude: 75.8577, name: 'Indore, Madhya Pradesh' },
  bhopal: { latitude: 23.2599, longitude: 77.4126, name: 'Bhopal, Madhya Pradesh' },
  noida: { latitude: 28.5355, longitude: 77.3910, name: 'Noida, Uttar Pradesh' },
  gurgaon: { latitude: 28.4595, longitude: 77.0266, name: 'Gurgaon, Haryana' },
  gurugram: { latitude: 28.4595, longitude: 77.0266, name: 'Gurugram, Haryana' },
};


function IconButton({ name, onPress, label, style, color = C.muted, size = 21 }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={[styles.iconButton, style]}><Icon name={name} size={size} color={color} /></Pressable>;
}

function ProfileAvatar({ uri, onEditPress, size = 82, style }) {
  const radius = size / 2;
  return (
    <View style={[styles.avatarWrap, { width: size, height: size }, style]}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: radius }]}>
        {uri ? <Image source={{ uri }} resizeMode="cover" style={styles.avatarImage} /> : <Icon name="account-outline" size={Math.round(size * 0.42)} color={C.greenDark} />}
      </View>
      {onEditPress ? <Pressable accessibilityRole="button" accessibilityLabel="Edit profile photo" onPress={onEditPress} hitSlop={12} style={styles.editPhotoButton}>
        <Icon name="pencil" size={15} color={C.white} />
      </Pressable> : null}
    </View>
  );
}

function ProfileMenuRow({ icon, title, value, onPress, last = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={value ? `${title}: ${value}` : title} onPress={onPress} style={[styles.menuRow, last && styles.menuRowLast]}>
    <View style={styles.menuIconSlot}><Icon name={icon} size={21} color={C.greenDark} /></View>
    <View style={styles.menuCopy}>
      <Text numberOfLines={1} style={styles.menuTitle}>{title}</Text>
      {value ? <Text numberOfLines={1} ellipsizeMode="tail" style={styles.menuValue}>{value}</Text> : null}
    </View>
    <Icon name="chevron-right" size={19} color="#A8ADA9" />
  </Pressable>;
}

function ProfileField({ label, value, onChangeText, icon, keyboardType, autoCapitalize, onPress, editable = true }) {
  return <View style={styles.profileFieldGroup}>
    <Text style={styles.profileFieldLabel}>{label}</Text>
    <Pressable disabled={!onPress} onPress={onPress} style={styles.profileField}>
      <Icon name={icon} size={20} color={C.greenDark} />
      <TextInput value={value} onChangeText={onChangeText} editable={editable} keyboardType={keyboardType} autoCapitalize={autoCapitalize} autoCorrect={false} style={styles.profileFieldInput} placeholder={label} placeholderTextColor="#9EA39F" accessibilityLabel={label} />
      {onPress ? <Icon name="chevron-down" size={19} color={C.muted} /> : null}
    </Pressable>
  </View>;
}

function ScreenHeader({ title, onBack, right }) {
  return <View style={[styles.pageHeader, styles.pageHeaderPremium]}>
    <IconButton name="arrow-left" label="Back" onPress={onBack} color={C.ink} />
    <Text numberOfLines={1} style={[styles.pageTitle, styles.pageTitlePremium]}>{title}</Text>
    <View style={styles.pageRight}>{right || null}</View>
  </View>;
}

function SearchField({ value, onChangeText, placeholder = 'Search devices', style, onSubmitEditing }) {
  return <View style={[styles.searchField, styles.searchFieldPremium, style]}>
    <Icon name="magnify" size={20} color={C.muted} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A0A6A1" style={styles.searchInput} returnKeyType="search" accessibilityLabel={placeholder} onSubmitEditing={onSubmitEditing} />
    {value ? (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={onSubmitEditing} style={{ paddingHorizontal: 6 }} hitSlop={6} accessibilityLabel="Search">
          <Icon name="arrow-right-circle" size={20} color={C.greenDark} />
        </Pressable>
        <IconButton name="close-circle" label="Clear search" size={18} onPress={() => onChangeText('')} />
      </View>
    ) : null}
  </View>;
}

function StatusChip({ label, status }) {
  const colors = status === 'red' ? [C.redPale, C.red] : status === 'amber' ? [C.amberPale, '#A87917'] : status === 'blue' ? [C.bluePale, C.blue] : [C.greenPale, C.greenDark];
  return <View style={[styles.statusChip, styles.statusChipPremium, { backgroundColor: colors[0] }]}><Text numberOfLines={1} style={[styles.statusChipText, styles.statusChipTextPremium, { color: colors[1] }]}>{label}</Text></View>;
}

function genericDeviceVisual(name) {
  const key = String(name || 'device').trim().toLowerCase();
  const hash = [...key].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  return GENERIC_DEVICE_VISUALS[hash % GENERIC_DEVICE_VISUALS.length];
}

function DeviceThumb({ kind, name, size = 54 }) {
  const visual = DEVICE_VISUALS[kind] || genericDeviceVisual(name);
  return <View style={[styles.deviceThumb, styles.deviceThumbPremium, { width: size, height: size, backgroundColor: visual.background, borderColor: `${visual.color}30`, borderWidth: 1 }]}>
    <Icon name={visual.icon} size={Math.round(size * 0.48)} color={visual.color} />
  </View>;
}

function DeviceCard({ device, onPress }) {
  const statusColor = device.chips?.[0]?.status === 'red' ? C.red : device.chips?.[0]?.status === 'amber' ? C.amber : C.green;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${device.name}, ${device.loc}. Open details`} onPress={onPress} style={({ pressed }) => [styles.deviceCard, styles.deviceCardLayoutOverride, styles.deviceCardPremium, pressed && styles.pressed]}>
    <View style={[styles.deviceCardTop, styles.deviceCardTopPremium]}>
      <DeviceThumb kind={device.kind} name={device.name} size={50} />
      <View style={styles.deviceCardBody}>
        <Text numberOfLines={1} style={[styles.deviceName, styles.deviceNamePremium]}>{device.name}</Text>
        {device.projectName || device.solutionName ? <Text numberOfLines={1} style={styles.deviceProject}>{device.projectName || device.solutionName}</Text> : null}
        <Text numberOfLines={1} style={[styles.deviceLocation, styles.deviceLocationPremium]}><Icon name="map-marker-outline" size={13} color={C.muted} /> {device.loc}</Text>
      </View>
      <Icon name="chevron-right" color="#A1AAA2" size={20} />
    </View>
    <View style={[styles.deviceCardBottom, styles.deviceCardBottomPremium]}>
      <View style={[styles.chipRow, styles.deviceCardChipRow]}>{device.chips?.slice(0, 2).map((chip, index) => <StatusChip key={`${chip.label}-${index}`} {...chip} />)}</View>
      <View style={styles.deviceLastHeard}>
        <View style={[styles.onlineDot, { backgroundColor: statusColor }]} />
        <Text numberOfLines={1} style={styles.deviceLastHeardText}>{device.heard || 'Last heard unknown'}</Text>
      </View>
    </View>
    <Text numberOfLines={1} style={[styles.deviceIdLine, styles.deviceIdLinePremium]}>DEVICE ID  ·  {device.id || device.devEui || device.hardwareId || 'Not reported'}{device.hardwareType ? `  ·  ${device.hardwareType}` : ''}{device.networkId ? `  ·  Network ${device.networkId}` : ''}</Text>
  </Pressable>;
}

function preferredDownlinkModule(device, modules) {
  const interfaces = modules;
  const relayController = /relay|lt\s*io\s*controller/i.test(`${device?.name || ''} ${device?.hardwareType || ''} ${device?.outputs?.map(output => output.outputName || output.label || '').join(' ') || ''}`);
  if (relayController) {
    return interfaces.find(module => /^relay\s*1$/i.test(module.label || ''))
      || interfaces.find(module => /relay control|control relay output/i.test(module.label || ''))
      || interfaces.find(module => /^gpio\s*1$/i.test(module.label || ''))
      || null;
  }
  return interfaces.length === 1 ? interfaces[0] : null;
}

function colorCommandValue(module, enteredValue) {
  if (!/set\s*colou?r/i.test(module?.label || '')) return enteredValue.trim();
  const supported = { red: 'Red', blue: 'Blue', green: 'Green', off: 'Off' };
  return supported[enteredValue.trim().toLowerCase()] || '';
}

function downlinkConfirmation(receipt) {
  const raw = String(receipt?.message || '').trim();
  const type = String(receipt?.type || '').trim();
  if (!raw || !type) throw new Error('Ginjer returned no usable downlink result. Check device logs before trying again.');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const status = parsed && (typeof parsed.status === 'number' || typeof parsed.status === 'string')
    ? Number(parsed.status)
    : null;
  const detail = parsed?.statusText || parsed?.message || raw;
  if (/parsing|error|fail|reject/i.test(type) || (status !== null && ![200, 201, 202].includes(status))) {
    throw new Error(`Downlink rejected${status !== null && Number.isFinite(status) ? ` (${status})` : ''}: ${detail}`);
  }
  if (status !== null && [200, 201, 202].includes(status)) {
    return `Ginjer accepted the downlink request (${detail}). Device execution is not confirmed until its next uplink.`;
  }
  return `Ginjer replied: ${detail}. Device execution is not confirmed until its next uplink.`;
}

function BottomTabs({ current, onChange }) {
  const items = [
    ['devices', 'Devices', 'view-dashboard-outline'], ['locations', 'Locations', 'map-outline'],
    ['analytics', 'Analytics', 'chart-box-outline'], ['profile', 'Profile', 'account-outline'],
  ];
  return <SafeAreaView edges={['bottom']} style={styles.tabSafeArea}>
    <View style={[styles.bottomTabs, styles.bottomTabsPremium]}>
      {items.map(([id, label, icon]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: current === id }} onPress={() => onChange(id)} style={styles.tabButton}>
        <View style={[styles.tabIconShell, styles.tabIconShellPremium, current === id && styles.tabIconShellActive]}><Icon name={icon} size={21} color={current === id ? C.greenDark : '#9BA19D'} /></View>
        <Text style={[styles.tabLabel, styles.tabLabelPremium, current === id && styles.tabLabelActive]}>{label}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}

function ActionButton({ title, onPress, secondary = false, disabled = false, style }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [secondary ? styles.secondaryButton : styles.primaryButton, styles.buttonPremium, disabled && styles.disabledButton, pressed && !disabled && styles.pressed, style]}>
    <Text style={[secondary ? styles.secondaryButtonText : styles.primaryButtonText, disabled && { color: '#A3AAA3' }]}>{title}</Text>
  </Pressable>;
}

function StatCard({ label, value, icon, tint = C.green }) {
  return <View style={[styles.statCard, styles.statCardPremium]}><View style={[styles.statIcon, styles.statIconPremium, { backgroundColor: `${tint}18` }]}><Icon name={icon} size={19} color={tint} /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Sheet({ visible, title, subtitle, onClose, children, actions }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <Pressable style={styles.modalScrim} onPress={onClose}>
      <Pressable style={[styles.sheet, styles.sheetPremium]} onPress={event => event.stopPropagation()}>
        <View style={styles.sheetGrabber} />
        <View style={styles.sheetHeadingPremium}>
          <View style={styles.sheetHeadingCopy}>
            <Text style={[styles.sheetTitle, styles.sheetTitlePremium]}>{title}</Text>
            {subtitle ? <Text style={[styles.sheetSubtitle, styles.sheetSubtitlePremium]}>{subtitle}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} hitSlop={8} style={styles.sheetClose}>
            <Icon name="close" size={18} color={C.muted} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.sheetContent}>{children}</ScrollView>
        {actions ? <View style={[styles.sheetActions, styles.sheetActionsPremium]}>{actions}</View> : null}
      </Pressable>
    </Pressable>
  </Modal>;
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const [serverInput, setServerInput] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [connectedToBackend, setConnectedToBackend] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [route, setRoute] = useState('setup');
  const [tab, setTab] = useState('devices');
  const [previousRoute, setPreviousRoute] = useState('devices');
  const [modal, setModal] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [devices, setDevices] = useState(demoDevices);
  const [organisations, setOrganisations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeOrganisation, setActiveOrganisation] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [profile, setProfile] = useState(DEMO_PROFILE);
  const [profileDraft, setProfileDraft] = useState(DEMO_PROFILE);
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [profilePhotoDraftUri, setProfilePhotoDraftUri] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [pollingError, setPollingError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(demoDevices[1]);
  const [selectedMapDevice, setSelectedMapDevice] = useState(null);
  const [selectedCustomLocation, setSelectedCustomLocation] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [noticeFilter, setNoticeFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState('');
  const [downlinkInterfaces, setDownlinkInterfaces] = useState([]);
  const [downlinkNetworkKeys, setDownlinkNetworkKeys] = useState([]);
  const [downlinkOptionsLoading, setDownlinkOptionsLoading] = useState(false);
  const [downlinkOptionsError, setDownlinkOptionsError] = useState('');
  const [downlinkModule, setDownlinkModule] = useState('');
  const [downlinkControllerValue, setDownlinkControllerValue] = useState('');
  const [downlinkPort, setDownlinkPort] = useState('1');
  const [downlinkClass, setDownlinkClass] = useState('CLASS_C');
  const [downlinkNetworkKeyId, setDownlinkNetworkKeyId] = useState('');
  const [organizationQuery, setOrganizationQuery] = useState('');
  const [automationRules, setAutomationRules] = useState(() => AUTO_RULE_SEED.map(rule => ({ ...rule })));
  const [automationSolution, setAutomationSolution] = useState('All');
  const [automationOutput, setAutomationOutput] = useState('All');
  const [newAutomationName, setNewAutomationName] = useState('');
  const [newAutomationSolution, setNewAutomationSolution] = useState('Default solution');
  const [newAutomationOutput, setNewAutomationOutput] = useState('Valve 1');
  const [newAutomationMode, setNewAutomationMode] = useState('manual');
  const [activeAutomationId, setActiveAutomationId] = useState(null);
  const mapRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const client = useMemo(() => serverUrl ? new GinjerClient(serverUrl, sessionId) : null, [serverUrl, sessionId]);
  const isConnected = connectedToBackend && !demoMode;
  const hasTabs = ['devices', 'locations', 'analytics', 'profile'].includes(route);
  const positionableDevices = useMemo(() => {
    const withCoords = devices.filter(hasCoordinates);
    return withCoords.length > 0 ? withCoords : demoDevices.filter(hasCoordinates);
  }, [devices]);
  const isFallbackDemo = isConnected && devices.filter(hasCoordinates).length === 0;
  const showToast = useCallback(message => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const clearLocalSession = useCallback(async (message = '') => {
    await client?.clearSession();
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    setSessionId(''); setDemoMode(true); setDevices(demoDevices); setSelectedDevice(demoDevices[1]);
    setOrganisations([]); setProjects([]); setModules([]); setActiveOrganisation(null); setActiveProject(null);
    setProfile(DEMO_PROFILE); setProfileDraft(DEMO_PROFILE); setProfilePhotoUri(null); setProfilePhotoDraftUri(null);
    setRoute('login'); setTab('devices'); setModal(null);
    if (message) showToast(message);
  }, [client, showToast]);

  const fetchActiveProjectData = useCallback(() => {
    if (!client || !activeOrganisation || !activeProject) return Promise.resolve(null);
    return activeProject._id === ALL_PROJECTS_ID
      ? client.getOrganisationData(activeOrganisation, projects)
      : client.getProjectData(activeOrganisation, activeProject);
  }, [client, activeOrganisation, activeProject, projects]);

  const showCurrentLocation = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showToast(permission.canAskAgain ? 'Allow location access to show your position on the map.' : 'Enable location permission for Alumhacks in your phone settings.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        showToast('Turn on your phone’s location service and try again.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCurrentLocation(coordinate);
      mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 650);
      showToast('Showing your current location.');
    } catch {
      showToast('Could not get your location. Check that location services are enabled.');
    } finally {
      setLocating(false);
    }
  }, [locating, showToast]);

  const handleMapPress = useCallback(async e => {
    const coordinate = e.nativeEvent?.coordinate;
    if (!coordinate) return;
    setSelectedMapDevice(null);
    const fallbackName = `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;
    setSelectedCustomLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude, placeName: fallbackName });
    try {
      const places = await Location.reverseGeocodeAsync(coordinate);
      if (places && places.length > 0) {
        const p = places[0];
        const label = [p.name || p.street, p.city || p.district || p.subregion, p.region || p.country].filter(Boolean).join(', ');
        if (label) setSelectedCustomLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude, placeName: label });
      }
    } catch {}
  }, []);

  const handleSearchSubmit = useCallback(async () => {
    const q = (query || '').trim();
    if (!q) return;
    const match = positionableDevices.find(d => `${d.name} ${d.id} ${d.loc}`.toLowerCase().includes(q.toLowerCase()));
    if (match && hasCoordinates(match)) {
      const coord = { latitude: Number(match.position.lat), longitude: Number(match.position.lng) };
      setSelectedMapDevice(match);
      setSelectedCustomLocation(null);
      mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
      showToast(isFallbackDemo ? `Sample placeholder selected: ${match.name}` : `Found device: ${match.name}`);
      return;
    }
    const key = q.toLowerCase();
    if (POPULAR_PLACES[key]) {
      const loc = POPULAR_PLACES[key];
      const coord = { latitude: loc.latitude, longitude: loc.longitude };
      setSelectedCustomLocation({ ...coord, placeName: loc.name });
      setSelectedMapDevice(null);
      mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.15, longitudeDelta: 0.15 }, 500);
      showToast(`Selected: ${loc.name}`);
      return;
    }
    try {
      const results = await Location.geocodeAsync(q);
      if (results && results.length > 0) {
        const first = results[0];
        const coord = { latitude: first.latitude, longitude: first.longitude };
        setSelectedCustomLocation({ ...coord, placeName: q });
        setSelectedMapDevice(null);
        mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.12, longitudeDelta: 0.12 }, 500);
        showToast(`Selected: ${q}`);
        return;
      }
    } catch {}
    showToast(`No location found for "${q}".`);
  }, [query, positionableDevices, isFallbackDemo, showToast]);

  const pickImage = useCallback(async () => {
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('Allow photo access to choose a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setProfilePhotoDraftUri(result.assets[0].uri);
      showToast('Photo selected. Save your profile to apply it.');
    } catch {
      showToast('Could not open the photo library. Please try again.');
    }
  }, [showToast]);

  const changeTab = useCallback(nextTab => {
    setTab(nextTab); setRoute(nextTab); setQuery(''); setSelectedMapDevice(null); setSelectedCustomLocation(null); setExpanded(false);
  }, []);

  const goToDevice = useCallback((device, from = route) => {
    setPreviousRoute(from); setSelectedDevice(device); setExpanded(false); setRoute('detail');
  }, [route]);

  const beginProfileEdit = () => {
    setProfileDraft({ ...profile, organization: activeOrganisation?.name || profile.organization || 'SenRa IoT' });
    setProfilePhotoDraftUri(profilePhotoUri);
    setRoute('edit');
  };

  const saveProfile = () => {
    setProfile(profileDraft);
    setProfilePhotoUri(profilePhotoDraftUri);
    setRoute('profile');
    showToast(isConnected ? 'Profile saved for this session. Ginjer does not provide a profile update API.' : 'Profile saved for this preview session.');
  };

  const back = useCallback(() => {
    if (modal) { setModal(null); return true; }
    if (route === 'detail' || route === 'notifications' || route === 'map') {
      setRoute(route === 'detail' ? previousRoute : route === 'map' ? previousRoute : previousRoute);
      return true;
    }
    if (route === 'edit') { setRoute('profile'); return true; }
    if (route === 'setup') return false;
    setRoute(tab);
    return true;
  }, [modal, route, previousRoute, tab]);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', back);
    return () => listener.remove();
  }, [back]);

  useEffect(() => {
    if (route !== 'map' || positionableDevices.length === 0) return;
    const timer = setTimeout(() => {
      const coords = selectedMapDevice && hasCoordinates(selectedMapDevice)
        ? [{ latitude: Number(selectedMapDevice.position.lat), longitude: Number(selectedMapDevice.position.lng) }]
        : positionableDevices.map(device => ({ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }));
      if (coords.length === 1) mapRef.current?.animateToRegion({ ...coords[0], latitudeDelta: 0.08, longitudeDelta: 0.08 }, 350);
      else mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 120, right: 55, bottom: 160, left: 55 }, animated: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [route, positionableDevices, selectedMapDevice]);

  useEffect(() => {
    if (!isConnected || !client || !activeOrganisation || !activeProject) return undefined;
    let mounted = true;
    const poll = async () => {
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;
      try {
        const result = await fetchActiveProjectData();
        if (!mounted || !result) return;
        setDevices(result.devices); setModules(result.modules);
        setSelectedDevice(current => current ? result.devices.find(item => item.apiId === current.apiId) || result.devices[0] || null : result.devices[0] || null);
        setSelectedMapDevice(current => current ? result.devices.find(item => item.apiId === current.apiId) || null : null);
        setLastUpdatedAt(Date.now()); setPollingError('');
      } catch (error) {
        if (error.code === 'SESSION_EXPIRED') {
          if (mounted) await clearLocalSession('Your Ginjer session expired. Please sign in again.');
        } else if (mounted) setPollingError(error.message || 'Could not refresh project data.');
      } finally {
        refreshInFlightRef.current = false;
      }
    };
    const timer = setInterval(poll, 20000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') poll(); });
    return () => { mounted = false; clearInterval(timer); subscription.remove(); };
  }, [isConnected, client, activeOrganisation, activeProject, fetchActiveProjectData, clearLocalSession]);

  const checkServer = async () => {
    const candidate = serverInput.trim().replace(/[./]+$/, '');
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' || !parsed.port || parsed.pathname !== '/') throw new Error('Enter the full local URL, including :8787.');
      setLoading(true); setSetupError('');
      const response = await fetch(`${candidate}/api/status`);
      if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`);
      setServerUrl(candidate); setConnectedToBackend(true); setRoute('login');
    } catch (error) {
      setSetupError(error.message === 'Failed to fetch' ? 'Could not reach the backend. Check the URL, Wi-Fi, and firewall.' : (error.message || 'Could not reach the backend.'));
    } finally { setLoading(false); }
  };

  const loadProject = async (organisation, project, clientOverride = client) => {
    const result = await clientOverride.getProjectData(organisation, project);
    setActiveOrganisation(organisation); setActiveProject(project); setOrganisations(current => current.length ? current : [organisation]);
    setDevices(result.devices); setModules(result.modules); setSelectedDevice(result.devices[0] || null);
    setLastUpdatedAt(Date.now()); setPollingError('');
    setDemoMode(false); setTab('devices'); setRoute('devices'); setQuery(''); setLoginError(''); setModal(null);
    setProfile(current => ({ ...current, email: current.email || 'Connected Ginjer user' }));
    if (result.errors.length) showToast(result.errors.join(' '));
    if (!result.devices.length) showToast('No devices were returned for this project.');
    else showToast('Project data loaded from Ginjer.');
  };

  const loadAllProjects = async (organisation, projectList = projects, clientOverride = client) => {
    if (!projectList.length) throw new Error(`No projects were returned for ${organisation.name || 'this organization'}.`);
    const result = await clientOverride.getOrganisationData(organisation, projectList);
    const aggregateProject = { _id: ALL_PROJECTS_ID, name: 'All Projects', active: true, projectCount: projectList.length };
    setOrganisations(current => current.length ? current : [organisation]);
    setProjects(projectList); setActiveOrganisation(organisation); setActiveProject(aggregateProject);
    setDevices(result.devices); setModules(result.modules); setSelectedDevice(result.devices[0] || null);
    setLastUpdatedAt(Date.now()); setPollingError(''); setDemoMode(false); setTab('devices'); setRoute('devices'); setQuery(''); setLoginError(''); setModal(null);
    if (result.errors.length) showToast(result.errors.join(' '));
    else showToast(`Loaded ${result.devices.length} devices across ${projectList.length} projects.`);
  };

  const loadOrganisation = async (organisation, clientOverride = client) => {
    setLoading(true);
    try {
      const orgProjects = await clientOverride.getProjects(organisation);
      if (!orgProjects.length) throw new Error(`No projects were returned for ${organisation.name || 'this organization'}.`);
      setOrganisations(current => current.length ? current : [organisation]);
      setProjects(orgProjects); setActiveOrganisation(organisation);
      await loadAllProjects(organisation, orgProjects, clientOverride);
    } finally { setLoading(false); }
  };

  const loadAccountData = async (clientOverride, defaultId = '') => {
    const orgs = await clientOverride.getOrganisations(defaultId);
    if (!orgs.length) throw new Error('No accepted organizations were returned for this account.');
    setOrganisations(orgs);
    const failures = [];
    for (const organisation of orgs) {
      try {
        const orgProjects = await clientOverride.getProjects(organisation);
        if (!orgProjects.length) { failures.push(`No projects were returned for ${organisation.name || 'this organization'}.`); continue; }
        setProjects(orgProjects); setActiveOrganisation(organisation);
        await loadAllProjects(organisation, orgProjects, clientOverride);
        return;
      } catch (error) { failures.push(error.message); }
    }
    throw new Error(failures.join(' '));
  };

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved?.serverUrl || !saved?.sessionId) throw new Error('Invalid saved session.');
        const restoredClient = new GinjerClient(saved.serverUrl, saved.sessionId);
        if (!(await restoredClient.restoreSession())) throw new Error('Saved session expired.');
        if (!mounted) return;
        setServerInput(saved.serverUrl); setServerUrl(saved.serverUrl); setConnectedToBackend(true); setSessionId(saved.sessionId);
        setProfile(saved.profile || DEMO_PROFILE); setProfileDraft(saved.profile || DEMO_PROFILE); setLoading(true);
        const defaultId = (typeof saved.defaultAccount === 'string' ? saved.defaultAccount : saved.defaultAccount?.organisationId) || saved.organisationId;
        await loadAccountData(restoredClient, defaultId);
      } catch {
        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    restore();
    return () => { mounted = false; };
  }, []);

  const submitLogin = async () => {
    if (!client) { setLoginError('Connect to the computer backend first.'); return; }
    setLoading(true); setLoginError('');
    try {
      const data = await client.login(email.trim(), password);
      const user = data.user;
      const nextProfile = { ...DEMO_PROFILE, name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Ginjer User', email: user?.emailId || email.trim() };
      setSessionId(data.sessionId); setProfile(nextProfile); setProfileDraft(nextProfile); setPassword('');
      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify({ serverUrl, sessionId: data.sessionId, profile: nextProfile, defaultAccount: user?.defaultAccount, organisationId: user?.organisationId }));
      const defaultId = (typeof user?.defaultAccount === 'string' ? user.defaultAccount : user?.defaultAccount?.organisationId) || user?.organisationId;
      await loadAccountData(client, defaultId);
    } catch (error) {
      await client.clearSession();
      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
      setSessionId(''); setPassword('');
      setLoginError(error.message || 'Could not connect to Ginjer.');
    } finally { setLoading(false); }
  };

  const disconnect = async () => {
    await clearLocalSession('Signed out.');
  };

  const refresh = async () => {
    if (!client || !activeOrganisation || !activeProject || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setLoading(true);
    try {
      const result = await fetchActiveProjectData();
      if (!result) return;
      setDevices(result.devices); setModules(result.modules);
      setSelectedDevice(current => current ? result.devices.find(item => item.apiId === current.apiId) || result.devices[0] || null : result.devices[0] || null);
      setSelectedMapDevice(current => current ? result.devices.find(item => item.apiId === current.apiId) || null : null);
      setLastUpdatedAt(Date.now()); setPollingError('');
      showToast('Device data refreshed from Ginjer.');
    } catch (error) {
      if (error.code === 'SESSION_EXPIRED') await clearLocalSession('Your Ginjer session expired. Please sign in again.');
      else showToast(`Refresh failed: ${error.message}`);
    }
    finally { refreshInFlightRef.current = false; setLoading(false); }
  };

  const openDownlink = async device => {
    setDownlinkControllerValue('');
    setDownlinkPort('1');
    setDownlinkClass('CLASS_C');
    setDownlinkNetworkKeyId('');
    setDownlinkModule('');
    setDownlinkInterfaces([]);
    setDownlinkNetworkKeys([]);
    setDownlinkOptionsError('');
    setDownlinkOptionsLoading(true);
    setModal('downlink');
    try {
      if (!client || !activeOrganisation) throw new Error('Connect to Ginjer before loading downlink options.');
      const options = await client.getDownlinkOptions(activeOrganisation, device);
      setDownlinkInterfaces(options.interfaces);
      setDownlinkNetworkKeys(options.networkKeys);
      setDownlinkNetworkKeyId(options.defaultNetworkKeyId);
      setDownlinkModule(preferredDownlinkModule(device, options.interfaces)?._id || '');
    } catch (error) {
      setDownlinkOptionsError(error.message || 'Could not load compatible downlink options.');
    } finally {
      setDownlinkOptionsLoading(false);
    }
  };

  const chooseOrganisation = async organisation => {
    try { await loadOrganisation(organisation); }
    catch (error) { showToast(error.message); setModal('organisations'); }
  };

  const chooseProject = async project => {
    if (demoMode && project.isDemo) {
      const nextDevices = demoDevices.filter(device => project._id === ALL_PROJECTS_ID || (device.solutionName || 'Default solution') === project.name);
      setProjects(DEMO_PROJECTS); setActiveProject(project); setDevices(nextDevices); setSelectedDevice(nextDevices[0] || null); setModal(null); setQuery('');
      return;
    }
    setLoading(true);
    try { if (project._id === ALL_PROJECTS_ID) await loadAllProjects(activeOrganisation, projects); else await loadProject(activeOrganisation, project); }
    catch (error) { showToast(error.message); }
    finally { setLoading(false); }
  };

  const openFullMap = (from = route, device = null) => {
    setPreviousRoute(from); setSelectedMapDevice(device); setRoute('map');
  };

  const filteredDevices = useMemo(() => devices.filter(device => {
    const matchesQuery = !query || `${device.name} ${device.id} ${device.loc} ${device.chips?.map(chip => chip.label).join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const needsAttention = device.chips?.some(chip => ['red', 'amber'].includes(chip.status));
    return matchesQuery && (filter !== 'attention' || needsAttention) && (filter !== 'online' || device.chips?.some(chip => /online|on\b/i.test(chip.label)));
  }), [devices, query, filter]);

  const visibleMarkers = useMemo(() => positionableDevices.filter(device => !query || `${device.name} ${device.id} ${device.loc}`.toLowerCase().includes(query.toLowerCase())), [positionableDevices, query]);

  const showDemo = () => {
    setDemoMode(true); setDevices(demoDevices); setSelectedDevice(demoDevices[1]); setProjects(DEMO_PROJECTS); setActiveProject({ _id: ALL_PROJECTS_ID, name: 'All Projects', isDemo: true }); setRoute('devices'); setTab('devices'); setLoginError(''); setLastUpdatedAt(Date.now());
  };

  const onDetailBack = () => {
    if (route === 'detail' && previousRoute === 'map') { setRoute('map'); return; }
    if (route === 'detail' && previousRoute === 'notifications') { setRoute('notifications'); return; }
    if (route === 'notifications') { setRoute(previousRoute || 'devices'); return; }
    if (route === 'map') { setRoute(previousRoute || 'locations'); return; }
    back();
  };

  const renderSetup = () => <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={C.canvas} />
    <KeyboardAvoidingView style={styles.centerPage} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.setupPanel}>
        <Text style={styles.kicker}>ALUMHACKS MOBILE</Text>
        <Text style={styles.screenHeading}>Connect to your computer</Text>
        <Text style={styles.bodyCopy}>Start the Alumhacks backend on your computer. Enter its “Phone on the same Wi-Fi” address here.</Text>
        <TextInput value={serverInput} onChangeText={setServerInput} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.20:8787" placeholderTextColor="#A0A6A1" style={styles.textInput} onSubmitEditing={checkServer} accessibilityLabel="Backend server URL" />
        {setupError ? <Text style={styles.errorText}>{setupError}</Text> : null}
        <ActionButton title={loading ? 'Connecting…' : 'Open Alumhacks'} disabled={loading} onPress={checkServer} />
        <ActionButton title="Explore the demo" secondary onPress={showDemo} style={styles.setupDemoButton} />
        <Text style={styles.footnote}>Keep your phone and computer on the same trusted Wi-Fi network.</Text>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  const renderLogin = () => <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={C.white} />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.loginScrollPremium} keyboardShouldPersistTaps="handled">
        <View style={styles.loginHero}>
          <View style={styles.loginHeroTop}>
            <View style={styles.loginLogoCard}><Image source={require('./assets/reference/senra-logo.png')} style={styles.ginjerLogoPremium} resizeMode="contain" /></View>
            <View style={styles.loginSecurePill}><View style={styles.loginSecureDot} /><Text style={styles.loginSecureLabel}>SECURE ACCESS</Text></View>
          </View>
          <Text style={styles.loginHeroEyebrow}>SMART DEVICE MANAGEMENT</Text>
          <Text style={styles.loginHeroTitle}>Your connected{'\n'}world, in sync.</Text>
          <Text style={styles.loginHeroCopy}>See what’s happening across your devices, wherever you are.</Text>
          <View style={styles.loginArtwork}>
            <Image source={require('./assets/reference/login-illustration.png')} style={styles.loginIllustrationPremium} resizeMode="contain" />
            <View style={styles.loginArtworkBadge}><Icon name="access-point" size={15} color={C.greenDark} /><Text style={styles.loginArtworkBadgeText}>Your fleet, at a glance</Text></View>
          </View>
        </View>
        <View style={styles.loginFormCard}>
          <Text style={styles.loginWelcome}>Welcome back</Text>
          <Text style={styles.loginFormCopy}>Sign in with your Ginjer account to continue.</Text>
          <Text style={[styles.fieldLabel, styles.authFieldLabel]}>Email address</Text>
          <View style={styles.authInputShell}>
            <Icon name="email-outline" size={19} color={C.muted} />
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" placeholderTextColor="#A0AAA2" style={styles.authInput} accessibilityLabel="Email ID" />
          </View>
          <Text style={[styles.fieldLabel, styles.authFieldLabel, { marginTop: 16 }]}>Password</Text>
          <View style={styles.authInputShell}>
            <Icon name="lock-outline" size={19} color={C.muted} />
            <TextInput value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} autoComplete="password" placeholder="Enter your password" placeholderTextColor="#A0AAA2" style={[styles.authInput, styles.authPasswordInput]} accessibilityLabel="Password" />
            <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} onPress={() => setPasswordVisible(value => !value)} hitSlop={10} style={styles.authPasswordToggle}><Icon name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} /></Pressable>
          </View>
          {loginError ? <Text accessibilityRole="alert" style={styles.errorText}>{loginError}</Text> : null}
          <ActionButton title={loading ? 'Signing in…' : 'Sign in'} disabled={loading} onPress={submitLogin} style={styles.loginSubmit} />
          <View style={[styles.loginSecurityNote, styles.loginSecurityNotePremium]}><Icon name="shield-check-outline" size={17} color={C.greenDark} /><Text style={styles.loginSecurityText}>Your password is used only to sign in. Your session is stored securely on this device.</Text></View>
          <Text style={styles.legalText}>Secure access to your Ginjer device network.</Text>
          <Pressable accessibilityRole="button" onPress={() => setRoute('setup')} style={styles.changeBackendLink}><Icon name="server-network-outline" size={15} color={C.greenDark} /><Text style={styles.changeBackendText}>Change backend address</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  const renderDevices = () => <View style={styles.screen}>
    <View style={[styles.listTopBar, styles.listTopBarPremium]}>
      <View><Text style={[styles.sectionTitle, styles.sectionTitlePremium]}>Devices</Text><Text style={styles.screenSubtitle}>Your connected fleet, at a glance</Text></View>
      <View style={styles.topActions}>
        <IconButton name="bell-outline" label="Notifications" onPress={() => { setPreviousRoute(route); setRoute('notifications'); }} color={C.ink} />
        <IconButton name="robot-outline" label="Automation" onPress={() => { setPreviousRoute(route); setRoute('automation'); }} color={C.ink} />
        <IconButton name="filter-variant" label="Filter devices" onPress={() => setModal('filter')} color={C.ink} />
      </View>
    </View>
    <Pressable style={styles.projectSelector} onPress={() => setModal('projects')} accessibilityRole="button" accessibilityLabel={`Project ${activeProject?.name || 'Demo'}. Choose project`}>
      <Icon name="view-grid-outline" size={19} color={C.greenDark} />
      <View style={{ flex: 1, marginLeft: 9 }}><Text style={styles.selectorCaption}>PROJECT</Text><Text numberOfLines={1} style={styles.selectorName}>{activeProject?.name || 'Demo Project'}</Text></View>
      <Icon name="chevron-down" size={19} color={C.muted} />
    </Pressable>
    <View style={styles.fleetOverview}>
      <View style={styles.fleetOverviewHeading}>
        <Text style={styles.fleetEyebrow}>FLEET OVERVIEW</Text>
        <View style={[styles.connectionPill, isConnected ? styles.connectionPillLive : styles.connectionPillDemo]}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#8FD694' : '#FFC56F' }]} />
          <Text style={styles.connectionLabel}>{isConnected ? 'LIVE' : 'PREVIEW'}</Text>
        </View>
      </View>
      <View style={styles.fleetStats}>
        <View style={styles.fleetStat}>
          <Text style={styles.fleetStatValue}>{devices.length}</Text>
          <Text style={styles.fleetStatLabel}>Total devices</Text>
        </View>
        <View style={styles.fleetStatDivider} />
        <View style={styles.fleetStat}>
          <Text style={[styles.fleetStatValue, { color: '#FFD18A' }]}>{devices.filter(device => device.chips?.some(chip => ['red', 'amber'].includes(chip.status))).length}</Text>
          <Text style={styles.fleetStatLabel}>Need attention</Text>
        </View>
        <View style={styles.fleetStatDivider} />
        <View style={styles.fleetStat}>
          <Text style={[styles.fleetStatValue, { color: '#D5EFD5' }]}>{devices.filter(device => device.chips?.some(chip => /online|on\b/i.test(chip.label))).length}</Text>
          <Text style={styles.fleetStatLabel}>Online</Text>
        </View>
      </View>
    </View>
    <SearchField value={query} onChangeText={setQuery} style={{ marginHorizontal: 16, marginTop: 12 }} />
    <View style={styles.listSummary}><Text style={styles.summaryText}>{filteredDevices.length} devices</Text><Text style={styles.summaryText}>{isConnected ? (pollingError ? 'Refresh delayed' : formatUpdatedAt(lastUpdatedAt)) : 'Demo data'}</Text></View>
    <ScrollView contentContainerStyle={styles.deviceList} keyboardShouldPersistTaps="handled">
      {filteredDevices.length ? filteredDevices.map((device, index) => <DeviceCard key={device.apiId || device.id || index} device={device} onPress={() => goToDevice(device)} />) : <View style={styles.emptyBox}><Icon name="devices" size={28} color="#A4AAA5" /><Text style={styles.emptyText}>No devices match this search.</Text></View>}
      <Pressable onPress={() => { setPreviousRoute(route); setRoute('notifications'); }} style={styles.notificationsLink}><Icon name="bell-badge-outline" size={17} color={C.greenDark} /><Text style={styles.notificationsLinkText}>View notifications</Text><Icon name="chevron-right" size={18} color={C.muted} /></Pressable>
    </ScrollView>
  </View>;

  const mapSearch = <SearchField value={query} onChangeText={setQuery} onSubmitEditing={handleSearchSubmit} placeholder="Search devices or places (e.g. Jaipur)" style={styles.mapSearch} />;
  const renderMap = full => {
    const mapUsesPlaceholders = demoMode || isFallbackDemo;
    const selected = full ? selectedMapDevice : null;
    const projectPosition = activeProject?.location;
    const mapDevices = visibleMarkers;
    const coordinates = selected && hasCoordinates(selected)
      ? [{ latitude: Number(selected.position.lat), longitude: Number(selected.position.lng) }]
      : mapDevices
        .map(device => ({ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }));
    const initial = coordinates[0]
      || (hasCoordinates({ position: projectPosition }) ? { latitude: Number(projectPosition.lat), longitude: Number(projectPosition.lng) } : { latitude: 22.9734, longitude: 78.6569 });
    return <View style={styles.mapScreen}>
      <MapView ref={mapRef} provider={GOOGLE_MAPS_API_KEY ? PROVIDER_GOOGLE : undefined} key={`${full ? 'full' : 'detail'}-${route}`} style={StyleSheet.absoluteFill} initialRegion={{ ...initial, latitudeDelta: coordinates.length ? 2.5 : 24, longitudeDelta: coordinates.length ? 2.5 : 24 }} showsUserLocation={false} showsCompass userInterfaceStyle="light" customMapStyle={GOOGLE_MAPS_LIGHT_STYLE} onPress={handleMapPress}>
        {mapDevices.map(device => <Marker key={device.apiId || device.id} coordinate={{ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }} title={mapUsesPlaceholders ? `Sample placeholder · ${device.name}` : device.name} description={mapUsesPlaceholders ? 'Example location only · Not a live Ginjer device' : `${device.loc} · Last heard ${device.heard}`} onPress={() => { setSelectedCustomLocation(null); setSelectedMapDevice(device); if (!full) setSelectedDevice(device); }}>
          <View style={[styles.markerBubble, { backgroundColor: chipColor(device.chips?.[0]?.status) }]}><Icon name={kindIcon(device.kind, device.name)} size={17} color={C.white} /></View>
        </Marker>)}
        {selectedCustomLocation ? <Marker coordinate={{ latitude: selectedCustomLocation.latitude, longitude: selectedCustomLocation.longitude }} title={selectedCustomLocation.placeName} description="Selected on map"><View style={[styles.markerBubble, { backgroundColor: C.red }]}><Icon name="map-marker" size={17} color={C.white} /></View></Marker> : null}
        {currentLocation ? <Marker coordinate={currentLocation} title="Your current location" description="Your phone’s location" zIndex={1000} tracksViewChanges={false}>
          <View style={styles.currentLocationMarker}><View style={styles.currentLocationMarkerCenter} /></View>
        </Marker> : null}
      </MapView>
      {full ? <ScreenHeader title="Device map" onBack={onDetailBack} /> : <View style={[styles.mapHeader, styles.mapHeaderPremium]}><View><Text style={[styles.sectionTitle, styles.sectionTitlePremium]}>Locations</Text><Text style={styles.mapProviderLabel}>{GOOGLE_MAPS_API_KEY ? 'Google Maps · live device locations' : 'Map view · live device locations'}</Text></View><View style={{ flexDirection: 'row' }}><IconButton name="bell-outline" label="Notifications" color={C.ink} onPress={() => { setPreviousRoute(route); setRoute('notifications'); }} /><IconButton name="crosshairs-gps" label={locating ? 'Finding your location' : 'Show my current location'} color={locating ? C.green : C.greenDark} onPress={showCurrentLocation} /></View></View>}
      {full ? <View style={[styles.mapOverlay, { top: 56 }]}>{mapSearch}</View> : <View style={styles.mapOverlay}>{mapSearch}</View>}
      {visibleMarkers.length === 0 ? <View style={styles.mapNotice}><Icon name="map-marker-off-outline" size={17} color={C.greenDark} /><Text style={styles.mapNoticeText}>Tap anywhere on the map or search a city to select a location.</Text></View> : mapUsesPlaceholders ? <View style={styles.mapNotice}><Icon name="information-outline" size={17} color={C.greenDark} /><Text style={styles.mapNoticeText}>Sample placeholders only — these are not live devices or confirmed locations. Tap a marker for its sample details.</Text></View> : null}
      <View style={styles.mapCount}><Icon name="map-marker-multiple-outline" color={C.greenDark} size={15} /><Text style={styles.mapCountText}>{mapUsesPlaceholders ? `${visibleMarkers.length} sample placeholders` : `${visibleMarkers.length} of ${devices.length} devices with coordinates`}</Text></View>
      {selectedMapDevice ? <View style={styles.mapDeviceCard}>
        <DeviceThumb kind={selectedMapDevice.kind} name={selectedMapDevice.name} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.mapDeviceName}>{mapUsesPlaceholders ? `Sample · ${selectedMapDevice.name}` : selectedMapDevice.name}</Text><Text numberOfLines={1} style={styles.mapDeviceMeta}>{selectedMapDevice.loc} · {selectedMapDevice.heard}</Text></View>
        <IconButton name="chevron-right" label={`Open ${selectedMapDevice.name}`} color={C.greenDark} onPress={() => goToDevice(selectedMapDevice, route)} />
      </View> : selectedCustomLocation ? <View style={styles.mapDeviceCard}>
        <View style={[styles.avatar, { width: 40, height: 40, borderRadius: 20, backgroundColor: C.redPale }]}><Icon name="map-marker" size={24} color={C.red} /></View>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 8 }}><Text numberOfLines={1} style={styles.mapDeviceName}>{selectedCustomLocation.placeName}</Text><Text numberOfLines={1} style={styles.mapDeviceMeta}>{selectedCustomLocation.latitude.toFixed(4)}, {selectedCustomLocation.longitude.toFixed(4)}</Text></View>
        <IconButton name="close" label="Clear selected location" color={C.muted} size={19} onPress={() => setSelectedCustomLocation(null)} />
      </View> : null}
    </View>;
  };

  const renderLocations = () => renderMap(false);

  const renderAutomation = () => {
    const solutionOptions = ['All', ...new Set([...projects.map(project => project.name).filter(Boolean), ...automationRules.map(rule => rule.solution).filter(Boolean)])];
    const outputOptions = ['All', ...new Set([...devices.flatMap(device => (device.outputs || []).map(output => output.outputName || output.label).filter(Boolean)), ...automationRules.map(rule => rule.output).filter(Boolean)])];
    const shownRules = automationRules.filter(rule => (automationSolution === 'All' || rule.solution === automationSolution) && (automationOutput === 'All' || rule.output === automationOutput));
    const toggleRule = rule => {
      setAutomationRules(current => current.map(item => item.id === rule.id ? { ...item, active: !item.active } : item));
      showToast(isConnected ? 'Automation preview changed locally. Ginjer has no automation control API.' : 'Automation preview updated.');
    };
    const runRule = rule => {
      if (isConnected) {
        showToast('Ginjer has no automation execution API in the supplied collection. This rule is a preview.');
        return;
      }
      setAutomationRules(current => current.map(item => item.id === rule.id ? { ...item, runs: (item.runs || 0) + (item.running ? 0 : 1), running: !item.running } : item));
    };
    return <View style={styles.screen}>
      <ScreenHeader title="Automation" onBack={() => setRoute(previousRoute || 'devices')} right={<IconButton name="plus" label="Add automation" color={C.greenDark} onPress={() => { setActiveAutomationId(null); setNewAutomationName(''); setNewAutomationSolution('Default solution'); setNewAutomationOutput('Valve 1'); setNewAutomationMode('manual'); setModal('automation-create'); }} />} />
      <View style={styles.automationBreadcrumb}><Icon name="home-outline" size={14} color={C.muted} /><Text style={styles.automationBreadcrumbText}>Projects</Text><Icon name="chevron-right" size={13} color={C.muted} /><Text numberOfLines={1} style={styles.automationBreadcrumbText}>{activeProject?.name || 'Demo Project'}</Text><Icon name="chevron-right" size={13} color={C.muted} /><Text style={styles.automationBreadcrumbCurrent}>Automation</Text></View>
      <View style={styles.automationFilters}>
        <Pressable style={styles.automationFilter} onPress={() => setModal('automation-solution')}><View style={styles.automationFilterText}><Text style={styles.automationFilterLabel}>Solution</Text><Text numberOfLines={1} style={styles.automationFilterValue}>{automationSolution}</Text></View><Icon name="chevron-down" size={17} color={C.muted} /></Pressable>
        <Pressable style={styles.automationFilter} onPress={() => setModal('automation-output')}><View style={styles.automationFilterText}><Text style={styles.automationFilterLabel}>Output</Text><Text numberOfLines={1} style={styles.automationFilterValue}>{automationOutput}</Text></View><Icon name="chevron-down" size={17} color={C.muted} /></Pressable>
        <IconButton name="plus-circle-outline" label="Add automation" color={C.green} onPress={() => { setActiveAutomationId(null); setNewAutomationName(''); setNewAutomationSolution('Default solution'); setNewAutomationOutput('Valve 1'); setNewAutomationMode('manual'); setModal('automation-create'); }} />
      </View>
      <Text style={styles.automationSectionHeading}>Automation</Text>
      <ScrollView contentContainerStyle={styles.automationList} keyboardShouldPersistTaps="handled">
        {shownRules.map(rule => <View key={rule.id} style={[styles.automationCard, rule.running && styles.automationCardRunning]}>
          <View style={styles.automationRowTop}><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.automationName}>{rule.name}</Text><Text numberOfLines={1} style={styles.automationSubtitle}>{rule.solution} · {rule.output}</Text></View>{rule.mode === 'automatic' ? <Switch value={!!rule.active} onValueChange={() => toggleRule(rule)} trackColor={{ false: '#D4D7D2', true: C.green }} thumbColor={C.white} /> : <Switch value={!!rule.active} onValueChange={() => toggleRule(rule)} trackColor={{ false: '#D4D7D2', true: C.green }} thumbColor={C.white} />}<IconButton name="dots-vertical" label={`More options for ${rule.name}`} size={18} onPress={() => { setActiveAutomationId(rule.id); setModal('automation-actions'); }} /></View>
          {rule.mode === 'manual' ? <View style={styles.automationRowBottom}><Pressable style={[styles.runAutomationButton, rule.running && styles.runAutomationButtonRunning]} onPress={() => runRule(rule)}><Icon name={rule.running ? 'pause' : 'play'} size={12} color={C.white} /><Text style={styles.runAutomationText}>{rule.running ? 'Stop Automation' : 'Run Automation'}</Text></Pressable>{rule.running ? <Text style={styles.automationRunningPill}>Running</Text> : null}<View style={styles.automationCountPill}><Icon name="clock-outline" size={13} color={C.muted} /><Text style={styles.automationCountText}>{rule.runs || 0}</Text></View></View> : null}
        </View>)}
        {!shownRules.length ? <View style={styles.automationEmpty}><Icon name="robot-off-outline" size={25} color={C.muted} /><Text style={styles.emptyText}>No automation rules match these filters.</Text></View> : null}
        <View style={styles.automationApiNote}><Icon name="information-outline" size={15} color={C.greenDark} /><Text style={styles.infoNoteText}>These are editable preview rules. The Ginjer API collection does not include automation listing, scheduling, or execution endpoints.</Text></View>
      </ScrollView>
    </View>;
  };

  const renderAnalytics = () => {
    const liveOutputs = isConnected ? devices.flatMap(device => device.outputs.map((output, index) => ({ device, output, index }))) : [];
    return <ScrollView style={styles.screen} contentContainerStyle={styles.standardScroll}>
      <Text style={styles.dashboardHeading}>Dashboard</Text>
      <Pressable style={styles.projectSelector} onPress={() => setModal('projects')}><Icon name="chart-box-outline" size={19} color={C.greenDark} /><View style={{ flex: 1, marginLeft: 9 }}><Text style={styles.selectorCaption}>PUBLIC DASHBOARD</Text><Text numberOfLines={1} style={styles.selectorName}>{activeProject?.name || 'Device health'}</Text></View><Icon name="chevron-down" size={19} color={C.muted} /></Pressable>
      {isConnected ? <View style={styles.infoNote}><Icon name="information-outline" size={16} color={C.greenDark} /><Text style={styles.infoNoteText}>These are current device outputs. Historical analytics are not included in the Ginjer API collection.</Text></View> : <View style={styles.infoNote}><Icon name="flask-outline" size={16} color={C.greenDark} /><Text style={styles.infoNoteText}>Preview metrics are sample data. Connect to Ginjer to see current outputs.</Text></View>}
      <View style={styles.statsRow}>
        <StatCard label="Devices" value={devices.length} icon="devices" tint={C.green} />
        <StatCard label="Needs attention" value={devices.filter(device => device.chips?.some(chip => chip.status === 'red')).length} icon="alert-circle-outline" tint={C.red} />
      </View>
      <Text style={styles.sectionTitleSmall}>{isConnected ? 'Current outputs' : 'Overview'}</Text>
      {isConnected ? liveOutputs.length ? liveOutputs.map(({ device, output, index }) => <View key={`${device.apiId}-${output.outputId || index}`} style={styles.metricCard}>
        <View style={styles.metricHeader}><View style={{ flex: 1 }}><Text style={styles.metricName}>{output.outputName || output.label || `Output ${index + 1}`}</Text><Text style={styles.metricCaption}>{device.name} · {device.loc}</Text></View><Icon name="dots-horizontal" size={19} color={C.muted} /></View>
        <Text style={styles.metricValue}>{typeof output.value === 'object' ? JSON.stringify(output.value) : String(output.value ?? output.label ?? '—')}</Text>
        <View style={styles.metricFooter}><Text style={styles.metricFooterText}>Last heard · {device.heard}</Text><View style={[styles.onlineDot, { backgroundColor: chipColor(device.chips?.[0]?.status) }]} /></View>
      </View>) : <EmptyState text="No output values were returned for this project." /> : <>
        <View style={styles.metricCard}><View style={styles.metricHeader}><View><Text style={styles.metricName}>Level Sensor</Text><Text style={styles.metricCaption}>Tank 6 · Water level</Text></View><Icon name="dots-horizontal" size={19} color={C.muted} /></View><View style={styles.gauge}><View style={styles.gaugeArc}><View style={styles.gaugeNeedle} /></View><Text style={styles.gaugeValue}>1.00<Text style={styles.gaugeUnit}> m</Text></Text></View><View style={styles.metricFooter}><Text style={styles.metricFooterText}>0.0 m</Text><Text style={styles.metricFooterText}>Range 0.0–1.3 m</Text></View></View>
        <View style={styles.metricCard}><View style={styles.metricHeader}><View><Text style={styles.metricName}>IO Controller</Text><Text style={styles.metricCaption}>Lab Room · Output status</Text></View><Icon name="dots-horizontal" size={19} color={C.muted} /></View><Text style={[styles.metricValue, { color: C.greenDark }]}>ON</Text><View style={styles.metricFooter}><Text style={styles.metricFooterText}>Sample value</Text><View style={[styles.onlineDot, { backgroundColor: C.green }]} /></View></View>
      </>}
    </ScrollView>;
  };

  const renderProfile = () => <ScrollView style={styles.screen} contentContainerStyle={styles.profileScroll}>
    <Text style={styles.profileHeading}>Profile</Text>
    <View style={styles.profileHero}>
      <ProfileAvatar uri={profilePhotoUri} size={78} />
      <View style={styles.profileIdentity}>
        <Text numberOfLines={2} style={styles.profileName}>{profile.name || 'Ginjer User'}</Text>
        <Text numberOfLines={2} style={styles.profileEmail}>{profile.email || 'Email not available'}</Text>
      </View>
    </View>
    <View style={styles.profileMenu}>
      <ProfileMenuRow icon="account-outline" title="My Profile" onPress={beginProfileEdit} />
      <ProfileMenuRow icon="view-grid-outline" title="Project" value={activeProject?.name || 'Demo Project'} onPress={() => setModal('projects')} />
      <ProfileMenuRow icon="domain" title="Organization" value={activeOrganisation?.name || profile.organization || 'SenRa IoT'} onPress={() => setModal('organisations')} last />
    </View>
    <Pressable accessibilityRole="button" onPress={() => Alert.alert(isConnected ? 'Log out?' : 'Leave preview?', isConnected ? 'Disconnect this app from your Ginjer account?' : 'Return to the connection screen?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: isConnected ? disconnect : () => setRoute('login') }])} style={styles.logoutRow}>
      <Icon name="logout" size={20} color={C.red} /><Text style={styles.logoutText}>{isConnected ? 'Logout' : 'Connect to Ginjer'}</Text><Icon name="chevron-right" size={19} color={C.red} />
    </Pressable>
    <Text style={styles.profileFootnote}>Alumhacks Mobile · {isConnected ? 'Ginjer connected' : 'Demo preview'}</Text>
  </ScrollView>;

  const renderDetail = () => {
    const device = selectedDevice;
    if (!device) return <View style={styles.screen}><ScreenHeader title="Device Details" onBack={onDetailBack} /><EmptyState text="Select a device to see its details." /></View>;
    const coords = hasCoordinates(device);
    return <ScrollView style={styles.screen} contentContainerStyle={styles.detailScroll}>
      <ScreenHeader title="Device Details" onBack={onDetailBack} right={<IconButton name="dots-horizontal" label="Device options" onPress={() => showToast('No additional device options are available.')} />} />
      <View style={styles.detailSummary}><DeviceThumb kind={device.kind} name={device.name} size={64} /><View style={{ flex: 1 }}><Text style={styles.detailName}>{device.name}</Text><Text style={styles.detailId}>Device ID · {device.id || device.devEui || device.hardwareId || 'Not reported'}</Text><Text style={styles.detailHeard}>Last heard · {device.heard}</Text></View><View style={styles.detailMetaTop}><Text style={styles.detailMetaLabel}>Hardware</Text><Text numberOfLines={2} style={styles.detailMetaValue}>{device.hardwareType || 'Not reported'}</Text><Text style={[styles.detailMetaLabel, { marginTop: 6 }]}>Network</Text><Text numberOfLines={1} style={styles.detailMetaValue}>{device.networkId || 'Not reported'}</Text></View></View>
      <View style={styles.detailFields}><View style={styles.detailField}><Text style={styles.detailFieldLabel}>Location</Text><Text numberOfLines={2} style={styles.detailFieldValue}>{device.loc}</Text></View><View style={styles.detailField}><Text style={styles.detailFieldLabel}>Main Output</Text><Text numberOfLines={2} style={styles.detailFieldValue}>{device.output}</Text></View></View>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.expandButton}><Text style={styles.expandButtonText}>{expanded ? 'See less' : 'See more'}</Text><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={C.greenDark} /></Pressable>
      {expanded ? <View style={styles.expandedDetails}><Text style={styles.expandedLine}><Text style={styles.bold}>Device type</Text> · {device.hardwareType || 'Not reported'}</Text><Text style={styles.expandedLine}><Text style={styles.bold}>Network ID</Text> · {device.networkId || 'Not reported'}</Text>{device.attributes?.length ? device.attributes.map((attribute, index) => <Text key={attribute.attributeId || index} style={styles.expandedLine}><Text style={styles.bold}>{attribute.attributeName || 'Attribute'}</Text> · {formatOutput(attribute.value)}</Text>) : <Text style={styles.expandedLine}><Text style={styles.bold}>Attributes</Text> · None returned</Text>}</View> : null}
      <Text style={styles.sectionTitleSmall}>Outputs</Text>
      {device.outputs?.length ? <View style={styles.outputGrid}>{device.outputs.map((output, index) => <View key={output.outputId || index} style={styles.outputCard}><Text numberOfLines={1} style={styles.outputLabel}>{output.outputName || output.label || `Output ${index + 1}`}</Text><Text style={styles.outputValue}>{formatOutput(output.value ?? output.label)}</Text><View style={[styles.outputDot, { backgroundColor: chipColor(output.status) }]} /></View>)}</View> : <View style={styles.emptyInline}><Text style={styles.emptyText}>No output data returned for this device.</Text></View>}
      {device.outputs?.some(output => output.status === 'unknown') ? <Text style={[styles.infoNoteText, { marginHorizontal: 16, marginTop: 8 }]}>Unknown readings mean Ginjer has not reported those values yet. A queued downlink does not confirm a color change; check again after the device's next uplink.</Text> : null}
      <View style={styles.detailSectionHeader}><Text style={styles.sectionTitleSmall}>Location</Text><Pressable onPress={() => openFullMap('detail', device)}><Text style={styles.linkText}>View map</Text></Pressable></View>
      <View style={styles.miniMap}>
        <MapView provider={GOOGLE_MAPS_API_KEY ? PROVIDER_GOOGLE : undefined} style={StyleSheet.absoluteFill} initialRegion={coords ? { latitude: Number(device.position.lat), longitude: Number(device.position.lng), latitudeDelta: 0.08, longitudeDelta: 0.08 } : { latitude: 22.9734, longitude: 78.6569, latitudeDelta: 24, longitudeDelta: 24 }} scrollEnabled={coords} zoomEnabled={coords} userInterfaceStyle="light" customMapStyle={GOOGLE_MAPS_LIGHT_STYLE}>
          {coords ? <Marker coordinate={{ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }} title={device.name} description={device.loc} /> : null}
        </MapView>
        {!coords ? <View style={styles.miniMapMessage}><Icon name="map-marker-off-outline" size={17} color={C.greenDark} /><Text style={styles.miniMapText}>Coordinates were not returned for this device.</Text></View> : null}
      </View>
      <View style={styles.expandedDetails}><Text style={styles.expandedLine}>{device.loc}{coords ? ` · ${device.position.lat}, ${device.position.lng}` : ''}</Text></View>
      <View style={styles.detailActions}><ActionButton title="Refresh data" secondary onPress={refresh} />{isConnected ? <ActionButton title="Send Downlink" disabled={!isMongoObjectId(device.apiId)} onPress={() => openDownlink(device)} /> : null}</View>
      {isConnected && !isMongoObjectId(device.apiId) ? <Text style={styles.downlinkIdWarning}>Ginjer has not returned this device’s database ID. Refresh the device list before sending commands.</Text> : null}
    </ScrollView>;
  };

  const renderNotifications = () => {
    const notices = demoNotices.filter((notice, index) => noticeFilter === 'all' || (noticeFilter === 'unread' && notice.count) || (noticeFilter === 'critical' && notice.color === 'red'))
      .filter(notice => !query || `${notice.title} ${notice.where}`.toLowerCase().includes(query.toLowerCase()));
    return <View style={styles.screen}>
      <ScreenHeader title="Notifications" onBack={onDetailBack} right={<View style={{ flexDirection: 'row' }}><IconButton name="filter-variant" label="Filter notifications" onPress={() => setModal('notice-filter')} /><IconButton name="cog-outline" label="Notification settings" onPress={() => showToast('Notification preferences are not provided by the Ginjer API.')} /></View>} />
      {isConnected ? <View style={[styles.infoNote, { marginHorizontal: 14 }]}><Icon name="information-outline" size={16} color={C.greenDark} /><Text style={styles.infoNoteText}>Sample alerts · Ginjer’s supplied API does not include notifications.</Text></View> : null}
      <SearchField value={query} onChangeText={setQuery} placeholder="Search notifications" style={{ marginHorizontal: 14, marginTop: 6, marginBottom: 8 }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {notices.map((notice, index) => <View key={`${notice.title}-${index}`}>
          {(index === 0 || (index === 4 && notices.length > 4)) ? <Text style={styles.noticeDate}>{index === 0 ? 'Today' : 'Earlier'}</Text> : null}
          <View style={styles.noticeRow}><Image source={NOTICE_IMAGES[notice.icon]} style={styles.noticeImage} resizeMode="cover" /><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>{notice.title}</Text><Text style={styles.noticeLocation}>{notice.where}</Text></View><View style={styles.noticeTime}>{notice.count ? <Text style={styles.unreadCount}>{notice.count}</Text> : null}<Text style={styles.noticeTimeText}>{notice.time}</Text></View></View>
        </View>)}
        {!notices.length ? <EmptyState text="No notifications match this filter." /> : null}
      </ScrollView>
    </View>;
  };

  const renderEdit = () => <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScreenHeader title="Edit Profile" onBack={() => { setProfileDraft(profile); setProfilePhotoDraftUri(profilePhotoUri); setRoute('profile'); }} right={<IconButton name="check" label="Save profile" color={C.greenDark} onPress={saveProfile} />} />
    <ScrollView style={styles.screen} contentContainerStyle={styles.editProfileScroll} keyboardShouldPersistTaps="handled">
      <View style={styles.editAvatarWrap}><ProfileAvatar uri={profilePhotoDraftUri} onEditPress={pickImage} size={112} /></View>
      <ProfileField label="Full name" icon="account-outline" value={profileDraft.name} onChangeText={value => setProfileDraft(current => ({ ...current, name: value }))} />
      <ProfileField label="Email" icon="email-outline" value={profileDraft.email} keyboardType="email-address" autoCapitalize="none" onChangeText={value => setProfileDraft(current => ({ ...current, email: value }))} />
      <ProfileField label="Primary Phone Number" icon="phone-outline" value={profileDraft.primaryPhone || ''} keyboardType="phone-pad" onChangeText={value => setProfileDraft(current => ({ ...current, primaryPhone: value }))} />
      <ProfileField label="Secondary phone Number" icon="phone-outline" value={profileDraft.secondaryPhone || ''} keyboardType="phone-pad" onChangeText={value => setProfileDraft(current => ({ ...current, secondaryPhone: value }))} />
      <ProfileField label="Organization" icon="domain" value={profileDraft.organization || ''} editable={false} onPress={() => setModal('profile-organisations')} />
      <ActionButton title="Save changes" onPress={saveProfile} style={{ marginTop: 18 }} />
      {isConnected ? <Text style={styles.profileEditNote}>These changes stay in this app session. Ginjer’s supplied API does not support updating account details.</Text> : null}
    </ScrollView>
  </KeyboardAvoidingView>;

  const renderBody = () => {
    if (route === 'devices') return renderDevices();
    if (route === 'locations') return renderLocations();
    if (route === 'map') return renderMap(true);
    if (route === 'analytics') return renderAnalytics();
    if (route === 'automation') return renderAutomation();
    if (route === 'profile') return renderProfile();
    if (route === 'notifications') return renderNotifications();
    if (route === 'detail') return renderDetail();
    if (route === 'edit') return renderEdit();
    return renderDevices();
  };

  const renderOptions = () => {
    if (modal === 'automation-solution') {
      const options = ['All', ...new Set([...projects.map(project => project.name).filter(Boolean), ...automationRules.map(rule => rule.solution).filter(Boolean)])];
      return <Sheet visible title="Solution" subtitle="Filter automations by solution." onClose={() => setModal(null)} actions={<ActionButton title="Close" secondary onPress={() => setModal(null)} />}>
        {options.map(value => <OptionRow key={value} title={value} selected={automationSolution === value} radio onPress={() => { setAutomationSolution(value); setModal(null); }} />)}
      </Sheet>;
    }
    if (modal === 'automation-output') {
      const options = ['All', ...new Set([...devices.flatMap(device => (device.outputs || []).map(output => output.outputName || output.label).filter(Boolean)), ...automationRules.map(rule => rule.output).filter(Boolean)])];
      return <Sheet visible title="Output" subtitle="Filter automations by output." onClose={() => setModal(null)} actions={<ActionButton title="Close" secondary onPress={() => setModal(null)} />}>
        {options.map(value => <OptionRow key={value} title={value} selected={automationOutput === value} radio onPress={() => { setAutomationOutput(value); setModal(null); }} />)}
      </Sheet>;
    }
    if (modal === 'automation-create') {
      const save = () => {
        const name = newAutomationName.trim();
        if (!name) { showToast('Enter a name for this automation.'); return; }
        if (activeAutomationId) {
          setAutomationRules(current => current.map(rule => rule.id === activeAutomationId ? { ...rule, name, solution: newAutomationSolution.trim() || 'Default solution', output: newAutomationOutput.trim() || 'Valve 1', mode: newAutomationMode } : rule));
        } else {
          setAutomationRules(current => [...current, { id: `local-${Date.now()}`, name, solution: newAutomationSolution.trim() || 'Default solution', output: newAutomationOutput.trim() || 'Valve 1', mode: newAutomationMode, active: false, runs: 0 }]);
        }
        setActiveAutomationId(null); setModal(null); showToast(isConnected ? 'Automation saved in this preview only; Ginjer has no automation API.' : 'Automation added to this preview.');
      };
      return <Sheet visible title={activeAutomationId ? 'Edit Automation' : 'New Automation'} subtitle="Create a local preview rule for the selected solution and output." onClose={() => { setModal(null); setActiveAutomationId(null); }} actions={<><ActionButton title="Cancel" secondary onPress={() => { setModal(null); setActiveAutomationId(null); }} /><ActionButton title="Save" onPress={save} /></>}>
        <Text style={styles.fieldLabel}>Automation name</Text><TextInput value={newAutomationName} onChangeText={setNewAutomationName} placeholder="e.g. Pump Off" placeholderTextColor="#9EA39F" style={styles.textInput} accessibilityLabel="Automation name" />
        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Solution</Text><TextInput value={newAutomationSolution} onChangeText={setNewAutomationSolution} placeholder="Default solution" placeholderTextColor="#9EA39F" style={styles.textInput} accessibilityLabel="Automation solution" />
        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Output</Text><TextInput value={newAutomationOutput} onChangeText={setNewAutomationOutput} placeholder="Valve 1" placeholderTextColor="#9EA39F" style={styles.textInput} accessibilityLabel="Automation output" />
        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Mode</Text>
        <OptionRow title="Automatic" selected={newAutomationMode === 'automatic'} radio onPress={() => setNewAutomationMode('automatic')} />
        <OptionRow title="Manual" selected={newAutomationMode === 'manual'} radio onPress={() => setNewAutomationMode('manual')} />
      </Sheet>;
    }
    if (modal === 'automation-actions') {
      const selectedRule = automationRules.find(rule => rule.id === activeAutomationId);
      if (!selectedRule) return null;
      return <Sheet visible title="Automation options" subtitle={selectedRule.name} onClose={() => setModal(null)} actions={<ActionButton title="Close" secondary onPress={() => setModal(null)} />}>
        <OptionRow title="Edit automation" onPress={() => { setNewAutomationName(selectedRule.name); setNewAutomationSolution(selectedRule.solution); setNewAutomationOutput(selectedRule.output); setNewAutomationMode(selectedRule.mode); setModal('automation-create'); }} />
        <OptionRow title="Delete automation" onPress={() => { setAutomationRules(current => current.filter(rule => rule.id !== selectedRule.id)); setActiveAutomationId(null); setModal(null); showToast('Preview automation deleted.'); }} />
      </Sheet>;
    }
    if (modal === 'profile-organisations') {
      const choices = (organisations.length ? organisations : [{ name: 'SenRa' }, { name: 'Individual' }, { name: 'SenRa IoT' }])
        .filter(item => (item.name || item.organisationId || '').toLowerCase().includes(organizationQuery.toLowerCase()));
      return <Sheet visible title="Organization" subtitle="Choose the organization shown on your profile." onClose={() => { setModal(null); setOrganizationQuery(''); }} actions={<ActionButton title="Close" secondary onPress={() => { setModal(null); setOrganizationQuery(''); }} />}>
        <SearchField value={organizationQuery} onChangeText={setOrganizationQuery} placeholder="Search organizations" style={{ marginVertical: 8 }} />
        {choices.map((item, index) => <OptionRow key={item.organisationId || item.name || index} title={item.name || item.organisationId} selected={profileDraft.organization === (item.name || item.organisationId)} onPress={() => { setProfileDraft(current => ({ ...current, organization: item.name || item.organisationId })); setModal(null); setOrganizationQuery(''); }} />)}
        {!choices.length ? <Text style={styles.sheetEmpty}>No organizations match this search.</Text> : null}
      </Sheet>;
    }
    if (modal === 'organisations') return <Sheet visible title="Organizations" subtitle="Choose an accepted Ginjer organization." onClose={() => setModal(null)} actions={<ActionButton title="Close" secondary onPress={() => setModal(null)} />}>
      {organisations.map(organisation => <OptionRow key={organisation.organisationId} title={organisation.name || organisation.organisationId} onPress={() => chooseOrganisation(organisation)} />)}
    </Sheet>;
    if (modal === 'projects') return <Sheet visible title="Projects" subtitle="Switch the project shown in the app." onClose={() => setModal(null)} actions={<ActionButton title="Close" secondary onPress={() => setModal(null)} />}>
      {projects.length > 1 ? <OptionRow title="All Projects" subtitle={`${projects.length} projects · combined device list`} selected={activeProject?._id === ALL_PROJECTS_ID} onPress={() => chooseProject({ _id: ALL_PROJECTS_ID, name: 'All Projects', isDemo: demoMode })} /> : null}
      {projects.map(project => <OptionRow key={project._id} title={project.name || project._id} subtitle={`${project.deviceCount?.[0]?.deviceCount ?? '—'} devices`} selected={activeProject?._id === project._id} onPress={() => chooseProject(project)} />)}
      {!projects.length ? <Text style={styles.sheetEmpty}>Connect to Ginjer to select a project.</Text> : null}
    </Sheet>;
    if (modal === 'filter' || modal === 'notice-filter') {
      const noticeMode = modal === 'notice-filter';
      const value = noticeMode ? noticeFilter : filter;
      const options = noticeMode ? [['all', 'All notifications'], ['unread', 'Unread only'], ['critical', 'Critical alerts']] : [['all', 'All devices'], ['attention', 'Needs attention'], ['online', 'Online']];
      return <Sheet visible title={noticeMode ? 'Notification filter' : 'Filter devices'} subtitle={noticeMode ? 'Choose which alerts appear in your feed.' : 'Narrow the device list by current status.'} onClose={() => setModal(null)} actions={<><ActionButton title="Cancel" secondary onPress={() => setModal(null)} /><ActionButton title="Apply" onPress={() => setModal(null)} /></>}>
        {options.map(([id, label]) => <OptionRow key={id} title={label} selected={value === id} onPress={() => noticeMode ? setNoticeFilter(id) : setFilter(id)} radio />)}
      </Sheet>;
    }
    if (modal === 'downlink-keys') return <Sheet visible title="Downlink network key" subtitle="Choose a key configured for this device's network." onClose={() => setModal('downlink')} actions={<ActionButton title="Back" secondary onPress={() => setModal('downlink')} />}>
      {downlinkNetworkKeys.map(key => <OptionRow key={key.id} title={key.name} selected={downlinkNetworkKeyId === key.id} onPress={() => { setDownlinkNetworkKeyId(key.id); setModal('downlink'); }} radio />)}
      {!downlinkNetworkKeys.length ? <Text style={styles.sheetEmpty}>No downlink keys are configured for this device network.</Text> : null}
    </Sheet>;
    if (modal === 'downlink') {
      const interfaces = downlinkInterfaces;
      const selectedInterface = interfaces.find(item => item._id === downlinkModule);
      const isColorController = /set\s*colou?r/i.test(selectedInterface?.label || '');
      const relayController = /relay|lt\s*io\s*controller/i.test(`${selectedDevice?.name || ''} ${selectedDevice?.hardwareType || ''} ${selectedDevice?.outputs?.map(output => output.outputName || output.label || '').join(' ') || ''}`);
      const send = async () => {
        if (demoMode || !isConnected || !client) { showToast('Downlinks are available only for a live Ginjer device.'); setModal(null); return; }
        if (!isMongoObjectId(selectedDevice?.apiId)) { showToast('Ginjer device ID is missing or invalid. Refresh the live device list and select the device again.'); return; }
        if (downlinkOptionsLoading || downlinkOptionsError) { showToast(downlinkOptionsError || 'Wait for compatible downlink options to finish loading.'); return; }
        if (!downlinkModule || !interfaces.some(item => item._id === downlinkModule)) { showToast('Select a live downlink interface from Ginjer.'); return; }
        const port = Number(downlinkPort);
        const controllerValue = colorCommandValue(selectedInterface, downlinkControllerValue);
        if (!controllerValue) { showToast(isColorController ? 'For Set Color, enter Red, Blue, Green, or Off.' : 'Enter the controller value.'); return; }
        if (!Number.isInteger(port) || port < 1 || port > 223) { showToast('Downlink port must be a whole number from 1 to 223.'); return; }
        if (!downlinkNetworkKeys.some(key => key.id === downlinkNetworkKeyId)) { showToast('Choose a downlink key configured for this device network.'); return; }
        const value = { value: controllerValue, port, class: downlinkClass, networkKeyId: downlinkNetworkKeyId };
        setLoading(true);
        try {
          const result = await client.sendDownlink(activeOrganisation, selectedDevice, downlinkModule, value, { interfaces, networkKeys: downlinkNetworkKeys });
          const receipt = result.sendDownlink;
          const confirmation = downlinkConfirmation(receipt);
          setModal(null);
          showToast(confirmation);
        } catch (error) { showToast(error.message); }
        finally { setLoading(false); }
      };
      const selectedNetworkKey = downlinkNetworkKeys.find(key => key.id === downlinkNetworkKeyId);
      return <Sheet visible title="Send downlink" subtitle="Send a command to this device." onClose={() => setModal(null)} actions={<><ActionButton title="Cancel" secondary onPress={() => setModal(null)} style={styles.sheetActionButton} /><ActionButton title={loading ? 'Sending…' : 'Send command'} disabled={loading || downlinkOptionsLoading || !interfaces.length || !downlinkNetworkKeys.length} onPress={send} style={styles.sheetActionButton} /></>}>
        <View style={styles.downlinkDeviceCard}>
          <View style={styles.downlinkDeviceIcon}><Icon name={kindIcon(selectedDevice?.kind, selectedDevice?.name)} size={21} color={C.greenDark} /></View>
          <View style={styles.downlinkDeviceCopy}>
            <Text numberOfLines={1} style={styles.downlinkDeviceName}>{selectedDevice?.name || 'Unknown device'}</Text>
            <Text numberOfLines={1} style={styles.downlinkDeviceId}>DEVICE ID · {selectedDevice?.id || selectedDevice?.devEui || selectedDevice?.hardwareId || 'Unavailable'}</Text>
          </View>
          <View style={styles.downlinkLivePill}><View style={styles.downlinkLiveDot} /><Text style={styles.downlinkLiveText}>LIVE</Text></View>
        </View>
        {downlinkOptionsLoading ? <View style={styles.downlinkLoading}><ActivityIndicator size="small" color={C.green} /><Text style={styles.downlinkLoadingText}>Loading device-compatible controls…</Text></View> : null}
        {downlinkOptionsError ? <View style={styles.downlinkError}><Icon name="alert-circle-outline" size={18} color={C.red} /><Text style={styles.downlinkErrorText}>{downlinkOptionsError}</Text></View> : null}
        <Text style={styles.downlinkSectionLabel}>CONTROL INTERFACE</Text>
        {interfaces.length ? <View style={styles.downlinkInterfaceList}>{interfaces.map(item => {
          const selected = downlinkModule === item._id;
          return <Pressable key={item._id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setDownlinkModule(item._id)} style={[styles.downlinkInterfaceRow, selected && styles.downlinkInterfaceRowSelected]}>
            <View style={[styles.downlinkInterfaceIcon, selected && styles.downlinkInterfaceIconSelected]}><Icon name={relayController ? 'electric-switch' : 'tune-variant'} size={18} color={selected ? C.greenDark : C.muted} /></View>
            <Text numberOfLines={1} style={[styles.downlinkInterfaceName, selected && styles.downlinkInterfaceNameSelected]}>{item.label || item._id}</Text>
            <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={21} color={selected ? C.greenDark : '#A0AAA2'} />
          </Pressable>;
        })}</View> : !downlinkOptionsLoading && !downlinkOptionsError ? <Text style={styles.downlinkEmpty}>This device has no compatible downlink controller.</Text> : null}
        <Text style={[styles.downlinkSectionLabel, { marginTop: 20 }]}>COMMAND VALUE</Text>
        {isColorController ? <View style={styles.downlinkColorChoices}>{['Red', 'Blue', 'Green', 'Off'].map(value => {
          const selected = downlinkControllerValue.toLowerCase() === value.toLowerCase();
          return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setDownlinkControllerValue(value)} style={[styles.downlinkColorChoice, selected && styles.downlinkColorChoiceSelected]}>
            {value !== 'Off' ? <View style={[styles.downlinkColorDot, { backgroundColor: value.toLowerCase() }]} /> : <Icon name="power" size={15} color={selected ? C.greenDark : C.muted} />}
            <Text style={[styles.downlinkColorText, selected && styles.downlinkColorTextSelected]}>{value}</Text>
          </Pressable>;
        })}</View> : <TextInput value={downlinkControllerValue} onChangeText={setDownlinkControllerValue} autoCapitalize="none" autoCorrect={false} style={[styles.textInput, styles.downlinkValueInput]} accessibilityLabel="Controller value" placeholder="Enter a value for this controller" placeholderTextColor="#A0AAA2" />}
        {isColorController ? <Text style={styles.downlinkHelper}>Choose a supported color. The change is confirmed after the device sends its next uplink.</Text> : null}
        <View style={styles.downlinkFieldsRow}>
          <View style={styles.downlinkFieldColumn}><Text style={styles.downlinkSectionLabel}>PORT</Text><View style={styles.downlinkPortShell}><TextInput value={downlinkPort} onChangeText={setDownlinkPort} keyboardType="number-pad" style={styles.downlinkPortInput} accessibilityLabel="Downlink port" /><Text style={styles.downlinkPortHint}>1–223</Text></View></View>
          <View style={styles.downlinkFieldColumn}><Text style={styles.downlinkSectionLabel}>CLASS</Text><View style={styles.downlinkClassRow}>{['CLASS_A', 'CLASS_B', 'CLASS_C'].map(item => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: downlinkClass === item }} onPress={() => setDownlinkClass(item)} style={[styles.downlinkClassOption, downlinkClass === item && styles.downlinkClassOptionSelected]}><Text style={[styles.downlinkClassText, downlinkClass === item && styles.downlinkClassTextSelected]}>{item.slice(-1)}</Text></Pressable>)}</View></View>
        </View>
        <Text style={[styles.downlinkSectionLabel, { marginTop: 20 }]}>NETWORK KEY</Text>
        <Pressable accessibilityRole="button" onPress={() => setModal('downlink-keys')} style={styles.downlinkKeySelector}>
          <View style={styles.downlinkKeyIcon}><Icon name="key-outline" size={17} color={C.greenDark} /></View>
          <Text numberOfLines={1} style={styles.downlinkKeyText}>{selectedNetworkKey?.name || 'Choose a configured network key'}</Text>
          <Icon name="chevron-down" size={19} color={C.muted} />
        </Pressable>
        <View style={styles.downlinkSafetyNote}><Icon name="information-outline" size={16} color={C.greenDark} /><Text style={styles.downlinkSafetyText}>{relayController ? 'This queues a relay command. Verify the relay state after the device’s next uplink.' : 'This queues the command for delivery. Device execution is confirmed by its next uplink.'}</Text></View>
      </Sheet>;
    }
    return null;
  };

  if (route === 'setup') return renderSetup();
  if (route === 'login') return renderLogin();

  return <SafeAreaView edges={hasTabs ? ['top'] : ['top', 'bottom']} style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={route === 'locations' || route === 'map' ? '#F8FAF5' : C.canvas} />
    <View style={styles.appBody}>{renderBody()}</View>
    {hasTabs ? <BottomTabs current={tab} onChange={changeTab} /> : null}
    {toast ? <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    {loading && route !== 'login' ? <View style={styles.loadingOverlay}><ActivityIndicator color={C.green} size="large" /></View> : null}
    {renderOptions()}
  </SafeAreaView>;
}

function OptionRow({ title, subtitle, selected, radio, onPress }) {
  return <Pressable onPress={onPress} style={styles.optionRow}>
    <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.optionTitle}>{title}</Text>{subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}</View>
    {radio ? <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={21} color={selected ? C.greenDark : '#A0A6A1'} /> : <Icon name={selected ? 'check-circle' : 'chevron-right'} size={19} color={selected ? C.greenDark : '#A0A6A1'} />}
  </Pressable>;
}

function EmptyState({ text }) {
  return <View style={styles.emptyBox}><Icon name="inbox-outline" size={28} color="#A4AAA5" /><Text style={styles.emptyText}>{text}</Text></View>;
}

function kindIcon(kind, name) {
  return DEVICE_VISUALS[kind]?.icon || genericDeviceVisual(name).icon;
}

function chipColor(status) { return status === 'red' ? C.red : status === 'amber' ? C.amber : status === 'blue' ? C.blue : status === 'unknown' ? C.muted : C.green; }
function formatOutput(value) { return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—'); }
function formatUpdatedAt(timestamp) {
  if (!timestamp) return 'Waiting for data';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)}m ago`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: C.canvas }, appBody: { flex: 1, minHeight: 0 }, screen: { flex: 1, backgroundColor: C.canvas },
  centerPage: { flex: 1, justifyContent: 'center', padding: 22 }, setupPanel: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 22, borderRadius: 20, backgroundColor: C.white, elevation: 3, shadowColor: '#15220E', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  kicker: { color: C.green, fontSize: 12, lineHeight: 17, fontWeight: '800', letterSpacing: 1.2, marginBottom: 11 }, screenHeading: { color: C.ink, fontSize: 24, lineHeight: 30, fontWeight: '700', marginBottom: 9 }, bodyCopy: { color: '#6F7771', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  textInput: { width: '100%', minHeight: 51, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1.2, borderColor: '#C9CDC9', borderRadius: 11, backgroundColor: C.white, color: C.ink, fontSize: 15, lineHeight: 20, textAlignVertical: 'center' }, errorText: { color: C.red, fontSize: 13, lineHeight: 19, marginTop: 9 },
  primaryButton: { minHeight: 51, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: C.green }, primaryButtonText: { color: C.white, fontSize: 16, fontWeight: '700' }, secondaryButton: { minHeight: 45, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DEE6D3', borderRadius: 11, backgroundColor: C.white }, secondaryButtonText: { color: C.greenDark, fontSize: 14, fontWeight: '600' }, disabledButton: { backgroundColor: '#E9EEE3', borderColor: '#E9EEE3' }, pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] }, footnote: { color: '#969D97', fontSize: 12, lineHeight: 18, marginTop: 12 },
  loginScroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 22, backgroundColor: C.white }, loginBrand: { height: 76, alignItems: 'center', justifyContent: 'center' }, ginjerLogo: { width: 235, height: 68 }, loginTagline: { marginTop: 5, color: '#969D98', fontSize: 16, textAlign: 'center' }, loginIllustration: { width: '100%', height: 190, marginTop: 14, marginBottom: 14 }, loginSecurityNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 16, padding: 11, borderRadius: 10, backgroundColor: C.greenPale }, loginSecurityText: { flex: 1, color: C.greenDark, fontSize: 12, lineHeight: 17 }, fieldLabel: { color: C.greenDark, fontSize: 13, fontWeight: '600', marginBottom: 7 }, textLink: { alignSelf: 'center', marginTop: 12, padding: 6 }, linkText: { color: C.greenDark, fontSize: 14, fontWeight: '600' }, legalText: { color: '#969D98', textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 16 }, legalLinkText: { color: C.greenDark, fontSize: 11, fontWeight: '600' }, mutedLink: { color: '#929A94', fontSize: 12 }, changeServer: { alignSelf: 'center', marginTop: 7, padding: 5 },
  listTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, paddingTop: 10, paddingBottom: 5 }, sectionTitle: { color: C.ink, fontSize: 19, lineHeight: 26, fontWeight: '700' }, topActions: { flexDirection: 'row', gap: 2 }, iconButton: { minWidth: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, pageHeader: { minHeight: 52, zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, backgroundColor: '#FFFFFFF2' }, pageTitle: { flex: 1, minWidth: 0, paddingHorizontal: 4, textAlign: 'center', color: C.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' }, pageRight: { minWidth: 38, alignItems: 'flex-end' },
  projectSelector: { minHeight: 52, marginHorizontal: 16, marginTop: 7, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.white, shadowColor: '#293221', shadowOpacity: 0.035, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, selectorCaption: { color: '#A1A7A2', fontSize: 9, lineHeight: 12, fontWeight: '700', letterSpacing: 0.7 }, selectorName: { color: C.ink, fontSize: 13, fontWeight: '600', marginTop: 2 },
  searchField: { minHeight: 45, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#EEF0EC', borderRadius: 12, backgroundColor: C.white, shadowColor: '#293221', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, searchInput: { flex: 1, minWidth: 0, height: 44, padding: 0, color: C.ink, fontSize: 13, lineHeight: 18, textAlignVertical: 'center' },
  listSummary: { paddingHorizontal: 18, paddingTop: 13, paddingBottom: 7, flexDirection: 'row', justifyContent: 'space-between' }, summaryText: { color: '#929A94', fontSize: 10, lineHeight: 14, fontWeight: '500' }, deviceList: { gap: 10, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 16 }, deviceCard: { minHeight: 132, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 11, borderRadius: 14, backgroundColor: C.white, elevation: 2, shadowColor: '#1F2C19', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, deviceThumb: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#F4F7F1' }, deviceCardBody: { flex: 1, minWidth: 0, paddingVertical: 2, justifyContent: 'center' }, deviceName: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '700' }, deviceId: { color: '#929A94', fontSize: 9, lineHeight: 13, marginTop: 2 }, deviceLocation: { color: '#7C857E', fontSize: 10, lineHeight: 14, marginTop: 4 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 }, statusChip: { maxWidth: '100%', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 }, statusChipText: { fontSize: 9, lineHeight: 12, fontWeight: '600' }, deviceCardMeta: { width: 82, flexShrink: 0, alignItems: 'flex-end', paddingTop: 1 }, deviceMetaHeading: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }, onlineDot: { width: 8, height: 8, borderRadius: 5 }, lastLabel: { maxWidth: '100%', color: '#A1A7A2', fontSize: 8, lineHeight: 11, textAlign: 'right' }, lastTime: { maxWidth: '100%', marginTop: 2, color: '#626B64', fontSize: 8, lineHeight: 11, textAlign: 'right' },
  tabSafeArea: { backgroundColor: C.white }, bottomTabs: { minHeight: 60, paddingTop: 3, paddingBottom: Platform.OS === 'android' ? 4 : 2, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E9ECE7', backgroundColor: C.white }, tabButton: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', gap: 2 }, tabLabel: { color: '#999F9A', fontSize: 9, lineHeight: 12, fontWeight: '500' }, tabLabelActive: { color: C.greenDark, fontWeight: '700' }, notificationsLink: { minHeight: 44, marginTop: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: '#F1F6E9' }, notificationsLinkText: { flex: 1, color: C.greenDark, fontSize: 12, fontWeight: '600' },
  emptyBox: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 }, emptyInline: { minHeight: 56, justifyContent: 'center' }, emptyText: { color: '#929A94', fontSize: 13, textAlign: 'center' },
  mapScreen: { flex: 1, backgroundColor: '#FFFFFF' }, mapHeader: { height: 48, zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, backgroundColor: '#FFFFFFF0' }, mapOverlay: { position: 'absolute', zIndex: 2, top: 58, left: 12, right: 12 }, mapSearch: { borderColor: '#E5EAE2' }, mapNotice: { position: 'absolute', zIndex: 1, top: 120, left: 12, right: 12, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: '#FFFFFFEE' }, mapNoticeText: { flex: 1, color: '#6E786F', fontSize: 9, lineHeight: 13 }, mapCount: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: '#FFFFFFF2', elevation: 2 }, mapCountText: { color: '#6F7970', fontSize: 10 }, currentLocationMarker: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.white, borderRadius: 12, backgroundColor: '#D94343', elevation: 5, shadowColor: '#641717', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, currentLocationMarkerCenter: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.white }, markerBubble: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.white, borderRadius: 19, borderBottomLeftRadius: 5, elevation: 4 }, mapDeviceCard: { position: 'absolute', bottom: 12, left: 12, right: 12, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 13, backgroundColor: C.white, elevation: 5, shadowColor: '#162015', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }, mapDeviceName: { color: C.ink, fontSize: 13, fontWeight: '700' }, mapDeviceMeta: { color: C.muted, fontSize: 10, marginTop: 3 },
  standardScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22 }, dashboardHeading: { marginTop: 5, marginBottom: 8, color: C.ink, fontSize: 19, fontWeight: '700' }, infoNote: { marginTop: 11, padding: 10, flexDirection: 'row', gap: 7, alignItems: 'center', borderWidth: 1, borderColor: '#E7EDDE', borderRadius: 10, backgroundColor: '#F4F8EE' }, infoNoteText: { flex: 1, color: '#6F7A6E', fontSize: 10, lineHeight: 15 }, statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, statCard: { flex: 1, minHeight: 102, padding: 11, borderRadius: 12, backgroundColor: C.white, elevation: 1 }, statIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, statValue: { marginTop: 8, color: C.ink, fontSize: 19, fontWeight: '700' }, statLabel: { marginTop: 1, color: C.muted, fontSize: 10 }, sectionTitleSmall: { color: C.ink, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8 }, metricCard: { marginTop: 10, padding: 13, borderRadius: 13, backgroundColor: C.white, elevation: 2, shadowColor: '#192512', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } }, metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }, metricName: { color: C.ink, fontSize: 12, fontWeight: '700' }, metricCaption: { color: '#999F9A', fontSize: 9, marginTop: 2 }, metricValue: { marginTop: 12, color: C.greenDark, fontSize: 25, fontWeight: '700', textAlign: 'center' }, metricFooter: { minHeight: 27, marginTop: 10, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line }, metricFooterText: { color: '#9CA39D', fontSize: 9 }, gauge: { height: 106, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }, gaugeArc: { position: 'absolute', bottom: 0, width: 160, height: 80, borderWidth: 12, borderBottomWidth: 0, borderColor: '#C8E0E8', borderTopLeftRadius: 100, borderTopRightRadius: 100 }, gaugeNeedle: { position: 'absolute', left: 70, top: 46, width: 45, height: 2, backgroundColor: C.blue, transform: [{ rotate: '-37deg' }] }, gaugeValue: { marginBottom: 7, color: '#347F9B', fontSize: 22, fontWeight: '700' }, gaugeUnit: { fontSize: 13, fontWeight: '500' },
  profileScroll: { paddingHorizontal: 17, paddingTop: 8, paddingBottom: 24 }, profileHeading: { marginTop: 2, color: C.ink, fontSize: 19, fontWeight: '700', textAlign: 'center' }, profileHero: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12, paddingBottom: 18, paddingHorizontal: 10 }, profileIdentity: { flex: 1, minWidth: 0 }, avatar: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: C.white, borderRadius: 42, backgroundColor: '#E8F0DF', elevation: 2 }, avatarWrap: { position: 'relative' }, editPhotoButton: { position: 'absolute', bottom: -7, right: -7, width: 32, height: 32, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.white, elevation: 4, shadowColor: '#15220E', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, avatarImage: { width: '100%', height: '100%' }, profileName: { color: C.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' }, profileEmail: { color: '#969D98', fontSize: 11, lineHeight: 16, marginTop: 3 }, profileMenu: { overflow: 'hidden', borderRadius: 13, backgroundColor: C.white, elevation: 2 }, menuRow: { minHeight: 62, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEEEA' }, menuRowLast: { borderBottomWidth: 0 }, menuIconSlot: { width: 26, alignItems: 'center', justifyContent: 'center' }, menuCopy: { flex: 1, minWidth: 0, justifyContent: 'center' }, menuTitle: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' }, menuValue: { color: '#969D98', fontSize: 11, lineHeight: 15, marginTop: 2 }, logoutRow: { minHeight: 54, marginTop: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#F1D9D6', borderRadius: 12, backgroundColor: C.white }, logoutText: { flex: 1, color: C.red, fontSize: 14, fontWeight: '600' }, profileFootnote: { marginTop: 14, color: '#A2A8A3', fontSize: 10, textAlign: 'center' },
  editProfileScroll: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 28 }, editAvatarWrap: { alignItems: 'center', paddingTop: 3, paddingBottom: 27 }, profileFieldGroup: { marginBottom: 14 }, profileFieldLabel: { marginBottom: 6, color: C.greenDark, fontSize: 14, fontWeight: '600' }, profileField: { minHeight: 54, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1.3, borderColor: '#D4D9D3', borderRadius: 13, backgroundColor: C.white }, profileFieldInput: { flex: 1, minWidth: 0, minHeight: 50, color: C.ink, fontSize: 15 }, profileEditNote: { marginTop: 12, color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  detailScroll: { paddingBottom: 18 }, detailSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12 }, detailName: { color: C.ink, fontSize: 16, fontWeight: '700' }, detailId: { color: '#7E8780', fontSize: 10, marginTop: 3 }, detailHeard: { color: '#969D98', fontSize: 9, marginTop: 3 }, detailMetaTop: { width: 86, alignItems: 'flex-end' }, detailMetaLabel: { color: '#A1A7A2', fontSize: 8 }, detailMetaValue: { maxWidth: '100%', color: '#626B64', fontSize: 8, lineHeight: 11, textAlign: 'right', marginTop: 2 }, detailFields: { flexDirection: 'row', gap: 9, paddingHorizontal: 16 }, detailField: { minHeight: 58, flex: 1, padding: 10, borderRadius: 10, backgroundColor: C.white, elevation: 1 }, detailFieldLabel: { color: '#A1A7A2', fontSize: 9 }, detailFieldValue: { color: C.ink, fontSize: 11, fontWeight: '600', marginTop: 5 }, expandButton: { minHeight: 35, marginHorizontal: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 9, backgroundColor: C.greenPale }, expandButtonText: { color: C.greenDark, fontSize: 11, fontWeight: '600' }, expandedDetails: { marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: C.white }, expandedLine: { color: '#727B74', fontSize: 10, lineHeight: 16 }, bold: { color: '#465047', fontWeight: '700' }, outputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 16 }, outputCard: { position: 'relative', width: '48%', minHeight: 74, padding: 10, borderRadius: 11, backgroundColor: C.white, elevation: 1 }, outputLabel: { color: C.muted, fontSize: 9 }, outputValue: { color: C.ink, fontSize: 14, fontWeight: '700', marginTop: 6, paddingRight: 12 }, outputDot: { position: 'absolute', right: 9, bottom: 10, width: 10, height: 10, borderRadius: 6 }, detailSectionHeader: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, miniMap: { height: 170, marginHorizontal: 16, overflow: 'hidden', borderRadius: 11, backgroundColor: '#FFFFFF' }, miniMapMessage: { position: 'absolute', left: 10, right: 10, top: 10, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, backgroundColor: '#FFFFFFEE' }, miniMapText: { flex: 1, color: '#70796F', fontSize: 10 }, detailActions: { flexDirection: 'row', gap: 9, marginHorizontal: 16, marginTop: 11 },
  noticeDate: { marginHorizontal: 16, marginTop: 14, marginBottom: 7, color: '#8B938D', fontSize: 10, fontWeight: '700' }, noticeRow: { minHeight: 69, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE7', backgroundColor: C.white }, noticeImage: { width: 38, height: 38, borderRadius: 20 }, noticeTitle: { color: C.ink, fontSize: 11, fontWeight: '700' }, noticeLocation: { color: '#969D98', fontSize: 9, marginTop: 3 }, noticeTime: { alignItems: 'flex-end', gap: 4 }, noticeTimeText: { color: '#9AA19B', fontSize: 9 }, unreadCount: { minWidth: 17, height: 17, paddingHorizontal: 4, overflow: 'hidden', borderRadius: 9, backgroundColor: C.green, color: C.white, fontSize: 9, textAlign: 'center', textAlignVertical: 'center' },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#10171299' }, sheet: { maxHeight: '84%', paddingTop: 8, paddingHorizontal: 18, paddingBottom: Platform.OS === 'ios' ? 25 : 14, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: C.white }, sheetGrabber: { width: 36, height: 4, alignSelf: 'center', marginBottom: 13, borderRadius: 4, backgroundColor: '#D9DED8' }, sheetTitle: { color: C.ink, fontSize: 17, fontWeight: '700', textAlign: 'center' }, sheetSubtitle: { alignSelf: 'center', maxWidth: 300, marginTop: 5, marginBottom: 12, color: '#969D98', fontSize: 11, lineHeight: 16, textAlign: 'center' }, sheetContent: { flexShrink: 1 }, sheetActions: { flexDirection: 'row', gap: 9, marginTop: 12 }, optionRow: { minHeight: 49, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEF0EC' }, optionTitle: { color: C.ink, fontSize: 12, fontWeight: '500' }, optionSubtitle: { color: C.muted, fontSize: 10, marginTop: 3 }, sheetEmpty: { padding: 15, color: C.muted, fontSize: 12, textAlign: 'center' }, jsonInput: { minHeight: 96, marginTop: 6, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  loginPasswordShell: { position: 'relative', justifyContent: 'center' }, loginPasswordInput: { paddingRight: 48 }, passwordVisibilityButton: { position: 'absolute', right: 10, width: 36, height: 42, alignItems: 'center', justifyContent: 'center' }, authModeLink: { alignSelf: 'center', marginTop: 12, padding: 6 }, authModeLinkText: { color: C.greenDark, fontSize: 13, fontWeight: '600' },
  deviceProject: { color: C.greenDark, fontSize: 9, fontWeight: '600', marginTop: 3 },
  downlinkIdWarning: { marginHorizontal: 16, marginTop: 6, color: C.red, fontSize: 10, lineHeight: 14 },
  downlinkFieldsRow: { flexDirection: 'row', gap: 10 }, downlinkClassRow: { minHeight: 44, marginTop: 6, padding: 3, flexDirection: 'row', gap: 3, borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.white }, downlinkClassOption: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, downlinkClassOptionSelected: { backgroundColor: C.greenPale }, downlinkClassText: { color: C.muted, fontSize: 11 }, downlinkClassTextSelected: { color: C.greenDark, fontWeight: '700' },
  automationBreadcrumb: { minHeight: 35, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 5 }, automationBreadcrumbText: { maxWidth: 120, color: C.muted, fontSize: 10 }, automationBreadcrumbCurrent: { flexShrink: 1, color: C.greenDark, fontSize: 10, fontWeight: '700' },
  automationFilters: { minHeight: 45, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 }, automationFilter: { minHeight: 40, flex: 1, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.white }, automationFilterText: { flex: 1, minWidth: 0 }, automationFilterLabel: { color: C.greenDark, fontSize: 8, fontWeight: '700' }, automationFilterValue: { color: C.ink, fontSize: 11, marginTop: 1 },
  automationSectionHeading: { marginHorizontal: 15, marginTop: 10, marginBottom: 7, color: C.ink, fontSize: 14, fontWeight: '700' }, automationList: { gap: 8, paddingHorizontal: 13, paddingBottom: 18 }, automationCard: { padding: 11, borderWidth: 1, borderColor: '#ECEFEB', borderRadius: 12, backgroundColor: C.white }, automationCardRunning: { borderColor: '#D9E7CC', backgroundColor: '#F4F8EE' }, automationRowTop: { flexDirection: 'row', alignItems: 'center', gap: 4 }, automationName: { color: C.greenDark, fontSize: 11, fontWeight: '700' }, automationSubtitle: { color: C.muted, fontSize: 9, marginTop: 3 }, automationRowBottom: { minHeight: 28, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }, runAutomationButton: { minHeight: 25, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 13, backgroundColor: C.green }, runAutomationButtonRunning: { opacity: 0.72 }, runAutomationText: { color: C.white, fontSize: 9, fontWeight: '700' }, automationRunningPill: { paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: '#E4B85A', borderRadius: 9, color: '#A67C24', fontSize: 8, fontWeight: '700' }, automationCountPill: { minHeight: 22, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, backgroundColor: '#F4F5F3' }, automationCountText: { color: C.muted, fontSize: 9 }, automationEmpty: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8 }, automationApiNote: { marginTop: 4, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: 9, backgroundColor: '#F4F8EE' },
  screenSubtitle: { color: C.muted, fontSize: 11, lineHeight: 15, marginTop: 1 },
  fleetOverview: { marginHorizontal: 16, marginTop: 10, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 13, borderWidth: 1, borderColor: '#2C5536', borderRadius: 16, backgroundColor: '#2E5838', shadowColor: '#1C3823', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  fleetOverviewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fleetEyebrow: { color: '#D4E5D5', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  connectionPill: { minHeight: 20, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.13)' },
  connectionPillLive: { backgroundColor: 'rgba(255,255,255,0.13)' },
  connectionPillDemo: { backgroundColor: 'rgba(255,255,255,0.13)' },
  connectionDot: { width: 6, height: 6, borderRadius: 3 },
  connectionLabel: { color: C.white, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  fleetStats: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  fleetStat: { flex: 1, alignItems: 'center' },
  fleetStatValue: { color: C.white, fontSize: 20, lineHeight: 24, fontWeight: '800' },
  fleetStatLabel: { marginTop: 2, color: '#D4E5D5', fontSize: 9, lineHeight: 13 },
  fleetStatDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: 'rgba(255,255,255,0.28)' },
  deviceCardLayoutOverride: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 13, borderWidth: 1, borderColor: C.line, borderRadius: 16, shadowColor: '#263529', shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  deviceCardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  deviceCardBottom: { minHeight: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  deviceNamePremium: { fontSize: 14, lineHeight: 19, letterSpacing: -0.2 },
  deviceLocationPremium: { fontSize: 11, lineHeight: 15 },
  deviceCardChipRow: { flex: 1, minWidth: 0, marginTop: 0 },
  deviceLastHeard: { maxWidth: '42%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  deviceLastHeardText: { color: C.muted, fontSize: 9, lineHeight: 13 },
  deviceIdLine: { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, color: C.muted, fontSize: 8, lineHeight: 12, letterSpacing: 0.2 },
  tabIconShell: { width: 38, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  tabIconShellActive: { backgroundColor: C.greenPale },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 74, zIndex: 20, minHeight: 38, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#26312B', elevation: 5 }, toastText: { color: C.white, fontSize: 11, textAlign: 'center' }, loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9F7AA' },
  buttonPremium: { minHeight: 52, borderRadius: 15 },
  pageHeaderPremium: { minHeight: 58, paddingHorizontal: 14, backgroundColor: C.canvas },
  pageTitlePremium: { textAlign: 'left', fontSize: 18, letterSpacing: -0.3 },
  listTopBarPremium: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 8 },
  sectionTitlePremium: { fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  searchFieldPremium: { minHeight: 52, paddingHorizontal: 15, borderColor: '#E8EDE7', borderRadius: 16, shadowOpacity: 0.025, elevation: 0 },
  statusChipPremium: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  statusChipTextPremium: { fontSize: 10, lineHeight: 13, fontWeight: '700' },
  deviceCardPremium: { gap: 13, padding: 15, borderRadius: 20, borderColor: '#E8EDE7', shadowOpacity: 0.045, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  deviceThumbPremium: { borderRadius: 16 },
  deviceCardTopPremium: { gap: 12 },
  deviceCardBottomPremium: { minHeight: 30, paddingTop: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  deviceIdLinePremium: { paddingTop: 9, fontSize: 9, letterSpacing: 0.35 },
  bottomTabsPremium: { minHeight: 69, paddingTop: 6, borderTopColor: '#E9EEE8', shadowColor: '#203628', shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  tabIconShellPremium: { width: 44, height: 30, borderRadius: 16 },
  tabLabelPremium: { fontSize: 10, lineHeight: 14 },
  statCardPremium: { minHeight: 112, padding: 14, borderWidth: 1, borderColor: C.line, borderRadius: 18, shadowOpacity: 0.025, elevation: 0 },
  statIconPremium: { width: 36, height: 36, borderRadius: 12 },
  sheetPremium: { maxHeight: '90%', paddingTop: 10, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 28 : 18, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#101B13', shadowOpacity: 0.16, shadowRadius: 28, shadowOffset: { width: 0, height: -8 }, elevation: 18 },
  sheetHeadingPremium: { minHeight: 50, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sheetHeadingCopy: { flex: 1, minWidth: 0 },
  sheetTitlePremium: { color: C.ink, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5 },
  sheetSubtitlePremium: { alignSelf: 'flex-start', maxWidth: '100%', marginTop: 4, marginBottom: 0, fontSize: 12, lineHeight: 17, textAlign: 'left' },
  sheetClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: C.canvas },
  sheetActionsPremium: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  loginScrollPremium: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30, backgroundColor: C.canvas },
  loginHero: { overflow: 'hidden', padding: 20, borderRadius: 26, backgroundColor: '#204D36' },
  loginHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loginLogoCard: { width: 154, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: C.white },
  ginjerLogoPremium: { width: 143, height: 39 },
  loginSecurePill: { minHeight: 30, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#FFFFFF38', borderRadius: 20, backgroundColor: '#FFFFFF14' },
  loginSecureDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8EE0A1' },
  loginSecureLabel: { color: '#E5F0E7', fontSize: 8, fontWeight: '800', letterSpacing: 0.55 },
  loginHeroEyebrow: { marginTop: 22, color: '#B8D5BD', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  loginHeroTitle: { marginTop: 7, color: C.white, fontSize: 29, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8 },
  loginHeroCopy: { maxWidth: 270, marginTop: 6, color: '#D8E6DA', fontSize: 12, lineHeight: 18 },
  loginArtwork: { height: 140, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#EDF3E9' },
  loginIllustrationPremium: { width: '94%', height: 132 },
  loginArtworkBadge: { position: 'absolute', right: 9, bottom: 9, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#E5EDE4', borderRadius: 12, backgroundColor: '#FFFFFFF2' },
  loginArtworkBadgeText: { color: C.greenDark, fontSize: 9, fontWeight: '700' },
  loginFormCard: { zIndex: 1, marginTop: 14, padding: 20, borderWidth: 1, borderColor: '#E7ECE6', borderRadius: 24, backgroundColor: C.white, shadowColor: '#193322', shadowOpacity: 0.045, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  loginWelcome: { color: C.ink, fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 },
  loginFormCopy: { marginTop: 4, marginBottom: 20, color: C.muted, fontSize: 12, lineHeight: 18 },
  authFieldLabel: { marginBottom: 8, color: '#34463A', fontSize: 12, fontWeight: '700' },
  authInputShell: { minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#E1E8E0', borderRadius: 15, backgroundColor: '#FAFBF9' },
  authInput: { flex: 1, minWidth: 0, height: 52, padding: 0, color: C.ink, fontSize: 14 },
  authPasswordInput: { paddingRight: 0 },
  authPasswordToggle: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  loginSubmit: { minHeight: 54, marginTop: 22, borderRadius: 15, backgroundColor: C.greenDark, shadowColor: C.greenDark, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  loginSecurityNotePremium: { marginTop: 16, marginBottom: 0, padding: 12, borderWidth: 1, borderColor: '#E3EDE2', borderRadius: 14, backgroundColor: '#F3F8F1' },
  setupDemoButton: { marginTop: 10, borderColor: '#DCE7DB', backgroundColor: '#F8FAF7' },
  changeBackendLink: { alignSelf: 'center', marginTop: 13, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  changeBackendText: { color: C.greenDark, fontSize: 11, fontWeight: '700' },
  downlinkDeviceCard: { minHeight: 68, marginBottom: 22, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#E5ECE5', borderRadius: 17, backgroundColor: '#F8FAF7' },
  downlinkDeviceIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: C.greenPale },
  downlinkDeviceCopy: { flex: 1, minWidth: 0 },
  downlinkDeviceName: { color: C.ink, fontSize: 13, fontWeight: '800' },
  downlinkDeviceId: { marginTop: 3, color: C.muted, fontSize: 8, fontWeight: '600', letterSpacing: 0.3 },
  downlinkLivePill: { paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, backgroundColor: '#E9F4EB' },
  downlinkLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  downlinkLiveText: { color: C.greenDark, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  downlinkLoading: { minHeight: 44, marginBottom: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, backgroundColor: C.greenPale },
  downlinkLoadingText: { color: C.greenDark, fontSize: 11, fontWeight: '600' },
  downlinkError: { marginBottom: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, backgroundColor: C.redPale },
  downlinkErrorText: { flex: 1, color: C.red, fontSize: 11, lineHeight: 16 },
  downlinkSectionLabel: { color: '#67766B', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  downlinkInterfaceList: { marginTop: 9, overflow: 'hidden', borderWidth: 1, borderColor: '#E6ECE5', borderRadius: 16, backgroundColor: C.white },
  downlinkInterfaceRow: { minHeight: 58, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBF0EA' },
  downlinkInterfaceRowSelected: { backgroundColor: '#F2F7F1' },
  downlinkInterfaceIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#F1F4F0' },
  downlinkInterfaceIconSelected: { backgroundColor: '#E3F0E4' },
  downlinkInterfaceName: { flex: 1, color: C.ink, fontSize: 13, fontWeight: '600' },
  downlinkInterfaceNameSelected: { color: C.greenDark, fontWeight: '800' },
  downlinkEmpty: { marginTop: 9, padding: 15, borderWidth: 1, borderColor: C.line, borderRadius: 14, color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', backgroundColor: '#FAFBF9' },
  downlinkColorChoices: { marginTop: 9, flexDirection: 'row', gap: 7 },
  downlinkColorChoice: { minHeight: 45, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#E3E9E2', borderRadius: 13, backgroundColor: C.white },
  downlinkColorChoiceSelected: { borderColor: '#B9D2BC', backgroundColor: '#EAF3E9' },
  downlinkColorDot: { width: 9, height: 9, borderRadius: 5 },
  downlinkColorText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  downlinkColorTextSelected: { color: C.greenDark, fontWeight: '800' },
  downlinkHelper: { marginTop: 7, color: C.muted, fontSize: 10, lineHeight: 15 },
  downlinkValueInput: { minHeight: 54, marginTop: 9, borderColor: '#E1E8E0', borderRadius: 14, backgroundColor: '#FAFBF9' },
  downlinkFieldsRow: { marginTop: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  downlinkFieldColumn: { flex: 1, minWidth: 0 },
  downlinkPortShell: { minHeight: 48, marginTop: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E1E8E0', borderRadius: 13, backgroundColor: '#FAFBF9' },
  downlinkPortInput: { flex: 1, minWidth: 0, height: 46, padding: 0, color: C.ink, fontSize: 16, fontWeight: '700' },
  downlinkPortHint: { color: '#A0AAA2', fontSize: 9, fontWeight: '600' },
  downlinkClassRow: { minHeight: 48, marginTop: 8, padding: 4, flexDirection: 'row', gap: 3, borderWidth: 1, borderColor: '#E1E8E0', borderRadius: 13, backgroundColor: '#FAFBF9' },
  downlinkClassOption: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  downlinkClassOptionSelected: { backgroundColor: '#E5F0E5' },
  downlinkClassText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  downlinkClassTextSelected: { color: C.greenDark, fontWeight: '800' },
  downlinkKeySelector: { minHeight: 52, marginTop: 8, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E1E8E0', borderRadius: 14, backgroundColor: '#FAFBF9' },
  downlinkKeyIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.greenPale },
  downlinkKeyText: { flex: 1, color: C.ink, fontSize: 11, fontWeight: '600' },
  downlinkSafetyNote: { marginTop: 16, marginBottom: 5, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderColor: '#E5ECE4', borderRadius: 14, backgroundColor: '#F5F8F4' },
  downlinkSafetyText: { flex: 1, color: '#5D6D61', fontSize: 10, lineHeight: 15 },
  sheetActionButton: { flex: 1 },
  mapHeaderPremium: { height: 64, paddingLeft: 18, paddingRight: 10, backgroundColor: '#FFFFFFF5' },
  mapProviderLabel: { marginTop: 1, color: C.muted, fontSize: 10 },
});
