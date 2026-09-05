import type { CaseGenome } from "./types";

// The reference living case — hand-authored, so the generator has a gold standard
// to imitate and the reader has a real case to render.
export const NVIDIA_CUDA: CaseGenome = {
  slug: "nvidia-cuda",
  eyebrow: "Strategy · platform bets · timing",
  title: "The bet on a market that didn't exist.",
  dek: "It's 2006. NVIDIA sells graphics chips to gamers and has nearly gone bankrupt more than once. Jensen Huang wants to spend the company's scarce R&D making its GPUs *programmable for general computing* — a market with almost no customers, no revenue, and a real cost to the margins that keep the lights on. Do you back him?",
  protagonist: "Jensen Huang, CEO",
  decision: "fund CUDA, or don't",
  meta: "~10 min · 8 sources · 3 videos",
  openingVideo: { youtubeId: "pcuwZ8zk2ng", title: "Jensen Huang tells the NVIDIA story (full interview)" },

  situationBeats: [
    {
      n: "1",
      kicker: "the situation · 2006",
      title: "A gaming company that keeps almost dying.",
      body: "NVIDIA invented the modern graphics chip — it coined the term “GPU” with the GeForce 256 in 1999 — and it lives and dies on the gaming cycle. Jensen has said for decades the company is always “[thirty days from going out of business](https://guyraz.substack.com/p/how-jensen-huang-built-the-most-valuable).” Its GPUs are, secretly, massively parallel processors: hundreds of little cores doing the same math at once to shade pixels. A handful of researchers have noticed you could use that horsepower for *non-graphics* math — but only by disguising their problem as a graphics operation in OpenGL. It's brutal, and almost no one does it.",
      deeper: [
        { label: "why a GPU is secretly a supercomputer", body: "A CPU has a few powerful cores optimized for doing one complicated thing quickly. A GPU has thousands of simple cores optimized for doing the *same* simple thing to a lot of data at once — exactly the shape of rendering millions of pixels, and, it turns out, of multiplying the giant matrices underneath machine learning. In 2003, a Stanford project called [Brook](https://www.infoworld.com/article/2256401/what-is-cuda-parallel-programming-for-gpus.html), led by Ian Buck, first extended C with data-parallel constructs so you could program the GPU directly. Buck joined NVIDIA and led what became CUDA." },
      ],
    },
    {
      n: "2",
      kicker: "the bet · CUDA",
      title: "Make every chip a computer you can program.",
      body: "The proposal on the table in 2006: launch **CUDA** — “Compute Unified Device Architecture” — and a new chip, the [G80](https://developer.nvidia.com/blog/cuda-refresher-reviewing-the-origins-of-gpu-computing/), whose 128 shader cores are unified into one programmable array. Ship it not just on a niche professional card but across the line, so that *every* NVIDIA GPU a developer can buy is also a parallel computer they can program in plain C. The catch: that programmability costs die area, costs margin, and serves a market — scientific and general-purpose GPU computing — that in 2006 is essentially research labs. Wall Street will ask why gaming-chip gross margins are subsidizing a customer base that doesn't exist yet.",
      exhibit: {
        title: "the arc of the bet",
        caption: "illustrative, not to scale",
        points: [
          { x: 6, y: 88, label: "1993", note: "Founded. Nearly dies, repeatedly." },
          { x: 20, y: 80, label: "1999", note: "Coins the “GPU.”" },
          { x: 36, y: 72, label: "2006", note: "CUDA. The bet." },
          { x: 52, y: 58, label: "2012", note: "AlexNet — on 2 GPUs." },
          { x: 68, y: 40, label: "2016", note: "Deep-learning boom." },
          { x: 82, y: 20, label: "2023", note: "Crosses $1T." },
          { x: 95, y: 6, label: "2024+", note: "Multi-trillion." },
        ],
      },
      deeper: [
        { label: "the real cost of the bet", body: "For years CUDA was a line item that added cost and returned little revenue. NVIDIA effectively taxed its profitable gaming business to build compilers, libraries, documentation, and a developer-education machine for an application nobody was buying at scale. The strategic wager wasn't “GPUs will sell” — it was “if we make the tools free and ubiquitous, developers will invent the demand.” That's a platform bet: spend now to own the standard later. Read [Modular's breakdown of what CUDA actually is](https://www.modular.com/blog/democratizing-compute-part-2-what-exactly-is-cuda) for how deep that moat eventually became." },
      ],
      teach: "Force the DCF here. On 2006 numbers, CUDA is negative NPV. The case is a clinic in why judgment beats the model when the whole value is optionality on a nonexistent market. Good students will reach for real-options language unprompted; great ones will ask what evidence would *update* the bet.",
    },
    {
      n: "3",
      kicker: "your move",
      title: "Commit, before you know.",
      body: "You've seen what a Harvard case gives you here: an epilogue. This one makes you decide first. Go on record — then the reveal unlocks, and you'll read the rest knowing whether you'd have made the call that built one of the most valuable companies on earth.",
    },
  ],

  commitPrompt: "It's 2006. You're Jensen. What do you do?",
  commitOptions: [
    { k: "bet", label: "Bet the company", blurb: "Make every GPU CUDA-capable. Eat the margin hit. Evangelize developers for a market that doesn't exist yet." },
    { k: "hedge", label: "Hedge it", blurb: "Ship CUDA on a niche professional line only. Protect the gaming margins that pay the bills." },
    { k: "focus", label: "Stay focused", blurb: "Double down on graphics, where you're already winning. General-purpose GPU computing is a science project." },
  ],

  revealBeats: [
    {
      n: "4",
      kicker: "the reveal · 2012",
      title: "Two GPUs win an image contest, and the world tilts.",
      body: "For six years CUDA looked like an expensive hobby. Then in 2012, three researchers — Alex Krizhevsky, Ilya Sutskever, and Geoffrey Hinton — trained a deep neural network called **AlexNet** on two consumer NVIDIA GPUs and demolished the field at the ImageNet contest. Deep learning was suddenly, undeniably real — and it ran on CUDA, because CUDA was the only mature way to program a GPU. Every AI lab that followed was, by default, an NVIDIA customer. The hobby became the franchise.",
      video: { youtubeId: "lQHK61IDFH4", title: "Jensen Huang, NVIDIA GTC keynote — CUDA and accelerated computing" },
    },
    {
      n: "5",
      kicker: "the payoff",
      title: "The option that owned the next era.",
      body: "By 2016 the data-center business was NVIDIA's growth engine; by 2023 the company crossed a [trillion dollars](https://www.generativevalue.com/p/nvidia-past-present-and-future) in market value, and then several trillion, as the AI boom made its chips the scarcest resource in technology. The 2006 decision to tax gaming margins for a market that didn't exist turned out to be the option that owned the next era of computing. Jensen tells the whole arc in his own words on [Acquired](https://www.acquired.fm/episodes/jensen-huang) and, on the strategy of accelerated computing, with [Stratechery](https://stratechery.com/2026/an-interview-with-nvidia-ceo-jensen-huang-about-accelerated-computing/).",
      deeper: [
        { label: "the uncomfortable part — was it skill or luck?", body: "The honest case doesn't let you off easy. NVIDIA did not know AlexNet was coming; the deep-learning explosion was not the specific bet. What Jensen bet on was that *parallel, programmable compute would find valuable uses if the tools were ubiquitous* — and then positioned to catch whatever emerged. That's the real teachable skill: not predicting the future, but building the option that pays off across many futures, and being patient (and solvent) enough to hold it. Ask yourself: would your 2006 call have survived six years of Wall Street asking why?" },
      ],
      teach: "The best discussion lives in the counterfactual: strip out AlexNet and the bet still looks wise *ex ante* if you frame it as buying optionality cheaply and holding it. Push students who say “great call” to separate the process from the outcome — that's the whole point.",
    },
  ],

  interrogate: [
    { q: "Gross margins are getting hit and CUDA has almost no revenue. Why should the board keep funding it?", a: "Because we're not selling chips, we're building an installed base of developers. Every GPU we ship is a computer we can program. The revenue follows the developers, and the developers follow the tools." },
    { q: "That's a story. What's the number that proves it isn't just a science project?", a: "Ask me a different way — what would have to be true for it to be a science project? No one building anything real on it. Go look at the university labs." },
  ],

  sources: [
    { label: "NVIDIA — Origins of GPU computing", href: "https://developer.nvidia.com/blog/cuda-refresher-reviewing-the-origins-of-gpu-computing/" },
    { label: "InfoWorld — What is CUDA", href: "https://www.infoworld.com/article/2256401/what-is-cuda-parallel-programming-for-gpus.html" },
    { label: "Acquired — Jensen Huang", href: "https://www.acquired.fm/episodes/jensen-huang" },
    { label: "Stratechery — Accelerated computing interview", href: "https://stratechery.com/2026/an-interview-with-nvidia-ceo-jensen-huang-about-accelerated-computing/" },
    { label: "Generative Value — NVIDIA past/present/future", href: "https://www.generativevalue.com/p/nvidia-past-present-and-future" },
    { label: "How I Built This — near collapse", href: "https://guyraz.substack.com/p/how-jensen-huang-built-the-most-valuable" },
    { label: "Modular — What exactly is CUDA", href: "https://www.modular.com/blog/democratizing-compute-part-2-what-exactly-is-cuda" },
    { label: "Jon Peddie — Evolution to AI GPUs", href: "https://www.jonpeddie.com/news/part-iii-the-evolution-to-ai-gpus/" },
  ],

  teachingIntro: "Teach this as a **real-options / platform-timing** case: the value isn't in 2006 cash flows, it's in the option CUDA creates on a future that hasn't arrived. Ask students to price optionality under deep uncertainty — and to notice that the “rational” DCF says no.",
};
