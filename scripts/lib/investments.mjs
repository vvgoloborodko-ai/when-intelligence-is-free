import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const PUBLICATION_PATH = resolve(ROOT, "data/investments/publication.json");
export const MAX_PUBLICATION_BYTES = 512 * 1024;
export const SLEEVE_IDS = Object.freeze([
  "physical-scarcity",
  "compute-platforms",
  "survivors-tolls-second-wave",
  "moonshots",
  "macro-scenario-bets",
  "reserve-optionality"
]);

const FORBIDDEN_PROTOTYPE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const FIXED_SIX = /^-?(?:0|[1-9][0-9]{0,6})\.[0-9]{6}$/;
const WEIGHT_SIX = /^(?:0|[1-9][0-9]?|100)\.[0-9]{6}$/;
const PERIOD = /^[0-9]{4}-(?:0[1-9]|1[0-2])$/;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const TIMESTAMP = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
const CORRECTION_ID = /^corr-[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const PUBLIC_TICKER = /^[A-Z0-9][A-Z0-9.:-]{0,19}$/;
const COMMENTARY_TOKENS = new Set(["benchmark_name", "benchmark_month_abs_pct"]);
const MIN_NORMAL_NUMBER = 2.2250738585072014e-308;
const NUMBER_WORD = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion)";
const NUMBER_PHRASE = `(?:${NUMBER_WORD})(?:\\s+(?:${NUMBER_WORD}|and|point)){0,10}`;
const NUMBER_VALUE = `(?:\\d[\\d,.]*|${NUMBER_PHRASE})`;
const CURRENCY_CODE = "(?:usd|eur|gbp|jpy|chf|cad|aud|nzd|cny|hkd|sgd|sek|nok|dkk|inr|brl|mxn|zar|rub|krw|aed|sar)";
const CURRENCY_WORD = "(?:dollars?|euros?|pounds?|yen|francs?|yuan|renminbi|rupees?|rubles?|dirhams?|kron(?:a|e|er)|reais|pesos?)";
const CURRENCY_QUALIFIER = "(?:(?:u\\s+s|us|american|australian|canadian|new\\s+zealand|hong\\s+kong|singapore|swiss|south\\s+african)\\s+)?";
const QUANTITY_WORD = "(?:shares?|units?|contracts?|options?|tokens?)";
const CURRENCY_CODE_AMOUNT = new RegExp(
  `\\b(?:${CURRENCY_CODE}(?:\\s*\\d[\\d,.]*|\\s+${NUMBER_PHRASE})|(?:\\d[\\d,.]*\\s*|${NUMBER_PHRASE}\\s+)${CURRENCY_CODE})\\b`,
  "i"
);
const CURRENCY_WORD_AMOUNT = new RegExp(
  `\\b(?:${NUMBER_VALUE}\\s+${CURRENCY_QUALIFIER}${CURRENCY_WORD}|${CURRENCY_WORD}\\s+${NUMBER_VALUE})\\b`,
  "i"
);
const QUANTITY_AMOUNT = new RegExp(
  `\\b(?:${NUMBER_VALUE}\\s+${QUANTITY_WORD}|${QUANTITY_WORD}(?:\\s+(?:count|quantity))?\\s+${NUMBER_VALUE})\\b`,
  "i"
);
const PUBLIC_DATA_LANGUAGE = /\b(?:a\s*u\s*m|assets\s+under\s+management|clients?|client\s+mirror|mirror(?:ed|ing)?(?:\s+(?:data|portfolio|account))?|friends?(?:\s+and)?\s+famil(?:y|ies)|famil(?:y|ies)(?:\s+and)?\s+friends?|f(?:\s+and)?\s+f|managed\s+money|managed\s+capital|personal\s+portfolio|my\s+own\s+capital|own\s+funds)\b/i;
const NAV_ABBREVIATION = /\bn\s*a\s*v\b/i;
const NET_ASSET_VALUE_LANGUAGE = /\bnet\s+asset\s+value\b/i;
const OPERATIONAL_DATA_LANGUAGE = /\b(?:account(?:\s+(?:id|identifier|number|balance|data|statement))?|iban|broker(?:age)?(?:\s+(?:data|feed|account|statement|identifier))?|cost\s+basis|average\s+cost|cash\s+balance|absolute\s+capital|capital\s+(?:amount|balance|value)|absolute\s+position\s+value|position\s+value|market\s+value|notional)\b/i;
const DIRECTED_ADVICE = /(?:^|[.!?]\s*)(?:buy|sell|invest|allocate|hold|purchase)\b|\bconsider(?:ing)?\s+(?:buying|selling|investing|allocating|holding|purchasing)\b|\bthis\s+is\s+(?:a|an)\s+(?:buy|sell|hold)\b|\b(?:you|readers?|investors?)\b.{0,30}\b(?:should|ought to|must)\b.{0,20}\b(?:invest|allocate|buy|sell|hold|purchase)\b|\bcontact (?:us|me)\b.{0,20}\binvest\b/i;
const FORWARD_RETURN_LANGUAGE = /\b(?:strategy|book|returns?|performance)\b.{0,40}\b(?:will|should|expected?|likely|projected?|target(?:ed)?|outperform|strong|gain)\b|\bwe (?:expect|project|anticipate)\b.{0,30}\b(?:gains?|returns?|outperform|performance)\b/i;
const OTHER_SOLICITATION_LANGUAGE = /\b(?:invest with|allocate with|subscriptions? open|capacity available|expected returns?|target returns?|projected returns?|will return|recommend(?:ation|ed)?)\b/i;
const INDIRECT_SOLICITATION_LANGUAGE = /\b(?:enquir(?:y|ies)|inquir(?:y|ies))\b.{0,30}\b(?:participat(?:e|ing|ion)|invest(?:ing|ment)?)\b|\bparticipat(?:e|ing|ion)\b.{0,30}\b(?:welcome|open|available)\b/i;
const INDIRECT_FORWARD_LANGUAGE = /\b(?:coming|next|future|forthcoming)\s+(?:month|quarter|period|year)\b.{0,40}\b(?:favourable|favorable|positive|promising|strong|better|upside|gain)\b/i;
const SPELLED_FINANCIAL_STATISTIC = new RegExp(`\\b${NUMBER_PHRASE}\\s+(?:percent(?:age)?|percentage\\s+points?|basis\\s+points?)\\b`, "i");
const SPELLED_NUMBER = new RegExp(`\\b${NUMBER_WORD}\\b`, "i");
const ABSOLUTE_MAGNITUDE_WORD = /\b(?:hundred|thousand|million|billion|trillion)\b/i;

