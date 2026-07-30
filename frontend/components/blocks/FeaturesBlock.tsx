"use client";

interface Feature {
  icon?: string;
  title?: string;
  description?: string;
}

interface FeaturesBlockProps {
  value: {
    title?: string;
    features?: Feature[];
    class?: string;
  };
}

export function FeaturesBlock({ value }: FeaturesBlockProps) {
  return (
    <section className={`py-16 md:py-20 ${value.class ?? ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {value.title && <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">{value.title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(value.features ?? []).map((f, i) => (
            <div key={i} className="glass-card">
              {f.icon && (
                <span className="material-symbols-outlined text-2xl text-primary mb-3 block">
                  {f.icon}
                </span>
              )}
              {f.title && <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>}
              {f.description && <p className="text-base-content/60 text-sm">{f.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
