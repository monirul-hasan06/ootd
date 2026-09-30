import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CormorantGaramond_400Regular, CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    PanResponder,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* ────────────────────────── TYPES ────────────────────────── */

type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'bn';
type Gender = 'Male' | 'Female' | 'Other';
type Profession = 'Student' | 'Corporate' | 'Teacher' | 'Freelancer' | 'Casual';
type Profile = {
    nickname: string;
    gender: Gender;
    age: string;
    profession: Profession;
    theme: ThemeMode;
    language: Language;
    notificationsEnabled: boolean;
    notificationTime: string;
    notificationDays: number[];
};
type Weather = {
    city: string;
    temperature: number;
    code: number;
    wind: number;
    humidity: number;
    feelsLike: number;
    visibility: number;
    uv: number;
    pressure: number;
    dewPoint: number;
    updatedAt: Date;
};
type Theme = {
    background: string;
    text: string;
    muted: string;
    line: string;
    accent: string;
    card: string;
    cardAlt: string;
    gradient1: string;
    gradient2: string;
    font: string;
    bodyFont: string;
    highlight: string;
    overlay: string;
    navBg: string;
    inputBg: string;
    badge: string;
};

type Copy = Record<string, string>;
type Recommendation = { label: string; title: string; description: string; pieces: string };

/* ────────────────────────── CONSTANTS ────────────────────────── */

const STORAGE_KEY = '@ootd/profile';
const STORE_URL = 'https://canvix-store.netlify.app';
const AppActionsContext = createContext<{ toggleTheme: () => void; refreshHome: () => void }>({
    toggleTheme: () => undefined,
    refreshHome: () => undefined,
});
const defaultProfile: Profile = {
    nickname: '',
    gender: 'Other',
    age: '',
    profession: 'Casual',
    theme: 'light',
    language: 'en',
    notificationsEnabled: false,
    notificationTime: '08:00',
    notificationDays: [],
};
const fallbackWeather: Weather = {
    city: 'Dhaka',
    temperature: 28,
    code: 2,
    wind: 11,
    humidity: 87,
    feelsLike: 30,
    visibility: 4,
    uv: 0,
    pressure: 1003,
    dewPoint: 26,
    updatedAt: new Date(),
};
const weekdays = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'],
};
const genderOptions: Gender[] = ['Male', 'Female', 'Other'];
const professionOptions: Profession[] = ['Student', 'Corporate', 'Teacher', 'Freelancer', 'Casual'];

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const isValidNotificationTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

const normalizeProfile = (saved: Partial<Profile>): Profile => ({
    ...defaultProfile,
    ...saved,
    nickname: typeof saved.nickname === 'string' ? saved.nickname.trim() : '',
    language: saved.language === 'bn' ? 'bn' : 'en',
    notificationsEnabled: saved.notificationsEnabled === true,
    notificationTime:
        typeof saved.notificationTime === 'string' && isValidNotificationTime(saved.notificationTime)
            ? saved.notificationTime
            : defaultProfile.notificationTime,
    notificationDays: Array.isArray(saved.notificationDays)
        ? [...new Set(saved.notificationDays.filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 7))].sort()
        : [],
});

/* ────────────────────────── COPY / TRANSLATIONS ────────────────────────── */

const copyFor = (language: Language): Copy =>
    language === 'bn'
        ? {
              assistant: 'আপনার দৈনিক স্টাইল সহায়ক',
              languageTitle: 'আপনার ভাষা বেছে নিন',
              languageCopy: 'OOTD আপনার সঙ্গে যে ভাষায় কথা বলবে তা বেছে নিন।',
              nameTitle: 'আপনার নাম কী?',
              nameCopy: 'আপনার জন্য প্রতিদিনের এডিট আরও ব্যক্তিগত করে তুলুন।',
              ageTitle: 'আপনার বয়স কত?',
              ageCopy: 'আপনার বয়স ঐচ্ছিক, চাইলে পরে যোগ করতে পারেন।',
              genderTitle: 'আপনার স্টাইল কী?',
              genderCopy: 'আপনার পছন্দ অনুযায়ী OOTD-কে সাজান।',
              professionTitle: 'আপনার দিন কেমন কাটে?',
              professionCopy: 'আপনার বাস্তব জীবনের সঙ্গে মানানসই পোশাক বেছে নিন।',
              themeTitle: 'আপনার আবহ বেছে নিন।',
              themeCopy: 'আপনি পরে যেকোনো সময় এটি বদলাতে পারবেন।',
              remindersTitle: 'দিনের শুরুতে আপনার এডিট',
              remindersCopy: 'আবহাওয়া ও স্টাইল সাজেশন কখন পাবেন তা বেছে নিন।',
              nickname: 'আপনার ডাকনাম',
              age: 'বয়স (ঐচ্ছিক)',
              light: 'হালকা / প্রাণবন্ত',
              dark: 'গাঢ় / মনোযোগী',
              male: 'পুরুষ',
              female: 'নারী',
              other: 'অন্যান্য',
              student: 'শিক্ষার্থী',
              corporate: 'কর্পোরেট',
              teacher: 'শিক্ষক',
              freelancer: 'ফ্রিল্যান্সার',
              casual: 'ক্যাজুয়াল',
              notifications: 'দৈনিক OOTD রিমাইন্ডার',
              chooseDays: 'রিমাইন্ডারের দিন বেছে নিন',
              time: 'সময় (১২ ঘণ্টা, যেমন ০৮:৩০)',
              weatherIn: 'ডিগ্রি তাপমাত্রা',
              wind: 'বাতাস',
              humidity: 'আর্দ্রতা',
              feelsLike: 'অনুভূত হচ্ছে',
              visibility: 'দৃশ্যমানতা',
              uv: 'UV সূচক',
              pressure: 'চাপ',
              dewPoint: 'শিশির বিন্দু',
              updated: 'আপডেট হয়েছে',
              home: 'হোম',
              storeNav: 'স্টোর',
              continue: 'চালিয়ে যান',
              enter: 'OOTD-তে প্রবেশ করুন',
              current: 'আপনার শহরের বর্তমান আবহাওয়া',
              edit: 'প্রোফাইল সম্পাদনা করুন',
              morning: 'শুভ সকাল',
              daily: 'উজ্জ্বল, সহজ দিনের জন্য আপনার এডিট।',
              today: 'আজকের এডিট',
              store: 'OOTD স্টোর দেখুন',
              footer: 'আপনার আরাম, প্রেক্ষাপট এবং নিজস্বতার জন্য সাজানো।',
              details: 'লুকের বিবরণ',
              permissionDenied: 'অনুমতি দেওয়া হয়নি। সেটিংস থেকে নোটিফিকেশন চালু করতে পারেন।',
              ready: 'আপনার OOTD এডিট প্রস্তুত',
              try: 'আজ চেষ্টা করুন',
              reminderDaysRequired: 'রিমাইন্ডার চালু রাখতে অন্তত একটি দিন বেছে নিন।',
              reminderTimeInvalid: 'রিমাইন্ডারের সময় ১২ ঘণ্টায় দিন, যেমন 08:30।',
              ok: 'ঠিক আছে',
              theEdit: 'এডিট',
              reminderSub: 'আবহাওয়া + আপনার ব্যক্তিগত পোশাক এডিট',
              tagline: 'দৈনিক পোশাকের সঙ্গী',
              editLabel: 'সম্পাদনা',
              swipeHint: 'সোয়াইপ করুন',
              curatedPieces: 'নির্বাচিত পোশাক',
              weatherNote: 'আজকের আবহাওয়া অনুসারে সাজানো',
              exploreCollection: 'কালেকশন দেখুন',
          }
        : {
              assistant: 'YOUR DAILY STYLE ASSISTANT',
              languageTitle: 'Choose your language',
              languageCopy: 'Pick the language OOTD will use with you.',
              nameTitle: 'What should we call you?',
              nameCopy: 'Make your daily edit feel a little more personal.',
              ageTitle: 'How old are you?',
              ageCopy: 'Your age is optional. You can add it later.',
              genderTitle: 'What is your style?',
              genderCopy: 'Shape OOTD around the way you see yourself.',
              professionTitle: 'How do most days look?',
              professionCopy: 'Tell us what kind of life your edit should fit.',
              themeTitle: 'Choose your atmosphere.',
              themeCopy: 'You can change this anytime from your profile.',
              remindersTitle: 'Start the day in your edit.',
              remindersCopy: 'Choose when OOTD should bring you the weather and a suggestion.',
              nickname: 'Your name',
              age: 'Age (optional)',
              light: 'Light / airy',
              dark: 'Dark / focused',
              male: 'Male',
              female: 'Female',
              other: 'Other',
              student: 'Student',
              corporate: 'Corporate',
              teacher: 'Teacher',
              freelancer: 'Freelancer',
              casual: 'Casual',
              notifications: 'Daily OOTD reminders',
              chooseDays: 'Choose reminder days',
              time: 'Time (12-hour, e.g. 08:30)',
              weatherIn: 'degrees in',
              wind: 'Wind',
              humidity: 'Humidity',
              feelsLike: 'Feels like',
              visibility: 'Visibility',
              uv: 'UV index',
              pressure: 'Pressure',
              dewPoint: 'Dew point',
              updated: 'Updated',
              home: 'Home',
              storeNav: 'Store',
              continue: 'Continue',
              enter: 'Enter OOTD',
              current: 'CURRENTLY IN YOUR CITY',
              edit: 'Edit profile',
              morning: 'Good morning',
              daily: 'Your edit for a bright, easy day.',
              today: "Today's edit",
              store: 'Visit the OOTD store',
              footer: 'Curated around your comfort, context, and point of view.',
              details: 'Look details',
              permissionDenied: 'Permission was not granted. You can enable notifications in device settings.',
              ready: 'Your OOTD edit is ready',
              try: 'Try today',
              reminderDaysRequired: 'Choose at least one day to enable reminders.',
              reminderTimeInvalid: 'Enter a reminder time like 08:30.',
              ok: 'OK',
              theEdit: 'THE EDIT',
              reminderSub: 'Weather + a personalised outfit edit',
              tagline: 'Outfit of the Day',
              editLabel: 'Edit',
              swipeHint: 'Swipe to browse',
              curatedPieces: 'CURATED PIECES',
              weatherNote: 'Styled for today\u2019s conditions',
              exploreCollection: 'Explore Collection',
          };

