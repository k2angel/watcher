import fs from 'node:fs';
import { stat, utimes } from 'node:fs/promises';
import path from 'node:path'
import { pipeline } from 'node:stream/promises';

import { EmbedBuilder } from 'discord.js';

import { config, pkg } from './vars.js'


/**
 *
 * @param {string} title
 */
function embedTemplate(title) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setFooter({ text: `${pkg.name} v${pkg.version}`, iconURL: 'https://github.com/identicons/k2angel.png'})
    .setTimestamp();
  return embed
}

/**
 *
 * @param {string} url
 * @param {string} dest
 */
async function download(url, dest) {
  const dir = path.dirname(dest);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  if (res.headers.get('Content-Length') / (1024 * 1024) > config.sizeLimit) return;

  fs.mkdirSync(dir, { recursive: true });
  await pipeline(res.body, fs.createWriteStream(dest));
  const domain = new URL(url).hostname;
  const relativePath = path.relative(process.cwd(), dest);
  console.log(`saved > ${domain} to "${relativePath}"`);
};

/**
 *
 * @param {string} url
 */
async function getTwitterMediaURLs(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);

  const data = await res.json();
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
  if (!fs.existsSync(dest)) return;

  const s = await stat(dest);
  await utimes(dest, s.atime, mtime);
  const relativePath = path.relative(process.cwd(), dest);
  console.log(`update timestamp "${relativePath}" > ${s.mtime.getTime()} to ${mtime.getTime()}`);
}

export { embedTemplate, download, getTwitterMediaURLs, getVxtwitterUrls, updateTimestamp }
