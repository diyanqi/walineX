import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

if (process.loadEnvFile) {
  process.loadEnvFile(".env");
}

const { Client } = pg;
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(6).toString("hex");
const email = `smoke-${suffix}@example.com`;
const sessionToken = `smoke-session-${suffix}`;
const slug = `smoke-${suffix}`;

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

let userId;
try {
  const userResult = await db.query(
    `INSERT INTO "User" (id, email, name, plan, "updatedAt")
     VALUES ($1, $2, $3, 'starter', now()) RETURNING id`,
    [`smoke-user-${suffix}`, email, "Smoke Tester"],
  );
  userId = userResult.rows[0].id;
  await db.query(
    `INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt")
     VALUES ($1, $2, $3, now() + interval '1 day')`,
    [
      `smoke-session-${suffix}`,
      createHash("sha256").update(sessionToken).digest("hex"),
      userId,
    ],
  );

  const cookie = `walinex_session=${sessionToken}`;
  const instanceToken = await capToken("instance");
  const created = await request("/api/dashboard/instances", {
    method: "POST",
    cookie,
    body: {
      name: "Smoke Instance",
      slug,
      description: "Created by backend smoke test",
      capToken: instanceToken,
    },
  });
  const instance = created.data;
  console.log(`instance created: ${instance.slug} (${instance.id})`);

  await db.query(`UPDATE "User" SET plan = 'free' WHERE id = $1`, [userId]);
  const gatedPatchResponse = await fetch(`${base}/api/dashboard/instances/${instance.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ notifyModeration: true }),
  });
  const gatedPatchBody = await gatedPatchResponse.json();
  console.log(
    `free plan notification patch: status=${gatedPatchResponse.status} body=${JSON.stringify(gatedPatchBody)}`,
  );
  if (gatedPatchResponse.status !== 403 || gatedPatchBody.errno !== 403) {
    throw new Error("expected free plan notification patch to be rejected");
  }
  await db.query(`UPDATE "User" SET plan = 'starter' WHERE id = $1`, [userId]);

  await db.query(
    `UPDATE "Instance"
     SET "notifyModeration" = true, "wechatNotificationEnabled" = true,
         "wechatBotTokenEncrypted" = 'smoke-token', "wechatBaseUrl" = 'https://example.com',
         "wechatUserId" = 'smoke@im.wechat',
         "requireCap" = true, "moderationEnabled" = false,
         "defaultCommentStatus" = 'approved'
     WHERE id = $2`,
    [instance.id],
  );

  const missingCapResponse = await fetch(`${base}/tenant/${slug}/api/comment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nick: "NoCap",
      mail: "nocap@example.com",
      comment: "This should fail without a CAP token.",
      ua: "backend-smoke",
      url: "/smoke",
    }),
  });
  const missingCapBody = await missingCapResponse.json();
  console.log(`missing CAP: status=${missingCapResponse.status} body=${JSON.stringify(missingCapBody)}`);
  if (missingCapResponse.status !== 400 || missingCapBody.errno !== 400) {
    throw new Error("expected requireCap to reject a missing token");
  }

  const normalToken = await capToken("comment");
  const normal = await request(`/tenant/${slug}/api/comment`, {
    method: "POST",
    body: {
      nick: "Normal",
      mail: "normal@example.com",
      comment: "This is a normal smoke comment.",
      ua: "backend-smoke",
      url: "/smoke",
      capToken: normalToken,
    },
  });
  console.log(`normal comment: objectId=${normal.data.objectId} status=${normal.data.status}`);
  const normalRow = await db.query(
    `SELECT status FROM "Comment" WHERE "objectId" = $1`,
    [normal.data.objectId],
  );
  if (normalRow.rows[0].status !== "approved") {
    throw new Error(`expected normal comment approved, got ${normalRow.rows[0].status}`);
  }

  const replyToken = await capToken("comment");
  const reply = await request(`/tenant/${slug}/api/comment`, {
    method: "POST",
    body: {
      nick: "Replier",
      mail: "replier@example.com",
      comment: "A reply to the normal comment.",
      ua: "backend-smoke",
      url: "/smoke",
      pid: normal.data.objectId,
      rid: normal.data.objectId,
      capToken: replyToken,
    },
  });
  console.log(
    `reply comment: objectId=${reply.data.objectId} pid=${reply.data.pid} rid=${reply.data.rid}`,
  );
  if (reply.data.pid !== normal.data.objectId || reply.data.rid !== normal.data.objectId) {
    throw new Error("reply did not preserve pid/rid");
  }

  const duplicateToken = await capToken("comment");
  const duplicateResponse = await fetch(`${base}/tenant/${slug}/api/comment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nick: "Replier",
      mail: "replier@example.com",
      comment: "A reply to the normal comment.",
      ua: "backend-smoke",
      url: "/smoke",
      pid: normal.data.objectId,
      rid: normal.data.objectId,
      capToken: duplicateToken,
    }),
  });
  const duplicateBody = await duplicateResponse.json();
  console.log(`duplicate reply: status=${duplicateResponse.status} body=${JSON.stringify(duplicateBody)}`);
  if (duplicateResponse.status !== 400) {
    throw new Error("expected duplicate comment to be rejected");
  }

  const likeResponse = await fetch(
    `${base}/tenant/${slug}/api/comment/${normal.data.objectId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ like: true }),
    },
  );
  const likeBody = await likeResponse.json();
  console.log(`like: status=${likeResponse.status} like=${likeBody.data?.like}`);
  if (likeResponse.status !== 200 || likeBody.data?.like !== 1) {
    throw new Error("expected first like to succeed");
  }
  const duplicateLikeResponse = await fetch(
    `${base}/tenant/${slug}/api/comment/${normal.data.objectId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ like: true }),
    },
  );
  if (duplicateLikeResponse.status !== 400) {
    throw new Error("expected duplicate like to be rejected");
  }

  const reviewToken = await capToken("comment");
  const review = await request(`/tenant/${slug}/api/comment`, {
    method: "POST",
    body: {
      nick: "Review",
      mail: "review@example.com",
      comment: "This includes 广告 and needs review.",
      ua: "backend-smoke",
      url: "/smoke",
      capToken: reviewToken,
    },
  });
  const reviewRow = await db.query(
    `SELECT status, "moderationReason" FROM "Comment" WHERE "objectId" = $1`,
    [review.data.objectId],
  );
  const reviewComment = reviewRow.rows[0];
  console.log(
    `review comment: objectId=${review.data.objectId} status=${reviewComment.status} reason=${reviewComment.moderationReason || ""}`,
  );
  if (reviewComment.status !== "waiting") {
    throw new Error(`expected waiting status, got ${reviewComment.status}`);
  }

  const blockToken = await capToken("comment");
  const blockedResponse = await fetch(`${base}/tenant/${slug}/api/comment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nick: "Blocked",
      mail: "blocked@example.com",
      comment: "This contains 代刷 and must be blocked.",
      ua: "backend-smoke",
      url: "/smoke",
      capToken: blockToken,
    }),
  });
  const blockedBody = await blockedResponse.json();
  console.log(`blocked comment: status=${blockedResponse.status} body=${JSON.stringify(blockedBody)}`);
  if (blockedResponse.status !== 403 || blockedBody.errno !== 403) {
    throw new Error("expected sensitive word to block the comment");
  }

  const notifications = await db.query(
    `SELECT type, status, error FROM "Notification" WHERE "instanceId" = $1 ORDER BY "createdAt" DESC`,
    [instance.id],
  );
  console.log(`notifications: ${JSON.stringify(notifications.rows)}`);
  if (!notifications.rows.some((row) => row.type === "moderation")) {
    throw new Error("expected a moderation notification row");
  }

  const listed = await request(`/tenant/${slug}/api/comment?path=/smoke&pageSize=50`);
  const root = listed.data.data.find((item) => item.objectId === normal.data.objectId);
  if (!root || !Array.isArray(root.children) || root.children.length !== 1) {
    throw new Error("public list did not include the approved root with its reply child");
  }
  console.log(`public list: roots=${listed.data.data.length} children=${root.children.length}`);

  const countBody = await request(`/tenant/${slug}/api/comment?type=count&url=/smoke`);
  if (countBody.data[0] !== 2) {
    throw new Error(`expected article comment count 2, got ${countBody.data[0]}`);
  }
  console.log(`comment count: ${countBody.data[0]}`);

  const articlePost = await request(`/tenant/${slug}/api/article`, {
    method: "POST",
    body: { path: "/smoke", type: "time", action: "inc" },
  });
  const articleGet = await request(`/tenant/${slug}/api/article?path=/smoke&type=time`);
  if (articlePost.data[0].time !== 1 || articleGet.data[0].time !== 1) {
    throw new Error("article counter did not persist an increment");
  }
  console.log(`article counter: ${articleGet.data[0].time}`);

  const users = await request(`/tenant/${slug}/api/user?pageSize=20`);
  if (!Array.isArray(users.data) || users.data.length < 2) {
    throw new Error("user API did not return comment authors");
  }
  console.log(`user API: ${users.data.length} users`);

  const dashboardList = await request(
    `/api/dashboard/comments?instanceId=${instance.id}&pageSize=50`,
    { cookie },
  );
  const found = dashboardList.data.find((item) => item.objectId === review.data.objectId);
  if (!found) {
    throw new Error("dashboard comment list did not include the review comment");
  }
  console.log(`dashboard list: ${dashboardList.count} comments`);

  const whitelistPatch = await fetch(`${base}/api/dashboard/instances/${instance.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ targetOrigins: ["https://allowed.example.com"] }),
  });
  const whitelistBody = await whitelistPatch.json();
  if (!whitelistPatch.ok || whitelistBody.errno !== 0) {
    throw new Error(`target origin whitelist patch failed: ${JSON.stringify(whitelistBody)}`);
  }

  const allowedOrigin = await fetch(`${base}/tenant/${slug}/api/comment?path=/smoke`, {
    headers: { origin: "https://allowed.example.com" },
  });
  if (allowedOrigin.status !== 200) {
    throw new Error(`allowed origin got ${allowedOrigin.status}`);
  }

  const deniedOrigin = await fetch(`${base}/tenant/${slug}/api/comment?path=/smoke`, {
    headers: { origin: "https://evil.example.com" },
  });
  const deniedBody = await deniedOrigin.json();
  if (deniedOrigin.status !== 403 || deniedBody.errno !== 403) {
    throw new Error(`denied origin got ${deniedOrigin.status} ${JSON.stringify(deniedBody)}`);
  }

  const directRequest = await fetch(`${base}/tenant/${slug}/api/comment?path=/smoke`);
  const directBody = await directRequest.json();
  if (directRequest.status !== 403 || directBody.errno !== 403) {
    throw new Error(`direct request got ${directRequest.status} ${JSON.stringify(directBody)}`);
  }

  const allowedPreflight = await fetch(`${base}/tenant/${slug}/api/comment`, {
    method: "OPTIONS",
    headers: {
      origin: "https://allowed.example.com",
      "access-control-request-method": "POST",
    },
  });
  if (
    allowedPreflight.status !== 204 ||
    allowedPreflight.headers.get("access-control-allow-origin") !==
      "https://allowed.example.com"
  ) {
    throw new Error("allowed preflight did not include the whitelisted origin");
  }

  const deniedPreflight = await fetch(`${base}/tenant/${slug}/api/comment`, {
    method: "OPTIONS",
    headers: {
      origin: "https://evil.example.com",
      "access-control-request-method": "POST",
    },
  });
  if (deniedPreflight.headers.has("access-control-allow-origin")) {
    throw new Error("denied preflight incorrectly allowed a non-whitelisted origin");
  }
  console.log("CORS whitelist: allowed/denied/direct/preflight checks passed");

  const commentRow = await db.query(
    `SELECT "consumedAt" FROM "CapRedemption"
     WHERE "tokenKey" = $1`,
    [`${normalToken.split(":")[0]}:${createHash("sha256").update(normalToken.split(":")[1]).digest("hex")}`],
  );
  if (commentRow.rowCount !== 1 || !commentRow.rows[0].consumedAt) {
    throw new Error("comment CAP redemption was not consumed");
  }
  console.log("backend smoke test passed");
} finally {
  if (userId) {
    await db.query(`DELETE FROM "User" WHERE id = $1`, [userId]);
  }
  await redis.quit().catch(() => {});
  await db.end();
}
