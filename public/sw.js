// Service Worker: fixes proto2 group encoding in ArcGIS VectorTileServer PBF tiles.
//
// UGRC LiteBase and VectorHillshade tiles encode Layer messages as proto2 groups
// (wire type 3 / wire type 4) rather than the length-delimited encoding (wire type 2)
// that the Mapbox Vector Tile spec v2 and MapLibre's pbf parser expect.
// Tiles that use groups cause MapLibre to throw "Unimplemented type: 3" and fail
// to render, leaving transparent holes in the map.
//
// This SW intercepts those tile requests, rewrites any group-encoded fields as
// length-delimited fields (preserving all data), and returns the fixed buffer.
// The fix is recursive, so groups nested within groups are also converted.
// Length-delimited fields (strings, packed arrays, embedded messages) are copied
// as-is — we never recurse into them — which avoids corrupting non-group data.

const TILE_RE = /^https:\/\/tiles\.arcgis\.com\/.+\.pbf(\?.*)?$/;

// ── PBF helpers ────────────────────────────────────────────────────────────────

/** Read a varint from buf starting at pos. Returns [value, nextPos]. */
function readVarint(buf, pos) {
  let val = 0, shift = 0, b;
  do {
    if (pos >= buf.length) throw new RangeError('Truncated varint at ' + pos);
    b = buf[pos++];
    val = (val | ((b & 0x7f) << shift)) >>> 0;
    shift += 7;
  } while (b >= 0x80);
  return [val, pos];
}

/** Encode val as a varint Uint8Array. */
function encodeVarint(val) {
  val = val >>> 0;
  if (val < 0x80) return new Uint8Array([val]);
  const out = [];
  while (val >= 0x80) { out.push((val & 0x7f) | 0x80); val >>>= 7; }
  out.push(val);
  return new Uint8Array(out);
}

/** Concatenate an array of Uint8Arrays into one. */
function concat(parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/**
 * Quick top-level scan: does the buffer contain any wire-type-3 (group-start) tag?
 * Only scans the top level — does NOT descend into length-delimited fields.
 * Returns false for any parse error so we fall through to the original buffer.
 */
function hasGroup(buf) {
  let pos = 0;
  try {
    while (pos < buf.length) {
      const [tag, p] = readVarint(buf, pos);
      if ((tag & 7) === 3) return true;
      pos = p;
      const wt = tag & 7;
      if      (wt === 0) { while (buf[pos++] >= 0x80) {} }
      else if (wt === 1) { pos += 8; }
      else if (wt === 2) { const [l, p2] = readVarint(buf, pos); pos = p2 + l; }
      else if (wt === 4) { break; } // end-group at top level = malformed
      else if (wt === 5) { pos += 4; }
      else               { break; } // unknown wire type
    }
  } catch { /* parse error — treat as no-group */ }
  return false;
}

/**
 * Walk buf[pos..end) converting proto2 group fields (wt=3/4) to
 * length-delimited fields (wt=2).
 *
 * - wt=3 (group start): recurse until matching wt=4, re-emit as wt=2+length+content.
 * - wt=2 (length-delimited): copy tag+length+content bytes verbatim — never recurse,
 *   so strings, packed arrays, and embedded messages are never misinterpreted.
 * - wt=0/1/5: copy verbatim.
 * - wt=4 (end-group): stop and return current pos to parent (group nesting).
 *
 * Returns { bytes: Uint8Array, nextPos: number }.
 */
function fixGroups(buf, pos, end) {
  const parts = [];

  while (pos < end) {
    const fieldStart = pos;
    const [tag, p] = readVarint(buf, pos);
    pos = p;
    const wt = tag & 7;
    const fn = tag >>> 3;

    if (wt === 4) {
      // End-group marker — return to parent caller
      return { bytes: concat(parts), nextPos: pos };
    }

    if (wt === 3) {
      // Group start: recursively process content until the matching end-group tag.
      // Group content is always a protobuf message, so it is safe to recurse.
      const inner = fixGroups(buf, pos, end);
      pos = inner.nextPos;
      // Re-emit as length-delimited (wire type 2), same field number
      parts.push(encodeVarint((fn << 3) | 2));
      parts.push(encodeVarint(inner.bytes.length));
      parts.push(inner.bytes);
      continue;
    }

    // All non-group wire types: copy original bytes unchanged
    if (wt === 0) {
      // Varint value: copy tag varint + value varint bytes
      while (buf[pos++] >= 0x80) {}
      parts.push(buf.slice(fieldStart, pos));
    } else if (wt === 1) {
      parts.push(buf.slice(fieldStart, pos + 8));
      pos += 8;
    } else if (wt === 2) {
      // Length-delimited: copy tag + length varint + content — do NOT recurse
      const [len, p2] = readVarint(buf, pos);
      pos = p2 + len;
      parts.push(buf.slice(fieldStart, pos));
    } else if (wt === 5) {
      parts.push(buf.slice(fieldStart, pos + 4));
      pos += 4;
    } else {
      break; // unknown wire type — stop gracefully
    }
  }

  return { bytes: concat(parts), nextPos: pos };
}

// ── Service Worker lifecycle ───────────────────────────────────────────────────

self.addEventListener('install',  ()  => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (!TILE_RE.test(event.request.url)) return; // not an ArcGIS PBF tile

  event.respondWith(
    fetch(event.request).then(async (res) => {
      if (!res.ok) return res;

      const raw = new Uint8Array(await res.arrayBuffer());

      // Fast path: no groups → return original bytes immediately
      if (!hasGroup(raw)) {
        return new Response(raw, { headers: { 'Content-Type': 'application/x-protobuf' } });
      }

      // Slow path: fix proto2 group encodings
      try {
        const { bytes } = fixGroups(raw, 0, raw.length);
        return new Response(bytes, { headers: { 'Content-Type': 'application/x-protobuf' } });
      } catch (err) {
        // If the fix itself fails, return the original so MapLibre can log its own error
        console.warn('[SW] proto2 fix error for', event.request.url, '—', err.message);
        return new Response(raw, { headers: { 'Content-Type': 'application/x-protobuf' } });
      }
    })
  );
});