/* ────────────────────────── RECOMMENDATIONS ────────────────────────── */

const recommendationsFor = (language: Language): Recommendation[] =>
    language === 'bn'
        ? [
              {
                  label: '০১ / ক্যাজুয়াল কমফোর্ট',
                  title: 'নরম কাঠামোর এডিট',
                  description: 'সারাদিনের জন্য আরামদায়ক, পরিপাটি একটি স্তর।',
                  pieces: 'কটন ওভারশার্ট  /  স্ট্রেইট ডেনিম  /  লেদার স্নিকার',
              },
              {
                  label: '০২ / স্মার্ট ফরমাল',
                  title: 'নীরব আত্মবিশ্বাস',
                  description: 'দিনের প্রয়োজনে পরিষ্কার রেখা আর আরামদায়ক স্তর।',
                  pieces: 'ফাইন নিট  /  টেইলর্ড ট্রাউজার  /  মিনিমাল লোফার',
              },
              {
                  label: '০৩ / ইজি উইকএন্ড',
                  title: 'খোলা হাওয়ার এডিট',
                  description: 'ছুটির সহজ পরিকল্পনার জন্য হালকা, স্বচ্ছন্দ সমন্বয়।',
                  pieces: 'লিনেন শার্ট  /  রিল্যাক্সড চিনো  /  ক্যানভাস ট্রেইনার',
              },
          ]
        : [
              {
                  label: '01 / CASUAL COMFORT',
                  title: 'The soft structure edit',
                  description: 'A relaxed layer with enough polish for a full day out.',
                  pieces: 'Cotton overshirt  /  straight denim  /  leather sneaker',
              },
              {
                  label: '02 / SMART FORMAL',
                  title: 'Quiet confidence',
                  description: 'Clean lines and breathable layers for when the day asks for more.',
                  pieces: 'Fine knit  /  tailored trouser  /  minimal loafer',
              },
              {
                  label: '03 / EASY WEEKEND',
                  title: 'The open-air edit',
                  description: 'A light, unhurried combination for plans that find you.',
                  pieces: 'Linen shirt  /  relaxed chino  /  canvas trainer',
              },
          ];

/* ────────────────────────── WEATHER UTIL ────────────────────────── */

const getWeatherDescription = (code: number, language: Language) => {
    const values =
        language === 'bn'
            ? [
                  'পরিষ্কার আকাশ  /  হালকা বাতাস',
                  'আংশিক মেঘলা  /  মৃদু বাতাস',
                  'কুয়াশাচ্ছন্ন আকাশ  /  শান্ত বাতাস',
                  'হালকা বৃষ্টি  /  একটি স্তর সঙ্গে রাখুন',
                  'তুষারপাত  /  উষ্ণ স্থর রাখুন',
                  'বৃষ্টির সম্ভাবনা  /  পরিবর্তনের জন্য প্রস্তুত থাকুন',
                  'অস্থির আকাশ  /  আবহাওয়া দেখে নিন',
              ]
            : [
                  'Clear skies  /  Light breeze',
                  'Partly cloudy  /  Mild breeze',
                  'Hazy skies  /  Still air',
                  'Light rain  /  Keep a layer close',
                  'Snowfall  /  Keep warm layers',
                  'Showers nearby  /  Dress for change',
                  'Unsettled skies  /  Check the forecast',
              ];
    if (code === 0) return values[0];
    if (code <= 3) return values[1];
    if (code <= 48) return values[2];
    if (code <= 67) return values[3];
    if (code <= 77) return values[4];
    if (code <= 82) return values[5];
    return values[6];
};

const getWeatherEmoji = (code: number) => {
    if (code === 0) return '☀';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫';
    if (code <= 67) return '🌧';
    if (code <= 77) return '❄';
    if (code <= 82) return '🌦';
    return '⛈';
};

/* ────────────────────────── PREMIUM THEME SYSTEM ────────────────────────── */

const themeFor = (profile: Profile): Theme => {
    const dark = profile.theme === 'dark';
    if (profile.gender === 'Female')
        return {
            background: dark ? '#1A1520' : '#FFFBFD',
            text: dark ? '#F8EDF4' : '#2D1F29',
            muted: dark ? '#B49AAD' : '#8E7485',
            line: dark ? '#3D2F3A' : '#F2E4EE',
            accent: dark ? '#6B3D5E' : '#FCEDF7',
            card: dark ? '#261E2B' : '#FFF5FA',
            cardAlt: dark ? '#2F2536' : '#FFF0F6',
            gradient1: dark ? '#2A1D30' : '#FFF5FA',
            gradient2: dark ? '#1A1520' : '#FFFBFD',
            font: 'CormorantGaramond_600SemiBold',
            bodyFont: 'DMSans_400Regular',
            highlight: dark ? '#D4A9C4' : '#E8B4D4',
            overlay: dark ? 'rgba(26, 21, 32, 0.92)' : 'rgba(255, 251, 253, 0.92)',
            navBg: dark ? 'rgba(26, 21, 32, 0.95)' : 'rgba(255, 251, 253, 0.95)',
            inputBg: dark ? '#261E2B' : '#FFF5FA',
            badge: dark ? '#8B5A7A' : '#F5D6EA',
        };
    if (profile.gender === 'Male')
        return {
            background: dark ? '#0E1820' : '#F7FAFC',
            text: dark ? '#E8F2F8' : '#0F2030',
            muted: dark ? '#8EAAB8' : '#5E7D8E',
            line: dark ? '#1E3345' : '#E0EDF4',
            accent: dark ? '#1E4A62' : '#E8F4FA',
            card: dark ? '#152838' : '#EFF7FC',
            cardAlt: dark ? '#1A3040' : '#E8F2F8',
            gradient1: dark ? '#152838' : '#EFF7FC',
            gradient2: dark ? '#0E1820' : '#F7FAFC',
            font: 'SpaceGrotesk_700Bold',
            bodyFont: 'SpaceGrotesk_400Regular',
            highlight: dark ? '#5AA0C4' : '#7BC4E8',
            overlay: dark ? 'rgba(14, 24, 32, 0.92)' : 'rgba(247, 250, 252, 0.92)',
            navBg: dark ? 'rgba(14, 24, 32, 0.95)' : 'rgba(247, 250, 252, 0.95)',
            inputBg: dark ? '#152838' : '#EFF7FC',
            badge: dark ? '#2A6080' : '#C8E2F0',
        };
    return {
        background: dark ? '#141C18' : '#F9FCF6',
        text: dark ? '#E6F2E0' : '#182818',
        muted: dark ? '#94B09A' : '#5A7862',
        line: dark ? '#2A3E30' : '#E2EDE2',
        accent: dark ? '#2E5A3E' : '#E8F5EB',
        card: dark ? '#1C2E24' : '#F0F8F2',
        cardAlt: dark ? '#223628' : '#E8F5EB',
        gradient1: dark ? '#1C2E24' : '#F0F8F2',
        gradient2: dark ? '#141C18' : '#F9FCF6',
        font: 'DMSans_700Bold',
        bodyFont: 'DMSans_400Regular',
        highlight: dark ? '#6BC480' : '#8AD4A0',
        overlay: dark ? 'rgba(20, 28, 24, 0.92)' : 'rgba(249, 252, 246, 0.92)',
        navBg: dark ? 'rgba(20, 28, 24, 0.95)' : 'rgba(249, 252, 246, 0.95)',
        inputBg: dark ? '#1C2E24' : '#F0F8F2',
        badge: dark ? '#3E7A50' : '#C8E8D0',
    };
};

