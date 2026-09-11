// Test-only Supabase stub: in-memory tables + storage. No network, no schema changes.
const seedCategories = [
  { id: 1, name: "Fresh Favorites", slug: "fresh-favorites", type: "market", sort_order: 0, is_active: true, description: "Everyday picks", background_image_path: "bg/fresh.jpg", background_image_url: "https://stub/bg/fresh.jpg" },
  { id: 2, name: "Coffee", slug: "coffee", type: "cafe", sort_order: 1, is_active: true, description: null, background_image_path: null, background_image_url: null },
  { id: 3, name: "ألبان", slug: "category-seed01", type: "market", sort_order: 2, is_active: true, description: "أجبان طازجة يومياً", background_image_path: null, background_image_url: null },
];
const seedProducts = [
  { id: 11, name: "Heritage Flat White", slug: "heritage-flat-white", category_id: 2, description: "Silky", price: 6.5, badge: "Popular", sort_order: 0, is_active: true, image_path: "product-images/old.jpg", image_url: "https://stub/product-images/old.jpg" },
  { id: 12, name: "Butter Croissant", slug: "butter-croissant", category_id: 1, description: null, price: 3.0, badge: null, sort_order: 1, is_active: true, image_path: null, image_url: null },
  { id: 13, name: "لبن رايب", slug: "product-seed01", category_id: 3, description: "لبن طازج", price: 12.5, badge: "جديد", sort_order: 2, is_active: true, image_path: null, image_url: null },
];

export const stubDb = {
  categories: structuredClone(seedCategories),
  products: structuredClone(seedProducts),
};
export const stubStorage = {}; // bucket -> { path: { name, type, size } }
export const calls = []; // audit log

class Query {
  constructor(table) { this.table = table; this._kind = null; this._cols = "*"; this._filters = []; this._orders = []; this._limit = null; this._payload = null; this._single = false; }
  select(cols = "*") { if (!this._kind) this._kind = "select"; this._cols = cols; return this; }
  eq(col, val) { this._filters.push((r) => r[col] === val); return this; }
  neq(col, val) { this._filters.push((r) => r[col] !== val); return this; }
  order(col, { ascending = true } = {}) { this._orders.push({ col, ascending }); return this; }
  limit(n) { this._limit = n; return this; }
  insert(payload) { this._kind = "insert"; this._payload = payload; return this; }
  update(payload) { this._kind = "update"; this._payload = payload; return this; }
  delete() { this._kind = "delete"; return this; }
  single() { this._single = true; return this; }
  then(resolve, reject) {
    try { resolve(this._exec()); } catch (e) { reject(e); }
  }
  _rows() { return stubDb[this.table]; }
  _applyFilters(rows) { return rows.filter((r) => this._filters.every((f) => f(r))); }
  _applyOrders(rows) {
    const out = [...rows];
    for (const { col, ascending } of this._orders) {
      out.sort((a, b) => {
        const av = a[col] ?? "", bv = b[col] ?? "";
        return (av < bv ? -1 : av > bv ? 1 : 0) * (ascending ? 1 : -1);
      });
    }
    return out;
  }
  _withJoin(row) {
    if (typeof this._cols === "string" && this.table === "products" && this._cols.includes("categories(")) {
      const cat = stubDb.categories.find((c) => c.id === row.category_id) || null;
      return { ...row, categories: cat ? { id: cat.id, name: cat.name, slug: cat.slug, type: cat.type } : null };
    }
    return { ...row };
  }
  _exec() {
    const rows = this._rows();
    if (this._kind === "insert") {
      const nextId = rows.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
      const row = { id: nextId, ...this._payload };
      rows.push(row);
      calls.push({ op: "insert", table: this.table, row: { ...row } });
      const out = this._withJoin(row);
      return { data: this._single ? out : [out], error: null };
    }
    if (this._kind === "update") {
      const matched = this._applyFilters(rows);
      for (const r of matched) Object.assign(r, this._payload);
      calls.push({ op: "update", table: this.table, ids: matched.map((r) => r.id), payload: { ...this._payload } });
      if (this._single) {
        if (!matched.length) return { data: null, error: { message: "No rows" } };
        return { data: this._withJoin(matched[0]), error: null };
      }
      return { data: matched.map((r) => this._withJoin(r)), error: null };
    }
    if (this._kind === "delete") {
      const matched = this._applyFilters(rows);
      stubDb[this.table] = rows.filter((r) => !matched.includes(r));
      calls.push({ op: "delete", table: this.table, ids: matched.map((r) => r.id) });
      return { data: null, error: null };
    }
    let out = this._applyOrders(this._applyFilters(rows)).map((r) => this._withJoin(r));
    if (this._limit != null) out = out.slice(0, this._limit);
    calls.push({ op: "select", table: this.table, cols: this._cols });
    if (this._single) return { data: out[0] ?? null, error: out[0] ? null : { message: "No rows" } };
    return { data: out, error: null };
  }
}

const storageApi = {
  from(bucket) {
    return {
      async upload(path, file, opts) {
        stubStorage[bucket] = stubStorage[bucket] || {};
        stubStorage[bucket][path] = { name: file?.name, type: file?.type, size: file?.size, contentType: opts?.contentType };
        calls.push({ op: "upload", bucket, path });
        return { data: { path }, error: null };
      },
      getPublicUrl(path) {
        return { data: { publicUrl: `https://stub.supabase.co/storage/v1/object/public/${bucket}/${path}` } };
      },
    };
  },
};

function makeClient() {
  return {
    from: (table) => new Query(table),
    storage: storageApi,
    auth: { onAuthStateChange: () => {} },
  };
}

export function getSupabase() { return makeClient(); }
export function getPublicSupabase() { return makeClient(); }
