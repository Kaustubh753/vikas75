// Room codes must not spell a slur — the code goes on a projector in front of an audience.
// Only abuse is blocked, never ordinary words: BANK, CARD and HAND are all fine codes.
//
// Sources: the better-profanity wordlist filtered to 4 letters, plus Hindi/Hinglish abuse and
// caste-communal slurs that a Western list does not carry. I and O are absent from the code
// alphabet already (they read as 1 and 0), so anything needing them cannot be drawn.
//
// 116 entries against a 331,776-code space — a redraw is vanishingly rare.
// Server-only: reached through game-engine, which only the API route imports.
const BLOCKED = `ANAL ANUS ARSE BDSM BEHN BHDK BHDV BHEN BHSD BKCH BKLD BSDK BSDW CAWK CHDA CHMR CHTY CHUT CHUY CNUT CRAP CUMS CUNT DAMN DLCK DYKE FACK FAGG FAGS FART FCUK FECK FUCK FUKS FVCK FXCK GAND GAYS GHAY GHEY GHNT GNDU GNDW HARM HEBE HEEB HELL HEMP HERP HRAM HUMP JAPS JERK JHAT JHNT KAWK KLAN KUMS KUTA KUTE KYKE LAND LECH LUBE LUND LUST LWDA LWDE MADR MAMS MCBC MDCH MDRC MDRS METH MRDC MUFF NADS NUDE PAWN PHUK PHUQ PUBE PUSS RACY RAND RAPE RNDK RNDW RUMP SALA SCAG SCUM SHAG SKAG SLUT SMUT SPAC STFU SUAR SUCK SUWR TARD TATT TEAT TEEZ TERD THUG TURD TUSH TWAT UGLY WANG WANK WEED YURY`;

export const BLOCKED_CODES: ReadonlySet<string> = new Set(BLOCKED.split(' '));
