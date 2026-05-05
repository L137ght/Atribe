const ttlMs = 10 * 60 * 1000;
const stateStore = new Map();

export const oauthStateStore = {
  set(state, shop, metadata = {}) {
    stateStore.set(state, {
      shop,
      metadata,
      expiresAt: Date.now() + ttlMs
    });
  },

  consume(state) {
    const record = stateStore.get(state);
    stateStore.delete(state);

    if (!record || record.expiresAt < Date.now()) {
      return null;
    }

    return record;
  }
};
