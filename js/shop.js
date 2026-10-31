// Dream League Soccer — Club Treasury & Gem Exchange (100% offline, earned in-game currency only).
(function () {
  const KK = window.KK = window.KK || {};
  const EXCHANGE = [
    { id: 'dls_coins_pouch', kind: 'coins', amount: 1500, gemCost: 25, name: 'Club Budget Boost', ic: '🪙', tag: 'Starter' },
    { id: 'dls_coins_bag', kind: 'coins', amount: 5000, gemCost: 75, name: 'Transfer Warchest', ic: '💰', tag: 'Popular' },
    { id: 'dls_coins_vault', kind: 'coins', amount: 15000, gemCost: 200, name: 'Chairman Sovereign Vault', ic: '🏦', tag: 'Best Value' },
    { id: 'dls_coach_pack_r', kind: 'coach_rare', amount: 2, gemCost: 45, name: 'Rare Coach Bundle (×2)', ic: '📋', tag: 'Training' },
    { id: 'dls_coach_pack_l', kind: 'coach_leg', amount: 2, gemCost: 110, name: 'Legendary Coach Bundle (×2)', ic: '🌟', tag: 'Breakthrough' },
  ];
  KK.shop = {
    PACKS: EXCHANGE,
    state: { ready: true, err: '', busy: false },
    isNative: () => false,
    enabled: () => false,
    can: () => false,
    init: () => {},
    buy: async () => false,
    restore: async () => false,
    onGrant: () => {},
    onRefresh: () => {},
    price: () => null,
  };
})();
