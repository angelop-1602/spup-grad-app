<?php

namespace App\Support;

class NationalityNormalizer
{
    /**
     * Normalize nationality / country / demonym strings to a standard country name.
     * - Handles common separators (/, &, and, comma) and returns the FIRST recognized value.
     * - Use normalizeManyFromString() if you want ALL recognized values.
     */
    public static function normalize(?string $nationality): ?string
    {
        if ($nationality === null) {
            return null;
        }

        $raw = trim($nationality);
        if ($raw === '') {
            return null;
        }

        // Treat common "empty" inputs as null
        $nullTokens = [
            'n/a', 'na', 'none', 'no', 'not applicable', 'unknown', 'unsure',
            '-', '--', '---', 'null', 'nil', '0',
        ];
        $rawLower = mb_strtolower($raw, 'UTF-8');
        if (in_array(self::collapseSpaces(self::stripPunct($rawLower)), $nullTokens, true)) {
            return null;
        }

        // If user typed multiple values, return the first recognized
        foreach (self::splitCandidates($raw) as $candidate) {
            $mapped = self::mapSingle($candidate);
            if ($mapped !== null) {
                return $mapped;
            }
        }

        // Fallback: Title Case of the original (best-effort)
        return mb_convert_case($raw, MB_CASE_TITLE, 'UTF-8');
    }

    /**
     * Normalize a CSV-like string (e.g., "Filipino/Canadian") into multiple standardized values.
     * Returns unique results in input order.
     */
    public static function normalizeManyFromString(?string $nationality): array
    {
        if ($nationality === null || trim($nationality) === '') {
            return [];
        }

        $out = [];
        foreach (self::splitCandidates($nationality) as $candidate) {
            $mapped = self::mapSingle($candidate);
            if ($mapped !== null && !in_array($mapped, $out, true)) {
                $out[] = $mapped;
            }
        }
        return $out;
    }

    /**
     * Normalize an array of nationality strings.
     *
     * @param  array<string|null>  $nationalities
     * @return array<string>
     */
    public static function normalizeArray(array $nationalities): array
    {
        $out = [];
        foreach ($nationalities as $n) {
            $v = self::normalize($n);
            if ($v !== null) {
                $out[] = $v;
            }
        }
        return $out;
    }

    // -------------------------
    // Internals
    // -------------------------

    private static function mapSingle(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        // Lower + basic cleanup
        $lower = mb_strtolower($value, 'UTF-8');
        $lower = self::removeNoiseWords($lower);

        // Keep both UTF-8 and ASCII-transliterated keys (for accents)
        $keyUtf8 = self::canonicalKey($lower, transliterate: false);
        $keyAscii = self::canonicalKey($lower, transliterate: true);

        $candidates = array_values(array_unique(array_filter([
            $keyUtf8,
            str_replace(' ', '', $keyUtf8),
            $keyAscii,
            str_replace(' ', '', $keyAscii),
        ])));

        // 1) Exact mapping
        $map = self::mapping();
        foreach ($candidates as $k) {
            if (isset($map[$k])) {
                return $map[$k];
            }
        }

        // 2) Regex / pattern mapping (for very messy inputs)
        $joined = ' ' . $keyUtf8 . ' ';

        $regexMap = self::regexMapping();
        foreach ($regexMap as $pattern => $standard) {
            if (preg_match($pattern, $joined) === 1) {
                return $standard;
            }
        }

        return null;
    }

