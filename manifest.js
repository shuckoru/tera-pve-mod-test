"use strict";
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const IGNORED_FILES = [
  "manifest.js",
  "manifest.json",
  "README.md",
  "module.config.json",
];

const IGNORE_FOLDERS = ["config\\", "logs\\"];

const INCLUDE_PATTERNS = ["config\\defaults"];

const IGNORED_START_SYMBOL = [".", "_"];

//load predefined manifest
let manifest = undefined;
try {
  manifest = require("./manifest.json");
  if (manifest && typeof manifest === "object") {
    if (!manifest.files) manifest.files = {};
  } else manifest = { files: {} };
} catch (err) {
  manifest = { files: {} };
}

//cleanup manifest
Object.keys(manifest.files).forEach((entry) => {
  try {
    fs.accessSync(path.join(__dirname, entry), fs.constants.F_OK);
  } catch (err) {
    delete manifest.files[entry];
  }
});

//recursive file gather
function findInDirRelative(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const fileStat = fs.lstatSync(filePath);

    if (IGNORE_FOLDERS.find((f) => filePath.includes(f))) {
      let isPresent;
      for (let i = 0; i < INCLUDE_PATTERNS.length; i++) {
        const pattern = INCLUDE_PATTERNS[i];
        if (!isPresent && filePath.includes(pattern)) isPresent = true;
      }
      if (!isPresent) return;
    }

    if (
      !IGNORED_FILES.includes(file) &&
      !IGNORED_START_SYMBOL.includes(file[0])
    ) {
      if (fileStat.isDirectory()) findInDirRelative(filePath, fileList);
      else fileList.push(path.relative(__dirname, filePath));
    }
  });
  return fileList;
}

//generate hash
const files = findInDirRelative(__dirname);
files.forEach((filePath) => {
  let file = filePath.replace(/\\/g, "/");
  if (manifest.files[file] && typeof manifest.files[file] === "object") {
    manifest.files[file].hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, file)))
      .digest("hex");
  } else
    manifest.files[file] = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, file)))
      .digest("hex");
});

//save file
fs.writeFileSync(
  path.join(__dirname, "manifest.json"),
  JSON.stringify(manifest, null, "\t"),
  "utf8"
);
