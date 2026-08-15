"use client";

export default function PartnerJobCard({
  partnerWorkspace,
  partnerProfile,
}: any) {
  const title = partnerWorkspace?.owner_job_title;
  return (
    <div className="card bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ai">
        Redesigning{" "}
        {partnerProfile?.display_name
          ? `${partnerProfile.display_name}'s job`
          : "your partner's job"}
      </div>
      {title ? (
        <>
          <div className="mt-1 font-semibold">{title}</div>
          {partnerWorkspace?.owner_job_description && (
            <p className="mt-1 text-sm text-slate-600">
              {partnerWorkspace.owner_job_description}
            </p>
          )}
        </>
      ) : (
        <div className="mt-1 text-sm text-slate-400">
          Your partner hasn&apos;t described their job yet.
        </div>
      )}
    </div>
  );
}
