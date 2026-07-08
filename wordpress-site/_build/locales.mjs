/** Site dilleri — kaynak: Türkçe (Decap CMS) */
export const LOCALES = [
  { code: "tr", label: "TR", name: "Türkçe", dir: "ltr", htmlLang: "tr", deepl: null },
  { code: "en", label: "EN", name: "English", dir: "ltr", htmlLang: "en", deepl: "EN" },
  { code: "ru", label: "RU", name: "Русский", dir: "ltr", htmlLang: "ru", deepl: "RU" },
  { code: "ar", label: "AR", name: "العربية", dir: "rtl", htmlLang: "ar", deepl: "AR" },
];

export const SOURCE_LOCALE = "tr";
export const TARGET_LOCALES = ["en", "ru", "ar"];

export function getLocale(code) {
  return LOCALES.find((l) => l.code === code) || LOCALES[0];
}
