export const metadata = { title: "Help" };

const FAQ = [
  { q: "How do staff log in?", a: "Staff use the lock icon at the top (Switch user) and enter their PIN. Only people with an email and password can log in from a new device." },
  { q: "Where is my Shop ID?", a: "Settings shows your Shop ID. You need it, plus your email and password, to log in." },
  { q: "Can each person have their own theme?", a: "Yes. Settings → Appearance is saved per staff member." },
  { q: "Who can change shop details?", a: "Only the owner. Managers can add cashiers, stock staff, tailors and accountants." },
];

export default function HelpPage() {
  return (
    <section className="card max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">Help</h1>
      <p className="mt-1 text-muted">Quick answers. More guides and videos are on the way.</p>
      <div className="mt-6 space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="rounded-2xl bg-surface-2 px-5 py-4">
            <summary className="cursor-pointer font-semibold">{item.q}</summary>
            <p className="mt-2 text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
