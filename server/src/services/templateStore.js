import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.TEMPLATES_FILE || path.resolve(here, "../../data/templates.json");

// Writes go through one queue so two saves can't overwrite each other.
let queue = Promise.resolve();
const serialize = (fn) => (queue = queue.then(fn, fn));

async function readAll() {
  try { return JSON.parse(await readFile(FILE, "utf8")); }
  catch (e) { if (e.code === "ENOENT") return []; throw e; }
}

async function writeAll(list) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(list, null, 2));
  await rename(tmp, FILE);
}

export const listTemplates = () => readAll();

export const saveTemplate = (tpl) =>
  serialize(async () => {
    const list = (await readAll()).filter((t) => t.name !== tpl.name);
    list.push(tpl);
    list.sort((a, b) => a.name.localeCompare(b.name));
    await writeAll(list);
    return list;
  });

export const deleteTemplate = (name) =>
  serialize(async () => {
    const list = (await readAll()).filter((t) => t.name !== name);
    await writeAll(list);
    return list;
  });
