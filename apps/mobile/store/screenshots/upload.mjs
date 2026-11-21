// Uploads the rendered screenshots in out/ to the stores:
//   node upload.mjs apple <version> [locale...]
//   node upload.mjs play --skip <shot> [locale...]
// Apple puts them on <version>, creating it beside the live one when it is missing.
// Play replaces the phone screenshots and the feature graphic in each listing and commits the edit.
// Keys live outside the repo; see "Uploading by API" in ../checklist.md.
import { createHash, createSign } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
const keys = process.env.LYMI_STORE_KEYS ?? join(homedir(), ".lymi", "keys");
const bundleId = "app.lymi";

const appleLocales = { en: "en-US", uk: "uk", ru: "ru" };
const playLocales = { en: "en-US", uk: "uk", ru: "ru-RU" };
// App Store Connect's slots for the two sizes set.mjs renders.
const appleSlots = { 6.9: "APP_IPHONE_67", 6.3: "APP_IPHONE_61" };

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const shots = (dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".jpg"))
    .sort()
    .map((name) => join(dir, name));

async function call(url, init, what) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`${what}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// App Store Connect ------------------------------------------------------------------------------

function appleToken() {
  const { keyId, issuerId } = JSON.parse(
    readFileSync(join(keys, "app-store-connect.json"), "utf8"),
  );
  const key = readFileSync(join(keys, `AuthKey_${keyId}.p8`), "utf8");
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "ES256", kid: keyId, typ: "JWT" })}.${b64({ iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" })}`;
  const signature = createSign("SHA256").update(body).sign({ key, dsaEncoding: "ieee-p1363" });
  return `${body}.${signature.toString("base64url")}`;
}

function asc(path, init = {}) {
  return call(
    `https://api.appstoreconnect.apple.com${path}`,
    {
      ...init,
      headers: { Authorization: `Bearer ${appleToken()}`, "content-type": "application/json" },
      body: init.body && JSON.stringify(init.body),
    },
    `${init.method ?? "GET"} ${path}`,
  );
}

async function editableVersion(appId, versionString) {
  const { data } = await asc(
    `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${versionString}`,
  );
  const found = data[0];
  if (found) {
    const state = found.attributes.appStoreState;
    if (
      !["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"].includes(
        state,
      )
    ) {
      throw new Error(`Version ${versionString} is ${state}; its screenshots are locked.`);
    }
    return found.id;
  }
  const created = await asc("/v1/appStoreVersions", {
    method: "POST",
    body: {
      data: {
        type: "appStoreVersions",
        attributes: { platform: "IOS", versionString },
        relationships: { app: { data: { type: "apps", id: appId } } },
      },
    },
  });
  console.log(`created version ${versionString}`);
  return created.data.id;
}

async function uploadAppleShot(setId, file) {
  const bytes = readFileSync(file);
  const { data } = await asc("/v1/appScreenshots", {
    method: "POST",
    body: {
      data: {
        type: "appScreenshots",
        attributes: { fileName: basename(file), fileSize: bytes.length },
        relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: setId } } },
      },
    },
  });
  for (const part of data.attributes.uploadOperations) {
    await call(
      part.url,
      {
        method: part.method,
        headers: Object.fromEntries(part.requestHeaders.map((h) => [h.name, h.value])),
        body: bytes.subarray(part.offset, part.offset + part.length),
      },
      `upload ${file}`,
    );
  }
  await asc(`/v1/appScreenshots/${data.id}`, {
    method: "PATCH",
    body: {
      data: {
        type: "appScreenshots",
        id: data.id,
        attributes: {
          uploaded: true,
          sourceFileChecksum: createHash("md5").update(bytes).digest("hex"),
        },
      },
    },
  });
  return data.id;
}

async function waitForApple(ids) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const states = await Promise.all(
      ids.map(
        async (id) => (await asc(`/v1/appScreenshots/${id}`)).data.attributes.assetDeliveryState,
      ),
    );
    const failed = states.find((s) => s.state === "FAILED");
    if (failed) throw new Error(`Apple rejected a screenshot: ${JSON.stringify(failed.errors)}`);
    if (states.every((s) => s.state === "COMPLETE")) return;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Apple is still processing the screenshots after five minutes.");
}

