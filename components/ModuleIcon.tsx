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
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
