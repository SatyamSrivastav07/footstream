import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function PublicBreadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 text-sm text-white/40">
        {items.map((item, index) => (
          <li
            className="flex items-center gap-2"
            key={`${item.label}-${index}`}
          >
            {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
            {item.to ? (
              <Link
                className="rounded-sm hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300"
                to={item.to}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-white/70">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