async function apple(versionString, languages) {
  if (!versionString) throw new Error("Name the version, as in: node upload.mjs apple 1.0.1");
  const { data: apps } = await asc(`/v1/apps?filter[bundleId]=${bundleId}`);
  const versionId = await editableVersion(apps[0].id, versionString);
  const { data: localizations } = await asc(
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`,
  );
  for (const lang of languages) {
    const locale = appleLocales[lang];
    const localization = localizations.find((l) => l.attributes.locale === locale);
    if (!localization) throw new Error(`Version ${versionString} has no ${locale} localization.`);
    const { data: sets } = await asc(
      `/v1/appStoreVersionLocalizations/${localization.id}/appScreenshotSets?include=appScreenshots&limit[appScreenshots]=10`,
    );
    for (const [size, slot] of Object.entries(appleSlots)) {
      let set = sets.find((s) => s.attributes.screenshotDisplayType === slot);
      if (set) {
        for (const old of set.relationships.appScreenshots.data) {
          await asc(`/v1/appScreenshots/${old.id}`, { method: "DELETE" });
        }
      } else {
        set = (
          await asc("/v1/appScreenshotSets", {
            method: "POST",
            body: {
              data: {
                type: "appScreenshotSets",
                attributes: { screenshotDisplayType: slot },
                relationships: {
                  appStoreVersionLocalization: {
                    data: { type: "appStoreVersionLocalizations", id: localization.id },
                  },
                },
              },
            },
          })
        ).data;
      }
      const ids = [];
      for (const file of shots(join(out, lang, size)))
        ids.push(await uploadAppleShot(set.id, file));
      await waitForApple(ids);
      console.log(`apple ${locale} ${size}: ${ids.length}`);
    }
  }
}

// Google Play ------------------------------------------------------------------------------------

async function playToken() {
  const account = JSON.parse(readFileSync(join(keys, "play-service-account.json"), "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(body)
    .sign(account.private_key)
    .toString("base64url");
  const token = await call(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${body}.${signature}`,
      }),
    },
    "Google token",
  );
  return token.access_token;
}

async function play(skip, languages) {
  const token = await playToken();
  const auth = { Authorization: `Bearer ${token}` };
  const app = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${bundleId}`;
  const upload = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${bundleId}`;
  const edit = await call(`${app}/edits`, { method: "POST", headers: auth }, "open edit");
  try {
    for (const lang of languages) {
      const listing = `edits/${edit.id}/listings/${playLocales[lang]}`;
      const images = (type, files) => async () => {
        await call(
          `${app}/${listing}/${type}`,
          { method: "DELETE", headers: auth },
          `clear ${type}`,
        );
        for (const file of files) {
          await call(
            `${upload}/${listing}/${type}?uploadType=media`,
            {
              method: "POST",
              headers: { ...auth, "content-type": "image/jpeg" },
              body: readFileSync(file),
            },
            `upload ${file}`,
          );
        }
      };
      // Play takes at most eight phone screenshots.
      const phone = shots(join(out, lang, "play")).filter(
        (file) => basename(file) !== `${skip}.jpg`,
      );
      if (phone.length > 8)
        throw new Error("Play takes at most eight; pass --skip with a shot number.");
      await images("phoneScreenshots", phone)();
      await images("featureGraphic", [join(out, "play-feature", `${lang}.jpg`)])();
      console.log(`play ${playLocales[lang]}: ${phone.length} + feature graphic`);
    }
    await call(`${app}/edits/${edit.id}:commit`, { method: "POST", headers: auth }, "commit edit");
    console.log("play edit committed");
  } catch (error) {
    await fetch(`${app}/edits/${edit.id}`, { method: "DELETE", headers: auth });
    throw error;
  }
}

// ------------------------------------------------------------------------------------------------

const [store, ...rest] = process.argv.slice(2);
const skipAt = rest.indexOf("--skip");
const skip = skipAt >= 0 ? rest.splice(skipAt, 2)[1]?.padStart(2, "0") : undefined;
const pick = (args) => {
  const languages = args.length ? args : ["en", "uk", "ru"];
  for (const lang of languages) {
    if (!statSync(join(out, lang), { throwIfNoEntry: false })) {
      throw new Error(`No ${lang} screenshots in out/. Run set.mjs first.`);
    }
  }
  return languages;
};

if (store === "apple") await apple(rest[0], pick(rest.slice(1)));
else if (store === "play") await play(skip, pick(rest));
else console.log("node upload.mjs apple <version> [locale...] | play --skip <shot> [locale...]");
