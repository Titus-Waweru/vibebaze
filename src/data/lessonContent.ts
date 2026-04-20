import welcomeImg from "@/assets/lessons/welcome.jpg";
import profileSetupImg from "@/assets/lessons/profile-setup.jpg";
import walletImg from "@/assets/lessons/wallet-overview.jpg";
import videoImg from "@/assets/lessons/video-fundamentals.jpg";
import hashtagsImg from "@/assets/lessons/hashtags.jpg";
import tipsImg from "@/assets/lessons/tips.jpg";
import consistencyImg from "@/assets/lessons/consistency.jpg";
import brandingImg from "@/assets/lessons/branding.jpg";

export interface LessonSection {
  heading?: string;
  body?: string;
  image?: string;
  imageCaption?: string;
  bullets?: string[];
  tip?: string;
}

export interface LessonContent {
  hero?: string;
  intro: string;
  sections: LessonSection[];
  takeaways: string[];
}

export const lessonContent: Record<string, LessonContent> = {
  "1-1": {
    hero: welcomeImg,
    intro:
      "VibeBaze is Africa's home-grown creator platform built for real earnings, real community, and real ownership. This lesson walks you through what makes us different and how to win from day one.",
    sections: [
      {
        heading: "Why VibeBaze?",
        body: "Unlike global platforms that pay creators in pennies, VibeBaze is optimized for African creators with M-PESA payouts, low-data video delivery, and a 15% platform fee — meaning 85% of every tip goes straight to you.",
        bullets: [
          "Direct M-PESA withdrawals (KES 1,000 minimum)",
          "85% revenue share on tips and subscriptions",
          "Optimized for low-bandwidth networks across Africa",
          "VibePoints rewards for engagement (1,000 pts = 100 KES)",
        ],
      },
      {
        heading: "The Three Feeds",
        body: "Master the feed system to know where your content lives:",
        bullets: [
          "Vibes — algorithmic for-you feed (most discovery happens here)",
          "Circle — content from creators you follow",
          "Hot — trending posts gaining momentum right now",
        ],
        tip: "Aim for the Hot feed by driving fast engagement in the first 60 minutes after posting.",
      },
    ],
    takeaways: [
      "VibeBaze pays African creators directly via M-PESA",
      "85% of tips go to you, only 15% platform fee",
      "Three feeds: Vibes, Circle, and Hot — each unlocks different audiences",
    ],
  },
  "1-2": {
    hero: profileSetupImg,
    intro:
      "Your profile is your storefront. A strong profile converts random viewers into followers, and followers into paying fans. Here's how to set one up that earns trust in under 10 seconds.",
    sections: [
      {
        heading: "The Anatomy of a Winning Profile",
        image: profileSetupImg,
        imageCaption: "A complete profile: clear avatar, descriptive name, focused bio, external links",
        bullets: [
          "Avatar: Use a high-contrast face shot or recognizable logo",
          "Username: Short, memorable, lowercase, no numbers if possible",
          "Bio: 50 words max — say what you create and who it's for",
          "External links: Up to 5 links (YouTube, Instagram, WhatsApp business)",
        ],
      },
      {
        heading: "Bio Formula That Converts",
        body: "Use this proven 3-line format:\n\n1. What you create (e.g. \"Daily Nairobi street food reviews\")\n2. Who it's for (e.g. \"For Kenyan foodies on a budget\")\n3. A call to action (e.g. \"New videos every Tuesday — tip for shoutouts!\")",
        tip: "Profile edits have a 10-day cooldown — get it right the first time.",
      },
    ],
    takeaways: [
      "Your avatar must be recognizable at thumbnail size",
      "Bio = what + who + call to action",
      "Add up to 5 external links to drive cross-platform growth",
    ],
  },
  "1-3": {
    hero: walletImg,
    intro:
      "Your VibeBaze Wallet is the financial command center for your creator business. Understand it deeply and you'll never miss a payout.",
    sections: [
      {
        heading: "Wallet Sections Explained",
        image: walletImg,
        imageCaption: "The wallet shows available balance, pending earnings, and lifetime totals",
        bullets: [
          "Available Balance — ready to withdraw to M-PESA",
          "Pending Balance — earnings under the 72-hour security hold",
          "Lifetime Earnings — total you've ever earned on VibeBaze",
          "VibePoints — engagement rewards (claim at 1,000 pts = 100 KES)",
        ],
      },
      {
        heading: "How Money Moves",
        body: "When a fan tips you 100 KES: 15 KES platform fee is deducted, 85 KES enters Pending, and after 72 hours it moves to Available. From there you can withdraw to M-PESA (KES 1,000 minimum).",
        tip: "The 72-hour lock protects you and your fans from chargebacks and fraud.",
      },
    ],
    takeaways: [
      "Pending → Available after 72 hours",
      "Minimum withdrawal: KES 1,000 to M-PESA",
      "VibePoints are a separate rewards currency from cash earnings",
    ],
  },
  "1-4": {
    intro:
      "Your first post sets the tone for your entire channel. Don't post randomly — follow this proven first-post framework used by VibeBaze's top creators.",
    sections: [
      {
        heading: "The First-Post Formula",
        bullets: [
          "Hook: First 2 seconds must stop the scroll (question, bold claim, motion)",
          "Value: Deliver one clear takeaway in under 60 seconds",
          "CTA: End with a clear ask — follow, comment, or tip",
          "Caption: 1-2 sentences + 3-5 hashtags",
        ],
      },
      {
        heading: "Technical Checklist",
        body: "Before hitting Post:",
        bullets: [
          "Video is under 8 minutes (VibeBaze limit)",
          "Vertical 9:16 ratio for video",
          "Auto-thumbnail looks good (or upload custom)",
          "Hashtags include #VibeBaze + 2-4 niche tags",
        ],
        tip: "Posts get a 'NEW' badge for 7 days — make those days count with extra engagement.",
      },
    ],
    takeaways: [
      "Stop the scroll in the first 2 seconds",
      "End every post with a clear CTA",
      "Use #VibeBaze plus 2-4 niche tags for max reach",
    ],
  },
  "2-1": {
    intro:
      "African audiences are not monolithic. Kenyans love banter, Nigerians love drama, South Africans love wit. Tailor your content and watch engagement explode.",
    sections: [
      {
        heading: "Regional Content Patterns",
        bullets: [
          "East Africa (KE/UG/TZ): Comedy, street food, motivation, Sheng/Swahili",
          "West Africa (NG/GH): Music, fashion, drama skits, pidgin",
          "Southern Africa (ZA/ZW): Dance, satire, township life",
          "Pan-African: Education, fitness, faith, fintech tips",
        ],
      },
      {
        heading: "Peak Posting Times (EAT)",
        body: "Africans scroll heaviest during these windows. Schedule accordingly:",
        bullets: [
          "12:00 - 14:00 (lunch break)",
          "19:00 - 22:00 (evening unwind — biggest window)",
          "Sundays after 16:00 (weekend wind-down)",
        ],
        tip: "Test your own posting times for 2 weeks. Your audience may have unique patterns.",
      },
    ],
    takeaways: [
      "Speak your audience's language — literally",
      "7-9 PM EAT is the highest-engagement window",
      "Track your own analytics to find personal peak times",
    ],
  },
  "2-2": {
    hero: hashtagsImg,
    intro:
      "Hashtags are how new viewers find you. Use them strategically — too few and you're invisible, too many and you look spammy.",
    sections: [
      {
        heading: "The 1-2-2 Rule",
        image: hashtagsImg,
        imageCaption: "VibeBaze auto-suggests trending hashtags as you type",
        body: "On every post use:",
        bullets: [
          "1 broad tag — #VibeBaze (auto-applied)",
          "2 niche tags — your category (#NairobiEats, #AfroDance)",
          "2 trending tags — current viral conversations",
        ],
      },
      {
        heading: "Hashtag Mistakes to Avoid",
        bullets: [
          "Don't stuff 20+ tags — algorithm flags it as spam",
          "Don't use irrelevant trending tags — kills credibility",
          "Don't reuse the exact same set on every post",
        ],
        tip: "Use VibeBaze's hashtag suggestions panel — it surfaces real-time trending tags in your niche.",
      },
    ],
    takeaways: [
      "Follow the 1-2-2 rule: 1 broad, 2 niche, 2 trending",
      "Use the in-app suggestion tool, not random tags",
      "Vary your tag set — avoid copy-paste patterns",
    ],
  },
  "2-3": {
    hero: consistencyImg,
    intro:
      "The single biggest difference between creators who earn and creators who don't is consistency. Algorithms reward predictability.",
    sections: [
      {
        heading: "Build a Sustainable Schedule",
        image: consistencyImg,
        imageCaption: "A simple weekly content calendar — pick days you can realistically hit",
        bullets: [
          "Start with 3 posts/week (Mon, Wed, Fri)",
          "Pick fixed times — your audience learns when to expect you",
          "Batch-create on Sundays to never miss a day",
          "Use the Schedule feature to queue posts in advance",
        ],
      },
      {
        heading: "The 30-Day Sprint",
        body: "Commit to 30 days straight of posting. By day 30 you'll have data on what works, a content rhythm, and typically 3-5x your starting follower count.",
        tip: "Done is better than perfect. Ship the post.",
      },
    ],
    takeaways: [
      "Pick a schedule you can actually keep",
      "Batch creation prevents burnout",
      "30 straight days = breakthrough for most creators",
    ],
  },
  "2-4": {
    intro:
      "Engagement is a two-way street. Creators who reply to comments grow 3x faster than those who don't.",
    sections: [
      {
        heading: "The First-Hour Rule",
        body: "For the first 60 minutes after posting, reply to every single comment. This signals the algorithm that your post is generating conversation, which boosts it into more feeds.",
        bullets: [
          "Reply to every comment in the first hour",
          "Pin your favorite comment to spark more responses",
          "Ask follow-up questions to keep threads alive",
          "Use voice/emoji replies for a personal touch",
        ],
      },
      {
        heading: "Build Super-Fans",
        body: "5% of your audience will drive 80% of your tips. Identify them by:",
        bullets: [
          "Repeat commenters — DM them to say thanks",
          "Tippers — send a personalized voice note",
          "Sharers — feature their content in your stories",
        ],
        tip: "Comments are public — make every reply a mini-marketing post.",
      },
    ],
    takeaways: [
      "Reply to all comments in the first hour",
      "5% of fans drive 80% of revenue — nurture them",
      "Public replies are free advertising for your brand",
    ],
  },
  "3-1": {
    hero: videoImg,
    intro:
      "You don't need an expensive camera. You need three things right: light, sound, and framing. Master these and your phone footage will out-perform expensive setups.",
    sections: [
      {
        heading: "Lighting: The 3-Point Cheat",
        image: videoImg,
        imageCaption: "A simple ring light or window light setup — the secret to pro-looking video",
        bullets: [
          "Face a window during daytime (free, perfect light)",
          "Or use a ring light at eye level",
          "Avoid backlighting (window/light behind you)",
          "Soft, even light beats bright harsh light",
        ],
      },
      {
        heading: "Sound: The #1 Quality Signal",
        body: "Viewers tolerate shaky video but never bad audio. Invest here first.",
        bullets: [
          "Record indoors with soft surfaces (rugs, curtains)",
          "A KES 500 lavalier mic transforms quality",
          "Always check sound on headphones before posting",
        ],
      },
      {
        heading: "Framing: The Rule of Thirds",
        body: "Place your eyes on the upper-third line of the frame. Leave headroom but not too much. Vertical 9:16 for feed, 16:9 only for landscape tutorials.",
        tip: "Keep videos under 8 minutes — VibeBaze's hard limit and the sweet spot for completion rates.",
      },
    ],
    takeaways: [
      "Light → Sound → Framing, in that priority",
      "A cheap mic beats an expensive camera",
      "9:16 vertical for the feed, always",
    ],
  },
  "3-2": {
    intro:
      "African storytelling is rooted in oral tradition, rhythm, and shared experience. Tap into these elements and your content resonates on a deeper level.",
    sections: [
      {
        heading: "Story Structures That Work",
        bullets: [
          "The Folk Tale — beginning, twist, lesson (under 90 seconds)",
          "The Reveal — build mystery, deliver payoff at the end",
          "The Day-in-the-Life — real moments, real emotions",
          "The Comparison — 'Nairobi vs Lagos', 'Mama vs me'",
        ],
      },
      {
        heading: "Cultural Anchors",
        body: "Reference shared experiences your audience instantly recognizes:",
        bullets: [
          "Local foods, slang, and music",
          "Common frustrations (matatu chaos, NEPA outages)",
          "Wins everyone celebrates (graduation, first job)",
        ],
        tip: "Authenticity beats production value 10 out of 10 times.",
      },
    ],
    takeaways: [
      "Use proven story structures, not random clips",
      "Reference shared cultural moments",
      "Authenticity > polish",
    ],
  },
  "3-3": {
    intro:
      "Most African viewers are on mobile data. If your video takes 5 seconds to load, they're gone. Optimize aggressively.",
    sections: [
      {
        heading: "Compress Smart, Not Hard",
        bullets: [
          "Export at 720p — looks great, half the data of 1080p",
          "Use H.264 codec for max compatibility",
          "Keep videos under 50MB when possible",
          "Trim every unnecessary second",
        ],
      },
      {
        heading: "VibeBaze Does the Rest",
        body: "Our platform automatically generates web-friendly versions and thumbnails. But uploading clean, compressed source files makes everything load faster for your viewers.",
        tip: "Test your videos on 3G to see what most of your audience experiences.",
      },
    ],
    takeaways: [
      "720p is the sweet spot for African networks",
      "Trim ruthlessly — every second matters",
      "Test on slow connections before posting",
    ],
  },
  "3-4": {
    intro:
      "Trending audio is rocket fuel for the algorithm. Catch a sound early and you can ride it to viral.",
    sections: [
      {
        heading: "How to Spot Trending Sounds",
        bullets: [
          "Browse the Hot feed daily — note repeating audio",
          "Follow African music producers and DJs",
          "When you spot a sound used 3+ times, jump on it",
          "Add your own twist — don't just copy the trend",
        ],
      },
      {
        heading: "Audio Rights Matter",
        body: "Use royalty-free music or VibeBaze's in-app library to avoid takedowns. Original audio you record always belongs to you.",
        tip: "Original audio you create can become a trend others use — credit links back to you for free reach.",
      },
    ],
    takeaways: [
      "Trending audio = algorithmic rocket fuel",
      "Add your unique spin to any trend",
      "Original audio drives free attribution traffic",
    ],
  },
  "4-1": {
    hero: walletImg,
    intro:
      "Setting up M-PESA takes 60 seconds. Skip this and you literally cannot get paid. Do it before you create your first post.",
    sections: [
      {
        heading: "Step-by-Step Setup",
        image: walletImg,
        imageCaption: "Open Wallet → Settings → Add M-PESA Number",
        bullets: [
          "Go to Profile → Wallet → Payment Settings",
          "Enter your Safaricom number (07XX XXX XXX)",
          "Verify with the OTP sent via SMS",
          "Add your full name as it appears on M-PESA",
        ],
      },
      {
        heading: "Verification & Limits",
        body: "Your name on VibeBaze must match your M-PESA registered name exactly, or withdrawals will fail.",
        tip: "First withdrawal often takes 24h for security review. After that, payouts are usually instant.",
      },
    ],
    takeaways: [
      "Set up M-PESA before posting — be ready to earn",
      "Names must match exactly between VibeBaze and M-PESA",
      "Minimum withdrawal: KES 1,000",
    ],
  },
  "4-2": {
    hero: tipsImg,
    intro:
      "Tips are the fastest path to creator income. Most viewers are willing to tip — they just need to be asked clearly and given a reason.",
    sections: [
      {
        heading: "How to Get Tipped",
        image: tipsImg,
        imageCaption: "Fans can send 50, 100, 500 KES in one tap via M-PESA",
        bullets: [
          "End each post with a soft CTA: 'Tip if this helped!'",
          "Pin a thank-you comment after each tip",
          "Share what tips fund (gear, travel, family support)",
          "Offer shoutouts for tips above a threshold (e.g. 200 KES)",
        ],
      },
      {
        heading: "Tip Psychology",
        body: "People tip when they feel:\n• Personally helped\n• Emotionally moved\n• Part of a creator's journey",
        tip: "Show your face when you say thanks — voice notes get 4x more repeat tippers than text.",
      },
    ],
    takeaways: [
      "Always include a soft tip CTA",
      "Public thanks creates social proof",
      "Show the human behind the content",
    ],
  },
  "4-3": {
    intro:
      "Tips are great but unpredictable. Subscriptions give you steady, predictable income — the foundation of a real creator business.",
    sections: [
      {
        heading: "Pricing Your Subscription",
        bullets: [
          "Start at KES 200/month — affordable, signals value",
          "Bump to KES 500 once you have 100+ subscribers",
          "Premium tier (KES 1,000+) for VIP perks",
        ],
      },
      {
        heading: "What to Offer Subscribers",
        body: "Make joining a no-brainer:",
        bullets: [
          "Exclusive weekly content not on the main feed",
          "Early access (subscribers see posts 24h early)",
          "Direct DM access for questions",
          "Subscriber-only live sessions monthly",
        ],
        tip: "100 subscribers at KES 500 = KES 50,000/month. Reach this and you've built a job.",
      },
    ],
    takeaways: [
      "Subscriptions = predictable income",
      "Start cheap, raise prices as value grows",
      "100 × KES 500 = full-time creator income",
    ],
  },
  "4-4": {
    intro:
      "How you manage withdrawals separates hobbyists from professional creators. Treat your wallet like a business account.",
    sections: [
      {
        heading: "Withdrawal Best Practices",
        bullets: [
          "Withdraw weekly, not daily — saves M-PESA fees",
          "Keep KES 5,000 buffer in available balance for big tips",
          "Track withdrawals in a simple notebook or app",
          "Set aside 30% for taxes (yes, creator income is taxable)",
        ],
      },
      {
        heading: "Reinvesting in Your Growth",
        body: "Smart creators reinvest 20-30% of earnings into:",
        bullets: [
          "Better mic or lighting",
          "Boosted posts to grow audience",
          "Editing software or apps",
          "Workshops and creator courses",
        ],
        tip: "Treat your creator income like a business from day 1. The earlier you do, the bigger you'll grow.",
      },
    ],
    takeaways: [
      "Withdraw weekly, save M-PESA fees",
      "Set aside 30% for taxes",
      "Reinvest 20-30% into growth",
    ],
  },
  "5-1": {
    hero: brandingImg,
    intro:
      "A niche isn't a cage — it's a magnet. The tighter your niche, the easier it is to be the obvious choice in your category.",
    sections: [
      {
        heading: "The Niche Formula",
        body: "Find the intersection of:\n• What you LOVE (you'll do it for years)\n• What you're GOOD at (or willing to master)\n• What people PAY for (real demand)",
      },
      {
        heading: "African Niches With Hungry Audiences",
        bullets: [
          "Personal finance for young Africans",
          "Fitness on a budget (no-gym workouts)",
          "Local food reviews & recipes",
          "Tech tutorials in local languages",
          "Faith and motivation",
          "Sheng/Pidgin comedy",
        ],
        tip: "Don't pick the biggest niche — pick the one where you can be the most distinct voice.",
      },
    ],
    takeaways: [
      "Niche = love × skill × demand",
      "Specific beats broad every time",
      "Be the most distinct voice, not the loudest",
    ],
  },
  "5-2": {
    hero: brandingImg,
    intro:
      "Visual identity makes you instantly recognizable. Same colors, same fonts, same vibe — every post should feel like 'you'.",
    sections: [
      {
        heading: "Build Your Visual Kit",
        image: brandingImg,
        imageCaption: "Pick 2-3 brand colors and 1-2 fonts and use them everywhere",
        bullets: [
          "Color palette: 2-3 colors max (use a free tool like Coolors)",
          "Fonts: One bold for headers, one clean for body",
          "Logo: Simple, works at avatar size",
          "Filter/preset: Same look across all photos",
        ],
      },
      {
        heading: "Consistency = Recognition",
        body: "Viewers should know it's your post before they read your name. Use the same intro card, outro, and color treatment on every video.",
        tip: "Your watermark on downloaded posts (Canvas API) automatically reinforces your brand for free.",
      },
    ],
    takeaways: [
      "Same colors and fonts across every post",
      "Recognizable at avatar size",
      "Watermarked downloads = free brand reach",
    ],
  },
  "5-3": {
    intro:
      "People follow people, not content. Sharing your story creates the emotional bond that turns viewers into super-fans.",
    sections: [
      {
        heading: "The Story Arc Every Creator Needs",
        bullets: [
          "Where you came from (your origin)",
          "What you struggled with (the conflict)",
          "What you discovered (the breakthrough)",
          "Where you're going (the mission)",
        ],
      },
      {
        heading: "Where to Share Your Story",
        body: "Don't dump it once — weave it through everything:",
        bullets: [
          "Pinned 'About Me' video on your profile",
          "Mention your why in every 5th post",
          "Reply to comments with personal anecdotes",
          "Live sessions to share real-time updates",
        ],
        tip: "Vulnerability is a superpower. Real beats perfect every time.",
      },
    ],
    takeaways: [
      "Share your origin, struggle, breakthrough, mission",
      "Weave story through content, don't dump it",
      "Vulnerability builds super-fans",
    ],
  },
  "5-4": {
    intro:
      "VibeBaze is your home base, but cross-platform presence multiplies your reach and protects you from any single platform's changes.",
    sections: [
      {
        heading: "The Hub-and-Spoke Model",
        body: "Make VibeBaze your hub (where the money flows) and use other platforms as spokes:",
        bullets: [
          "Instagram Reels — short-form discovery",
          "TikTok — Gen Z reach",
          "YouTube Shorts — long-tail SEO",
          "X (Twitter) — conversation and authority",
          "WhatsApp Status — your warmest audience",
        ],
      },
      {
        heading: "Repurpose, Don't Recreate",
        body: "Film once, post everywhere. Add platform-specific tweaks:",
        bullets: [
          "Strip watermarks before posting elsewhere",
          "Adjust caption tone per platform",
          "Always link back to VibeBaze in bio",
        ],
        tip: "Use the 5 external links on your VibeBaze profile to drive traffic the other way.",
      },
    ],
    takeaways: [
      "VibeBaze is the hub, others are spokes",
      "Film once, repurpose everywhere",
      "Always drive traffic back to your VibeBaze profile",
    ],
  },
};