# SoulBound Tone — Antiquarian

## §1. Anchor
SoulBound is anchored in the image of a thirty-something translator reading a first-edition book in a Left Bank café in Paris: attentive, worldly, quiet, and precise. SoulBound is NOT a dating app, social app, community platform, luxury e-commerce brand, SaaS dashboard product, or wellness/meditation product; it is a documentary commitment system whose visual and verbal constraints must read as records, thresholds, signatures, and rooms.

## §2. Forbidden adjacent tones
- Dating app warmth: intimacy must read as earned commitment, not flirtation, sweetness, or romance-first invitation.
- Social network community grammar (feeds, reactions, follows): SoulBound is record-first and document-first, so feed language collapses the product into ambient social chatter.
- Crypto / web3 neon: neon, glow, and speculative-tech cues break the trust-first documentary posture immediately.
- Luxury e-commerce (Hermès / Aesop direct imitation): the product may borrow restraint, but direct brand-adjacent styling makes it read like expensive retail rather than a system of terms.
- SaaS dashboard chic (Linear / Notion / Stripe clone aesthetic): operational-product minimalism is too generic and too productivity-coded for this product's emotional register.
- Wedding invitation calligraphy: calligraphic romance cues overstate sentiment and misframe the product as ceremonial stationery.
- Wellness / meditation pastel: soothing pastel atmospheres erase the contractual weight and evidentiary seriousness the product requires.
- Korean portal palette readings (the orange + green + grey + burgundy combination must NEVER read as a signage/portal/retail palette): if the combination starts to feel retail, portal, or storefront-coded, the system loses its documentary specificity.

## §3. Palette (authoritative hex values)

Use exactly these hex values. Do not invent substitutes.

Primary structural palette:
- Antiquarian orange (saddlery seal):         #C15A2B
  (Deliberately one step muted from Hermès trademark orange to avoid
  direct imitation. Used ONLY as an accent: seals, underlines, hash
  emphasis, single-instance markers. Never as area fill.)

- Antiquarian green (library interior):       #3B4A3E
  (Muted dark green in the British Racing Green / oxford library leather
  family. Used for stage backgrounds where depth is needed.)

- Antiquarian grey (granite ledger):          #8A8578
  (Warm-neutral grey with a faint olive undertone. Structural workhorse
  for borders, secondary text, and quiet surfaces.)

- Antiquarian burgundy (bound volume):        #5C2A2A
  (Muted wine-leather burgundy. Used for warm-space emphasis, seals on
  document space, and the singular "attention" marker on warm backgrounds
  where orange would feel out of place.)

Warm canvas family (preserved from existing repo tokens):
- Warm canvas (unchanged):                    #f7f1e8   (existing --sb-surface-warm)
- Warm soft (unchanged):                      #fcf8f2   (existing --sb-surface-warm-soft)
- Warm panel (new, apricot-adjacent depth):   #F0E5D2
  (A step warmer than canvas for panels that need to read as "a drawer
  inside the room" rather than a separate space.)

Stage family (re-anchored for Antiquarian):
- Stage depth (replaces midnight-navy feel):  #1E2823
  (Very dark green-black. NOT a pure navy. This carries the "library at
  dusk" reading. Existing --sb-surface-stage: #0b1220 remains in the file
  but Phase 5.5+ stage-space pages should use the new stage depth via
  the additive utility class defined in Part 2.)

Document family (preserved):
- Document panel (unchanged):                 #ffffff   (existing --sb-surface-panel)
- Document muted (unchanged):                 #fbfbfd   (existing --sb-surface-muted)

Ink family for text on warm/document:
- Ink strong (unchanged):                     #16120d   (existing --sb-text-warm-strong)
- Ink muted (unchanged):                      rgba(49, 41, 32, 0.74)
- Ink soft (unchanged):                       rgba(49, 41, 32, 0.56)

Ink family for text on stage (new):
- Stage ink strong:                           #F1E9DB
  (Warm cream, not pure white. Reads as "lamp-lit paper" on the dark green.)
- Stage ink muted:                            rgba(241, 233, 219, 0.74)
- Stage ink soft:                             rgba(241, 233, 219, 0.52)

Seal gold (preserved from existing --sb-accent-trust):
- Seal gold (unchanged):                      #b89c6b
  Semantic role clarified: this is the WARM-SPACE signature/seal color.
  Antiquarian orange is the STAGE-SPACE signature color.
  These two do not appear on the same page.

## §4. Orange usage rule (non-negotiable, mirrors the rigor of the retired
yellow rule but adjusted for Antiquarian context)

The Antiquarian orange #C15A2B is the product's single most controlled
color. It is a seal, not a UI color.

Absolute constraints:
1. One orange instance per page, maximum. Landing is the ONE documented
   exception with a cap of two (wordmark plus one CTA underline or
   hash emphasis, not both).
2. Stage-space only. On warm or document space, the corresponding
   signature color is seal gold #b89c6b or burgundy #5C2A2A, never
   orange.
3. Never as background fill of an interactive element at full size.
   Orange is an underline, a thin rule, a small chip stroke, a hash
   emphasis, or a 4px wide accent bar. It is never a 200×48 filled
   button.
4. Never paired with seal gold on the same page. The two reads conflict.
5. Never used for status indicators. Status is expressed in text and
   layout, not color.
6. Never animated. No pulse, no fade-in loop, no emphasis motion.
   Motion primitives may reveal an orange element; the orange itself
   does not move independently.

Permitted uses (exhaustive; adding a use requires a Phase restart):
- Landing hero wordmark rendered in orange on stage depth.
- Landing primary CTA underline (text remains stage ink; underline is
  orange at 2px).
- A single hash-emphasis line on stage-space receipt views (a 2px-wide
  left border on a receipt card).