/* ────────────────────────── GREETING ────────────────────────── */

const greetingFor = (language: Language, date = new Date()) => {
    const hour = date.getHours();
    if (language === 'bn') return hour < 12 ? 'শুভ সকাল' : hour < 18 ? 'শুভ বিকেল' : 'শুভ সন্ধ্যা';
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

/* ────────────────────────── NOTIFICATIONS ────────────────────────── */

const scheduleNotifications = async (profile: Profile, weather: Weather) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!profile.notificationsEnabled || profile.notificationDays.length === 0) return;
    if (!isValidNotificationTime(profile.notificationTime)) return;
    const [hourText, minuteText] = profile.notificationTime.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const copy = copyFor(profile.language);
    const theme = themeFor(profile);
    const recommendations = recommendationsFor(profile.language);
    const weatherText =
        profile.language === 'bn'
            ? `${weather.city}-তে ${weather.temperature}°।`
            : `${weather.temperature}° ${copy.weatherIn} ${weather.city}.`;
    if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('ootd-daily-edit', {
            name: profile.language === 'bn' ? 'দৈনিক OOTD এডিট' : 'Daily outfit edit',
            description: copy.daily,
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
            lightColor: theme.accent,
        });
    await Promise.all(
        profile.notificationDays.map((weekday) =>
            Notifications.scheduleNotificationAsync({
                content: {
                    title: copy.ready,
                    body: `${weatherText} ${getWeatherDescription(weather.code, profile.language)}. ${copy.try} ${recommendations[0].title}.`,
                    color: theme.accent,
                    sound: 'default',
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                    weekday,
                    hour,
                    minute,
                    channelId: 'ootd-daily-edit',
                },
            })
        )
    );
};

/* ────────────────────────── REUSABLE ANIMATED HOOKS ────────────────────────── */

function useFadeIn(delay = 0, duration = 500) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(18)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
            Animated.timing(translateY, { toValue: 0, duration, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        ]).start();
    }, []);
    return { opacity, transform: [{ translateY }] };
}

function usePulse(min = 0.92, max = 1, duration = 1800) {
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: min, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                Animated.timing(scale, { toValue: max, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            ])
        ).start();
    }, []);
    return { transform: [{ scale }] };
}

/* ══════════════════════════ ROOT APP ══════════════════════════ */

