// Pure offline stub — no external ad SDKs or tracking.
(function () {
  const KK = window.KK = window.KK || {};
  KK.ads = {
    state: { inited: false, ready: false, canRequest: false },
    can: () => false,
    init: () => {},
    rewardReady: () => false,
    showReward: async () => false,
    betweenMatches: async () => false,
    privacyOptionsRequired: () => false,
    showPrivacyOptions: () => {},
  };
})();
