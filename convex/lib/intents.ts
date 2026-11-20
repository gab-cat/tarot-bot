// Plain-text intents the bot recognises outside a reading.

const GREETING =
  /^(hi+|hello|hey+|hiya|howdy|greetings|good (morning|afternoon|evening)|sup|yo|aloha|bonjour|hola|ciao|namaste|salam|shalom|konnichiwa|kumusta|musta)\b/i;

export function isGreeting(text: string): boolean {
  return GREETING.test(text.trim());
}

export function isCancel(text: string): boolean {
  return /^(cancel|stop|end)$/i.test(text.trim());
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// English and Tagalog month names and common short forms, lowercase, to a month index.
const MONTH_WORDS: Record<string, number> = {};
[
  ["jan", "january", "enero"],
  ["feb", "february", "pebrero", "febrero"],
  ["mar", "march", "marso", "marzo"],
  ["apr", "april", "abril"],
  ["may", "mayo"],
  ["jun", "june", "hunyo", "junio"],
  ["jul", "july", "hulyo", "julio"],
  ["aug", "august", "agosto"],
  ["sep", "sept", "september", "setyembre", "septiyembre", "septiembre"],
  ["oct", "october", "oktubre", "octubre"],
  ["nov", "november", "nobyembre", "noviembre"],
  ["dec", "december", "disyembre", "diciembre"],
].forEach((words, index) => words.forEach((word) => (MONTH_WORDS[word] = index)));

function format(monthIndex: number, day: number): string | null {
  if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[monthIndex]) return null;
  return `${MONTHS[monthIndex]} ${day}`;
}

/**
 * A birthdate in the forms people actually type, normalised to "Mon D" (e.g. "Oct 15"),
 * or null. Accepts "Oct 15", "October 15th", "15 Oct", "Oktubre 15", "ika-15 ng Oktubre",
 * "Oct 15, 1998", "10/15", "15/10", "1998-10-15". Numeric dates read month first, as in
 * the Philippines, unless the first number can't be a month. The year is dropped.
 */
export function parseBirthdate(text: string): string | null {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/\b(po|lang|ko|ang|birthday|birthdate|bday|my|is|it's|its|born|on)\b/g, " ")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Words: "oct 15", "october 15th", "15 october", "ika-15 ng oktubre", optional year.
  const word =
    /^(?:ika-?)?(\d{1,2})(?:st|nd|rd|th)?(?: of| ng)? ([a-z]+)(?: \d{4})?$|^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?(?: \d{4})?$/.exec(
      cleaned,
    );
  if (word) {
    const [monthWord, day] = word[2] ? [word[2], Number(word[1])] : [word[3], Number(word[4])];
    const month = MONTH_WORDS[monthWord];
    return month === undefined ? null : format(month, day);
  }

  // ISO: 1998-10-15.
  const iso = /^\d{4}[-/](\d{1,2})[-/](\d{1,2})$/.exec(cleaned);
  if (iso) return format(Number(iso[1]) - 1, Number(iso[2]));

  // Numeric: 10/15, 15/10, 10-15-1998.
  const numeric = /^(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?$/.exec(cleaned);
  if (numeric) {
    const [a, b] = [Number(numeric[1]), Number(numeric[2])];
    return a <= 12 ? format(a - 1, b) : format(b - 1, a);
  }
  return null;
}
