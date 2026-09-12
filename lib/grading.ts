// Shared calibration for SUBJECTIVE, AI-judged 0-100 competence grades (quality of
// reasoning / questioning / application). Reserves the top of the scale for
// mastery, so the score DISCRIMINATES: a scale where merely-competent work already
// reads 95 has no variance left to detect learning or separate a treatment arm
// from control, which makes it useless as an L2 study outcome. Append to a grader's
// scoring instructions.
//
// Do NOT use on objective/mechanical scores — value claimed, decision-vs-sealed-
// truth, author-defined level values, a validated instrument like the WMS, or a
// compliance check like "was any statement misleading". Those are discriminating by
// construction, and rescaling them would corrupt their meaning.
export const COMPETENCE_CALIBRATION = `\n\nSCORE CALIBRATION (grade like a demanding expert; reserve the top of the scale for mastery):
- 90-100 is RARE and hard to earn: exemplary, expert work that anticipates failure modes and second-order effects and would be hard to improve.
- 70-85 is a solid, competent attempt that does the obvious right things but nothing beyond them; most good attempts land here.
- 50-69 is partial or uneven; below 50 has real gaps.
- Doing what the task asks, correctly, is about a 75, not a 95. Before awarding a high score, actively name what is missing, ordinary, or unpolished. A near-perfect score should be genuinely uncommon.`;
