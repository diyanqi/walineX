import { createHash } from "node:crypto";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const scope = process.env.CAP_SCOPE || "login";

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

async function solve(salt, target, maxAttempts = 5_000_000) {
  for (let nonce = 0; nonce < maxAttempts; nonce++) {
    const digest = createHash("sha256").update(`${salt}${nonce}`).digest();
    if (matchesPrefix(digest, target)) return nonce;
  }
  throw new Error(`failed to solve puzzle after ${maxAttempts} attempts`);
}

async function redeemCap(scope) {
  const challengeResponse = await fetch(`${base}/api/cap/${scope}/challenge`, {
    method: "POST",
  });
  if (!challengeResponse.ok) {
    throw new Error(`challenge ${scope} failed: ${challengeResponse.status} ${await challengeResponse.text()}`);
  }
  const challengeBody = await challengeResponse.json();
  if (!challengeBody.challenge || !challengeBody.token) {
    throw new Error(`unexpected challenge body: ${JSON.stringify(challengeBody)}`);
  }
  const { challenge, token } = challengeBody;
  console.log(
    `challenge ok: scope=${scope} c=${challenge.c} s=${challenge.s} d=${challenge.d}`,
  );

  const tokenFnv = fnv1a(token);
  const solutions = [];
  for (let i = 1; i <= challenge.c; i++) {
    const saltSeed = fnv1aResume(tokenFnv, String(i));
    const targetSeed = fnv1aResume(saltSeed, "d");
    const salt = prngFromHash(saltSeed, challenge.s);
    const target = prngFromHash(targetSeed, challenge.d);
    solutions.push(await solve(salt, target));
    if (i % 10 === 0) console.log(`solved ${i}/${challenge.c}`);
  }

  const redeemResponse = await fetch(`${base}/api/cap/${scope}/redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, solutions }),
  });
  const redeemBody = await redeemResponse.json();
  console.log(`redeem status=${redeemResponse.status}`);
  console.log(JSON.stringify(redeemBody));
  if (!redeemResponse.ok || !redeemBody.success || !redeemBody.token) {
    throw new Error(`redeem ${scope} failed`);
  }
  return redeemBody.token;
}

async function assertAuthStart(provider, capToken) {
  const authResponse = await fetch(`${base}/api/auth/${provider}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ redirect: "/dashboard", capToken }),
  });
  const authBody = await authResponse.json();
  console.log(`auth-start ${provider} status=${authResponse.status}`);
  console.log(JSON.stringify(authBody));
  if (!authResponse.ok || authBody.errno !== 0) {
    throw new Error(`auth-start ${provider} failed`);
  }
  const redirect = authBody.data?.redirectUrl;
  let callback = "";
  try {
    callback = new URL(redirect).searchParams.get("redirect_uri") || "";
  } catch {
    callback = "";
  }
  const expected = `https://${
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "waline.infvar.com"
  }/api/auth/${provider}/callback`;
  if (callback !== expected) {
    throw new Error(`auth-start ${provider} did not include its callback URL`);
  }
}

await assertAuthStart("github", await redeemCap(scope));
await assertAuthStart("google", await redeemCap(scope));
console.log("cap smoke test passed");
