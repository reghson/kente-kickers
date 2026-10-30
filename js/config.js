// Kente Kickers build config.
// BILLING_ENABLED is the single kill switch for real-money in-app purchases.
// Keep it false until the Google Play developer account is approved, a payments profile exists
// and the five in-app products are active in Play Console. When false, the shop shows
// "Coming soon" and every purchase call is a no-op. Purchases are never offered on the web/PWA.
window.KK = window.KK || {};
// ADS_ENABLED is the kill switch for AdMob ads (Android app only, never on the web/PWA).
// When false: the Mobile Ads SDK is never initialised, no consent request, no ad requests.
KK.CONFIG = Object.freeze({
  BILLING_ENABLED: false,
  ADS_ENABLED: false,
  // Real AdMob IDs: fill in after creating the "Kente Kickers" app in AdMob (see store/checklist.md).
  // Release builds refuse to request ads while these are still placeholders.
  ADMOB: Object.freeze({
    APP_ID: 'ADMOB_APP_ID',                 // ca-app-pub-7819677286480587~XXXXXXXXXX (also set in android/gradle.properties)
    REWARDED_ID: 'ADMOB_REWARDED_ID',       // ca-app-pub-7819677286480587/XXXXXXXXXX
    INTERSTITIAL_ID: 'ADMOB_INTERSTITIAL_ID', // ca-app-pub-7819677286480587/XXXXXXXXXX
  }),
  // Google's official public TEST ad units. Used only in debug builds (KK.BUILD.debug).
  ADMOB_TEST: Object.freeze({
    REWARDED_ID: 'ca-app-pub-3940256099942544/5224354917',
    INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/1033173712',
  }),
  INTERSTITIAL_EVERY: 3, // at most one interstitial every 3 matches
  REWARD_COINS: 150,     // bonus coins for an optional rewarded ad after a match
  APP_VERSION: '1.0.0',
  PRIVACY_URL: 'https://reghson.github.io/kente-kickers/privacy.html',
});
