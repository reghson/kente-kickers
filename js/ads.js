// AdMob ads for the Android app only. Fully OFF unless KK.CONFIG.ADS_ENABLED is true.
// Formats: optional rewarded ad (bonus coins after a match) and an interstitial between matches
// (max once every INTERSTITIAL_EVERY matches). No banners, never during gameplay, never on the web/PWA.
// Consent: Google UMP (GDPR/EEA + UK) is requested before any ad request.
(function () {
  const KK = window.KK, C = KK.CONFIG || {};
  const S = { inited: false, ready: false, canRequest: false, rewardLoaded: false, interLoaded: false, privacyReq: false, err: '' };
  const isAndroidApp = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.getPlatform() === 'android');
  const plugin = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
  const debug = () => !!(KK.BUILD && KK.BUILD.debug);
  const units = () => debug() ? { r: C.ADMOB_TEST.REWARDED_ID, i: C.ADMOB_TEST.INTERSTITIAL_ID }
    : { r: C.ADMOB.REWARDED_ID, i: C.ADMOB.INTERSTITIAL_ID };
  const realIds = () => { const u = units(); return /^ca-app-pub-\d+\/\d+$/.test(u.r) && /^ca-app-pub-\d+\/\d+$/.test(u.i); };
  const can = () => !!C.ADS_ENABLED && isAndroidApp() && !!plugin() && realIds(); // kill switch + web guard

  async function init() {
    if (!can() || S.inited) return; S.inited = true;
    const A = plugin();
    try {
      await A.initialize({ initializeForTesting: debug(), maxAdContentRating: 'G', tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false });
      // UMP consent (shows Google's consent form in the EEA/UK when required)
      let ci = await A.requestConsentInfo({});
      if (ci.status === 'REQUIRED' && ci.isConsentFormAvailable) ci = await A.showConsentForm();
      S.canRequest = !!ci.canRequestAds; S.privacyReq = ci.privacyOptionsRequirementStatus === 'REQUIRED';
      A.addListener('onRewardedVideoAdReward', () => { S.earned = true; });
      A.addListener('onRewardedVideoAdDismissed', () => { S.rewardLoaded = false; loadReward(); });
      A.addListener('interstitialAdDismissed', () => { S.interLoaded = false; loadInter(); });
      S.ready = true; loadReward(); loadInter();
    } catch (e) { S.err = String(e && e.message || e); }
  }
  async function loadReward() { if (!S.ready || !S.canRequest || S.rewardLoaded) return; try { await plugin().prepareRewardVideoAd({ adId: units().r, isTesting: debug(), immersiveMode: true }); S.rewardLoaded = true; } catch (e) { S.rewardLoaded = false; } }
  async function loadInter() { if (!S.ready || !S.canRequest || S.interLoaded) return; try { await plugin().prepareInterstitial({ adId: units().i, isTesting: debug(), immersiveMode: true }); S.interLoaded = true; } catch (e) { S.interLoaded = false; } }

  KK.ads = {
    state: S, can, init,
    rewardReady: () => can() && S.ready && S.canRequest && S.rewardLoaded,
    // resolves true only if the user watched to the end and earned the reward
    async showReward() {
      if (!KK.ads.rewardReady()) return false;
      S.earned = false;
      try { const r = await plugin().showRewardVideoAd(); S.rewardLoaded = false; return !!(S.earned || (r && r.amount)); } catch (e) { S.rewardLoaded = false; loadReward(); return false; }
    },
    // called after each finished match; shows at most one interstitial every N matches
    async betweenMatches(save) {
      if (!can() || !S.ready || !S.canRequest || !save) return false;
      save.adCount = (save.adCount || 0) + 1;
      if (save.adCount < (C.INTERSTITIAL_EVERY || 3) || !S.interLoaded) return false;
      try { await plugin().showInterstitial(); save.adCount = 0; S.interLoaded = false; return true; } catch (e) { loadInter(); return false; }
    },
    privacyOptionsRequired: () => can() && S.privacyReq,
    showPrivacyOptions() { if (can() && S.ready) return plugin().showPrivacyOptionsForm().catch(() => {}); },
  };
  document.addEventListener('deviceready', () => { if (can()) init(); }, false);
  window.addEventListener('load', () => setTimeout(() => { if (can()) init(); }, 1500));
})();
