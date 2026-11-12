// ============================================================
// Translations for Sinchai (English & Hindi)
// ============================================================

export type Language = 'en' | 'hi';

export const translations = {
  en: {
    // Top Bar & Common
    langButton: 'हिंदी',
    loading: 'Loading...',
    today: 'Today',

    // Bottom Navigation
    navDashboard: 'Dashboard',
    navHistory: 'History',
    navProfile: 'Profile',

    // Dashboard
    greeting: 'Hello',
    farmLabel: 'Farm',
    pumpTitle: '💧 Water Pump',
    pumpRunning: 'RUNNING',
    pumpStopped: 'STOPPED',
    lastChanged: 'Last changed',
    by: 'By',
    noPumpData: 'No pump data yet',
    liveSensors: 'Live Sensor Readings',
    waitingSensorData: 'Waiting for sensor data…',
    lastUpdated: 'Last updated',

    // Weather & Advisory
    weatherTitle: '🌤️ Farm Weather & Advisory',
    rainAlertTitle: '🌧️ Rain Alert',
    rainAlertDesc: 'Rain expected today. Hold off on irrigation to save water and electricity.',
    heatAlertTitle: '☀️ High Heat Advisory',
    heatAlertDesc: 'High temperatures detected. Best to irrigate in early morning or evening.',
    normalAlertTitle: '🌱 Ideal Irrigation Weather',
    normalAlertDesc: 'Weather is favorable for standard irrigation schedule.',
    rainChance: 'Rain Chance',
    wind: 'Wind',
    maxMin: 'Max / Min',
    weatherLoading: 'Fetching weather update...',

    // Sensors
    soilMoisture: 'Soil Moisture',
    temperature: 'Temperature',
    humidity: 'Humidity',
    waterFlow: 'Water Flow',

    // Moisture Statuses
    moistureCritDry: 'Critically Dry',
    moistureDry: 'Dry',
    moistureOptimal: 'Optimal',
    moistureMoist: 'Moist',
    moistureSaturated: 'Saturated',

    // Temp Statuses
    tempVeryCold: 'Very Cold',
    tempCool: 'Cool',
    tempOptimal: 'Optimal',
    tempWarm: 'Warm',
    tempVeryHot: 'Very Hot',

    // History
    historyTitle: '📈 Sensor History',
    historySubtitle: 'Last 10 readings from your farm',
    noHistory: 'No history data yet.',
    noHistoryDesc: 'Data will appear here once your hardware starts sending readings.',
    allReadings: 'All Readings',
    moistureShort: 'Moisture',
    tempShort: 'Temp',
    humidityShort: 'Humidity',
    flowShort: 'Flow',

    // Profile
    profileTitle: '👤 My Profile',
    accountInfo: 'Account Information',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    farmName: 'Farm Name',
    aboutApp: 'About App',
    appName: 'App Name',
    version: 'Version',
    dataSource: 'Data Source',
    signOut: 'Sign Out',
    signOutConfirmTitle: 'Sign Out?',
    signOutConfirmText: 'Are you sure you want to sign out of Sinchai?',
    cancel: 'Cancel',

    // Auth
    welcomeBack: 'Welcome Back',
    signInSubtitle: 'Sign in to your account',
    password: 'Password',
    signIn: 'Sign In',
    noAccount: "Don't have an account?",
    registerHere: 'Register here',
    createAccount: 'Create Account',
    createAccountSubtitle: 'Join thousands of smart farmers',
    confirmPassword: 'Confirm Password',
  },
  hi: {
    // Top Bar & Common
    langButton: 'English',
    loading: 'लोड हो रहा है...',
    today: 'आज',

    // Bottom Navigation
    navDashboard: 'डैशबोर्ड',
    navHistory: 'इतिहास',
    navProfile: 'प्रोफाइल',

    // Dashboard
    greeting: 'नमस्ते',
    farmLabel: 'खेत',
    pumpTitle: '💧 पानी का पंप (मोटर)',
    pumpRunning: 'चालू है',
    pumpStopped: 'बंद है',
    lastChanged: 'अंतिम बदलाव',
    by: 'द्वारा',
    noPumpData: 'अभी पंप की जानकारी नहीं है',
    liveSensors: 'लाइव सेंसर आंकड़े',
    waitingSensorData: 'सेंसर डेटा का इंतज़ार है…',
    lastUpdated: 'अंतिम अपडेट',

    // Weather & Advisory
    weatherTitle: '🌤️ खेत का मौसम व सलाह',
    rainAlertTitle: '🌧️ बारिश की चेतावनी',
    rainAlertDesc: 'आज बारिश की संभावना है। पानी और बिजली बचाने के लिए सिंचाई टालें।',
    heatAlertTitle: '☀️ तेज़ धूप व गर्मी की सलाह',
    heatAlertDesc: 'तापमान अधिक है। वाष्पीकरण से बचने हेतु सुबह या शाम सिंचाई करें।',
    normalAlertTitle: '🌱 अनुकूल मौसम',
    normalAlertDesc: 'मौसम अनुकूल है, सामान्य दिनचर्या के अनुसार सिंचाई कर सकते हैं।',
    rainChance: 'बारिश की संभावना',
    wind: 'हवा',
    maxMin: 'अधिकतम / न्यूनतम',
    weatherLoading: 'मौसम का हाल लोड हो रहा है...',

    // Sensors
    soilMoisture: 'मिट्टी की नमी',
    temperature: 'तापमान',
    humidity: 'हवा में नमी (आर्द्रता)',
    waterFlow: 'पानी का बहाव',

    // Moisture Statuses
    moistureCritDry: 'बेहद सूखा (पानी दें)',
    moistureDry: 'सूखा',
    moistureOptimal: 'उत्तम (सही)',
    moistureMoist: 'पर्याप्त नमी',
    moistureSaturated: 'अत्यधिक गीला',

    // Temp Statuses
    tempVeryCold: 'बहुत ठंडा',
    tempCool: 'ठंडा',
    tempOptimal: 'अनुकूल',
    tempWarm: 'गर्म',
    tempVeryHot: 'अत्यधिक गर्म',

    // History
    historyTitle: '📈 सेंसर का इतिहास',
    historySubtitle: 'आपके खेत के पिछले 10 आंकड़े',
    noHistory: 'अभी कोई पुराना डेटा नहीं है।',
    noHistoryDesc: 'हार्डवेयर सेंसर कनेक्ट होते ही यहाँ डेटा दिखाई देगा।',
    allReadings: 'सभी रिकॉर्ड्स',
    moistureShort: 'नमी',
    tempShort: 'तापमान',
    humidityShort: 'आर्द्रता',
    flowShort: 'बहाव',

    // Profile
    profileTitle: '👤 मेरी प्रोफाइल',
    accountInfo: 'खाते की जानकारी',
    fullName: 'पूरा नाम',
    emailAddress: 'ईमेल पता',
    farmName: 'खेत का नाम',
    aboutApp: 'ऐप के बारे में',
    appName: 'ऐप का नाम',
    version: 'वर्जन',
    dataSource: 'डेटा स्रोत',
    signOut: 'लॉग आउट करें',
    signOutConfirmTitle: 'लॉग आउट करें?',
    signOutConfirmText: 'क्या आप Sinchai ऐप से लॉग आउट करना चाहते हैं?',
    cancel: 'रद्द करें',

    // Auth
    welcomeBack: 'स्वागत है',
    signInSubtitle: 'अपने खाते में लॉगिन करें',
    password: 'पासवर्ड',
    signIn: 'साइन इन करें',
    noAccount: 'क्या आपका खाता नहीं है?',
    registerHere: 'यहाँ रजिस्टर करें',
    createAccount: 'खाता बनाएं',
    createAccountSubtitle: 'हज़ारों आधुनिक किसानों से जुड़ें',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
  },
};

export type TranslationKey = keyof typeof translations.en;
