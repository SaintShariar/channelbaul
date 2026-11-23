const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: keep going in memory */
    }
  },
};

const uploadsDb = (() => {
  let opening;

  function open() {
    if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is not available"));
    opening ||= new Promise((resolve, reject) => {
      const req = indexedDB.open("channelbaul", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("uploads", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return opening;
  }

  async function run(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", mode);
      const req = fn(tx.objectStore("uploads"));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return {
    all: () => run("readonly", (s) => s.getAll()),
    put: (record) => run("readwrite", (s) => s.put(record)),
    remove: (id) => run("readwrite", (s) => s.delete(id)),
  };
})();
