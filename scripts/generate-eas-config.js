#!/usr/bin/env node
/**
 * Reads all schools/configs/*.json files and generates apps/mobile/eas.json
 * with one build profile per school.
 *
 * Usage: node scripts/generate-eas-config.js
 */

const fs = require("fs");
const path = require("path");

const configsDir = path.join(__dirname, "../schools/configs");
const easOutputPath = path.join(__dirname, "../apps/mobile/eas.json");

const schoolFiles = fs.readdirSync(configsDir).filter((f) => f.endsWith(".json"));

const buildProfiles = {};

const REQUIRED_FIELDS = ["slug", "name", "schoolId", "primaryColor", "bundleIdentifier", "playStorePackage", "iconPath", "splashPath"];

for (const file of schoolFiles) {
  let school;
  try {
    school = JSON.parse(fs.readFileSync(path.join(configsDir, file), "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse ${file}: ${err.message}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!school[field]) throw new Error(`${file} is missing required field: ${field}`);
  }

  buildProfiles[school.slug] = {
    android: {
      buildType: "apk",
    },
    env: {
      EXPO_PUBLIC_SCHOOL_ID: school.schoolId,
      EXPO_PUBLIC_SCHOOL_NAME: school.name,
      EXPO_PUBLIC_PRIMARY_COLOR: school.primaryColor,
      EXPO_PUBLIC_BUNDLE_ID: school.bundleIdentifier,
      EXPO_PUBLIC_PLAY_STORE_PACKAGE: school.playStorePackage,
      EXPO_PUBLIC_ICON_PATH: school.iconPath,
      EXPO_PUBLIC_SPLASH_PATH: school.splashPath,
    },
  };
}

const easConfig = {
  cli: {
    version: ">= 10.0.0",
  },
  build: buildProfiles,
};

fs.writeFileSync(easOutputPath, JSON.stringify(easConfig, null, 2) + "\n");
console.log(`✓ Generated eas.json with ${schoolFiles.length} school profile(s):`);
schoolFiles.forEach((f) => console.log(`  - ${f.replace(".json", "")}`));
