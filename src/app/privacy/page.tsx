import type { Metadata } from 'next';
import { LegalPage, Section, Term, Bullets, Ext } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy · Vikas 75',
  description: 'How Vikas 75 handles the little data it needs to run a game — and how little it keeps.',
};

const LAST_UPDATED = '24 August 2026';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <strong style={{ color: '#fff' }}>The short version.</strong> Vikas 75 is a party game you
          play with a nickname — no account, no password, no email. We keep only what a live game
          needs, a game room is deleted within 24 hours, and most of what identifies you never
          leaves your own phone. This page explains the details.
        </>
      }
    >
      <Section n={1} title="Who we are">
        <p>
          Vikas 75 (&ldquo;the game&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a multiplayer
          card game about Indian government schemes, run as an initiative of the Office of Sujeet
          Kumar. This policy describes how we handle information when you host or join a game. It is
          written for India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act) and applies
          to everyone who uses the game.
        </p>
      </Section>

      <Section n={2} title="What information we process">
        <p>You give us very little, and we ask for nothing you don&apos;t need to play.</p>
        <p style={{ color: 'rgba(250,248,240,0.95)', fontWeight: 600 }}>Information you enter</p>
        <Bullets
          items={[
            <>A <Term>display name</Term> (a nickname is fine) and your chosen <Term>avatar</Term>.</>,
            <>Each round, the <Term>scheme card you play</Term> and the short <Term>explanation</Term> (up to 25 words) you write for it.</>,
            <>Any <Term>chat messages</Term> and <Term>emotes</Term> you send during a game.</>,
          ]}
        />
        <p style={{ color: 'rgba(250,248,240,0.95)', fontWeight: 600 }}>Stored only on your own device</p>
        <p>
          To keep you in your seat across a refresh, your browser stores — in its own local storage,
          not on our servers — a random player id, a game token, your name, avatar, room code, your
          current hand of cards, your sound preference, and any unsent answer draft. You can clear
          all of it at any time with the <Term>Leave</Term> button, or by clearing your
          browser&apos;s site data.
        </p>
        <p style={{ color: 'rgba(250,248,240,0.95)', fontWeight: 600 }}>Technical information</p>
        <p>
          Our servers briefly see your <Term>IP address</Term> on each request. We use it only as a
          rate-limit key to stop abuse (for example, one device creating hundreds of rooms). It is
          not stored in the game room, not linked to your name, and the rate-limit records expire on
          their own within minutes to an hour.
        </p>
      </Section>

      <Section n={3} title="How we use it">
        <Bullets
          items={[
            'To run the game — show players in the lobby, sync the round across every screen, keep score, and display the judge&apos;s verdict.',
            'To keep games fair and safe — filter obvious profanity from names and chat, and rate-limit requests to prevent abuse.',
            'To let you rejoin your seat after a disconnect without losing your score or cards.',
          ]}
        />
        <p>
          We do not sell your data, we do not use it for advertising, and we run no third-party
          analytics or tracking on the game.
        </p>
      </Section>

      <Section n={4} title="The AI judge">
        <p>
          When a round is judged, the challenge, every player&apos;s chosen scheme, their written
          explanation, and their display name are sent to <Term>Anthropic</Term> (the makers of
          Claude) so the AI can rank the answers and write a verdict. This happens only for judging.
          If no AI is configured, a built-in random judge runs instead and nothing leaves our
          servers. Anthropic&apos;s handling of that data is governed by its own{' '}
          <Ext href="https://www.anthropic.com/legal/privacy">privacy policy</Ext>. Please
          don&apos;t put anything private or sensitive into an explanation or the chat — it is meant
          to be a public, on-screen game.
        </p>
      </Section>

      <Section n={5} title="Who else processes your data">
        <p>
          We keep the game running with a few trusted service providers, who process data only to
          provide their service to us:
        </p>
        <Bullets
          items={[
            <><Term>Upstash</Term> — stores the live game room (see retention below).</>,
            <><Term>Pusher</Term> — delivers the real-time updates that sync the phones, host and projector.</>,
            <><Term>Anthropic</Term> — powers the AI judge, as described above.</>,
            <><Term>Vercel</Term> — hosts and serves the application.</>,
          ]}
        />
        <p>
          Some of these providers may process data on servers outside India. We otherwise share your
          information only where the law requires it.
        </p>
      </Section>

      <Section n={6} title="How long we keep it">
        <Bullets
          items={[
            'A game room and everything in it (names, avatars, scores, submissions, the last few chat messages) is automatically deleted within 24 hours, and idle rooms are cleaned up within minutes of the game ending.',
            'Rate-limit records tied to an IP address expire within minutes to an hour.',
            'Data stored on your own device stays until you leave the game, clear it, or your browser clears its storage.',
          ]}
        />
        <p>We keep no long-term database of players, games, or results.</p>
      </Section>

      <Section n={7} title="Cookies and local storage">
        <p>
          The game sets <Term>no tracking or advertising cookies</Term>. The only data kept in your
          browser is the game state listed in section 2, stored in your device&apos;s local
          storage so a refresh doesn&apos;t knock you out of your game. It is first-party, functional
          only, and never shared.
        </p>
      </Section>

      <Section n={8} title="Children">
        <p>
          The game is designed for general audiences at public events, campuses, and workshops. It
          is not directed at children under 18, and we ask that a parent or guardian be involved for
          younger players. Please use a nickname and do not enter real personal details about
          yourself or anyone else.
        </p>
      </Section>

      <Section n={9} title="Your rights">
        <p>
          Because we hold so little for so short a time, you are largely in control already: pressing
          <Term> Leave</Term> clears your device data, and every game room deletes itself within 24
          hours. Under the DPDP Act you also have the right to access, correct, or erase your
          personal data, to withdraw consent, and to raise a grievance. To exercise any of these, or
          if a game is still live and you want your entry removed sooner, contact us using the
          details below.
        </p>
      </Section>

      <Section n={10} title="How we protect it">
        <p>
          Traffic is served over HTTPS. Host and player credentials are kept server-side and are
          never sent to other players — each device only ever receives its own game token and its
          own hand of cards. No system is perfectly secure, but we keep the data we hold minimal and
          short-lived precisely to limit the risk.
        </p>
      </Section>

      <Section n={11} title="Changes to this policy">
        <p>
          We may update this policy as the game evolves. When we do, we&apos;ll change the
          &ldquo;last updated&rdquo; date at the top. Significant changes will be highlighted on this
          page.
        </p>
      </Section>

      <Section n={12} title="Contact">
        <p>
          For any privacy question or request, or to reach our grievance officer under the DPDP Act,
          email the Office of Sujeet Kumar at{' '}
          <Ext href="mailto:contact@sujeetkofficial.com">contact@sujeetkofficial.com</Ext> or reach
          us through <Ext href="https://www.sujeetkofficial.com/">sujeetkofficial.com</Ext>.
        </p>
      </Section>
    </LegalPage>
  );
}