    private static function splitCandidates(string $raw): array
    {
        // Normalize common separators to a pipe
        $s = mb_strtolower($raw, 'UTF-8');

        // Convert connectors to a delimiter
        $s = str_replace(
            [';', ',', "\n", "\r", "\t", '/', '\\', '|', '&', '+'],
            '|',
            $s
        );

        // Replace " and " / " or " with delimiter (but avoid messing inside words)
        $s = preg_replace('/\s+(and|or)\s+/u', '|', $s) ?? $s;

        $parts = array_map('trim', explode('|', $s));
        $parts = array_values(array_filter($parts, fn($p) => $p !== ''));

        // If user typed something like "filipino-canadian", keep as-is (mapSingle can handle via regex),
        // but also attempt splitting on hyphen if it looks like two nationalities.
        $expanded = [];
        foreach ($parts as $p) {
            $expanded[] = $p;

            // If hyphenated AND both sides have letters, also consider the sides
            if (str_contains($p, '-') && preg_match('/[a-z].*-[a-z]/u', $p)) {
                foreach (array_map('trim', explode('-', $p)) as $hp) {
                    if ($hp !== '') {
                        $expanded[] = $hp;
                    }
                }
            }
        }

        return $expanded;
    }

    private static function removeNoiseWords(string $s): string
    {
        // Remove phrases users commonly add in forms
        $s = preg_replace('/\b(nationality|citizenship|citizen|country|country of origin|origin|from|born in)\b/u', ' ', $s) ?? $s;
        $s = preg_replace('/\b(i am|im|i\'m|we are|they are)\b/u', ' ', $s) ?? $s;
        return self::collapseSpaces($s);
    }

    private static function canonicalKey(string $s, bool $transliterate = false): string
    {
        $s = trim($s);

        if ($transliterate) {
            $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
            if ($ascii !== false && $ascii !== null) {
                $s = $ascii;
            }
        }

        $s = mb_strtolower($s, 'UTF-8');
        $s = self::stripPunct($s);
        $s = self::collapseSpaces($s);

        return $s;
    }

