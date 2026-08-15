"use client";

import { useEffect, useRef } from "react";

export default function SetupPanel(props: any) {
  const { myWorkspace, myProfile, partnerWorkspace, partnerProfile, updateMine, updateProfile } = props;
  const seeded = useRef(false);

  // Prefill from a saved profile the first time, if this workspace is blank.
  useEffect(() => {
    if (seeded.current || !myWorkspace) return;
    seeded.current = true;
    if (!myWorkspace.owner_job_title && (myProfile?.job_title || myProfile?.job_description)) {
      updateMine({
        owner_job_title: myProfile.job_title || "",
        owner_job_description: myProfile.job_description || "",
      });
    }
  }, [myWorkspace, myProfile, updateMine]);

  if (!myWorkspace) return <Loading />;

  const partnerTitle = partnerWorkspace?.owner_job_title;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-6">
        <div className="mb-1 text-sm font-semibold text-human">Your job today</div>
        <p className="mb-4 text-sm text-slate-500">
          Your partner will redesign this — so give them something real to work with.
        </p>
        <label className="lbl">Job title</label>
        <input
          className="field"
          placeholder="e.g. Senior Marketing Manager"
          value={myWorkspace.owner_job_title || ""}
          onChange={(e) => {
            updateMine({ owner_job_title: e.target.value });
            updateProfile({ job_title: e.target.value });
          }}
        />
        <label className="lbl mt-4">In one or two lines, what do you actually do?</label>
        <textarea
          className="field"
          placeholder="What you're responsible for, and where your time goes."
          value={myWorkspace.owner_job_description || ""}
          onChange={(e) => {
            updateMine({ owner_job_description: e.target.value });
            updateProfile({ job_description: e.target.value });
          }}
        />
      </div>

      <div className="card bg-slate-50 p-6">
        <div className="mb-1 text-sm font-semibold text-ai">
          {partnerProfile?.display_name
            ? `${partnerProfile.display_name}'s job`
            : "Your partner's job"}
        </div>
        <p className="mb-4 text-sm text-slate-500">
          This is what you&apos;ll redesign. It fills in as they type.
        </p>
        {partnerTitle ? (
          <>
            <div className="text-lg font-semibold">{partnerTitle}</div>
            <p className="mt-2 whitespace-pre-wrap text-slate-600">
              {partnerWorkspace?.owner_job_description || "…"}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ai" />
            Waiting for your partner to describe their job…
          </div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return <div className="text-slate-400">Loading…</div>;
}
