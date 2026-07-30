"use client";

interface AmenityItemBlockProps {
  value: {
    icon?: string;
    name?: string;
    description?: string;
    class?: string;
  };
}

export function AmenityItemBlock({ value }: AmenityItemBlockProps) {
  return (
    <div className={`flex items-start gap-3 ${value.class ?? ""}`}>
      {value.icon && (
        <span className="material-symbols-outlined text-primary text-xl mt-0.5">
          {value.icon}
        </span>
      )}
      <div>
        {value.name && <h4 className="text-white font-medium">{value.name}</h4>}
        {value.description && (
          <p className="text-base-content/60 text-sm">{value.description}</p>
        )}
      </div>
    </div>
  );
}
