import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "om" | "en";

const STORAGE_KEY = "jag-lang";

const dict = {
  "nav.home": { om: "Fuula Duraa", en: "Home" },
  "nav.explore": { om: "Qoradhu", en: "Explore" },
  "nav.experiences": { om: "Muuxannoo", en: "Experiences" },
  "nav.create": { om: "Uumi", en: "Create" },
  "nav.createPost": { om: "Maxxansa uumi", en: "Create post" },
  "nav.alerts": { om: "Beeksisa", en: "Alerts" },
  "nav.profile": { om: "Profaayila", en: "Profile" },
  "nav.login": { om: "Seeni", en: "Login" },
  "nav.loginSignup": { om: "Seeni / Galmaa'i", en: "Login / Sign up" },
  "nav.myProfile": { om: "Profaayila koo", en: "My profile" },
  "nav.editProfile": { om: "Profaayila gulaali", en: "Edit profile" },
  "nav.logout": { om: "Ba'i", en: "Log out" },
  "nav.search": { om: "Barbaadi", en: "Search" },
  "nav.notifications": { om: "Beeksisa", en: "Notifications" },
  "nav.account": { om: "Akkaawuntii kee", en: "Your account" },

  "hero.eyebrow": {
    om: "Yuunivarsiitii Haramayaa · Barattoonni wal gargaaru",
    en: "Haramaya University · Students helping students",
  },
  "hero.tagline": {
    om: "Muuxannoon kee nama tokkoof qajeelfama ta'a.",
    en: "Your Experience Can Guide Someone.",
  },
  "hero.desc": {
    om: "Muuxannoo dhugaa barattoota Yuunivarsiitii Haramayaa. Beekumsa kee qoodi, kan biroo irraa baradhu, dhaloota itti aanu gargaari.",
    en: "Real student experiences from Haramaya University. Share your knowledge, learn from others, and help the next generation succeed.",
  },
  "hero.explore": { om: "Muuxannoo Qoradhu", en: "Explore Experiences" },
  "hero.share": { om: "Muuxannoo Kee Qoodi", en: "Share Your Experience" },
  "hero.join": { om: "JAG Makami", en: "Join JAG" },
  "stats.posts": { om: "Muuxannoo qoodaman", en: "Shared experiences" },
  "stats.students": { om: "Barattoonni makaman", en: "Students joined" },

  "section.featured": { om: "Muuxannoo filataman", en: "Featured experiences" },
  "section.latest": {
    om: "Kan dhiyeenya barattootaa",
    en: "Latest from students",
  },
  "section.seeAll": { om: "Hunda ilaali", en: "See all" },
  "section.trending": { om: "Kan amma beekkaman", en: "Trending now" },
  "section.categories": { om: "Ramaddii beekkaman", en: "Popular categories" },
  "section.listen": {
    om: "Muuxannoo dhaggeeffadhu",
    en: "Listen to experiences",
  },
  "section.watch": { om: "Daawwadhuut baradhu", en: "Watch & learn" },
  "empty.posts": {
    om: "Amma muuxannoon hin jiru — jalqaba ta'ee qoodi.",
    en: "No posts yet — be the first to share.",
  },

  "how.title": { om: "JAG akkataa hojjetu", en: "How JAG works" },
  "how.step1.t": { om: "Muuxannoo kee qoodi", en: "Share your experience" },
  "how.step1.d": {
    om: "Barreessi, suuraa fe'i, sagalee waraabi ykn viidiyoo YouTube dabali.",
    en: "Write, upload photos, record audio or add a YouTube video.",
  },
  "how.step2.t": { om: "Kan biroo irraa baradhu", en: "Learn from others" },
  "how.step2.d": {
    om: "Seenaa dhugaa barattoota karaa sana dabran dubbisi.",
    en: "Read honest stories from students who've been there.",
  },
  "how.step3.t": { om: "Nama tokko qajeelchi", en: "Guide someone" },
  "how.step3.d": {
    om: "Yaada kenni, gaaffii deebisi, barataa itti aanu jajjabeeysi.",
    en: "Comment, answer and encourage the next student.",
  },
  "how.step4.t": { om: "Waliin guddadhaa", en: "Grow together" },
  "how.step4.d": {
    om: "Barattoota hordofi, hawaasa hunda ol kaasu ijaari.",
    en: "Follow students and build a community that lifts everyone.",
  },
  "how.step": { om: "TARKANFII", en: "STEP" },

  "footer.desc": {
    om: "Waldaanna Barattootaa Dhalootaa Jaatanii Alii (JAG) — barattoota Yuunivarsiitii Haramayaaf. Muuxannoon kee nama tokkoof qajeelfama ta'a.",
    en: "Jatani Ali Generation (JAG) Students Association — Waldeenna Barattootaa Dhaloota Jaatanii Alii. For students of Haramaya University. Your Experience Can Guide Someone.",
  },
  "footer.about": { om: "Waa'ee JAG", en: "About JAG" },
  "footer.guidelines": {
    om: "Qajeelfama hawaasaa",
    en: "Community guidelines",
  },
  "footer.privacy": { om: "Iccitii & seera", en: "Privacy & terms" },
  "footer.contact": { om: "Quunnamtii", en: "Contact" },

  "auth.subtitle": {
    om: "Barattoota Yuunivarsiitii Haramayaaf. Lakkoofsa bilbilaa fi jecha iccitiitiin galmaa'aa/seenaa; koodiin OTP hin barbaachisu.",
    en: "For Haramaya University students. Sign up and sign in with your phone number and password—no OTP required.",
  },
  "auth.join": { om: "JAG Makami", en: "Join JAG" },
  "auth.signin": { om: "Seeni", en: "Sign in" },
  "auth.fullName": { om: "Maqaa guutuu", en: "Full name" },
  "auth.phone": { om: "Lakkoofsa bilbilaa", en: "Phone number" },
  "auth.password": { om: "Jecha iccitii", en: "Password" },
  "auth.createAccount": { om: "Akkaawuntii uumi", en: "Create account" },
  "auth.haveAccount": {
    om: "Miseensa taatee jirtaa? Seeni",
    en: "Already a member? Sign in",
  },
  "auth.noAccount": {
    om: "Akkaawuntii hin qabduu? Galmaa'i",
    en: "No account? Join",
  },
  "auth.signinTitle": { om: "JAG seeni", en: "Sign in to JAG" },
  "auth.pleaseWait": { om: "Tana obsi…", en: "Please wait…" },
  "auth.newToJag": {
    om: "JAG haaraa? Akkaawuntii uumi",
    en: "New to JAG? Create account",
  },
  "auth.showPassword": { om: "Jecha iccitii agarsiisi", en: "Show password" },
  "auth.hidePassword": { om: "Jecha iccitii dhoksi", en: "Hide password" },
} as const;

export type TKey = keyof typeof dict;

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
};
const Ctx = createContext<LangCtx>({
  lang: "om",
  setLang: () => {},
  t: (k) => dict[k].om,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("om");
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "om" || saved === "en") setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  };
  const t = (k: TKey) => dict[k][lang];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
