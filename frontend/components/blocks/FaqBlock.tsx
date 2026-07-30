"use client";

interface FaqItem {
  question?: string;
  answer?: string;
}

interface FaqBlockProps {
  value: {
    title?: string;
    faq_items?: FaqItem[];
    class?: string;
  };
}

export function FaqBlock({ value }: FaqBlockProps) {
  return (
    <section className={`py-16 ${value.class ?? ""}`}>
      <div className="max-w-3xl mx-auto px-4">
        {value.title && <h2 className="text-2xl font-bold text-white mb-8">{value.title}</h2>}
        <div className="space-y-4">
          {(value.faq_items ?? []).map((item, i) => (
            <div key={i} className="glass-card">
              <h3 className="text-white font-medium mb-2">{item.question}</h3>
              <p className="text-base-content/60 text-sm">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
