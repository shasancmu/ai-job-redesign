// Crisp geometric line-icons per module (no emoji). Color via `currentColor`.
// Modules without a bespoke icon fall back to one per category, below.
import { moduleCategory } from "@/lib/modules";

export default function ModuleIcon({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (slug) {
    case "reimagine-job": // paired — two linked nodes
      return (
        <svg {...common}>
          <circle cx="7" cy="8" r="3" />
          <circle cx="17" cy="16" r="3" />
          <path d="M9.2 10.2 14.8 13.8" />
        </svg>
      );
    case "reimagine-workflow": // a flow of steps
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="6" r="2" />
          <circle cx="19" cy="12" r="2" />
          <circle cx="12" cy="18" r="2" />
          <path d="M6.8 11 10.2 7M13.8 7l3.4 4M17.2 13l-3.4 4M10.2 17 6.8 13" />
        </svg>
      );
    case "workflow-solo": // flow with a spark
      return (
        <svg {...common}>
          <circle cx="5" cy="6" r="2" />
          <circle cx="5" cy="18" r="2" />
          <circle cx="15" cy="12" r="2" />
          <path d="M7 6.6 13.2 11M7 17.4 13.2 13" />
          <path d="M19 5v3M20.5 6.5h-3" />
        </svg>
      );
    case "network": // connected nodes
      return (
        <svg {...common}>
          <circle cx="6" cy="7" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="17" cy="17" r="2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M7.6 8.2 10.6 10.6M16.4 7.2 13.4 10.6M15.6 15.6 13.4 13.4M8.4 15.6 10.6 13.4" />
        </svg>
      );
    case "personal-network": // ego at center with contacts around
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.4" />
          <circle cx="5" cy="6" r="1.8" />
          <circle cx="19" cy="6" r="1.8" />
          <circle cx="5" cy="18" r="1.8" />
          <circle cx="19" cy="18" r="1.8" />
          <path d="M10.2 10.6 6.4 7.2M13.8 10.6 17.6 7.2M10.2 13.4 6.4 16.8M13.8 13.4 17.6 16.8" />
        </svg>
      );
    case "domain-brief": // magnifier over a cluster of nodes
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6" />
          <path d="m20 20-4.5-4.5" />
          <circle cx="8" cy="9" r="1" />
          <circle cx="12" cy="8" r="1" />
          <circle cx="10.5" cy="12" r="1" />
          <path d="M8.6 9.3 11.2 8.2M11.6 8.7 10.8 11M9 10.2l1.2 1.4" />
        </svg>
      );
    case "find-collaborators": // two nodes bridged by a link
      return (
        <svg {...common}>
          <circle cx="6" cy="7" r="2.5" />
          <circle cx="18" cy="17" r="2.5" />
          <circle cx="17" cy="6" r="1.6" />
          <circle cx="7" cy="18" r="1.6" />
          <path d="M8 8.4 15.6 15.2" />
        </svg>
      );
    case "licensing-brief": // a document with a seal
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M13 3v4h4" />
          <circle cx="11" cy="14" r="2" />
          <path d="M11 16v3l-1.2-.9-1.3.9v-3" />
        </svg>
      );
    case "benchmark": // a gauge / timer
      return (
        <svg {...common}>
          <path d="M5 19a9 9 0 1 1 14 0" />
          <path d="M12 12l4-3" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case "solo-ai": // a spark
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
          <path d="M12 8.5 13.2 10.8 15.5 12l-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2z" />
        </svg>
      );
    case "execution-4a": // the 2x2 A's
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "balanced-scorecard": // bars
      return (
        <svg {...common}>
          <path d="M5 20V11M12 20V5M19 20v-6" />
          <path d="M3 20h18" />
        </svg>
      );
    case "ai-canvas": // frontier curve + spark
      return (
        <svg {...common}>
          <path d="M4 20V4M4 20h16" />
          <path d="M6 16c5 0 9-3 12-11" />
          <path d="M19 4.5v2.4M20.2 5.7h-2.4" />
        </svg>
      );
    case "opportunity-capability": // target
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.8" />
        </svg>
      );
    case "test-the-bet": // beaker
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6l-4.5 8A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3L14 9V3" />
          <path d="M7.5 15h9" />
        </svg>
      );
    case "good-business": // rising chart + arrow
      return (
        <svg {...common}>
          <path d="M4 20V4M4 20h16" />
          <path d="M7 15l3.5-4 3 2.5L19 7" />
          <path d="M19 7h-3M19 7v3" />
        </svg>
      );
    case "close-the-offer": // two arrows meeting (bargaining)
      return (
        <svg {...common}>
          <path d="M3 9h8M8 6l3 3-3 3" />
          <path d="M21 15h-8M16 12l-3 3 3 3" />
        </svg>
      );
    case "name-your-price": // price tag
      return (
        <svg {...common}>
          <path d="M12 3H5a2 2 0 0 0-2 2v7l9 9 9-9-7-7a2 2 0 0 0-2-2z" />
          <circle cx="8" cy="8" r="1.3" />
        </svg>
      );
    default:
      // Most modules have no bespoke icon, and a single blank circle told you
      // nothing and made whole categories look identical in the grid. Fall back
      // to the module's category so a card at least names its family. Each of
      // these is kept distinct from the bespoke icons above.
      switch (moduleCategory(slug)) {
        case "redesign": // a briefcase with a spark — work, reshaped by AI
          return (
            <svg {...common}>
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              {/* a four-point spark, not a cross — a plus here reads as a first-aid kit */}
              <path d="M12 10.5l1.05 1.95L15 13.5l-1.95 1.05L12 16.5l-1.05-1.95L9 13.5l1.95-1.05z" />
            </svg>
          );
        case "foundations": // a chip — how the machine actually works
          return (
            <svg {...common}>
              <rect x="8" y="8" width="8" height="8" rx="1.5" />
              <path d="M10 8V5M14 8V5M10 19v-3M14 19v-3M8 10H5M8 14H5M19 10h-3M19 14h-3" />
            </svg>
          );
        case "strategy": // a fork in the road — a decision with branches
          return (
            <svg {...common}>
              <path d="M12 21v-8M12 13 6.5 8.5M12 13l5.5-4.5" />
              <circle cx="5.5" cy="7" r="1.6" />
              <circle cx="18.5" cy="7" r="1.6" />
            </svg>
          );
        case "commercialize": // an atom — science on its way to a venture
          return (
            <svg {...common}>
              <circle cx="12" cy="12" r="1.7" />
              <ellipse cx="12" cy="12" rx="9.2" ry="3.2" />
              <ellipse cx="12" cy="12" rx="9.2" ry="3.2" transform="rotate(60 12 12)" />
              <ellipse cx="12" cy="12" rx="9.2" ry="3.2" transform="rotate(120 12 12)" />
            </svg>
          );
        case "negotiate": // a balance scale — claiming and creating value
          return (
            <svg {...common}>
              <path d="M12 4v16M8 20h8M4 7h16" />
              <path d="M1.5 12a3.5 3.5 0 0 0 7 0zM15.5 12a3.5 3.5 0 0 0 7 0z" />
              <path d="M5 7v5M19 7v5" />
            </svg>
          );
        case "live": // a broadcast — the whole room, responding at once
          return (
            <svg {...common}>
              <circle cx="12" cy="12" r="2" />
              <path d="M8.4 8.4a5 5 0 0 0 0 7.2M15.6 8.4a5 5 0 0 1 0 7.2" />
              <path d="M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          );
        case "research": // an open book — scholarship
          return (
            <svg {...common}>
              <path d="M12 6.5C10 5 7 4.4 4 5v13c3-.6 6 0 8 1.5 2-1.5 5-2.1 8-1.5V5c-3-.6-6 0-8 1.5z" />
              <path d="M12 6.5v13" />
            </svg>
          );
        case "phd": // a graduation cap — the path to placement
          return (
            <svg {...common}>
              <path d="M2 9l10-4.5L22 9l-10 4.5z" />
              <path d="M6 11v4.5c0 1.6 2.7 2.9 6 2.9s6-1.3 6-2.9V11" />
            </svg>
          );
        default:
          return (
            <svg {...common}>
              <circle cx="12" cy="12" r="8" />
            </svg>
          );
      }
  }
}
