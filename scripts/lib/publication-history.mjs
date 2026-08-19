import { spawnSync } from "node:child_process";

export const PUBLICATION_REPOSITORY_PATH = "data/investments/publication.json";

export function selectPreviousDistinctPublicationText(currentText, candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0 && candidate !== currentText) return candidate;
  }
  return null;
}

function git(root, args) {
  return spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
}

function requireGitResult(result, operation) {
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || "unknown Git error").trim();
    throw new Error(`Cannot prove append-only Investments history: ${operation} failed${detail ? ` (${detail})` : ""}.`);
  }
  return result.stdout;
}

export function previousDistinctPublicationText(root, currentText, { runGit = git, baseRef = null } = {}) {
  const shallow = requireGitResult(
    runGit(root, ["rev-parse", "--is-shallow-repository"]),
    "Git shallow-history check"
  ).trim();
  if (shallow !== "true" && shallow !== "false") {
    throw new Error("Cannot prove append-only Investments history: Git returned an invalid shallow-history state.");
  }
  if (shallow === "true") {
    throw new Error("Cannot prove append-only Investments history from a shallow clone; fetch complete Git history before validating a publication.");
  }

  if (baseRef) {
    if (!/^[0-9a-f]{40,64}$/i.test(baseRef)) {
      throw new Error("Cannot prove append-only Investments history: publication base ref must be a full Git commit SHA.");
    }
    const basePaths = requireGitResult(
      runGit(root, ["ls-tree", "-r", "--name-only", baseRef, "--", PUBLICATION_REPOSITORY_PATH]),
      "reading the publication path from the pull-request base"
    ).split(/\r?\n/).filter(Boolean);
    if (basePaths.length === 0) return null;
    if (basePaths.length !== 1 || basePaths[0] !== PUBLICATION_REPOSITORY_PATH) {
      throw new Error("Cannot prove append-only Investments history: the pull-request base returned an unexpected publication path.");
    }
    const baseText = requireGitResult(
      runGit(root, ["show", `${baseRef}:${PUBLICATION_REPOSITORY_PATH}`]),
      "reading the publication from the pull-request base"
    );
    return baseText === currentText ? null : baseText;
  }

  const history = requireGitResult(
    runGit(root, ["log", "--format=%H", "--", PUBLICATION_REPOSITORY_PATH]),
    "Git publication log"
  );
  const candidates = [];
  for (const commit of history.split(/\r?\n/).filter(Boolean)) {
    candidates.push(requireGitResult(
      runGit(root, ["show", `${commit}:${PUBLICATION_REPOSITORY_PATH}`]),
      `reading publication at commit ${commit}`
    ));
  }
  return selectPreviousDistinctPublicationText(currentText, candidates);
}