- Counterpart surface (`/match` route in the current repo): the
  counterpart's initials set in orange, once per proposed counterpart.

Any use not on this list is forbidden.

## §5. Burgundy usage rule

Burgundy #5C2A2A is the warm-space analogue of orange. It functions as:
- The "seal" color on warm-space receipts and contracts
- The color of the small triangle/diamond mark next to the user's
  verified state on warm surfaces
- Ink for one-line quoted contract phrases, where ink strong would be
  too plain

Constraints:
- Warm-space and document-space only. Never on stage.
- One burgundy emphasis per page, maximum.
- Never as a background fill larger than a 1px rule or small chip.
- Never as body text color.

## §6. Green usage rule

Green #3B4A3E is primarily a stage background. It is not an accent.
- Use as sb-space-stage-antiquarian backing color in Phase 5.5+.
- May appear as a 1px border on stage-space panels.
- Never as text color on warm or document surfaces.
- Never as a signal/status color.

## §7. Grey usage rule

Grey #8A8578 is the structural workhorse.
- Borders on document space
- Secondary metadata text on warm space
- Quiet chip fills
- Never as accent, never as signal, never as emphasis.

## §8. Typography

Add these font stacks. Do NOT remove existing --sb-font-body or
--sb-font-display.

New stacks (append to :root in globals.css):

--sb-font-serif-display:
  `"GT Sectra", "Prata", "EB Garamond", "Cormorant Garamond",
  "Noto Serif KR", "Nanum Myeongjo", serif;`

--sb-font-serif-reading:
  `"EB Garamond", "Source Serif Pro", "Noto Serif KR",
  "Nanum Myeongjo", serif;`

Notes:
- GT Sectra is a paid family. If unavailable at runtime, the fallback to
  Prata (Google Fonts, free) and then EB Garamond keeps the classical
  display reading. Phase 5.5 will address font loading; Phase 5.4 only
  declares the stack.
- The Korean Myeongjo fallback must be a classical Myeongjo, not a
  modern sans. Do NOT substitute Pretendard in either serif stack.
- NO cursive / handwritten / signature font family anywhere in these
  stacks. That direction is retired.

Usage guidance (not enforced in code; stated in tone.md for Phase 5.5+):
- Display type (landing hero, dashboard primary heading):
  --sb-font-serif-display
- Long-form reading (contract body, legal quotes, introduction note):
  --sb-font-serif-reading
- UI labels, metadata, timestamps, navigation, buttons:
  existing --sb-font-body (sans)
- Hashes, contract versions, receipt IDs:
  existing monospace stack

## §9. Spatial rules (replace any earlier blending-ratio discussions)

A page belongs to exactly one space. The page's root element declares
that space via a single root class.

| Space                        | Background                  | Signature color | Used for                                         |
|-----------------------------|-----------------------------|-----------------|--------------------------------------------------|
| sb-space-stage-antiquarian  | #1E2823 (antiquarian green) | orange #C15A2B  | landing, counterpart                             |
| sb-space-warm               | #f7f1e8 (warm canvas)       | burgundy/seal   | dashboard, circles, introduction                 |
| sb-space-document           | #ffffff                     | ink only        | consent, contract, receipt, audit                |

Space transitions:
- Users move stage → warm → document as they go deeper into commitment.
- The three spaces are not dark-mode variants of each other. They are
  three distinct rooms.

Frosted / glass / backdrop-filter effects:
- Accent-only. Never a page background. Never a full panel.
- A thin band or single overlay element at most.

## §10. Copy voice (authoritative examples)

Length and rhythm:
- Full sentences. Commas welcome.
- Declarative, not exclamatory. Never end a UI string with `!`.
- Address the reader as a participant in a document, not a user of an app.
- Avoid imperative verbs for stage transitions ("Start now",
  "Get verified"). Prefer proposals and records ("Let us begin the
  agreement", "When both signatures arrive", "Your signature was
  received at 2:14 PM").

Permitted (example) KO copy:
- "서로를 알기 전에, 먼저 약속을 적어둡니다."
- "이 편지는 두 사람의 서명이 모두 도착했을 때에만 열립니다."
- "당신의 서명은 2026년 4월 17일 오후 2시 14분에 접수되었습니다."
- "이 방은 아직 닫혀 있습니다."

Permitted (example) EN copy:
- "We write the terms before we exchange a word."
- "This letter opens only when both signatures have arrived."
- "Your signature was received at 2:14 PM on the seventeenth of April."
- "This room is not yet open."

Forbidden patterns:
- "환영합니다, {name} 님!" / "Welcome back!"
- "오늘도 좋은 하루 되세요" / "Have a great day"
- "축하합니다!" / "Congratulations!"
- "거의 다 왔어요" / "Almost there"
- "간편하게" / "Easily" / "Quickly"
- "새로운" / "New" as an adjective for a person or counterpart
- Emoji anywhere
- Any CTA shorter than three words ("시작", "확인", "다음" forbidden)

## §11. Agent citation protocol

Every agent prompt in Phase 5.5 and 5.6 must include, verbatim, this
citation at the top:

```text
Tone: docs/design/tone.md — Antiquarian.
Anchor: thirty-something translator, Left Bank café, first-edition book.
Orange rule: §4, one per page, stage-only, never as fill.
Burgundy rule: §5, one per page, warm/document-only.
```

If an agent's output violates §2 (forbidden tones), §4 (orange rule), or
§5 (burgundy rule), the PR is rejected regardless of other merits.

## §12. Closing note

This tone is deliberately strict. If at any point during Phase 5.5 or
5.6 an agent or reviewer finds the rules too restrictive, that is the
signal the system is working. Constraint is the product. Loosening
this document requires a Phase restart.