    private static function stripPunct(string $s): string
    {
        // Keep letters/numbers/spaces only; remove dots, commas, parentheses, emojis, etc.
        // Also keeps hyphen as space so "u.s.a" -> "u s a" -> later "usa" candidate exists.
        $s = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $s) ?? $s;
        return $s;
    }

    private static function collapseSpaces(string $s): string
    {
        $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
        return trim($s);
    }

    /**
     * Exact mapping table (keys MUST be canonicalKey() outputs, sometimes with spaces removed too).
     * Add/extend as needed.
     */
    private static function mapping(): array
    {
        return [
            // -------------------------
            // PHILIPPINES
            // -------------------------
            'philippines' => 'Philippines',
            'philippine' => 'Philippines',
            'republic of the philippines' => 'Philippines',
            'rp' => 'Philippines',
            'ph' => 'Philippines',
            'phl' => 'Philippines',
            'fil' => 'Philippines',
            'fili' => 'Philippines',
            'filipino' => 'Philippines',
            'pinoy' => 'Philippines',
            'pinay' => 'Philippines',
            'pinas' => 'Philippines',
            'pilipinas' => 'Philippines',
            'filipinas' => 'Philippines',

            // -------------------------
            // CHINA + RELATED
            // -------------------------
            'china' => 'China',
            'peoples republic of china' => 'China',
            'prc' => 'China',
            'cn' => 'China',
            'chn' => 'China',
            'chinese' => 'China',
            'zhongguo' => 'China',
            '中国' => 'China',

            // Taiwan (common user inputs)
            'taiwan' => 'Taiwan',
            'republic of china' => 'Taiwan',
            'roc' => 'Taiwan',
            'taiwanese' => 'Taiwan',
            'tw' => 'Taiwan',
            'twn' => 'Taiwan',
            '台湾' => 'Taiwan',

            // Hong Kong / Macau (often entered as nationality)
            'hong kong' => 'Hong Kong',
            'hk' => 'Hong Kong',
            'hkg' => 'Hong Kong',
            'hongkong' => 'Hong Kong',
            'macau' => 'Macau',
            'macao' => 'Macau',
            'mo' => 'Macau',
            'mac' => 'Macau',

            // -------------------------
            // UNITED STATES
            // -------------------------
            'united states' => 'United States',
            'united states of america' => 'United States',
            'america' => 'United States',
            'american' => 'United States',
            'usa' => 'United States',
            'us' => 'United States',
            'u s' => 'United States',
            'u s a' => 'United States',
            'u s of a' => 'United States',
            'u s a' => 'United States',

            // -------------------------
            // CANADA
            // -------------------------
            'canada' => 'Canada',
            'canadian' => 'Canada',
            'ca' => 'Canada',
            'can' => 'Canada',

            // -------------------------
            // UNITED KINGDOM
            // -------------------------
            'united kingdom' => 'United Kingdom',
            'uk' => 'United Kingdom',
            'u k' => 'United Kingdom',
            'gbr' => 'United Kingdom',
            'great britain' => 'United Kingdom',
            'britain' => 'United Kingdom',
            'british' => 'United Kingdom',
            'england' => 'United Kingdom',
            'scotland' => 'United Kingdom',
            'wales' => 'United Kingdom',
            'northern ireland' => 'United Kingdom',

            // -------------------------
            // AU / NZ
            // -------------------------
            'australia' => 'Australia',
            'australian' => 'Australia',
            'au' => 'Australia',
            'aus' => 'Australia',
            'new zealand' => 'New Zealand',
            'newzealand' => 'New Zealand',
            'nz' => 'New Zealand',
            'nzl' => 'New Zealand',
            'kiwi' => 'New Zealand',

            // -------------------------
            // JAPAN / KOREA
            // -------------------------
            'japan' => 'Japan',
            'japanese' => 'Japan',
            'jp' => 'Japan',
            'jpn' => 'Japan',

            'south korea' => 'South Korea',
            'korea' => 'South Korea', // common form input; adjust if you need distinction
            'korean' => 'South Korea',
            'republic of korea' => 'South Korea',
            'rok' => 'South Korea',
            'kr' => 'South Korea',
            'kor' => 'South Korea',

            'north korea' => 'North Korea',
            'dprk' => 'North Korea',
            'kp' => 'North Korea',
            'prk' => 'North Korea',

            // -------------------------
            // ASEAN COMMON
            // -------------------------
            'singapore' => 'Singapore',
            'singaporean' => 'Singapore',
            'sg' => 'Singapore',
            'sgp' => 'Singapore',

            'malaysia' => 'Malaysia',
            'malaysian' => 'Malaysia',
            'my' => 'Malaysia',
            'mys' => 'Malaysia',

            'indonesia' => 'Indonesia',
            'indonesian' => 'Indonesia',
            'id' => 'Indonesia',
            'idn' => 'Indonesia',

            'thailand' => 'Thailand',
            'thai' => 'Thailand',
            'th' => 'Thailand',
            'tha' => 'Thailand',

            'vietnam' => 'Vietnam',
            'viet nam' => 'Vietnam',
            'vietnamese' => 'Vietnam',
            'vn' => 'Vietnam',
            'vnm' => 'Vietnam',

            'cambodia' => 'Cambodia',
            'cambodian' => 'Cambodia',
            'khmer' => 'Cambodia',
            'kh' => 'Cambodia',
            'khm' => 'Cambodia',

            'laos' => 'Laos',
            'lao' => 'Laos',
            'laotian' => 'Laos',
            'lao pdr' => 'Laos',
            'la' => 'Laos',

            'myanmar' => 'Myanmar',
            'burma' => 'Myanmar',
            'burmese' => 'Myanmar',
            'mm' => 'Myanmar',

            'brunei' => 'Brunei',
            'bruneian' => 'Brunei',
            'bn' => 'Brunei',

            // -------------------------
            // SOUTH ASIA
            // -------------------------
            'india' => 'India',
            'indian' => 'India',
            'in' => 'India',
            'ind' => 'India',

            'pakistan' => 'Pakistan',
            'pakistani' => 'Pakistan',
            'pk' => 'Pakistan',
            'pak' => 'Pakistan',

            'bangladesh' => 'Bangladesh',
            'bangladeshi' => 'Bangladesh',
            'bd' => 'Bangladesh',
            'bgd' => 'Bangladesh',

            'sri lanka' => 'Sri Lanka',
            'srilanka' => 'Sri Lanka',
            'sri lankan' => 'Sri Lanka',
            'lk' => 'Sri Lanka',

            'nepal' => 'Nepal',
            'nepali' => 'Nepal',
            'np' => 'Nepal',

            // -------------------------
            // MIDDLE EAST (common)
            // -------------------------
            'united arab emirates' => 'United Arab Emirates',
            'uae' => 'United Arab Emirates',
            'u a e' => 'United Arab Emirates',

            'saudi arabia' => 'Saudi Arabia',
            'saudi' => 'Saudi Arabia',
            'ksa' => 'Saudi Arabia',

            'qatar' => 'Qatar',
            'qatari' => 'Qatar',

            'kuwait' => 'Kuwait',
            'kuwaiti' => 'Kuwait',

            'oman' => 'Oman',
            'omani' => 'Oman',

            // -------------------------
            // EUROPE (common)
            // -------------------------
            'france' => 'France',
            'french' => 'France',
            'deutschland' => 'Germany',
            'germany' => 'Germany',
            'german' => 'Germany',
            'italy' => 'Italy',
            'italian' => 'Italy',
            'spain' => 'Spain',
            'spanish' => 'Spain',
            'portugal' => 'Portugal',
            'portuguese' => 'Portugal',
            'netherlands' => 'Netherlands',
            'dutch' => 'Netherlands',
            'belgium' => 'Belgium',
            'belgian' => 'Belgium',
            'switzerland' => 'Switzerland',
            'swiss' => 'Switzerland',

            // -------------------------
            // LATAM (common)
            // -------------------------
            'mexico' => 'Mexico',
            'mexican' => 'Mexico',
            'brazil' => 'Brazil',
            'brasil' => 'Brazil',
            'brazilian' => 'Brazil',
            'argentina' => 'Argentina',
            'argentinian' => 'Argentina',
            'argentine' => 'Argentina',
            'chile' => 'Chile',
            'chilean' => 'Chile',
            'colombia' => 'Colombia',
            'colombian' => 'Colombia',
            'peru' => 'Peru',
            'peruvian' => 'Peru',

            // -------------------------
            // AFRICA (common)
            // -------------------------
            'south africa' => 'South Africa',
            'southafrica' => 'South Africa',
            'sa' => 'South Africa', // NOTE: could conflict with Saudi Arabia; adjust if needed
            'nigeria' => 'Nigeria',
            'nigerian' => 'Nigeria',
            'kenya' => 'Kenya',
            'kenyan' => 'Kenya',
            'egypt' => 'Egypt',
            'egyptian' => 'Egypt',
        ];
    }

    /**
     * Pattern mapping for messy strings like:
     * - "Filipino-American", "Filipino / Canadian"
     * - "U.S.A.", "U.K."
     * - "PRC citizen", "Republic of Korea"
     */
    private static function regexMapping(): array
    {
        return [
            // USA patterns
            '/\b(u\s*s\s*a|u\s*s|usa|america|american)\b/u' => 'United States',

            // UK patterns
            '/\b(u\s*k|uk|great britain|britain|british|england|scotland|wales|northern ireland)\b/u' => 'United Kingdom',

            // Philippines patterns (including hyphenated diaspora forms)
            '/\b(filipino|pinoy|pinay|pinas|pilipinas|philippines|phl|ph)\b/u' => 'Philippines',

            // China patterns
            '/\b(prc|people s republic of china|china|chinese|zhongguo|cn|chn)\b/u' => 'China',

            // Korea patterns
            '/\b(republic of korea|south korea|korean|rok|kr|kor)\b/u' => 'South Korea',
            '/\b(dprk|north korea)\b/u' => 'North Korea',

            // UAE patterns
            '/\b(united arab emirates|uae)\b/u' => 'United Arab Emirates',
        ];
    }
}
