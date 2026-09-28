// lib/offlineDb.ts
//
// OFFLINE MODE — storage on the phone (IndexedDB, no extra package).
//
//   responses  last copy of every GET the app loaded, per user
//              key: "<userKey>|<path>"  e.g. "beekeeper:B-0001|/hives"
//   outbox     changes made while offline, waiting to be sent
//
// Every function fails quietly (returns null / [] / does nothing) when
// IndexedDB isn't available (private window, old browser, server render),
// so the app just behaves like before — online only.

const DB_NAME = "beeguard-offline";
const DB_VERSION = 1;
const RESPONSES = "responses";
const OUTBOX = "outbox";

export interface CachedResponse {
	key: string;
	userKey: string;
	body: unknown; // the backend envelope { success, message, data }
	savedAt: string; // ISO time
}

export interface OutboxItem {
	id?: number;
	userKey: string;
	method: "POST" | "PATCH";
	path: string;
	body: unknown;
	label: string; // shown to the user, e.g. "Add harvest (Hive 2)"
	createdAt: string;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
	if (typeof window === "undefined" || !("indexedDB" in window)) {
		return Promise.resolve(null);
	}
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve) => {
		try {
			const req = window.indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(RESPONSES)) {
					const s = db.createObjectStore(RESPONSES, { keyPath: "key" });
					s.createIndex("userKey", "userKey", { unique: false });
				}
				if (!db.objectStoreNames.contains(OUTBOX)) {
					const s = db.createObjectStore(OUTBOX, {
						keyPath: "id",
						autoIncrement: true,
					});
					s.createIndex("userKey", "userKey", { unique: false });
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve(null);
			req.onblocked = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
	return dbPromise;
}

function run<T>(
	store: string,
	mode: IDBTransactionMode,
	fn: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | null> {
	return openDb().then(
		(db) =>
			new Promise<T | null>((resolve) => {
				if (!db) return resolve(null);
				try {
					const tx = db.transaction(store, mode);
					const req = fn(tx.objectStore(store));
					tx.oncomplete = () => resolve(req ? (req.result as T) : null);
					tx.onerror = () => resolve(null);
					tx.onabort = () => resolve(null);
				} catch {
					resolve(null);
				}
			}),
	);
}

// ── saved GET responses ──
export const responseCache = {
	get: (userKey: string, path: string) =>
		run<CachedResponse>(RESPONSES, "readonly", (s) =>
			s.get(`${userKey}|${path}`),
		),

	put: (userKey: string, path: string, body: unknown) =>
		run(RESPONSES, "readwrite", (s) =>
			s.put({
				key: `${userKey}|${path}`,
				userKey,
				body,
				savedAt: new Date().toISOString(),
			} satisfies CachedResponse),
		),

	// Logout: forget everything this user's screens showed.
	clearUser: (userKey: string) =>
		run(RESPONSES, "readwrite", (s) => {
			const req = s.index("userKey").openCursor(IDBKeyRange.only(userKey));
			req.onsuccess = () => {
				const cursor = req.result;
				if (cursor) {
					cursor.delete();
					cursor.continue();
				}
			};
		}),
};

// ── changes waiting to be sent ──
export const outbox = {
	add: (item: OutboxItem) =>
		run<IDBValidKey>(OUTBOX, "readwrite", (s) => s.add(item)),

	list: async (userKey: string): Promise<OutboxItem[]> => {
		const all = await run<OutboxItem[]>(OUTBOX, "readonly", (s) =>
			s.index("userKey").getAll(IDBKeyRange.only(userKey)),
		);
		return (all ?? []).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
	},

	remove: (id: number) => run(OUTBOX, "readwrite", (s) => s.delete(id)),
};