import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About JAG — Students helping students" },
      {
        name: "description",
        content:
          "Why JAG exists, our community guidelines, and how we treat your information.",
      },
      { property: "og:title", content: "About JAG" },
      {
        property: "og:description",
        content: "One student's experience can become another student's guide.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="prose-jag mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-4xl font-extrabold">About JAG</h1>
      <p className="text-lg text-muted-foreground">
        JAG — the Jatani Ali Generation Students Association (Waldeenna
        Barattootaa Dhaloota Jaatanii Alii) — is a community for students of
        Haramaya University who share what they've lived through so the next
        student has an easier path. One student's experience can become another
        student's guide.
      </p>
      <h2 id="guidelines">Community guidelines</h2>
      <ul>
        <li>Be honest. Share what really happened, good and bad.</li>
        <li>Be kind. Disagree with ideas, never attack people.</li>
        <li>Only upload photos and audio you have the right to share.</li>
        <li>No hate speech, harassment, spam or exam cheating material.</li>
      </ul>
      <h2 id="privacy">Privacy & terms</h2>
      <p>
        Your phone number is used only to sign you in and is never shown to
        other students. Your name, university, department and bio are public on
        your profile. You can edit or delete your own posts at any time. Content
        that breaks the guidelines may be removed.
      </p>
    </div>
  );
}
