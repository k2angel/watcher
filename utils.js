const fs = require('node:fs');
const { stat, utimes } = require('node:fs/promises');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

/**
 *
 * @param {string} url
 * @param {string} dest
 */
async function download(url, dest) {
    const dir = path.dirname(dest);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);

    fs.mkdirSync(dir, { recursive: true });
    await pipeline(res.body, fs.createWriteStream(dest));
    const domain = new URL(url).hostname;
    const relativePath = path.relative(__dirname, dest);
    console.log(`saved > ${domain} to "${relativePath}"`);
};

/**
 *
 * @param {string} url
 */
async function getTwitterMediaURLs(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);

    data = await res.json();
    return data.mediaURLs
}

/**
 *
 * @param {string} text
 * @returns
 */
function getVxtwitterUrls(text) {
    const urlPattern = /https?:\/\/(?:x\.com|twitter\.com|vxtwitter\.com)\/([a-zA-Z0-9_]{1,15})\/status\/(\d+)/gm;
    return Array.from(text.matchAll(urlPattern), m => `https://api.vxtwitter.com/${m[1]}/status/${m[2]}`);
}

/**
 *
 * @param {string} dest
 * @param {Date|number} mtime
 */
async function updateTimestamp(dest, mtime) {
    const s = await stat(dest);
    await utimes(dest, s.atime, mtime);
    const relativePath = path.relative(__dirname, dest);
    console.log(`update timestamp "${relativePath}" > ${s.mtime.getTime()} to ${mtime.getTime()}`);
}

module.exports = { download, getTwitterMediaURLs, getVxtwitterUrls, updateTimestamp }
