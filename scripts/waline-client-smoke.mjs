import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

if (process.loadEnvFile) {
  process.loadEnvFile(".env");
}

const { Client } = pg;
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(6).toString("hex");
const email = `waline-smoke-${suffix}@example.com`;
const guestEmail = `waline-guest-${suffix}@example.com`;
const sessionToken = `waline-smoke-session-${suffix}`;
const guestSessionToken = `waline-guest-session-${suffix}`;
const slug = `waline-smoke-${suffix}`;
const url = `/waline-smoke-${suffix}`;
const keep = process.env.WALINE_SMOKE_KEEP === "1";

function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function fnv1aResume(state, str) {
  let hash = state;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function prngFromHash(initialHash, length) {
  let state = initialHash;
  let result = "";
  while (result.length < length) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    result += state.toString(16).padStart(8, "0");
  }
  return result.substring(0, length);
}

function matchesPrefix(digest, target) {
  const fullBytes = target.length >> 1;
  const bytes = Buffer.from(target.slice(0, fullBytes * 2), "hex");
  for (let i = 0; i < fullBytes; i++) {
    if (digest[i] !== bytes[i]) return false;
  }
  if (target.length % 2 === 1) {
    const nibble = Number.parseInt(target[target.length - 1], 16);
    if (digest[fullBytes] >> 4 !== nibble) return false;
  }
  return true;
}

async function solve(salt, target) {
  for (let nonce = 0; nonce < 5_000_000; nonce++) {
    const digest = createHash("sha256").update(`${salt}${nonce}`).digest();
    if (matchesPrefix(digest, target)) return nonce;
  }
  throw new Error(`failed to solve puzzle for salt ${salt}`);
}

