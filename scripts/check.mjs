import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;

function run(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(NODE, args, { cwd: ROOT, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${args.join(" ")} exited with ${code}.`));
    });
  });
}

await run(["scripts/validate.mjs"]);
await run(["--test"]);
await run(["scripts/build.mjs"]);
