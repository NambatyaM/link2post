const crypto = require("crypto");

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "contentrep-dev-secret-change-in-production",
);

function base64url(data) {
  return Buffer.from(data)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

function createSig(header, body, secret) {
  return base64url(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest(),
  );
}

function signJwtPayload(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const sig = createSig(header, body, secret);
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [header, body, sig] = parts;
  const expectedSig = createSig(header, body, secret);
  if (sig !== expectedSig) throw new Error("Invalid signature");
  return JSON.parse(base64urlDecode(body).toString());
}

class SignJWT {
  #payload;
  #protectedHeader = {};

  constructor(payload = {}) {
    this.#payload = { ...payload };
  }

  setProtectedHeader(header) {
    this.#protectedHeader = header;
    return this;
  }

  setIssuedAt() {
    this.#payload.iat = Math.floor(Date.now() / 1000);
    return this;
  }

  setExpirationTime(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      this.#payload.exp = Math.floor(Date.now() / 1000) + 3600;
    } else {
      const [, num, unit] = match;
      const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
      this.#payload.exp =
        Math.floor(Date.now() / 1000) + parseInt(num, 10) * multipliers[unit];
    }
    return this;
  }

  sign(secret) {
    return signJwtPayload(this.#payload, secret);
  }
}

async function jwtVerify(token, secret) {
  const payload = verifyJwt(token, secret);
  return { payload };
}

module.exports = { SignJWT, jwtVerify };
