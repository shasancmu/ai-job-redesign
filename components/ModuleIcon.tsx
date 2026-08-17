// Crisp geometric line-icons per module (no emoji). Color via `currentColor`.
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
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