async function capToken(scope) {
  const challengeResponse = await fetch(`${base}/api/cap/${scope}/challenge`, {
    method: "POST",
  });
  if (!challengeResponse.ok) {
    throw new Error(`challenge ${scope} failed: ${challengeResponse.status}`);
  }
  const { challenge, token } = await challengeResponse.json();
  const tokenFnv = fnv1a(token);
  const solutions = [];
  for (let i = 1; i <= challenge.c; i++) {
    const saltSeed = fnv1aResume(tokenFnv, String(i));
    const targetSeed = fnv1aResume(saltSeed, "d");
    solutions.push(
      await solve(
        prngFromHash(saltSeed, challenge.s),
        prngFromHash(targetSeed, challenge.d),
      ),
    );
  }
  const redeemResponse = await fetch(`${base}/api/cap/${scope}/redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, solutions }),
  });
  const body = await redeemResponse.json();
  if (!redeemResponse.ok || !body.success || !body.token) {
    throw new Error(`redeem ${scope} failed: ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function request(path, { method = "GET", body, cookie, bearer } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

let ownerUserId;
let guestUserId;
try {
  const ownerResult = await db.query(
    `INSERT INTO "User" (id, email, name, url, plan, "updatedAt")
     VALUES ($1, $2, $3, $4, 'starter', now()) RETURNING id, "objectId"`,
    [`waline-owner-${suffix}`, email, "Waline Owner", `https://example.com/${suffix}`],
  );
  ownerUserId = ownerResult.rows[0].id;
  const ownerObjectId = ownerResult.rows[0].objectId;
  await db.query(
    `INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt")
     VALUES ($1, $2, $3, now() + interval '1 day')`,
    [
      `waline-owner-session-${suffix}`,
      createHash("sha256").update(sessionToken).digest("hex"),
      ownerUserId,
    ],
  );

  const instanceCap = await capToken("instance");
  const created = await request("/api/dashboard/instances", {
    method: "POST",
    cookie: `walinex_session=${sessionToken}`,
    body: {
      name: "Waline Smoke Instance",
      slug,
      description: "Created by Waline client smoke test",
      capToken: instanceCap,
    },
  });
  const instance = created.data;
  await db.query(
    `UPDATE "Instance"
     SET "requireCap" = false, "moderationEnabled" = false,
         "defaultCommentStatus" = 'approved'
     WHERE id = $1`,
    [instance.id],
  );

  const tokenBody = await request(`/tenant/${slug}/api/token`, {
    cookie: `walinex_session=${sessionToken}`,
  });
  if (tokenBody.data.objectId !== ownerObjectId || tokenBody.data.url !== `https://example.com/${suffix}`) {
    throw new Error(`api/token identity mismatch: ${JSON.stringify(tokenBody.data)}`);
  }
  const ownerToken = tokenBody.data.token;
  console.log(`token endpoint: objectId=${tokenBody.data.objectId} type=${tokenBody.data.type}`);
  if (keep) {
    console.log(
      `SMOKE_FIXTURE ${JSON.stringify({ slug, sessionToken, guestSessionToken, ownerToken })}`,
    );
  }

  const root = await request(`/tenant/${slug}/api/comment`, {
    method: "POST",
    bearer: ownerToken,
    body: {
      nick: "Waline Owner",
      mail: email,
      comment: "Root comment from the Waline client smoke test.",
      ua: "waline-client-smoke",
      url,
    },
  });
  if (root.data.user_id !== ownerObjectId || root.data.type !== "administrator" || root.data.orig !== "Root comment from the Waline client smoke test.") {
    throw new Error(`create comment identity mismatch: ${JSON.stringify(root.data)}`);
  }
  console.log(`comment create: objectId=${root.data.objectId} user_id=${root.data.user_id} type=${root.data.type}`);

  const reply = await request(`/tenant/${slug}/api/comment`, {
    method: "POST",
    bearer: ownerToken,
    body: {
      nick: "Waline Owner",
      mail: email,
      comment: "Reply from the Waline client smoke test.",
      ua: "waline-client-smoke",
      url,
      pid: root.data.objectId,
      rid: root.data.objectId,
    },
  });
  if (reply.data.pid !== root.data.objectId || reply.data.rid !== root.data.objectId) {
    throw new Error(`reply pid/rid mismatch: ${JSON.stringify(reply.data)}`);
  }
  console.log(`reply create: objectId=${reply.data.objectId} pid=${reply.data.pid} rid=${reply.data.rid}`);

  const count = await request(`/tenant/${slug}/api/comment?type=count&url=${encodeURIComponent(url)}`);
  if (count.data[0] !== 2) {
    throw new Error(`expected count 2, got ${count.data[0]}`);
  }

  const recent = await request(`/tenant/${slug}/api/comment?type=recent&count=5`);
  if (!Array.isArray(recent) || recent.length < 2) {
    throw new Error(`recent should be a bare array, got ${JSON.stringify(recent).slice(0, 200)}`);
  }

  for (const sortBy of ["insertedAt_desc", "insertedAt_asc", "like_desc"]) {
    const listed = await request(
      `/tenant/${slug}/api/comment?path=${encodeURIComponent(url)}&pageSize=20&sortBy=${sortBy}`,
    );
    if (!Array.isArray(listed.data?.data)) {
      throw new Error(`sortBy ${sortBy} did not return a list`);
    }
  }
  console.log(`comment list/count/recent: count=${count.data[0]} recent=${recent.length}`);

  const users = await request(`/tenant/${slug}/api/user?pageSize=20`);
  if (!Array.isArray(users.data) || !users.data.some((user) => typeof user.level === "number")) {
    throw new Error(`user API did not include level: ${JSON.stringify(users.data).slice(0, 300)}`);
  }

  const like = await request(`/tenant/${slug}/api/comment/${root.data.objectId}`, {
    method: "PUT",
    body: { like: true },
  });
  if (like.data.like !== 1) {
    throw new Error(`like failed: ${JSON.stringify(like.data)}`);
  }
  console.log(`like/user list: like=${like.data.like} users=${users.data.length}`);

  const edited = await request(`/tenant/${slug}/api/comment/${root.data.objectId}`, {
    method: "PUT",
    bearer: ownerToken,
    body: { comment: "Edited root comment." },
  });
  if (edited.data.orig !== "Edited root comment." || edited.data.user_id !== ownerObjectId) {
    throw new Error(`author edit failed: ${JSON.stringify(edited.data)}`);
  }
  const sticky = await request(`/tenant/${slug}/api/comment/${root.data.objectId}`, {
    method: "PUT",
    bearer: ownerToken,
    body: { sticky: true },
  });
  if (sticky.data.sticky !== true) {
    throw new Error(`admin sticky update failed: ${JSON.stringify(sticky.data)}`);
  }
  console.log(`author/admin update: orig=${edited.data.orig} sticky=${sticky.data.sticky}`);

  const rss = await fetch(`${base}/tenant/${slug}/api/comment/rss?path=${encodeURIComponent(url)}`);
  const rssText = await rss.text();
  if (!rss.headers.get("content-type")?.includes("application/rss+xml") || !rssText.includes("<item>")) {
    throw new Error(`path RSS failed: ${rss.headers.get("content-type")} ${rssText.slice(0, 200)}`);
  }
  const siteRss = await fetch(`${base}/tenant/${slug}/api/comment/rss`);
  const siteRssText = await siteRss.text();
  if (!siteRss.headers.get("content-type")?.includes("application/rss+xml") || !siteRssText.includes("<item>")) {
    throw new Error(`site RSS failed: ${siteRss.headers.get("content-type")} ${siteRssText.slice(0, 200)}`);
  }
  const replyRss = await fetch(
    `${base}/tenant/${slug}/api/comment/rss?email=${encodeURIComponent(email)}&count=10`,
  );
  const replyRssText = await replyRss.text();
  if (!replyRssText.includes("<item>")) {
    throw new Error(`reply RSS did not include items: ${replyRssText.slice(0, 200)}`);
  }
  console.log("RSS feeds: path, site and reply feeds ok");

  const articleBefore = await request(
    `/tenant/${slug}/api/article?path=${encodeURIComponent(url)}&type=time`,
  );
  if (!Array.isArray(articleBefore.data) || articleBefore.data[0]?.time !== 0) {
    throw new Error(`article GET failed: ${JSON.stringify(articleBefore).slice(0, 200)}`);
  }
  const articleAfter = await request(`/tenant/${slug}/api/article`, {
    method: "POST",
    body: { path: url, type: "time", action: "inc" },
  });
  if (!Array.isArray(articleAfter.data) || articleAfter.data[0]?.time !== 1) {
    throw new Error(`article POST failed: ${JSON.stringify(articleAfter).slice(0, 200)}`);
  }
  console.log("article counter: GET/POST ok");

  const rootToken = await request(`/tenant/${slug}/token`, {
    bearer: ownerToken,
  });
  if (rootToken.data.objectId !== ownerObjectId || rootToken.data.type !== "administrator" || !rootToken.data.token) {
    throw new Error(`root token mismatch: ${JSON.stringify(rootToken.data)}`);
  }
  console.log(`root /token: objectId=${rootToken.data.objectId} type=${rootToken.data.type}`);

  const guestResult = await db.query(
    `INSERT INTO "User" (id, email, name, url, plan, "updatedAt")
     VALUES ($1, $2, $3, NULL, 'free', now()) RETURNING id, "objectId"`,
    [`waline-guest-${suffix}`, guestEmail, "Waline Guest"],
  );
  guestUserId = guestResult.rows[0].id;
  await db.query(
    `INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt")
     VALUES ($1, $2, $3, now() + interval '1 day')`,
    [
      `waline-guest-session-${suffix}`,
      createHash("sha256").update(guestSessionToken).digest("hex"),
      guestUserId,
    ],
  );
  const guestTokenBody = await request(`/tenant/${slug}/api/token`, {
    cookie: `walinex_session=${guestSessionToken}`,
  });
  const guestToken = guestTokenBody.data.token;
  if (guestTokenBody.data.type !== "guest") {
    throw new Error(`guest token type mismatch: ${JSON.stringify(guestTokenBody.data)}`);
  }

  const guestComment = await request(`/tenant/${slug}/api/comment`, {
    method: "POST",
    bearer: guestToken,
    body: {
      nick: "Waline Guest",
      mail: guestEmail,
      comment: "Guest comment from the smoke test.",
      ua: "waline-client-smoke",
      url,
    },
  });
  if (guestComment.data.type !== "guest" || guestComment.data.user_id !== guestTokenBody.data.objectId) {
    throw new Error(`guest identity mismatch: ${JSON.stringify(guestComment.data)}`);
  }

  const forbiddenDelete = await fetch(
    `${base}/tenant/${slug}/api/comment/${root.data.objectId}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${guestToken}` },
    },
  );
  if (forbiddenDelete.status !== 403) {
    throw new Error(`guest delete owner comment should be 403, got ${forbiddenDelete.status}`);
  }

  const guestEdit = await request(`/tenant/${slug}/api/comment/${guestComment.data.objectId}`, {
    method: "PUT",
    bearer: guestToken,
    body: { comment: "Guest edited comment." },
  });
  if (guestEdit.data.orig !== "Guest edited comment.") {
    throw new Error(`guest edit failed: ${JSON.stringify(guestEdit.data)}`);
  }
  const guestSticky = await fetch(
    `${base}/tenant/${slug}/api/comment/${guestComment.data.objectId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${guestToken}` },
      body: JSON.stringify({ sticky: true }),
    },
  );
  if (guestSticky.status !== 400) {
    throw new Error(`guest sticky update should be 400, got ${guestSticky.status}`);
  }
  const guestDelete = await request(`/tenant/${slug}/api/comment/${guestComment.data.objectId}`, {
    method: "DELETE",
    bearer: guestToken,
  });
  if (guestDelete.data !== "") {
    throw new Error(`guest delete failed: ${JSON.stringify(guestDelete.data)}`);
  }
  console.log("guest permissions: edit/delete ok, admin fields denied");

  const options = await fetch(`${base}/tenant/${slug}/api/comment`, { method: "OPTIONS" });
  if (options.status !== 204 || !options.headers.get("access-control-allow-origin")) {
    throw new Error(`OPTIONS CORS failed: ${options.status}`);
  }
  console.log("Waline client smoke test passed");
} finally {
  if (ownerUserId && !keep) {
    await db.query(`DELETE FROM "User" WHERE id = $1`, [ownerUserId]);
  }
  if (guestUserId && !keep) {
    await db.query(`DELETE FROM "User" WHERE id = $1`, [guestUserId]);
  }
  await db.end();
}