export class PublicationValidationError extends Error {
  constructor(issues) {
    super(`Investments publication validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "PublicationValidationError";
    this.issues = issues;
  }
}

class StrictJsonParser {
  constructor(text) {
    this.text = text;
    this.index = 0;
    this.nodes = 0;
  }

  fail(message) {
    throw new PublicationValidationError([`JSON: ${message} at character ${this.index}.`]);
  }

  skipWhitespace() {
    while (/\s/.test(this.text[this.index] || "")) this.index += 1;
  }

  parse() {
    this.skipWhitespace();
    const value = this.parseValue(0);
    this.skipWhitespace();
    if (this.index !== this.text.length) this.fail("unexpected trailing content");
    return value;
  }

  parseValue(depth) {
    if (depth > 24) this.fail("maximum nesting depth exceeded");
    this.nodes += 1;
    if (this.nodes > 15000) this.fail("maximum JSON node count exceeded");
    this.skipWhitespace();
    const char = this.text[this.index];
    if (char === "{") return this.parseObject(depth + 1);
    if (char === "[") return this.parseArray(depth + 1);
    if (char === '"') return this.parseString();
    if (char === "t" && this.text.slice(this.index, this.index + 4) === "true") {
      this.index += 4;
      return true;
    }
    if (char === "f" && this.text.slice(this.index, this.index + 5) === "false") {
      this.index += 5;
      return false;
    }
    if (char === "n" && this.text.slice(this.index, this.index + 4) === "null") {
      this.index += 4;
      return null;
    }
    if (char === "-" || /[0-9]/.test(char || "")) return this.parseNumber();
    this.fail("unexpected token");
  }

  parseString() {
    const start = this.index;
    this.index += 1;
    let escaped = false;
    while (this.index < this.text.length) {
      const code = this.text.charCodeAt(this.index);
      const char = this.text[this.index];
      if (!escaped && char === '"') {
        this.index += 1;
        try {
          return JSON.parse(this.text.slice(start, this.index));
        } catch {
          this.fail("invalid string escape");
        }
      }
      if (!escaped && code < 0x20) this.fail("unescaped control character in string");
      if (!escaped && char === "\\") escaped = true;
      else escaped = false;
      this.index += 1;
    }
    this.fail("unterminated string");
  }

  parseNumber() {
    const match = this.text.slice(this.index).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (!match) this.fail("invalid number");
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) this.fail("non-finite number");
    return value;
  }

  parseArray(depth) {
    const output = [];
    this.index += 1;
    this.skipWhitespace();
    if (this.text[this.index] === "]") {
      this.index += 1;
      return output;
    }
    while (this.index < this.text.length) {
      output.push(this.parseValue(depth));
      this.skipWhitespace();
      const char = this.text[this.index];
      if (char === "]") {
        this.index += 1;
        return output;
      }
      if (char !== ",") this.fail("expected ',' or ']' in array");
      this.index += 1;
      this.skipWhitespace();
    }
    this.fail("unterminated array");
  }

  parseObject(depth) {
    const output = Object.create(null);
    const keys = new Set();
    this.index += 1;
    this.skipWhitespace();
    if (this.text[this.index] === "}") {
      this.index += 1;
      return output;
    }
    while (this.index < this.text.length) {
      if (this.text[this.index] !== '"') this.fail("expected string object key");
      const key = this.parseString();
      if (keys.has(key)) this.fail(`duplicate key ${JSON.stringify(key)}`);
      if (FORBIDDEN_PROTOTYPE_KEYS.has(key)) this.fail("forbidden prototype key");
      keys.add(key);
      this.skipWhitespace();
      if (this.text[this.index] !== ":") this.fail("expected ':' after object key");
      this.index += 1;
      output[key] = this.parseValue(depth);
      this.skipWhitespace();
      const char = this.text[this.index];
      if (char === "}") {
        this.index += 1;
        return output;
      }
      if (char !== ",") this.fail("expected ',' or '}' in object");
      this.index += 1;
      this.skipWhitespace();
    }
    this.fail("unterminated object");
  }
}

export function canonicalizePublication(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function parsePublicationText(text, { canonical = true } = {}) {
  if (typeof text !== "string") {
    throw new PublicationValidationError(["JSON: publication input must be decoded UTF-8 text."]);
  }
  if (text.charCodeAt(0) === 0xfeff) {
    throw new PublicationValidationError(["JSON: UTF-8 BOM is not allowed."]);
  }
  if (Buffer.byteLength(text, "utf8") > MAX_PUBLICATION_BYTES) {
    throw new PublicationValidationError([`JSON: file exceeds ${MAX_PUBLICATION_BYTES} bytes.`]);
  }
  const value = new StrictJsonParser(text).parse();
  if (canonical && canonicalizePublication(value) !== text) {
    throw new PublicationValidationError([
      "JSON: file is not canonical two-space JSON with a final newline; regenerate it instead of hand-editing."
    ]);
  }
  return value;
}

export function parsePublicationBytes(bytes, options = {}) {
  if (!(bytes instanceof Uint8Array)) {
    throw new PublicationValidationError(["JSON: publication input must be UTF-8 bytes."]);
  }
  if (bytes.byteLength > MAX_PUBLICATION_BYTES) {
    throw new PublicationValidationError([`JSON: file exceeds ${MAX_PUBLICATION_BYTES} bytes.`]);
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new PublicationValidationError(["JSON: publication input is not valid UTF-8."]);
  }
  return parsePublicationText(text, options);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safePath(path, key) {
  return `${path}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function checkObject(value, path, required, optional, errors) {
  if (!isObject(value)) {
    errors.push(`${path}: expected object.`);
    return false;
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${safePath(path, key)}: unknown field.`);
    if (FORBIDDEN_PROTOTYPE_KEYS.has(key)) errors.push(`${safePath(path, key)}: forbidden key.`);
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) errors.push(`${safePath(path, key)}: required field is missing.`);
  }
  return true;
}

function checkArray(value, path, { minimum = 0, maximum = Infinity } = {}, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path}: expected array.`);
    return false;
  }
  if (value.length < minimum) errors.push(`${path}: requires at least ${minimum} item(s).`);
  if (value.length > maximum) errors.push(`${path}: exceeds ${maximum} item(s).`);
  return true;
}

function checkString(value, path, { minimum = 1, maximum = 1000, pattern = null } = {}, errors) {
  if (typeof value !== "string") {
    errors.push(`${path}: expected string.`);
    return false;
  }
  if (value.length < minimum || value.length > maximum) errors.push(`${path}: invalid string length.`);
  if (minimum > 0 && value.trim().length === 0) errors.push(`${path}: blank strings are forbidden.`);
  if (pattern && !pattern.test(value)) errors.push(`${path}: invalid string format.`);
  if (/[\p{Cc}\p{Default_Ignorable_Code_Point}]/u.test(value)) errors.push(`${path}: control and invisible default-ignorable characters are forbidden.`);
  return true;
}

function checkConst(value, expected, path, errors) {
  if (value !== expected) errors.push(`${path}: must equal ${JSON.stringify(expected)}.`);
}

function validDate(value) {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function periodIndex(period) {
  if (typeof period !== "string" || !PERIOD.test(period)) return null;
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

function periodFromIndex(index) {
  const year = Math.floor(index / 12);
  const month = index % 12 + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function normalizedName(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function containsNonAsciiLetter(value) {
  for (const character of value) {
    if (/\p{L}/u.test(character) && !/[A-Za-z]/.test(character)) return true;
  }
  return false;
}

function firewallPolicyText(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll("&", " and ")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function publicationFirewallFlags(value, {
  instrumentName = false,
  allowStandaloneNav = false,
  prose = false
} = {}) {
  if (typeof value !== "string") return [];
  const text = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  const lower = text.toLocaleLowerCase("en-US");
  const policyText = firewallPolicyText(text);
  const flags = new Set();

  if (/\p{Default_Ignorable_Code_Point}/u.test(value)) flags.add("invisible");
  if (/\p{Sc}/u.test(text)) flags.add("currency-symbol");
  if (CURRENCY_CODE_AMOUNT.test(policyText) || CURRENCY_WORD_AMOUNT.test(policyText)) flags.add("currency-amount");
  if (QUANTITY_AMOUNT.test(policyText)) flags.add("quantity");
  if (PUBLIC_DATA_LANGUAGE.test(policyText)
    || NET_ASSET_VALUE_LANGUAGE.test(policyText)
    || (!allowStandaloneNav && NAV_ABBREVIATION.test(policyText))) {
    flags.add("public-data");
  }
  if (OPERATIONAL_DATA_LANGUAGE.test(policyText)) flags.add("operational-data");
  if (!instrumentName && /\bfund\b/i.test(policyText)) flags.add("fund");
  if (prose && (DIRECTED_ADVICE.test(lower)
    || FORWARD_RETURN_LANGUAGE.test(lower)
    || OTHER_SOLICITATION_LANGUAGE.test(lower)
    || INDIRECT_SOLICITATION_LANGUAGE.test(lower)
    || INDIRECT_FORWARD_LANGUAGE.test(lower))) {
    flags.add("advice");
  }
  if (prose && containsNonAsciiLetter(text)) flags.add("non-ascii-prose");
  const quantityPolicyText = policyText.replace(/\ba quiet one\b/g, "");
  if (prose && SPELLED_NUMBER.test(quantityPolicyText)) flags.add("spelled-number");
  if (prose && SPELLED_FINANCIAL_STATISTIC.test(policyText)) flags.add("financial-statistic");
  if (prose && ABSOLUTE_MAGNITUDE_WORD.test(policyText)) flags.add("absolute-magnitude");
  return [...flags];
}

export function decimalToNumber(value) {
  return Number(value);
}

function fixedDecimal(value, path, errors, { weight = false, minimum = -9999999, maximum = 9999999 } = {}) {
  const pattern = weight ? WEIGHT_SIX : FIXED_SIX;
  if (typeof value !== "string" || !pattern.test(value)) {
    errors.push(`${path}: expected a fixed-six-decimal string in the declared unit.`);
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    errors.push(`${path}: value is outside the allowed range.`);
  }
  if (number === 0 && value.startsWith("-")) errors.push(`${path}: negative zero is not canonical.`);
  return number;
}

function deepEqual(left, right) {
  const stable = (value) => {
    if (Array.isArray(value)) return value.map(stable);
    if (!isObject(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  };
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function withoutRevisionMetadata(record) {
  if (!isObject(record)) return record;
  const copy = structuredClone(record);
  delete copy.revision;
  delete copy.correction_id;
  return copy;
}

function recordKey(record) {
  return `${record.period}|${record.revision}`;
}

function recordsByKey(records) {
  return new Map((Array.isArray(records) ? records : [])
    .filter((record) => isObject(record) && typeof record.period === "string" && Number.isInteger(record.revision))
    .map((record) => [recordKey(record), record]));
}

function scanPublication(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPublication(item, `${path}/${index}`, errors));
    return;
  }
  if (isObject(value)) {
    const forbiddenKeys = /(?:^|_)(?:aum|assets_under_management|nav_currency|nav_value|net_asset_value|absolute_capital|market_value|position_value|notional|quantity|shares|units|cost_basis|average_cost|cash_balance|account|account_id|iban|broker|brokerage|client|mirror|friends_and_family|managed_money|fund_name|portfolio_name|book_name)(?:$|_)/i;
    for (const [key, item] of Object.entries(value)) {
      const child = safePath(path, key);
      if (forbiddenKeys.test(key)) errors.push(`${child}: forbidden public-data field.`);
      scanPublication(item, child, errors);
    }
    return;
  }
  if (typeof value !== "string") return;

  if (/\p{Default_Ignorable_Code_Point}/u.test(value)) errors.push(`${path}: invisible default-ignorable characters are forbidden.`);
  if (/\/releases\/\d+\/holdings\/\d+\/ticker$/.test(path)) return;

  const text = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  const instrumentName = /\/releases\/\d+\/(?:holdings\/\d+\/name|attribution\/items\/\d+\/holding_name)$/.test(path);
  const prose = /\/(?:public_description|reason)$/.test(path) || /\/commentary\/paragraphs\/\d+$/.test(path);
  const firewallFlags = new Set(publicationFirewallFlags(value, { instrumentName, prose }));
  if (firewallFlags.has("currency-symbol")) errors.push(`${path}: currency symbols are forbidden.`);
  if (firewallFlags.has("currency-amount")) errors.push(`${path}: spelled-out or numeric currency amounts are forbidden.`);
  if (firewallFlags.has("quantity")) errors.push(`${path}: spelled-out or numeric quantities are forbidden.`);
  if (/\b[0-9]{9,}\b/.test(text)) errors.push(`${path}: account-like numeric identifier is forbidden.`);
  if (firewallFlags.has("public-data")) errors.push(`${path}: forbidden public-data or provenance language.`);
  if (firewallFlags.has("operational-data")) errors.push(`${path}: forbidden operational-data language.`);
  if (firewallFlags.has("fund")) errors.push(`${path}: the public practice may not be framed as a fund.`);

  if (prose) {
    if (/<|>|https?:\/\/|www\.|\b[^\s@]+@[^\s@]+\b/i.test(text)) errors.push(`${path}: markup, URLs, and email addresses are forbidden in publication prose.`);
    if (/\p{N}/u.test(text)) errors.push(`${path}: publication prose may not carry independently typed numbers or financial statistics.`);
    if (firewallFlags.has("financial-statistic") || firewallFlags.has("absolute-magnitude") || firewallFlags.has("spelled-number")) {
      errors.push(`${path}: spelled-out numbers, financial statistics, and absolute magnitudes are forbidden in publication prose.`);
    }
    if (firewallFlags.has("non-ascii-prose")) {
      errors.push(`${path}: public prose must use ASCII Latin-script letters; Unicode letter homoglyphs are forbidden.`);
    }
    if (firewallFlags.has("advice")) {
      errors.push(`${path}: solicitation, advice, or forward-return language is forbidden.`);
    }
  }
}

function validateConventions(value, errors) {
  if (!checkObject(value, "/conventions", ["inception_date", "return_currency", "benchmark", "strategy_return_basis", "audit_status", "period_convention", "drawdown_convention"], [], errors)) return;
  checkConst(value.inception_date, "2025-01-01", "/conventions/inception_date", errors);
  checkConst(value.return_currency, "USD", "/conventions/return_currency", errors);
  checkConst(value.audit_status, "unaudited", "/conventions/audit_status", errors);
  checkConst(value.period_convention, "official_calendar_month_close", "/conventions/period_convention", errors);
  checkConst(value.drawdown_convention, "month_end_series", "/conventions/drawdown_convention", errors);

  if (checkObject(value.benchmark, "/conventions/benchmark", ["name", "series_identifier", "return_basis"], [], errors)) {
    checkConst(value.benchmark.name, "Nasdaq-100", "/conventions/benchmark/name", errors);
    checkString(value.benchmark.series_identifier, "/conventions/benchmark/series_identifier", { maximum: 80, pattern: /^[A-Za-z0-9._:^/+\-]+(?: [A-Za-z0-9._:^/+\-]+)*$/ }, errors);
    if (!new Set(["price_return", "total_return"]).has(value.benchmark.return_basis)) errors.push("/conventions/benchmark/return_basis: expected price_return or total_return.");
  }
  if (checkObject(value.strategy_return_basis, "/conventions/strategy_return_basis", ["basis", "methodology_id", "public_description"], [], errors)) {
    checkConst(value.strategy_return_basis.basis, "net", "/conventions/strategy_return_basis/basis", errors);
    checkString(value.strategy_return_basis.methodology_id, "/conventions/strategy_return_basis/methodology_id", { maximum: 80, pattern: /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/ }, errors);
    if (checkString(value.strategy_return_basis.public_description, "/conventions/strategy_return_basis/public_description", { maximum: 280, pattern: /^[^<>\r\n]+$/ }, errors)) {
      if (!/\bnet\b/i.test(value.strategy_return_basis.public_description)) errors.push("/conventions/strategy_return_basis/public_description: must explain the existing net methodology.");
    }
  }
}

function validateRecordRevisions(records, path, corrections, errors) {
  const groups = new Map();
  records.forEach((record, index) => {
    if (!isObject(record) || typeof record.period !== "string" || !Number.isInteger(record.revision)) return;
    const key = record.period;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ record, index });
  });
  for (const [period, entries] of groups) {
    entries.sort((a, b) => a.record.revision - b.record.revision);
    entries.forEach((entry, index) => {
      const expected = index + 1;
      if (entry.record.revision !== expected) errors.push(`${path}: ${period} revisions must start at 1 and have no gaps.`);
      if (index > 0 && entry.index <= entries[index - 1].index) errors.push(`${path}: ${period} revisions must be appended in revision order.`);
      if (expected === 1 && Object.hasOwn(entry.record, "correction_id")) errors.push(`${path}/${entry.index}/correction_id: forbidden on revision 1.`);
      if (expected > 1) {
        if (!Object.hasOwn(entry.record, "correction_id")) errors.push(`${path}/${entry.index}/correction_id: required on revision 2+.`);
        else {
          const correction = corrections.get(entry.record.correction_id);
          if (!correction) errors.push(`${path}/${entry.index}/correction_id: does not reference a correction.`);
          else if (correction.period !== period) errors.push(`${path}/${entry.index}/correction_id: correction period does not match record period.`);
        }
      }
    });
  }
  return groups;
}

function effectiveRecords(records) {
  const map = new Map();
  records.forEach((record) => {
    const existing = map.get(record.period);
    if (!existing || record.revision > existing.revision) map.set(record.period, record);
  });
  return [...map.values()].sort((a, b) => periodIndex(a.period) - periodIndex(b.period));
}

function validatePerformance(records, generatedAt, correctionMap, errors) {
  if (!checkArray(records, "/performance", { minimum: 1, maximum: 2400 }, errors)) return [];
  records.forEach((record, index) => {
    const path = `/performance/${index}`;
    if (!checkObject(record, path, ["period", "as_of_date", "revision", "strategy_return_pct", "benchmark_return_pct"], ["correction_id"], errors)) return;
    if (typeof record.period !== "string" || !PERIOD.test(record.period)) errors.push(`${path}/period: invalid YYYY-MM period.`);
    if (!validDate(record.as_of_date)) errors.push(`${path}/as_of_date: invalid ISO date.`);
    else if (typeof record.period === "string" && !record.as_of_date.startsWith(`${record.period}-`)) errors.push(`${path}/as_of_date: date must fall inside record period.`);
    else {
      const [year, month, day] = record.as_of_date.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      if (day < lastDay - 6) errors.push(`${path}/as_of_date: official close must fall within the final seven calendar days of its month.`);
      if (generatedAt && new Date(`${record.as_of_date}T00:00:00Z`) > generatedAt) errors.push(`${path}/as_of_date: cannot be later than generated_at.`);
    }
    if (!Number.isInteger(record.revision) || record.revision < 1 || record.revision > 999) errors.push(`${path}/revision: expected integer from 1 to 999.`);
    fixedDecimal(record.strategy_return_pct, `${path}/strategy_return_pct`, errors, { minimum: -99.999999, maximum: 1000 });
    fixedDecimal(record.benchmark_return_pct, `${path}/benchmark_return_pct`, errors, { minimum: -99.999999, maximum: 1000 });
    if (Object.hasOwn(record, "correction_id")) checkString(record.correction_id, `${path}/correction_id`, { minimum: 12, maximum: 64, pattern: CORRECTION_ID }, errors);
  });
  const groups = validateRecordRevisions(records, "/performance", correctionMap, errors);
  for (const [period, entries] of groups) {
    const dates = new Set(entries.map((entry) => entry.record.as_of_date));
    if (dates.size > 1) errors.push(`/performance: corrected records for ${period} must retain the same as_of_date.`);
  }
  const effective = effectiveRecords(records);
  const start = periodIndex("2025-01");
  effective.forEach((record, index) => {
    const expected = start + index;
    if (periodIndex(record.period) !== expected) errors.push(`/performance: effective periods must be contiguous from 2025-01; expected ${periodFromIndex(expected)}.`);
  });
  const firstRevisionPeriods = records.filter((record) => record?.revision === 1).map((record) => record.period);
  if (!deepEqual(firstRevisionPeriods, effective.map((record) => record.period))) errors.push("/performance: revision-1 records must appear once in chronological order before appended corrections.");
  return effective;
}

function validateComposition(items, path, errors) {
  if (!checkArray(items, path, { minimum: 6, maximum: 6 }, errors)) return new Map();
  const weights = new Map();
  items.forEach((item, index) => {
    const itemPath = `${path}/${index}`;
    if (!checkObject(item, itemPath, ["sleeve_id", "weight_pct_nav"], [], errors)) return;
    if (!SLEEVE_IDS.includes(item.sleeve_id)) errors.push(`${itemPath}/sleeve_id: unknown public sleeve.`);
    if (weights.has(item.sleeve_id)) errors.push(`${itemPath}/sleeve_id: duplicate public sleeve.`);
    const weight = fixedDecimal(item.weight_pct_nav, `${itemPath}/weight_pct_nav`, errors, { weight: true, minimum: 0, maximum: 100 });
    weights.set(item.sleeve_id, weight ?? 0);
    if (SLEEVE_IDS[index] !== item.sleeve_id) errors.push(`${itemPath}/sleeve_id: sleeves must use the canonical public order.`);
  });
  const total = [...weights.values()].reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.0001) errors.push(`${path}: composition must sum to 100% within 0.0001 percentage point.`);
  return weights;
}

function validateHoldings(items, sleeveWeights, path, errors) {
  if (!checkArray(items, path, { minimum: 1, maximum: 200 }, errors)) return new Set();
  const names = new Set();
  const sleeveTotals = new Map();
  let total = 0;
  items.forEach((item, index) => {
    const itemPath = `${path}/${index}`;
    if (!checkObject(item, itemPath, ["name", "sleeve_id", "weight_pct_nav"], ["ticker"], errors)) return;
    if (checkString(item.name, `${itemPath}/name`, { maximum: 120, pattern: /^[^<>\r\n]+$/ }, errors)) {
      const normalized = normalizedName(item.name);
      if (names.has(normalized)) errors.push(`${itemPath}/name: duplicate public holding name.`);
      names.add(normalized);
    }
    if (Object.hasOwn(item, "ticker")) checkString(item.ticker, `${itemPath}/ticker`, { maximum: 20, pattern: PUBLIC_TICKER }, errors);
    if (!SLEEVE_IDS.includes(item.sleeve_id)) errors.push(`${itemPath}/sleeve_id: unknown public sleeve.`);
    const weight = fixedDecimal(item.weight_pct_nav, `${itemPath}/weight_pct_nav`, errors, { weight: true, minimum: 0.000001, maximum: 100 });
    if (weight !== null) {
      total += weight;
      sleeveTotals.set(item.sleeve_id, (sleeveTotals.get(item.sleeve_id) || 0) + weight);
    }
  });
  if (total > 100.0001) errors.push(`${path}: public holding weights cannot exceed 100% NAV.`);
  for (const [sleeve, subtotal] of sleeveTotals) {
    if (subtotal > (sleeveWeights.get(sleeve) ?? 0) + 0.0001) errors.push(`${path}: public holding weights for ${sleeve} exceed its sleeve weight.`);
  }
  return names;
}

function validateAttribution(value, release, holdingNames, strategyReturn, path, errors) {
  if (!checkObject(value, path, ["level", "coverage", "items"], [], errors)) return;
  if (!new Set(["sleeve", "position"]).has(value.level)) errors.push(`${path}/level: expected sleeve or position.`);
  if (!new Set(["complete", "selected"]).has(value.coverage)) errors.push(`${path}/coverage: expected complete or selected.`);
  if (!checkArray(value.items, `${path}/items`, { minimum: 1, maximum: 200 }, errors)) return;
  const seen = new Set();
  let sum = 0;
  value.items.forEach((item, index) => {
    const itemPath = `${path}/items/${index}`;
    if (value.level === "sleeve") {
      if (!checkObject(item, itemPath, ["sleeve_id", "effect_pp"], [], errors)) return;
      if (!SLEEVE_IDS.includes(item.sleeve_id)) errors.push(`${itemPath}/sleeve_id: unknown public sleeve.`);
      if (seen.has(item.sleeve_id)) errors.push(`${itemPath}/sleeve_id: duplicate attribution sleeve.`);
      seen.add(item.sleeve_id);
    } else {
      if (!checkObject(item, itemPath, ["holding_name", "effect_pp"], [], errors)) return;
      if (checkString(item.holding_name, `${itemPath}/holding_name`, { maximum: 120, pattern: /^[^<>\r\n]+$/ }, errors)) {
        const normalized = normalizedName(item.holding_name);
        if (seen.has(normalized)) errors.push(`${itemPath}/holding_name: duplicate attribution position.`);
        if (!holdingNames.has(normalized)) errors.push(`${itemPath}/holding_name: position attribution must reference a named public holding in the same release.`);
        seen.add(normalized);
      }
    }
    const effect = fixedDecimal(item.effect_pp, `${itemPath}/effect_pp`, errors, { minimum: -1000, maximum: 1000 });
    if (effect !== null) {
      sum += effect;
      if (value.coverage === "selected" && effect === 0) errors.push(`${itemPath}/effect_pp: selected attribution must not contain a zero-effect item.`);
    }
  });
  if (value.coverage === "complete" && value.level === "sleeve") {
    if (seen.size !== SLEEVE_IDS.length || SLEEVE_IDS.some((id) => !seen.has(id))) errors.push(`${path}: complete sleeve attribution must contain every public sleeve exactly once.`);
  }
  if (value.coverage === "complete" && value.level === "position") {
    if (seen.size !== holdingNames.size || [...holdingNames].some((name) => !seen.has(name))) errors.push(`${path}: complete position attribution must contain every named public holding exactly once.`);
  }
  if (value.coverage === "complete" && Number.isFinite(strategyReturn) && Math.abs(sum - strategyReturn) > 0.01) {
    errors.push(`${path}: complete attribution must reconcile to the period Strategy return within 0.01pp.`);
  }
  void release;
}

function validateCommentary(value, path, errors) {
  if (!checkObject(value, path, ["paragraphs"], [], errors)) return;
  if (!checkArray(value.paragraphs, `${path}/paragraphs`, { minimum: 1, maximum: 20 }, errors)) return;
  let total = 0;
  value.paragraphs.forEach((paragraph, index) => {
    const paragraphPath = `${path}/paragraphs/${index}`;
    if (checkString(paragraph, paragraphPath, { maximum: 1000, pattern: /^[^<>\r\n]+$/ }, errors)) {
      total += paragraph.length;
      for (const token of paragraph.matchAll(/\{\{([^{}]+)\}\}/g)) {
        if (!COMMENTARY_TOKENS.has(token[1])) errors.push(`${paragraphPath}: unknown derived commentary token ${token[0]}.`);
      }
      const withoutTokens = paragraph.replace(/\{\{[^{}]+\}\}/g, "");
      if (withoutTokens.includes("{{") || withoutTokens.includes("}}")) errors.push(`${paragraphPath}: malformed derived commentary token.`);
    }
  });
  if (total > 6000) errors.push(`${path}/paragraphs: combined commentary exceeds 6000 characters.`);
}

function validateReleases(records, effectivePerformance, correctionMap, errors) {
  if (!checkArray(records, "/releases", { minimum: 1, maximum: 1200 }, errors)) return [];
  const performanceByPeriod = new Map(effectivePerformance.map((record) => [record.period, record]));
  records.forEach((record, index) => {
    const path = `/releases/${index}`;
    if (!checkObject(record, path, ["period", "revision", "composition", "holdings", "attribution"], ["commentary", "correction_id"], errors)) return;
    if (typeof record.period !== "string" || !PERIOD.test(record.period)) errors.push(`${path}/period: invalid YYYY-MM period.`);
    if (!performanceByPeriod.has(record.period)) errors.push(`${path}/period: release has no matching effective performance record.`);
    if (!Number.isInteger(record.revision) || record.revision < 1 || record.revision > 999) errors.push(`${path}/revision: expected integer from 1 to 999.`);
    if (Object.hasOwn(record, "correction_id")) checkString(record.correction_id, `${path}/correction_id`, { minimum: 12, maximum: 64, pattern: CORRECTION_ID }, errors);
    const sleeves = validateComposition(record.composition, `${path}/composition`, errors);
    const holdings = validateHoldings(record.holdings, sleeves, `${path}/holdings`, errors);
    validateAttribution(record.attribution, record, holdings, NaN, `${path}/attribution`, errors);
    if (Object.hasOwn(record, "commentary")) validateCommentary(record.commentary, `${path}/commentary`, errors);
  });
  validateRecordRevisions(records, "/releases", correctionMap, errors);
  const effective = effectiveRecords(records);
  const revisionOne = records.filter((record) => record?.revision === 1).map((record) => record.period);
  if (!deepEqual(revisionOne, effective.map((record) => record.period))) errors.push("/releases: revision-1 records must appear once in chronological order before appended corrections.");
  const latestPerformance = effectivePerformance.at(-1)?.period;
  if (effective.at(-1)?.period !== latestPerformance) errors.push("/releases: latest effective release period must equal latest effective performance period.");
  for (const release of effective) {
    if (release.attribution?.coverage !== "complete") continue;
    const effectiveReturn = Number(performanceByPeriod.get(release.period)?.strategy_return_pct);
    const effectSum = Array.isArray(release.attribution.items)
      ? release.attribution.items.reduce((sum, item) => sum + Number(item.effect_pp || 0), 0)
      : NaN;
    if (Number.isFinite(effectiveReturn) && Number.isFinite(effectSum) && Math.abs(effectSum - effectiveReturn) > 0.01) {
      errors.push(`/releases: effective complete attribution for ${release.period} must reconcile to effective Strategy performance.`);
    }
  }
  return effective;
}

function validateCorrections(records, generatedAt, errors) {
  if (!checkArray(records, "/corrections", { maximum: 1200 }, errors)) return new Map();
  const map = new Map();
  records.forEach((record, index) => {
    const path = `/corrections/${index}`;
    if (!checkObject(record, path, ["id", "period", "disclosed_on", "reason"], [], errors)) return;
    if (checkString(record.id, `${path}/id`, { minimum: 12, maximum: 64, pattern: CORRECTION_ID }, errors)) {
      if (map.has(record.id)) errors.push(`${path}/id: duplicate correction ID.`);
      map.set(record.id, record);
    }
    if (typeof record.period !== "string" || !PERIOD.test(record.period)) errors.push(`${path}/period: invalid YYYY-MM period.`);
    if (!validDate(record.disclosed_on)) errors.push(`${path}/disclosed_on: invalid ISO date.`);
    else if (generatedAt && new Date(`${record.disclosed_on}T00:00:00Z`) > generatedAt) errors.push(`${path}/disclosed_on: cannot be later than generated_at.`);
    if (checkString(record.reason, `${path}/reason`, { minimum: 20, maximum: 1000, pattern: /^[^<>\r\n]+$/ }, errors)) {
      const normalizedReason = record.reason.normalize("NFKC");
      if (/\p{N}/u.test(normalizedReason)) {
        errors.push(`${path}/reason: correction reasons must not independently type digits or financial figures; before/after values are derived from revisions.`);
      }
      if (/\b(?:percent(?:age)?|percentage points?|basis points?|dollars?|euros?|pounds?|usd|eur|gbp|jpy|chf)\b/i.test(normalizedReason)) {
        errors.push(`${path}/reason: correction reasons must not independently type financial figures; before/after values are derived from revisions.`);
      }
    }
  });
  return map;
}

function validateCorrectionReferences(performance, releases, correctionMap, errors) {
  const performanceByKey = recordsByKey(performance);
  const releasesByKey = recordsByKey(releases);
  const revisedPerformance = (Array.isArray(performance) ? performance : []).filter((record) => record?.revision > 1);
  const revisedReleases = (Array.isArray(releases) ? releases : []).filter((record) => record?.revision > 1);
  const effectivePerformanceByPeriod = new Map(effectiveRecords(Array.isArray(performance) ? performance : []).map((record) => [record.period, record]));

  for (const [records, byKey, label] of [
    [revisedPerformance, performanceByKey, "performance"],
    [revisedReleases, releasesByKey, "release"]
  ]) {
    for (const record of records) {
      const previous = byKey.get(`${record.period}|${record.revision - 1}`);
      if (previous && deepEqual(withoutRevisionMetadata(previous), withoutRevisionMetadata(record))) {
        errors.push(`/corrections: corrected ${label} ${recordKey(record)} must change at least one primitive publication value.`);
      }
    }
  }

  const usage = new Map([...correctionMap.keys()].map((id) => [id, { performance: [], releases: [] }]));
  for (const record of revisedPerformance) {
    if (usage.has(record.correction_id)) usage.get(record.correction_id).performance.push(record);
  }
  for (const record of revisedReleases) {
    if (usage.has(record.correction_id)) usage.get(record.correction_id).releases.push(record);
  }
  for (const [id, records] of usage) {
    const total = records.performance.length + records.releases.length;
    if (total === 0) errors.push(`/corrections: correction ${id} is orphaned.`);
    if (records.performance.length > 1 || records.releases.length > 1) errors.push(`/corrections: correction ${id} may be used at most once in each revision stream.`);
    if (total > 2) errors.push(`/corrections: correction ${id} is referenced by too many revision records.`);
    const correction = correctionMap.get(id);
    const closeDate = records.performance[0]?.as_of_date
      || effectivePerformanceByPeriod.get(records.releases[0]?.period)?.as_of_date;
    if (correction && closeDate && correction.disclosed_on < closeDate) {
      errors.push(`/corrections: correction ${id} cannot be disclosed before its official close date.`);
    }
  }
}

function validateFiniteCumulative(effectivePerformance, errors) {
  const series = [
    ["Strategy", "strategy_return_pct"],
    ["benchmark", "benchmark_return_pct"]
  ];
  for (const [label, field] of series) {
    let wealth = 1;
    for (const record of effectivePerformance) {
      const monthlyReturn = Number(record[field]);
      const factor = 1 + monthlyReturn / 100;
      if (!Number.isFinite(monthlyReturn) || !Number.isFinite(factor) || factor < 0) {
        errors.push(`/performance: ${label} return series cannot be derived safely at ${record.period}.`);
        break;
      }
      if (wealth !== 0 && factor !== 0 && Math.abs(wealth) > Number.MAX_VALUE / Math.abs(factor)) {
        errors.push(`/performance: ${label} cumulative return overflows finite numeric output at ${record.period}.`);
        break;
      }
      const nextWealth = wealth * factor;
      if ((wealth !== 0 && factor !== 0 && nextWealth === 0) || (nextWealth !== 0 && Math.abs(nextWealth) < MIN_NORMAL_NUMBER)) {
        errors.push(`/performance: ${label} cumulative return underflows deterministic numeric output at ${record.period}.`);
        break;
      }
      wealth = nextWealth;
      if (!Number.isFinite(wealth) || Math.abs(wealth) > Number.MAX_VALUE / 100) {
        errors.push(`/performance: ${label} cumulative return overflows finite numeric output at ${record.period}.`);
        break;
      }
    }
  }
}

export function validateTransition(current, previous) {
  const errors = [];
  const warnings = [];
  if (!previous) return { errors, warnings };
  if (!deepEqual(current.conventions, previous.conventions)) errors.push("/conventions: permanent convention tuple is immutable after first publication.");
  if (current.schema_version !== previous.schema_version) errors.push("/schema_version: schema version cannot change inside this contract.");
  if (Date.parse(current.generated_at) <= Date.parse(previous.generated_at)) errors.push("/generated_at: must advance beyond the previous publication.");
  for (const key of ["performance", "releases", "corrections"]) {
    if (!Array.isArray(current[key]) || !Array.isArray(previous[key])) continue;
    if (current[key].length < previous[key].length) {
      errors.push(`/${key}: append-only history cannot remove records.`);
      continue;
    }
    previous[key].forEach((record, index) => {
      if (!deepEqual(current[key][index], record)) errors.push(`/${key}/${index}: published history is immutable; append a correction revision instead.`);
    });
  }
  const appended = ["performance", "releases", "corrections"].some((key) => Array.isArray(current[key]) && Array.isArray(previous[key]) && current[key].length > previous[key].length);
  if (!appended) errors.push("/: publication update must append a new close or correction, not only change metadata.");
  return { errors, warnings };
}

export function validatePublication(data, { previous = null } = {}) {
  const errors = [];
  const warnings = [];
  if (!checkObject(data, "", ["schema_version", "generated_at", "conventions", "performance", "releases", "corrections"], [], errors)) return { errors, warnings };
  checkConst(data.schema_version, 1, "/schema_version", errors);
  let generatedAt = null;
  if (typeof data.generated_at !== "string" || !TIMESTAMP.test(data.generated_at) || !Number.isFinite(Date.parse(data.generated_at))) {
    errors.push("/generated_at: expected a real UTC timestamp with whole seconds.");
  } else {
    generatedAt = new Date(data.generated_at);
    if (generatedAt.toISOString().replace(".000Z", "Z") !== data.generated_at) errors.push("/generated_at: timestamp must be canonical UTC with whole seconds.");
  }
  validateConventions(data.conventions, errors);
  const correctionMap = validateCorrections(data.corrections, generatedAt, errors);
  const performance = validatePerformance(data.performance, generatedAt, correctionMap, errors);
  validateReleases(data.releases, performance, correctionMap, errors);
  validateCorrectionReferences(data.performance, data.releases, correctionMap, errors);
  validateFiniteCumulative(performance, errors);

  const referencedCorrections = new Set([
    ...(Array.isArray(data.performance) ? data.performance : []),
    ...(Array.isArray(data.releases) ? data.releases : [])
  ].filter((record) => record && record.revision > 1 && typeof record.correction_id === "string").map((record) => record.correction_id));
  for (const id of correctionMap.keys()) {
    if (!referencedCorrections.has(id)) errors.push(`/corrections: correction ${id} is orphaned.`);
  }

  scanPublication(data, "", errors);
  if (previous) {
    const previousResult = validatePublication(previous);
    if (previousResult.errors.length) errors.push("previous publication supplied for transition validation is itself invalid.");
    const transition = validateTransition(data, previous);
    errors.push(...transition.errors);
    warnings.push(...transition.warnings);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function assertValidPublication(data, options = {}) {
  const result = validatePublication(data, options);
  if (result.errors.length) throw new PublicationValidationError(result.errors);
  return data;
}

function addPrimitiveChange(changes, scope, field, subject, unit, before, after) {
  const beforeValue = before === undefined ? null : before;
  const afterValue = after === undefined ? null : after;
  if (deepEqual(beforeValue, afterValue)) return;
  changes.push({ scope, field, subject: subject ?? null, unit, before: beforeValue, after: afterValue });
}

function publicHoldingMap(release) {
  return new Map((release?.holdings || []).map((holding) => [normalizedName(holding.name), holding]));
}

function publicAttributionMap(release) {
  const level = release?.attribution?.level;
  return new Map((release?.attribution?.items || []).map((item) => {
    const key = level === "sleeve" ? `sleeve:${item.sleeve_id}` : `position:${normalizedName(item.holding_name)}`;
    return [key, item];
  }));
}

function deriveCorrectionChanges(previousPerformance, currentPerformance, previousRelease, currentRelease) {
  const changes = [];
  addPrimitiveChange(changes, "performance", "as_of_date", null, "date", previousPerformance?.as_of_date, currentPerformance?.as_of_date);
  addPrimitiveChange(changes, "performance", "strategy_return_pct", null, "percent", previousPerformance?.strategy_return_pct, currentPerformance?.strategy_return_pct);
  addPrimitiveChange(changes, "performance", "benchmark_return_pct", null, "percent", previousPerformance?.benchmark_return_pct, currentPerformance?.benchmark_return_pct);

  const previousComposition = new Map((previousRelease?.composition || []).map((item) => [item.sleeve_id, item]));
  const currentComposition = new Map((currentRelease?.composition || []).map((item) => [item.sleeve_id, item]));
  for (const sleeveId of SLEEVE_IDS) {
    addPrimitiveChange(
      changes,
      "composition",
      "weight_pct_nav",
      sleeveId,
      "percent_nav",
      previousComposition.get(sleeveId)?.weight_pct_nav,
      currentComposition.get(sleeveId)?.weight_pct_nav
    );
  }

  const previousHoldings = publicHoldingMap(previousRelease);
  const currentHoldings = publicHoldingMap(currentRelease);
  const holdingKeys = [...new Set([...previousHoldings.keys(), ...currentHoldings.keys()])].sort();
  for (const key of holdingKeys) {
    const before = previousHoldings.get(key);
    const after = currentHoldings.get(key);
    const subject = after?.name || before?.name || key;
    addPrimitiveChange(changes, "holding", "name", subject, "text", before?.name, after?.name);
    addPrimitiveChange(changes, "holding", "ticker", subject, "identifier", before?.ticker, after?.ticker);
    addPrimitiveChange(changes, "holding", "sleeve_id", subject, "identifier", before?.sleeve_id, after?.sleeve_id);
    addPrimitiveChange(changes, "holding", "weight_pct_nav", subject, "percent_nav", before?.weight_pct_nav, after?.weight_pct_nav);
  }

  addPrimitiveChange(changes, "attribution", "level", null, "identifier", previousRelease?.attribution?.level, currentRelease?.attribution?.level);
  addPrimitiveChange(changes, "attribution", "coverage", null, "identifier", previousRelease?.attribution?.coverage, currentRelease?.attribution?.coverage);
  const previousAttribution = publicAttributionMap(previousRelease);
  const currentAttribution = publicAttributionMap(currentRelease);
  const attributionKeys = [...new Set([...previousAttribution.keys(), ...currentAttribution.keys()])].sort();
  for (const key of attributionKeys) {
    const before = previousAttribution.get(key);
    const after = currentAttribution.get(key);
    const subject = after?.sleeve_id || after?.holding_name || before?.sleeve_id || before?.holding_name || key;
    addPrimitiveChange(changes, "attribution", "effect_pp", subject, "percentage_points", before?.effect_pp, after?.effect_pp);
  }

  const previousParagraphs = previousRelease?.commentary?.paragraphs || [];
  const currentParagraphs = currentRelease?.commentary?.paragraphs || [];
  const paragraphCount = Math.max(previousParagraphs.length, currentParagraphs.length);
  for (let index = 0; index < paragraphCount; index += 1) {
    addPrimitiveChange(changes, "commentary", "paragraph", String(index + 1), "text", previousParagraphs[index], currentParagraphs[index]);
  }

  return changes.sort((left, right) => {
    const leftKey = `${left.scope}\u0000${left.subject || ""}\u0000${left.field}`;
    const rightKey = `${right.scope}\u0000${right.subject || ""}\u0000${right.field}`;
    return compareCodePoints(leftKey, rightKey);
  });
}

function deriveCorrections(data) {
  const performanceByKey = recordsByKey(data.performance);
  const releasesByKey = recordsByKey(data.releases);
  const performanceByCorrection = new Map(data.performance
    .filter((record) => record.revision > 1)
    .map((record) => [record.correction_id, record]));
  const releasesByCorrection = new Map(data.releases
    .filter((record) => record.revision > 1)
    .map((record) => [record.correction_id, record]));
  return data.corrections.map((correction) => {
    const performance = performanceByCorrection.get(correction.id);
    const release = releasesByCorrection.get(correction.id);
    const performanceRevision = performance?.revision ?? null;
    const releaseRevision = release?.revision ?? null;
    return {
      ...correction,
      performance_revision: performanceRevision,
      release_revision: releaseRevision,
      changes: deriveCorrectionChanges(
        performanceRevision === null ? null : performanceByKey.get(`${correction.period}|${performanceRevision - 1}`),
        performance,
        releaseRevision === null ? null : releasesByKey.get(`${correction.period}|${releaseRevision - 1}`),
        release
      )
    };
  });
}

function requireFinite(value, label) {
  if (!Number.isFinite(value)) {
    throw new PublicationValidationError([`${label}: deterministic calculation produced a non-finite numeric result.`]);
  }
  return Object.is(value, -0) ? 0 : value;
}

function assertFiniteNumbers(value, path = "derived") {
  if (typeof value === "number") {
    requireFinite(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteNumbers(item, `${path}/${index}`));
    return;
  }
  if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) assertFiniteNumbers(item, `${path}/${key}`);
  }
}

function compoundPercent(values) {
  let wealth = 1;
  for (const value of values) {
    const factor = requireFinite(1 + value / 100, "performance factor");
    if (wealth !== 0 && factor !== 0 && Math.abs(wealth) > Number.MAX_VALUE / Math.abs(factor)) {
      throw new PublicationValidationError(["performance: cumulative return exceeds finite numeric output."]);
    }
    const nextWealth = requireFinite(wealth * factor, "cumulative wealth");
    if ((wealth !== 0 && factor !== 0 && nextWealth === 0) || (nextWealth !== 0 && Math.abs(nextWealth) < MIN_NORMAL_NUMBER)) {
      throw new PublicationValidationError(["performance: cumulative return underflows deterministic numeric output."]);
    }
    wealth = nextWealth;
    if (Math.abs(wealth) > Number.MAX_VALUE / 100) {
      throw new PublicationValidationError(["performance: cumulative percentage exceeds finite numeric output."]);
    }
  }
  return requireFinite((wealth - 1) * 100, "cumulative return");
}

function effectiveWithIndex(records) {
  return effectiveRecords(records).map((record) => ({
    ...record,
    strategyReturnPct: Number(record.strategy_return_pct),
    benchmarkReturnPct: Number(record.benchmark_return_pct)
  }));
}

function windowSummary(selected, label) {
  if (!selected.length) return { available: false, strategyPct: null, benchmarkPct: null, excessPp: null };
  const strategyPct = compoundPercent(selected.map((row) => row.strategyMonthlyPct));
  const benchmarkPct = compoundPercent(selected.map((row) => row.benchmarkMonthlyPct));
  return { available: true, strategyPct, benchmarkPct, excessPp: requireFinite(strategyPct - benchmarkPct, `${label} excess return`) };
}

export function derivePublication(data) {
  const effectivePerformance = effectiveWithIndex(data.performance);
  const effectiveReleases = effectiveRecords(data.releases);
  const latestRelease = effectiveReleases.at(-1);
  const currentPeriod = latestRelease.period;
  const performanceByPeriod = new Map(effectivePerformance.map((record) => [record.period, record]));
  const asOfDate = performanceByPeriod.get(currentPeriod).as_of_date;
  let strategyWealth = 1;
  let benchmarkWealth = 1;
  let peak = 1;
  let maxDrawdownPct = 0;
  let maxDrawdownPeriod = null;
  const performanceRows = effectivePerformance.map((record) => {
    const strategyFactor = requireFinite(1 + record.strategyReturnPct / 100, `${record.period} Strategy factor`);
    const benchmarkFactor = requireFinite(1 + record.benchmarkReturnPct / 100, `${record.period} benchmark factor`);
    if ((strategyWealth !== 0 && strategyFactor !== 0 && Math.abs(strategyWealth) > Number.MAX_VALUE / Math.abs(strategyFactor))
      || (benchmarkWealth !== 0 && benchmarkFactor !== 0 && Math.abs(benchmarkWealth) > Number.MAX_VALUE / Math.abs(benchmarkFactor))) {
      throw new PublicationValidationError([`/performance: cumulative return exceeds finite numeric output at ${record.period}.`]);
    }
    const nextStrategyWealth = requireFinite(strategyWealth * strategyFactor, `${record.period} Strategy cumulative wealth`);
    const nextBenchmarkWealth = requireFinite(benchmarkWealth * benchmarkFactor, `${record.period} benchmark cumulative wealth`);
    if ((strategyWealth !== 0 && strategyFactor !== 0 && nextStrategyWealth === 0)
      || (benchmarkWealth !== 0 && benchmarkFactor !== 0 && nextBenchmarkWealth === 0)
      || (nextStrategyWealth !== 0 && Math.abs(nextStrategyWealth) < MIN_NORMAL_NUMBER)
      || (nextBenchmarkWealth !== 0 && Math.abs(nextBenchmarkWealth) < MIN_NORMAL_NUMBER)) {
      throw new PublicationValidationError([`/performance: cumulative return underflows deterministic numeric output at ${record.period}.`]);
    }
    strategyWealth = nextStrategyWealth;
    benchmarkWealth = nextBenchmarkWealth;
    if (Math.abs(strategyWealth) > Number.MAX_VALUE / 100 || Math.abs(benchmarkWealth) > Number.MAX_VALUE / 100) {
      throw new PublicationValidationError([`/performance: cumulative percentage exceeds finite numeric output at ${record.period}.`]);
    }
    peak = Math.max(peak, strategyWealth);
    const drawdownPct = requireFinite((strategyWealth / peak - 1) * 100, `${record.period} drawdown`);
    if (drawdownPct < maxDrawdownPct) {
      maxDrawdownPct = drawdownPct;
      maxDrawdownPeriod = record.period;
    }
    const strategyCumulativePct = requireFinite((strategyWealth - 1) * 100, `${record.period} Strategy cumulative return`);
    const benchmarkCumulativePct = requireFinite((benchmarkWealth - 1) * 100, `${record.period} benchmark cumulative return`);
    return {
      period: record.period,
      asOfDate: record.as_of_date,
      strategyMonthlyPct: record.strategyReturnPct,
      benchmarkMonthlyPct: record.benchmarkReturnPct,
      strategyCumulativePct,
      benchmarkCumulativePct,
      excessCumulativePp: requireFinite(strategyCumulativePct - benchmarkCumulativePct, `${record.period} cumulative excess return`),
      drawdownPct
    };
  });
  const last = performanceRows.at(-1);
  const since = {
    kind: "since_inception",
    available: true,
    strategyPct: last.strategyCumulativePct,
    benchmarkPct: last.benchmarkCumulativePct,
    excessPp: last.excessCumulativePp
  };
  const currentMonth = {
    kind: "current_month",
    period: last.period,
    ...windowSummary(performanceRows.slice(-1), "current month")
  };
  const trailingThreeMonths = {
    kind: "trailing_three_months",
    ...windowSummary(performanceRows.length >= 3 ? performanceRows.slice(-3) : [], "three month")
  };
  const trailingTwelveMonths = {
    kind: "trailing_twelve_months",
    ...windowSummary(performanceRows.length >= 12 ? performanceRows.slice(-12) : [], "twelve month")
  };
  const summary = {
    strategyCumulativePct: last.strategyCumulativePct,
    benchmarkCumulativePct: last.benchmarkCumulativePct,
    excessCumulativePp: last.excessCumulativePp,
    maxDrawdownPct,
    maxDrawdownPeriod,
    windows: [
      currentMonth,
      trailingThreeMonths,
      trailingTwelveMonths,
      since
    ]
  };
  const composition = latestRelease.composition.map((item) => ({
    sleeveId: item.sleeve_id,
    weightPct: Number(item.weight_pct_nav)
  }));
  const holdings = latestRelease.holdings.map((item) => ({
    name: item.name,
    ticker: item.ticker ?? null,
    sleeveId: item.sleeve_id,
    weightPct: Number(item.weight_pct_nav)
  })).sort((left, right) => right.weightPct - left.weightPct || compareCodePoints(normalizedName(left.name), normalizedName(right.name)));
  const attributionItems = latestRelease.attribution.items.map((item) => ({
    level: latestRelease.attribution.level,
    sleeveId: item.sleeve_id,
    holdingName: item.holding_name,
    effectPp: Number(item.effect_pp)
  }));
  const itemName = (item) => item.level === "sleeve" ? item.sleeveId : item.holdingName;
  attributionItems.sort((left, right) => {
    const leftGroup = left.effectPp > 0 ? 0 : left.effectPp < 0 ? 1 : 2;
    const rightGroup = right.effectPp > 0 ? 0 : right.effectPp < 0 ? 1 : 2;
    if (leftGroup !== rightGroup) return leftGroup - rightGroup;
    if (leftGroup === 0 && left.effectPp !== right.effectPp) return right.effectPp - left.effectPp;
    if (leftGroup === 1 && left.effectPp !== right.effectPp) return left.effectPp - right.effectPp;
    return compareCodePoints(normalizedName(itemName(left)), normalizedName(itemName(right)));
  });
  const currentStrategyReturn = performanceByPeriod.get(currentPeriod).strategyReturnPct;
  const attributionSum = attributionItems.reduce((sum, item) => sum + item.effectPp, 0);
  const derived = {
    effectivePerformance,
    latestRelease,
    currentPeriod,
    asOfDate,
    performanceRows,
    summary,
    composition,
    holdings,
    attribution: {
      level: latestRelease.attribution.level,
      coverage: latestRelease.attribution.coverage,
      items: attributionItems,
      reconciliationDeltaPp: requireFinite(attributionSum - currentStrategyReturn, "attribution reconciliation delta")
    },
    corrections: deriveCorrections(data),
    releaseCount: data.releases.length
  };
  assertFiniteNumbers(derived);
  return derived;
}