export default function App() {
    const [fontsLoaded] = useFonts({
        SpaceGrotesk_400Regular,
        SpaceGrotesk_600SemiBold,
        SpaceGrotesk_700Bold,
        CormorantGaramond_400Regular,
        CormorantGaramond_600SemiBold,
        DMSans_400Regular,
        DMSans_600SemiBold,
        DMSans_700Bold,
    });
    const [profile, setProfile] = useState(defaultProfile);
    const [draft, setDraft] = useState(defaultProfile);
    const [ready, setReady] = useState(false);
    const [editing, setEditing] = useState(false);
    const [screen, setScreen] = useState<'home' | 'store'>('home');
    const [step, setStep] = useState(0);
    const [weather, setWeather] = useState(fallbackWeather);
    const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const splashTimer = setTimeout(() => setReady(true), 1200);
        AsyncStorage.getItem(STORAGE_KEY)
            .then((stored) => {
                if (stored) {
                    const saved = normalizeProfile(JSON.parse(stored) as Partial<Profile>);
                    setProfile(saved);
                    setDraft(saved);
                }
            })
            .catch(() => undefined);
        return () => clearTimeout(splashTimer);
    }, []);

    const reloadWeather = useCallback(async () => {
        if (isRefreshingWeather) return;
        setIsRefreshingWeather(true);
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') return;
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = position.coords;
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,visibility,uv_index,surface_pressure,dew_point_2m&temperature_unit=celsius`
            );
            if (!response.ok) return;
            const data = (await response.json()) as {
                current?: {
                    temperature_2m?: number;
                    weather_code?: number;
                    wind_speed_10m?: number;
                    relative_humidity_2m?: number;
                    apparent_temperature?: number;
                    visibility?: number;
                    uv_index?: number;
                    surface_pressure?: number;
                    dew_point_2m?: number;
                    time?: string;
                };
            };
            const address = await Location.reverseGeocodeAsync({ latitude, longitude });
            const place = address[0];
            const currentWeather = data.current;
            if (currentWeather?.temperature_2m != null && currentWeather.weather_code != null)
                setWeather({
                    city: place?.city || place?.district || place?.region || fallbackWeather.city,
                    temperature: Math.round(currentWeather.temperature_2m),
                    code: currentWeather.weather_code,
                    wind: Math.round(currentWeather.wind_speed_10m || 0),
                    humidity: Math.round(currentWeather.relative_humidity_2m || 0),
                    feelsLike: Math.round(currentWeather.apparent_temperature || currentWeather.temperature_2m),
                    visibility: Math.round((currentWeather.visibility || 0) / 1000),
                    uv: Math.round(currentWeather.uv_index || 0),
                    pressure: Math.round(currentWeather.surface_pressure || 0),
                    dewPoint: Math.round(currentWeather.dew_point_2m || 0),
                    updatedAt: currentWeather.time ? new Date(currentWeather.time) : new Date(),
                });
        } catch {
            /* fallback remains usable */
        } finally {
            setIsRefreshingWeather(false);
        }
    }, [isRefreshingWeather]);

    useEffect(() => {
        if (ready && !editing) reloadWeather();
    }, [ready, editing]);
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!ready || editing) return;
        const timer = setInterval(() => reloadWeather(), 15 * 60_000);
        return () => clearInterval(timer);
    }, [ready, editing]);
    useEffect(() => {
        if (ready) scheduleNotifications(profile, weather).catch(() => undefined);
    }, [ready, profile.notificationsEnabled, profile.notificationTime, profile.notificationDays, profile.language, profile.gender, profile.theme, weather]);

    const save = async (next: Profile) => {
        const normalized = normalizeProfile(next);
        const copy = copyFor(normalized.language);
        if (normalized.notificationsEnabled && normalized.notificationDays.length === 0) {
            normalized.notificationsEnabled = false;
            Alert.alert(copy.reminderDaysRequired, undefined, [{ text: copy.ok }]);
        }
        if (normalized.notificationsEnabled && !isValidNotificationTime(next.notificationTime)) {
            normalized.notificationsEnabled = false;
            Alert.alert(copy.reminderTimeInvalid, undefined, [{ text: copy.ok }]);
        }
        if (normalized.notificationsEnabled) {
            if (Platform.OS === 'android')
                await Notifications.setNotificationChannelAsync('ootd-daily-edit', {
                    name: normalized.language === 'bn' ? 'দৈনিক OOTD এডিট' : 'Daily outfit edit',
                    description: copy.daily,
                    importance: Notifications.AndroidImportance.DEFAULT,
                    sound: 'default',
                    lightColor: themeFor(normalized).accent,
                });
            const permission = await Notifications.getPermissionsAsync();
            const result = permission.granted ? permission : await Notifications.requestPermissionsAsync();
            if (!result.granted) {
                normalized.notificationsEnabled = false;
                Alert.alert(copy.permissionDenied, undefined, [{ text: copy.ok }]);
            }
        }
        setProfile(normalized);
        setDraft(normalized);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    };

    const toggleTheme = () => {
        const next = { ...profile, theme: profile.theme === 'dark' ? ('light' as ThemeMode) : ('dark' as ThemeMode) };
        setProfile(next);
        setDraft(next);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
    };

    const activeProfile = editing ? draft : profile;
    const theme = themeFor(activeProfile);
    const copy = { ...copyFor(activeProfile.language), morning: greetingFor(activeProfile.language, now) };

    if (!ready || !fontsLoaded)
        return (
            <SafeAreaProvider>
                <LuxurySplash theme={theme} dark={activeProfile.theme === 'dark'} />
            </SafeAreaProvider>
        );
    if (editing)
        return (
            <SafeAreaProvider>
                <Onboarding
                    theme={theme}
                    copy={copy}
                    draft={draft}
                    step={step}
                    setDraft={setDraft}
                    onBack={() => setStep(Math.max(0, step - 1))}
                    onNext={async () => {
                        if (step < 6) setStep(step + 1);
                        else {
                            await save(draft);
                            setEditing(false);
                            setStep(0);
                        }
                    }}
                />
            </SafeAreaProvider>
        );
    return (
        <SafeAreaProvider>
            <AppActionsContext.Provider
                value={{
                    toggleTheme,
                    refreshHome: () => {
                        setScreen('home');
                        reloadWeather();
                    },
                }}
            >
                <ProductionHome
                    profile={profile}
                    theme={theme}
                    copy={copy}
                    weather={weather}
                    screen={screen}
                    refreshing={isRefreshingWeather}
                    onRefreshWeather={reloadWeather}
                    onNavigate={setScreen}
                    onEdit={() => {
                        setDraft(profile);
                        setStep(0);
                        setEditing(true);
                    }}
                />
            </AppActionsContext.Provider>
        </SafeAreaProvider>
    );
}

/* ══════════════════════════ LUXURY SPLASH ══════════════════════════ */

function LuxurySplash({ theme, dark }: { theme: Theme; dark: boolean }) {
    const logoFade = useRef(new Animated.Value(0)).current;
    const tagFade = useRef(new Animated.Value(0)).current;
    const lineWidth = useRef(new Animated.Value(0)).current;
    const pulse = usePulse(0.96, 1.0, 2200);

    useEffect(() => {
        Animated.sequence([
            Animated.timing(logoFade, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
            Animated.parallel([
                Animated.timing(tagFade, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(lineWidth, { toValue: 1, duration: 700, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
            ]),
        ]).start();
    }, []);

    const lineScaleX = lineWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    return (
        <SafeAreaView style={[splash.container, { backgroundColor: theme.background }]}>
            <StatusBar style={dark ? 'light' : 'dark'} />
            <View style={splash.content}>
                <Animated.View style={[splash.logoWrap, { opacity: logoFade }, pulse]}>
                    <Text style={[splash.logo, { color: theme.text, fontFamily: theme.font }]}>OOTD</Text>
                </Animated.View>
                <Animated.View style={[splash.lineContainer, { transform: [{ scaleX: lineScaleX }] }]}>
                    <View style={[splash.line, { backgroundColor: theme.highlight }]} />
                </Animated.View>
                <Animated.View style={{ opacity: tagFade }}>
                    <Text style={[splash.tagline, { color: theme.muted, fontFamily: theme.bodyFont }]}>OUTFIT OF THE DAY</Text>
                </Animated.View>
            </View>
            <Text style={[splash.byline, { color: theme.line, fontFamily: theme.bodyFont }]}>by canvix</Text>
        </SafeAreaView>
    );
}

const splash = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { alignItems: 'center' },
    logoWrap: { marginBottom: 12 },
    logo: { fontSize: 56, letterSpacing: 12, fontWeight: '800' },
    lineContainer: { marginBottom: 16 },
    line: { height: 2, width: 60, borderRadius: 1 },
    tagline: { fontSize: 11, letterSpacing: 4, fontWeight: '600' },
    byline: { position: 'absolute', bottom: 44, fontSize: 10, letterSpacing: 2, fontWeight: '600' },
});

/* ══════════════════════════ PRODUCTION HOME ══════════════════════════ */

function ProductionHome({
    profile,
    theme,
    copy,
    weather,
    screen,
    refreshing,
    onRefreshWeather,
    onNavigate,
    onEdit,
}: {
    profile: Profile;
    theme: Theme;
    copy: Copy;
    weather: Weather;
    screen: 'home' | 'store';
    refreshing: boolean;
    onRefreshWeather: () => Promise<void>;
    onNavigate: (screen: 'home' | 'store') => void;
    onEdit: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [index, setIndex] = useState(0);
    const [details, setDetails] = useState(false);
    const position = useRef(new Animated.Value(0)).current;
    const recommendations = recommendationsFor(profile.language);
    const item = recommendations[index];

    const rotate = position.interpolate({
        inputRange: [-280, 0, 280],
        outputRange: ['-3.5deg', '0deg', '3.5deg'],
        extrapolate: 'clamp',
    });

    const scale = position.interpolate({
        inputRange: [-280, 0, 280],
        outputRange: [0.97, 1, 0.97],
        extrapolate: 'clamp',
    });

    const nextCardScale = position.interpolate({
        inputRange: [-280, 0, 280],
        outputRange: [1, 0.93, 1],
        extrapolate: 'clamp',
    });

    const nextCardOpacity = position.interpolate({
        inputRange: [-280, 0, 280],
        outputRange: [0.8, 0.35, 0.8],
        extrapolate: 'clamp',
    });

    const move = (direction: number) => {
        const next = Math.min(recommendations.length - 1, Math.max(0, index + direction));
        if (next === index) return;
        Animated.sequence([
            Animated.timing(position, { toValue: direction * -340, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
            Animated.spring(position, { toValue: 0, speed: 18, bounciness: 5, useNativeDriver: true }),
        ]).start();
        setIndex(next);
    };

    const responder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
                onPanResponderMove: (_, gesture) => position.setValue(gesture.dx),
                onPanResponderRelease: (_, gesture) => {
                    if (gesture.dx < -55) move(1);
                    else if (gesture.dx > 55) move(-1);
                    else Animated.spring(position, { toValue: 0, speed: 20, bounciness: 8, useNativeDriver: true }).start();
                },
            }),
        [index, recommendations.length]
    );

    const weatherTime = weather.updatedAt.toLocaleTimeString(profile.language === 'bn' ? 'bn-BD' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
    const piecesList = item.pieces.split('  /  ');

    const heroFade = useFadeIn(0, 550);
    const weatherFade = useFadeIn(150, 500);
    const cardFade = useFadeIn(300, 500);

    if (screen === 'store')
        return (
            <SafeAreaView style={[s.safeArea, { backgroundColor: theme.background }]}>
                <StatusBar style={profile.theme === 'dark' ? 'light' : 'dark'} />
                <ScrollView contentContainerStyle={[s.container, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
                    <Brand theme={theme} profile={profile} copy={copy} />
                    <StorePage theme={theme} copy={copy} profile={profile} />
                </ScrollView>
                <FloatingNav active={screen} theme={theme} copy={copy} onNavigate={onNavigate} onEdit={onEdit} />
            </SafeAreaView>
        );

    return (
        <SafeAreaView style={[s.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar style={profile.theme === 'dark' ? 'light' : 'dark'} />
            <ScrollView
                contentContainerStyle={[s.container, { paddingBottom: 110 + insets.bottom }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshWeather} tintColor={theme.text} colors={[theme.text]} />}
                showsVerticalScrollIndicator={false}
            >
                <Brand theme={theme} profile={profile} copy={copy} />

                {/* ── Editorial Hero ── */}
                <Animated.View style={[s.heroBlock, heroFade]}>
                    <View style={[s.heroAccentLine, { backgroundColor: theme.highlight }]} />
                    <Text style={[s.eyebrow, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.assistant}</Text>
                    <Text style={[s.heroTitle, { color: theme.text, fontFamily: theme.font }]}>
                        {copy.morning},{'\n'}
                        {profile.nickname}.
                    </Text>
                    <Text style={[s.heroSub, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.daily}</Text>
                </Animated.View>

                {/* ── Weather Panel ── */}
                <Animated.View style={[s.weatherCard, { backgroundColor: theme.card, borderColor: theme.line }, weatherFade]}>
                    <View style={s.weatherCardInner}>
                        {/* Left side */}
                        <View style={s.weatherLeft}>
                            <Text style={[s.weatherEyebrow, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.current}</Text>
                            <View style={s.weatherCityRow}>
                                <Text style={[s.weatherEmoji]}>{getWeatherEmoji(weather.code)}</Text>
                                <Text style={[s.weatherCity, { color: theme.text, fontFamily: theme.font }]}>{weather.city}</Text>
                            </View>
                            <Text style={[s.weatherDesc, { color: theme.muted, fontFamily: theme.bodyFont }]}>
                                {getWeatherDescription(weather.code, profile.language)}
                            </Text>
                        </View>
                        {/* Right side */}
                        <View style={s.weatherRight}>
                            <Text style={[s.weatherTemp, { color: theme.text, fontFamily: theme.font }]}>{weather.temperature}°</Text>
                            <Text style={[s.weatherUpdated, { color: theme.muted, fontFamily: theme.bodyFont }]}>
                                {copy.updated} {weatherTime}
                            </Text>
                        </View>
                    </View>

                    {/* Metric Strip */}
                    <View style={[s.metricStrip, { borderTopColor: theme.line }]}>
                        <WeatherMetric label={copy.feelsLike} value={`${weather.feelsLike}°`} theme={theme} />
                        <View style={[s.metricDivider, { backgroundColor: theme.line }]} />
                        <WeatherMetric label={copy.wind} value={`${weather.wind} km/h`} theme={theme} />
                        <View style={[s.metricDivider, { backgroundColor: theme.line }]} />
                        <WeatherMetric label={copy.humidity} value={`${weather.humidity}%`} theme={theme} />
                        <View style={[s.metricDivider, { backgroundColor: theme.line }]} />
                        <WeatherMetric label={copy.uv} value={`${weather.uv}`} theme={theme} />
                    </View>

                    {/* Extended Metrics */}
                    <View style={s.metricRowExtended}>
                        <WeatherMetricPill label={copy.visibility} value={`${weather.visibility} km`} theme={theme} />
                        <WeatherMetricPill label={copy.pressure} value={`${weather.pressure} mb`} theme={theme} />
                        <WeatherMetricPill label={copy.dewPoint} value={`${weather.dewPoint}°C`} theme={theme} />
                    </View>

                    {/* Refresh */}
                    <Pressable
                        accessibilityLabel="Refresh weather"
                        onPress={onRefreshWeather}
                        style={({ pressed }) => [s.refreshPill, { backgroundColor: theme.accent, borderColor: theme.line, opacity: pressed || refreshing ? 0.5 : 1 }]}
                    >
                        <Ionicons name={refreshing ? 'hourglass-outline' : 'refresh'} size={14} color={theme.text} />
                        <Text style={[s.refreshText, { color: theme.text, fontFamily: theme.bodyFont }]}>
                            {refreshing ? '…' : copy.weatherNote}
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* ── Section Header ── */}
                <Animated.View style={[s.sectionHeader, cardFade]}>
                    <View style={s.sectionLeft}>
                        <Text style={[s.sectionTitle, { color: theme.text, fontFamily: theme.font }]}>{copy.today}</Text>
                        <View style={[s.sectionBadge, { backgroundColor: theme.badge }]}>
                            <Text style={[s.sectionBadgeText, { color: theme.text, fontFamily: theme.bodyFont }]}>
                                {index + 1}/{recommendations.length}
                            </Text>
                        </View>
                    </View>
                    <View style={s.swipeHint}>
                        <Ionicons name="swap-horizontal" size={12} color={theme.muted} />
                        <Text style={[s.swipeText, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.swipeHint}</Text>
                    </View>
                </Animated.View>

                {/* ── Card Stack ── */}
                <Animated.View style={[s.deckWrap, cardFade]}>
                    {/* Shadow card behind */}
                    <Animated.View
                        style={[
                            s.card,
                            s.deckBehind,
                            {
                                backgroundColor: theme.cardAlt,
                                borderColor: theme.line,
                                opacity: nextCardOpacity,
                                transform: [{ scale: nextCardScale }],
                            },
                        ]}
                    />
                    {/* Active card */}
                    <Animated.View
                        {...responder.panHandlers}
                        style={[
                            s.card,
                            s.deckActive,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.line,
                                transform: [{ translateX: position }, { rotate }, { scale }],
                            },
                        ]}
                    >
                        {/* Category line */}
                        <View style={s.cardTopRow}>
                            <View style={[s.catBadge, { backgroundColor: theme.accent, borderColor: theme.line }]}>
                                <Ionicons name="sparkles-sharp" size={10} color={theme.highlight} style={{ marginRight: 5 }} />
                                <Text style={[s.catLabel, { color: theme.text, fontFamily: theme.bodyFont }]}>{item.label}</Text>
                            </View>
                            <Pressable onPress={() => setDetails(true)} hitSlop={12}>
                                <Ionicons name="expand-outline" size={20} color={theme.muted} />
                            </Pressable>
                        </View>

                        {/* Content */}
                        <Text style={[s.cardTitle, { color: theme.text, fontFamily: theme.font }]}>{item.title}</Text>
                        <Text style={[s.cardDesc, { color: theme.muted, fontFamily: theme.bodyFont }]}>{item.description}</Text>

                        {/* Pieces */}
                        <View style={[s.piecesBlock, { borderTopColor: theme.line }]}>
                            <Text style={[s.piecesLabel, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.curatedPieces}</Text>
                            <View style={s.piecesRow}>
                                {piecesList.map((piece, i) => (
                                    <View key={i} style={[s.pieceChip, { backgroundColor: theme.background, borderColor: theme.line }]}>
                                        <View style={[s.pieceDot, { backgroundColor: theme.highlight }]} />
                                        <Text style={[s.pieceText, { color: theme.text, fontFamily: theme.bodyFont }]}>{piece}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Card footer */}
                        <View style={s.cardFooter}>
                            <Pressable
                                onPress={() => setDetails(true)}
                                style={({ pressed }) => [s.cardCta, { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 }]}
                            >
                                <Text style={[s.cardCtaText, { color: theme.background, fontFamily: theme.bodyFont }]}>{copy.details}</Text>
                                <Ionicons name="arrow-forward" size={14} color={theme.background} style={{ marginLeft: 8 }} />
                            </Pressable>
                            <View style={s.gestureIcons}>
                                <Ionicons name="chevron-back" size={12} color={theme.muted} />
                                <Ionicons name="hand-left-outline" size={13} color={theme.muted} style={{ marginHorizontal: 3 }} />
                                <Ionicons name="chevron-forward" size={12} color={theme.muted} />
                            </View>
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* ── Carousel Nav ── */}
                <View style={s.navControls}>
                    <Pressable
                        onPress={() => move(-1)}
                        accessibilityLabel="Previous look"
                        style={({ pressed }) => [
                            s.navCircle,
                            { borderColor: theme.line, backgroundColor: theme.card, opacity: pressed ? 0.6 : index === 0 ? 0.3 : 1 },
                        ]}
                    >
                        <Ionicons name="chevron-back" size={16} color={theme.text} />
                    </Pressable>
                    <View style={s.dotsRow}>
                        {recommendations.map((_, di) => (
                            <View
                                key={di}
                                style={[
                                    s.dot,
                                    di === index ? [s.dotActive, { backgroundColor: theme.text }] : { backgroundColor: theme.line },
                                ]}
                            />
                        ))}
                    </View>
                    <Pressable
                        onPress={() => move(1)}
                        accessibilityLabel="Next look"
                        style={({ pressed }) => [
                            s.navCircle,
                            {
                                borderColor: theme.line,
                                backgroundColor: theme.card,
                                opacity: pressed ? 0.6 : index === recommendations.length - 1 ? 0.3 : 1,
                            },
                        ]}
                    >
                        <Ionicons name="chevron-forward" size={16} color={theme.text} />
                    </Pressable>
                </View>

                {/* ── Footer tagline ── */}
                <View style={s.footerWrap}>
                    <View style={[s.footerLine, { backgroundColor: theme.line }]} />
                    <Text style={[s.footerText, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.footer}</Text>
                </View>
            </ScrollView>
            <FloatingNav active={screen} theme={theme} copy={copy} onNavigate={onNavigate} onEdit={onEdit} />
            {details && <LookDetails item={item} theme={theme} copy={copy} onClose={() => setDetails(false)} />}
        </SafeAreaView>
    );
}

/* ── Weather Metric (inline) ── */
function WeatherMetric({ label, value, theme }: { label: string; value: string; theme: Theme }) {
    return (
        <View style={s.metricItem}>
            <Text style={[s.metricVal, { color: theme.text, fontFamily: theme.font }]}>{value}</Text>
            <Text style={[s.metricLbl, { color: theme.muted, fontFamily: theme.bodyFont }]}>{label}</Text>
        </View>
    );
}

function WeatherMetricPill({ label, value, theme }: { label: string; value: string; theme: Theme }) {
    return (
        <View style={[s.metricPill, { backgroundColor: theme.accent, borderColor: theme.line }]}>
            <Text style={[s.metricPillVal, { color: theme.text, fontFamily: theme.bodyFont }]}>{value}</Text>
            <Text style={[s.metricPillLbl, { color: theme.muted, fontFamily: theme.bodyFont }]}>{label}</Text>
        </View>
    );
}

/* ══════════════════════════ BRAND HEADER ══════════════════════════ */

function Brand({ theme, profile, copy }: { theme: Theme; profile: Profile; copy: Copy }) {
    const { toggleTheme, refreshHome } = useContext(AppActionsContext);
    return (
        <View style={[s.brandRow, { paddingTop: 22 }]}>
            <Pressable accessibilityLabel="Refresh home" onPress={refreshHome}>
                <View>
                    <Text style={[s.brandMark, { color: theme.text, fontFamily: theme.font }]}>OOTD</Text>
                    <View style={s.brandTagRow}>
                        <View style={[s.brandDot, { backgroundColor: theme.highlight }]} />
                        <Text style={[s.brandTag, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.tagline}</Text>
                    </View>
                </View>
            </Pressable>
            <Pressable
                accessibilityLabel="Toggle color theme"
                onPress={toggleTheme}
                style={({ pressed }) => [
                    s.themeToggle,
                    { borderColor: theme.line, backgroundColor: theme.card, opacity: pressed ? 0.65 : 1 },
                ]}
            >
                <Text style={[s.themeIcon, { color: theme.text }]}>{profile.theme === 'dark' ? '☾' : '☀'}</Text>
            </Pressable>
        </View>
    );
}

/* ══════════════════════════ FLOATING BOTTOM NAV ══════════════════════════ */

function FloatingNav({
    active,
    theme,
    copy,
    onNavigate,
    onEdit,
}: {
    active: 'home' | 'store';
    theme: Theme;
    copy: Copy;
    onNavigate: (screen: 'home' | 'store') => void;
    onEdit: () => void;
}) {
    const insets = useSafeAreaInsets();
    const homeActive = active === 'home';
    const storeActive = active === 'store';
    return (
        <View style={[s.floatingNav, { backgroundColor: theme.navBg, borderColor: theme.line, marginBottom: Math.max(insets.bottom, 8) }]}>
            <Pressable
                onPress={() => onNavigate('home')}
                style={({ pressed }) => [s.navTab, homeActive && [s.navTabActive, { backgroundColor: theme.accent }], pressed && { opacity: 0.7 }]}
                accessibilityRole="tab"
                accessibilityLabel={copy.home}
                accessibilityState={{ selected: homeActive }}
            >
                <Ionicons name={homeActive ? 'home' : 'home-outline'} size={20} color={homeActive ? theme.text : theme.muted} />
                <Text style={[s.navLabel, { color: homeActive ? theme.text : theme.muted, fontFamily: theme.bodyFont }]}>{copy.home}</Text>
            </Pressable>
            <Pressable
                onPress={() => onNavigate('store')}
                style={({ pressed }) => [s.navTab, storeActive && [s.navTabActive, { backgroundColor: theme.accent }], pressed && { opacity: 0.7 }]}
                accessibilityRole="tab"
                accessibilityLabel={copy.storeNav}
                accessibilityState={{ selected: storeActive }}
            >
                <Ionicons name={storeActive ? 'bag' : 'bag-outline'} size={20} color={storeActive ? theme.text : theme.muted} />
                <Text style={[s.navLabel, { color: storeActive ? theme.text : theme.muted, fontFamily: theme.bodyFont }]}>{copy.storeNav}</Text>
            </Pressable>
            <Pressable
                onPress={onEdit}
                style={({ pressed }) => [s.navTab, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={copy.editLabel}
            >
                <Ionicons name="create-outline" size={20} color={theme.muted} />
                <Text style={[s.navLabel, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.editLabel}</Text>
            </Pressable>
        </View>
    );
}

/* ══════════════════════════ STORE PAGE ══════════════════════════ */

function StorePage({ theme, copy, profile }: { theme: Theme; copy: Copy; profile: Profile }) {
    const storeFade = useFadeIn(0, 600);
    return (
        <Animated.View style={[s.storeWrap, storeFade]}>
            <View style={[s.heroAccentLine, { backgroundColor: theme.highlight, marginBottom: 14 }]} />
            <Text style={[s.eyebrow, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.storeNav}</Text>
            <Text style={[s.storeTitle, { color: theme.text, fontFamily: theme.font }]}>{copy.store}</Text>
            <Text style={[s.storeSub, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.footer}</Text>

            {/* Store cards */}
            {recommendationsFor(profile.language).map((rec, i) => (
                <View key={i} style={[s.storeCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
                    <View style={[s.storeCardAccent, { backgroundColor: theme.highlight }]} />
                    <View style={s.storeCardContent}>
                        <Text style={[s.storeCardLabel, { color: theme.muted, fontFamily: theme.bodyFont }]}>{rec.label}</Text>
                        <Text style={[s.storeCardTitle, { color: theme.text, fontFamily: theme.font }]}>{rec.title}</Text>
                        <Text style={[s.storeCardDesc, { color: theme.muted, fontFamily: theme.bodyFont }]}>{rec.description}</Text>
                    </View>
                </View>
            ))}

            <Pressable
                onPress={() => Linking.openURL(STORE_URL)}
                style={({ pressed }) => [s.storeCta, { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 }]}
            >
                <Text style={[s.storeCtaText, { color: theme.background, fontFamily: theme.bodyFont }]}>{copy.exploreCollection}</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.background} style={{ marginLeft: 8 }} />
            </Pressable>
        </Animated.View>
    );
}

/* ══════════════════════════ LOOK DETAILS MODAL ══════════════════════════ */

function LookDetails({ item, theme, copy, onClose }: { item: Recommendation; theme: Theme; copy: Copy; onClose: () => void }) {
    const insets = useSafeAreaInsets();
    const piecesList = item.pieces.split('  /  ');
    const sheetFade = useRef(new Animated.Value(0)).current;
    const sheetSlide = useRef(new Animated.Value(420)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(sheetFade, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(sheetSlide, { toValue: 0, speed: 14, bounciness: 4, useNativeDriver: true }),
        ]).start();
    }, []);

    const dismiss = () => {
        Animated.parallel([
            Animated.timing(sheetFade, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(sheetSlide, { toValue: 420, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        ]).start(() => onClose());
    };

    return (
        <Animated.View style={[s.modalOverlay, { opacity: sheetFade }]}>
            <Pressable style={s.modalDismiss} onPress={dismiss} />
            <Animated.View
                style={[
                    s.detailSheet,
                    { backgroundColor: theme.card, borderColor: theme.line, paddingBottom: Math.max(32, insets.bottom + 32), transform: [{ translateY: sheetSlide }] },
                ]}
            >
                <View style={[s.sheetHandle, { backgroundColor: theme.line }]} />

                {/* Header */}
                <View style={s.sheetHeaderRow}>
                    <View style={[s.catBadge, { backgroundColor: theme.accent, borderColor: theme.line }]}>
                        <Ionicons name="sparkles-sharp" size={10} color={theme.highlight} style={{ marginRight: 5 }} />
                        <Text style={[s.catLabel, { color: theme.text, fontFamily: theme.bodyFont }]}>{item.label}</Text>
                    </View>
                    <Pressable onPress={dismiss} accessibilityLabel="Close details" hitSlop={14} style={[s.sheetClose, { backgroundColor: theme.accent }]}>
                        <Ionicons name="close" size={18} color={theme.text} />
                    </Pressable>
                </View>

                <Text style={[s.sheetTitle, { color: theme.text, fontFamily: theme.font }]}>{item.title}</Text>
                <Text style={[s.sheetDesc, { color: theme.muted, fontFamily: theme.bodyFont }]}>{item.description}</Text>

                {/* Pieces */}
                <View style={[s.sheetPiecesBox, { borderColor: theme.line, backgroundColor: theme.background }]}>
                    <Text style={[s.piecesLabel, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.curatedPieces}</Text>
                    <View style={s.piecesRow}>
                        {piecesList.map((piece, i) => (
                            <View key={i} style={[s.pieceChip, { backgroundColor: theme.card, borderColor: theme.line }]}>
                                <Ionicons name="shirt-outline" size={11} color={theme.highlight} style={{ marginRight: 5 }} />
                                <Text style={[s.pieceText, { color: theme.text, fontFamily: theme.bodyFont }]}>{piece}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* CTA */}
                <Pressable onPress={dismiss} style={({ pressed }) => [s.sheetCta, { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 }]}>
                    <Text style={[s.sheetCtaText, { color: theme.background, fontFamily: theme.bodyFont }]}>{copy.today}</Text>
                    <Ionicons name="checkmark" size={18} color={theme.background} style={{ marginLeft: 8 }} />
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

/* ══════════════════════════ ONBOARDING ══════════════════════════ */

function Onboarding({
    theme,
    copy,
    draft,
    step,
    setDraft,
    onBack,
    onNext,
}: {
    theme: Theme;
    copy: Copy;
    draft: Profile;
    step: number;
    setDraft: (profile: Profile) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const lift = useRef(new Animated.Value(0)).current;
    const stepFade = useRef(new Animated.Value(1)).current;
    const stepSlide = useRef(new Animated.Value(0)).current;
    const prevStep = useRef(step);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const show = Keyboard.addListener(showEvent, () => Animated.timing(lift, { toValue: -72, duration: 240, useNativeDriver: true }).start());
        const hide = Keyboard.addListener(hideEvent, () => Animated.timing(lift, { toValue: 0, duration: 220, useNativeDriver: true }).start());
        return () => {
            show.remove();
            hide.remove();
        };
    }, [lift]);

    // Animate step transitions
    useEffect(() => {
        if (prevStep.current !== step) {
            const direction = step > prevStep.current ? 1 : -1;
            prevStep.current = step;
            stepSlide.setValue(direction * 30);
            stepFade.setValue(0);
            Animated.parallel([
                Animated.timing(stepFade, { toValue: 1, duration: 320, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
                Animated.timing(stepSlide, { toValue: 0, duration: 320, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
            ]).start();
        }
    }, [step]);

    const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft({ ...draft, [key]: value });
    const titles = [
        copy.languageTitle,
        copy.nameTitle,
        copy.ageTitle,
        copy.genderTitle,
        copy.professionTitle,
        copy.themeTitle,
        copy.remindersTitle,
    ];
    const descriptions = [
        copy.languageCopy,
        copy.nameCopy,
        copy.ageCopy,
        copy.genderCopy,
        copy.professionCopy,
        copy.themeCopy,
        copy.remindersCopy,
    ];
    const genderLabels = { Male: copy.male, Female: copy.female, Other: copy.other };
    const professionLabels = {
        Student: copy.student,
        Corporate: copy.corporate,
        Teacher: copy.teacher,
        Freelancer: copy.freelancer,
        Casual: copy.casual,
    };

    const progress = (step + 1) / 7;

    return (
        <KeyboardAvoidingView style={ob.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={18}>
            <SafeAreaView style={[ob.container, { backgroundColor: theme.background }]}>
                <StatusBar style={draft.theme === 'dark' ? 'light' : 'dark'} />

                {/* Header */}
                <View style={ob.header}>
                    <Text style={[ob.wordmark, { color: theme.text, fontFamily: theme.font }]}>OOTD</Text>
                    <Text style={[ob.stepNum, { color: theme.muted, fontFamily: theme.bodyFont }]}>
                        {String(step + 1).padStart(2, '0')} / 07
                    </Text>
                </View>

                {/* Progress bar */}
                <View style={[ob.progressTrack, { backgroundColor: theme.line }]}>
                    <View style={[ob.progressFill, { backgroundColor: theme.highlight, width: `${progress * 100}%` }]} />
                </View>

                {/* Content with step transitions */}
                <Animated.View style={[ob.content, { transform: [{ translateY: lift }] }]}>
                    <Animated.View style={{ opacity: stepFade, transform: [{ translateY: stepSlide }] }}>
                        <View style={[ob.accentLine, { backgroundColor: theme.highlight }]} />
                        <Text style={[s.eyebrow, { color: theme.muted, fontFamily: theme.bodyFont, marginBottom: 10 }]}>{copy.assistant}</Text>
                        <Text style={[ob.title, { color: theme.text, fontFamily: theme.font }]}>{titles[step]}</Text>
                        <Text style={[ob.desc, { color: theme.muted, fontFamily: theme.bodyFont }]}>{descriptions[step]}</Text>

                        {step === 0 && (
                            <View style={ob.choices}>
                                <Choice label="English" selected={draft.language === 'en'} theme={theme} onPress={() => update('language', 'en')} />
                                <Choice label="বাংলা" selected={draft.language === 'bn'} theme={theme} onPress={() => update('language', 'bn')} />
                            </View>
                        )}
                        {step === 1 && (
                            <TextInput
                                autoFocus
                                value={draft.nickname}
                                onChangeText={(value) => update('nickname', value)}
                                placeholder={copy.nickname}
                                placeholderTextColor={theme.muted}
                                style={[ob.input, { color: theme.text, borderColor: theme.line, backgroundColor: theme.inputBg, fontFamily: theme.bodyFont }]}
                            />
                        )}
                        {step === 2 && (
                            <TextInput
                                autoFocus
                                value={draft.age}
                                onChangeText={(value) => update('age', value.replace(/[^0-9]/g, ''))}
                                placeholder={copy.age}
                                placeholderTextColor={theme.muted}
                                keyboardType="number-pad"
                                style={[ob.input, { color: theme.text, borderColor: theme.line, backgroundColor: theme.inputBg, fontFamily: theme.bodyFont }]}
                            />
                        )}
                        {step === 3 && (
                            <View style={ob.choices}>
                                {genderOptions.map((value) => (
                                    <Choice
                                        key={value}
                                        label={genderLabels[value]}
                                        selected={draft.gender === value}
                                        theme={theme}
                                        onPress={() => update('gender', value)}
                                    />
                                ))}
                            </View>
                        )}
                        {step === 4 && (
                            <View style={ob.choices}>
                                {professionOptions.map((value) => (
                                    <Choice
                                        key={value}
                                        label={professionLabels[value]}
                                        selected={draft.profession === value}
                                        theme={theme}
                                        onPress={() => update('profession', value)}
                                    />
                                ))}
                            </View>
                        )}
                        {step === 5 && (
                            <View style={ob.choices}>
                                <Choice label={copy.light} selected={draft.theme === 'light'} theme={theme} onPress={() => update('theme', 'light')} />
                                <Choice label={copy.dark} selected={draft.theme === 'dark'} theme={theme} onPress={() => update('theme', 'dark')} />
                            </View>
                        )}
                        {step === 6 && <NotificationSetup copy={copy} theme={theme} draft={draft} update={update} />}
                    </Animated.View>
                </Animated.View>

                {/* Footer */}
                <View style={ob.footer}>
                    {step > 0 && (
                        <Pressable onPress={onBack} style={({ pressed }) => [ob.backBtn, { borderColor: theme.line, backgroundColor: theme.card, opacity: pressed ? 0.6 : 1 }]}>
                            <Ionicons name="chevron-back" size={20} color={theme.text} />
                        </Pressable>
                    )}
                    <Pressable
                        disabled={step === 1 && !draft.nickname.trim()}
                        onPress={onNext}
                        style={({ pressed }) => [
                            ob.nextBtn,
                            { backgroundColor: theme.text, opacity: step === 1 && !draft.nickname.trim() ? 0.4 : pressed ? 0.8 : 1 },
                        ]}
                    >
                        <Text style={[ob.nextText, { color: theme.background, fontFamily: theme.bodyFont }]}>
                            {step === 6 ? copy.enter : copy.continue}
                        </Text>
                        <Ionicons name={step === 6 ? 'checkmark' : 'arrow-forward'} size={18} color={theme.background} style={{ marginLeft: 8 }} />
                    </Pressable>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

/* ── Notification Setup ── */

function NotificationSetup({
    copy,
    theme,
    draft,
    update,
}: {
    copy: Copy;
    theme: Theme;
    draft: Profile;
    update: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
}) {
    const [hourText, minuteText] = draft.notificationTime.split(':');
    const hour24 = Number(hourText);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = String(hour24 % 12 || 12).padStart(2, '0');
    const setTime = (hour: string, minute: string, nextPeriod: 'AM' | 'PM') => {
        const parsedHour = Number(hour);
        const parsedMinute = Number(minute);
        if (!Number.isFinite(parsedHour) || !Number.isFinite(parsedMinute)) return;
        const normalizedHour = parsedHour === 12 ? 0 : parsedHour;
        const hour24 = (nextPeriod === 'PM' ? normalizedHour + 12 : normalizedHour) % 24;
        const minute24 = parsedMinute % 60;
        update('notificationTime', `${String(hour24).padStart(2, '0')}:${String(minute24).padStart(2, '0')}`);
    };
    return (
        <View style={ns.wrap}>
            <View style={[ns.toggleRow, { borderColor: theme.line, backgroundColor: theme.card }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[ns.toggleLabel, { color: theme.text, fontFamily: theme.bodyFont }]}>{copy.notifications}</Text>
                    <Text style={[ns.toggleSub, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.reminderSub}</Text>
                </View>
                <Switch
                    value={draft.notificationsEnabled}
                    onValueChange={(value) => update('notificationsEnabled', value)}
                    trackColor={{ false: theme.line, true: theme.highlight }}
                    thumbColor={draft.notificationsEnabled ? theme.text : theme.muted}
                />
            </View>
            {draft.notificationsEnabled && (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 20 }}>
                        <TextInput
                            value={`${hour12}:${minuteText || '00'}`}
                            onChangeText={(value) => {
                                const [hour, minute = ''] = value.replace(/[^0-9:]/g, '').slice(0, 5).split(':');
                                setTime(hour, minute, period);
                            }}
                            placeholder="08:00"
                            placeholderTextColor={theme.muted}
                            keyboardType="numbers-and-punctuation"
                            style={[ob.input, { flex: 1, color: theme.text, borderColor: theme.line, backgroundColor: theme.inputBg, marginTop: 0, fontFamily: theme.bodyFont }]}
                        />
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Choice label="AM" selected={period === 'AM'} theme={theme} onPress={() => setTime(hour12, minuteText, 'AM')} />
                            <Choice label="PM" selected={period === 'PM'} theme={theme} onPress={() => setTime(hour12, minuteText, 'PM')} />
                        </View>
                    </View>
                    <Text style={[ns.dayHint, { color: theme.muted, fontFamily: theme.bodyFont }]}>{copy.chooseDays}</Text>
                    <View style={ob.choices}>
                        {weekdays[draft.language].map((label, index) => (
                            <Choice
                                key={label}
                                label={label}
                                selected={draft.notificationDays.includes(index + 1)}
                                theme={theme}
                                onPress={() =>
                                    update(
                                        'notificationDays',
                                        draft.notificationDays.includes(index + 1)
                                            ? draft.notificationDays.filter((day) => day !== index + 1)
                                            : [...draft.notificationDays, index + 1].sort()
                                    )
                                }
                            />
                        ))}
                    </View>
                </>
            )}
        </View>
    );
}

/* ── Choice Pill ── */

function Choice({
    label,
    selected,
    theme,
    onPress,
}: {
    label: string;
    selected: boolean;
    theme: Theme;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                ch.pill,
                {
                    borderColor: selected ? theme.text : theme.line,
                    backgroundColor: selected ? theme.text : theme.card,
                    opacity: pressed ? 0.75 : 1,
                },
            ]}
        >
            {selected && <View style={[ch.selectedDot, { backgroundColor: theme.highlight }]} />}
            <Text style={[ch.label, { color: selected ? theme.background : theme.text, fontFamily: theme.bodyFont }]}>{label}</Text>
        </Pressable>
    );
}

/* ════════════════════════ STYLE SHEETS ════════════════════════ */

const s = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flexGrow: 1, paddingHorizontal: 22 },

    /* Brand */
    brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    brandMark: { fontSize: 32, letterSpacing: 5, fontWeight: '800' },
    brandTagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5 },
    brandDot: { width: 4, height: 4, borderRadius: 2 },
    brandTag: { fontSize: 9, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase' },
    themeToggle: { width: 46, height: 46, borderWidth: 1, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    themeIcon: { fontSize: 18 },

    /* Hero */
    heroBlock: { paddingTop: 48, paddingBottom: 32 },
    heroAccentLine: { width: 32, height: 3, borderRadius: 2, marginBottom: 18 },
    eyebrow: { fontSize: 10, letterSpacing: 2.5, fontWeight: '700', textTransform: 'uppercase' },
    heroTitle: { fontSize: 38, lineHeight: 46, fontWeight: '800', marginTop: 14 },
    heroSub: { fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 300 },

    /* Weather */
    weatherCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    weatherCardInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 22, paddingBottom: 18 },
    weatherLeft: { flex: 1 },
    weatherRight: { alignItems: 'flex-end', marginLeft: 16 },
    weatherEyebrow: { fontSize: 9, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase' },
    weatherCityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
    weatherEmoji: { fontSize: 22 },
    weatherCity: { fontSize: 26, fontWeight: '800' },
    weatherDesc: { fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 200 },
    weatherTemp: { fontSize: 52, fontWeight: '200', letterSpacing: -2 },
    weatherUpdated: { fontSize: 10, marginTop: 4 },

    metricStrip: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 16, paddingHorizontal: 22 },
    metricItem: { flex: 1, alignItems: 'center' },
    metricVal: { fontSize: 15, fontWeight: '700' },
    metricLbl: { fontSize: 9, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    metricDivider: { width: 1, marginVertical: 2 },

    metricRowExtended: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
    metricPill: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
    metricPillVal: { fontSize: 12, fontWeight: '700' },
    metricPillLbl: { fontSize: 8, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

    refreshPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16, gap: 6 },
    refreshText: { fontSize: 11, fontWeight: '600' },

    /* Section */
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, marginBottom: 18 },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitle: { fontSize: 24, fontWeight: '800' },
    sectionBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    sectionBadgeText: { fontSize: 10, fontWeight: '700' },
    swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    swipeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },

    /* Deck */
    deckWrap: { position: 'relative', marginBottom: 8 },
    deckBehind: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 0, zIndex: 0 },
    deckActive: {
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 4,
    },
    card: { borderRadius: 28, padding: 24, minHeight: 340, borderWidth: 1 },

    /* Card innards */
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    catLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700', textTransform: 'uppercase' },
    cardTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800', marginTop: 22 },
    cardDesc: { fontSize: 14, lineHeight: 22, marginTop: 10, maxWidth: 280 },
    piecesBlock: { borderTopWidth: 1, marginTop: 24, paddingTop: 16 },
    piecesLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
    piecesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pieceChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 7 },
    pieceDot: { width: 5, height: 5, borderRadius: 3, marginRight: 6 },
    pieceText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
    cardCta: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 11 },
    cardCtaText: { fontSize: 13, fontWeight: '700' },
    gestureIcons: { flexDirection: 'row', alignItems: 'center', opacity: 0.5 },

    /* Carousel nav */
    navControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 2 },
    navCircle: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    dotActive: { width: 26, height: 6, borderRadius: 3 },

    /* Footer */
    footerWrap: { alignItems: 'center', marginTop: 36, marginBottom: 8 },
    footerLine: { width: 40, height: 1, marginBottom: 14 },
    footerText: { fontSize: 11, lineHeight: 18, textAlign: 'center', maxWidth: 280 },

    /* Floating Nav */
    floatingNav: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 28,
        paddingVertical: 8,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 6,
    },
    navTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 20 },
    navTabActive: { borderRadius: 20 },
    navLabel: { fontSize: 10, marginTop: 3, fontWeight: '600' },

    /* Store */
    storeWrap: { paddingTop: 52, paddingBottom: 16 },
    storeTitle: { fontSize: 36, lineHeight: 42, fontWeight: '800', marginTop: 12 },
    storeSub: { fontSize: 14, lineHeight: 22, marginTop: 12, maxWidth: 300 },
    storeCard: { borderWidth: 1, borderRadius: 20, marginTop: 20, overflow: 'hidden' },
    storeCardAccent: { height: 3 },
    storeCardContent: { padding: 20 },
    storeCardLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase' },
    storeCardTitle: { fontSize: 22, fontWeight: '800', marginTop: 8 },
    storeCardDesc: { fontSize: 13, lineHeight: 20, marginTop: 6 },
    storeCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 26, height: 54, marginTop: 28 },
    storeCtaText: { fontSize: 14, fontWeight: '700' },

    /* Modal */
    modalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
    modalDismiss: { flex: 1 },
    detailSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sheetClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800', marginTop: 22 },
    sheetDesc: { fontSize: 14, lineHeight: 22, marginTop: 10 },
    sheetPiecesBox: { borderWidth: 1, borderRadius: 18, padding: 18, marginTop: 24 },
    sheetCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 26, height: 54, marginTop: 24 },
    sheetCtaText: { fontSize: 14, fontWeight: '700' },
});

const ob = StyleSheet.create({
    keyboard: { flex: 1 },
    container: { flex: 1, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
    wordmark: { fontSize: 24, letterSpacing: 3, fontWeight: '800' },
    stepNum: { fontSize: 11, letterSpacing: 1, fontWeight: '700' },
    progressTrack: { height: 2, borderRadius: 1, marginTop: 16 },
    progressFill: { height: 2, borderRadius: 1 },
    content: { flex: 1, justifyContent: 'center', paddingBottom: 20 },
    accentLine: { width: 28, height: 3, borderRadius: 2, marginBottom: 18 },
    title: { fontSize: 36, lineHeight: 44, fontWeight: '800', marginTop: 8 },
    desc: { fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 320 },
    input: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, fontSize: 17, marginTop: 30 },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 },
    footer: { flexDirection: 'row', gap: 12 },
    backBtn: { width: 56, height: 56, borderWidth: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    nextBtn: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    nextText: { fontSize: 15, fontWeight: '800' },
});

const ch = StyleSheet.create({
    pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12 },
    selectedDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    label: { fontSize: 14, fontWeight: '600' },
});

const ns = StyleSheet.create({
    wrap: { marginTop: 28 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderWidth: 1, borderRadius: 20 },
    toggleLabel: { fontSize: 15, fontWeight: '700', maxWidth: 220 },
    toggleSub: { fontSize: 11, marginTop: 4 },
    dayHint: { fontSize: 12, marginTop: 22, fontWeight: '600' },
});
