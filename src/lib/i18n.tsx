import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "es";
const KEY = "eduverse-lang";

const dict: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Dashboard", classes: "Classes", assignments: "Assignments",
    announcements: "Announcements", materials: "Materials", discussions: "Discussions",
    tutor: "AI Tutor", planner: "Study Planner", calendar: "Calendar",
    students: "Students", analytics: "Analytics", profile: "Profile",
    quizzes: "Quizzes", flashcards: "Flashcards", meetings: "Live Classes",
    leaderboard: "Leaderboard", signout: "Sign out", search: "Search...",
    language: "Language", theme: "Theme",
  },
  hi: {
    dashboard: "डैशबोर्ड", classes: "कक्षाएं", assignments: "असाइनमेंट",
    announcements: "घोषणाएं", materials: "सामग्री", discussions: "चर्चा",
    tutor: "एआई ट्यूटर", planner: "अध्ययन योजनाकार", calendar: "कैलेंडर",
    students: "छात्र", analytics: "एनालिटिक्स", profile: "प्रोफ़ाइल",
    quizzes: "क्विज़", flashcards: "फ्लैशकार्ड", meetings: "लाइव क्लास",
    leaderboard: "लीडरबोर्ड", signout: "साइन आउट", search: "खोजें...",
    language: "भाषा", theme: "थीम",
  },
  es: {
    dashboard: "Panel", classes: "Clases", assignments: "Tareas",
    announcements: "Anuncios", materials: "Materiales", discussions: "Discusiones",
    tutor: "Tutor IA", planner: "Planificador", calendar: "Calendario",
    students: "Estudiantes", analytics: "Analítica", profile: "Perfil",
    quizzes: "Cuestionarios", flashcards: "Tarjetas", meetings: "Clases en vivo",
    leaderboard: "Clasificación", signout: "Cerrar sesión", search: "Buscar...",
    language: "Idioma", theme: "Tema",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as Lang | null;
    if (saved && dict[saved]) setLangState(saved);
  }, []);
  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }
  const t = (k: string) => dict[lang][k] ?? dict.en[k] ?? k;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
