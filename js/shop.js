// Coin shop. Real-money packs only work inside the Android app (Google Play Billing via
// cordova-plugin-purchase) AND only when KK.CONFIG.BILLING_ENABLED is true. Everything in the
// shop can also be earned for free by playing. Fixed amounts only: no loot boxes, no random rewards.
(function () {
  const KK = window.KK;
  const PACKS = [
    { id: 'kk_coins_small', kind: 'coins', amount: 2500, name: 'Pouch of Coins', ic: '🪙', ph: '$0.99' },
    { id: 'kk_coins_medium', kind: 'coins', amount: 8000, name: 'Bag of Coins', ic: '💰', ph: '$2.99', tag: 'Popular' },
    { id: 'kk_coins_large', kind: 'coins', amount: 20000, name: 'Chest of Coins', ic: '🧰', ph: '$5.99', tag: 'Best value' },
    { id: 'kk_gold_small', kind: 'gold', amount: 10, name: 'Gold Kente ×10', ic: '✦', ph: '$1.99' },
    { id: 'kk_gold_large', kind: 'gold', amount: 35, name: 'Gold Kente ×35', ic: '✦', ph: '$5.99' },
  ];
  const S = { ready: false, err: '', prices: {}, busy: false };
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.getPlatform() === 'android');
  const enabled = () => !!(KK.CONFIG && KK.CONFIG.BILLING_ENABLED);
  const can = () => enabled() && isNative() && !!window.CdvPurchase; // never on the web
  let grantCb = null, refreshCb = null;

  function grant(tx) {
    // idempotent: each Play order id is only ever credited once
    const save = KK.ui && KK.ui.getSave && KK.ui.getSave(); if (!save) return false;
    save.iap = save.iap || { tx: [] };
    const key = tx.transactionId || tx.purchaseId || ''; if (!key || save.iap.tx.includes(key)) return true;
    let gave = [];
    for (const pr of tx.products || []) { const pk = PACKS.find(p => p.id === pr.id); if (!pk) continue; const n = pk.amount * (pr.quantity || 1); if (pk.kind === 'coins') save.coins += n; else save.gold += n; gave.push(pk); }
    if (!gave.length) return false;
    save.iap.tx.push(key); if (save.iap.tx.length > 200) save.iap.tx = save.iap.tx.slice(-200);
    grantCb && grantCb(gave); return true;
  }

  function init() {
    if (!can() || S.inited) return; S.inited = true;
    try {
      const { store, ProductType, Platform, LogLevel } = window.CdvPurchase;
      store.verbosity = LogLevel.WARNING;
      store.register(PACKS.map(p => ({ id: p.id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
      store.when()
        .productUpdated(() => { for (const p of PACKS) { const pr = store.get(p.id, Platform.GOOGLE_PLAY); if (pr && pr.pricing) S.prices[p.id] = pr.pricing.price; } refreshCb && refreshCb(); })
        // approved = paid. Credit once, then finish(): acknowledges and consumes the consumable on Google Play.
        // No server receipt validation (see store/checklist.md): purchases are verified by Google Play only.
        .approved(tx => { if (grant(tx)) tx.finish(); })
        .finished(() => { S.busy = false; refreshCb && refreshCb(); });
      store.error(e => { S.err = e && e.message || 'Store error'; S.busy = false; refreshCb && refreshCb(); });
      store.initialize([Platform.GOOGLE_PLAY]).then(() => { S.ready = true; refreshCb && refreshCb(); });
    } catch (e) { S.err = String(e && e.message || e); }
  }

  async function buy(id) {
    if (!can() || !S.ready || S.busy) return false; // kill switch / web: no-op
    const { store, Platform } = window.CdvPurchase, pr = store.get(id, Platform.GOOGLE_PLAY), offer = pr && pr.getOffer();
    if (!offer) return false;
    S.busy = true; refreshCb && refreshCb();
    const err = await offer.order(); if (err) { S.busy = false; refreshCb && refreshCb(); }
    return !err;
  }
  // "Restore": re-reads Google Play and credits any paid-but-unfinished purchase (e.g. app closed mid-purchase).
  async function restore() { if (!can() || !S.ready) return false; await window.CdvPurchase.store.restorePurchases(); return true; }

  // process any paid-but-unfinished purchases at startup (only when billing is enabled in the Android app)
  document.addEventListener('deviceready', () => { if (can()) init(); }, false);
  window.addEventListener('load', () => setTimeout(() => { if (can()) init(); }, 1500));
  KK.shop = {
    PACKS, state: S, isNative, enabled, can, init, buy, restore,
    onGrant(f) { grantCb = f; }, onRefresh(f) { refreshCb = f; },
    price(p) { return can() && S.prices[p.id] ? S.prices[p.id] : null },
  };
})();
