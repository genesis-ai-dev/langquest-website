import WebPageWrapper from '@/components/WebPageWrapper';
import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';

// The privacy policy for LangQuest Next (the app in
// genesis-ai-dev/langquest-next, package com.frontierrnd.langquestnext),
// hosted here beside the LangQuest policy until that app has its own site.
// The app and its store listings link to /en/next/privacy. The text
// describes what that app's code keeps; change it when the app changes
// (langquest-next docs/decisions.md 46, 47 and 48).

const CONTACT = 'admin@frontierrnd.com';
const EFFECTIVE = 'September 30, 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 mt-12">
      <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
        {title}
      </h2>
      <div className="prose prose-gray dark:prose-invert space-y-4">
        {children}
      </div>
    </div>
  );
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">
      {CONTACT}
    </a>
  );
}

export default function LangQuestNextPrivacyPolicy() {
  return (
    <WebPageWrapper>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="space-y-4 mt-12">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              LangQuest Next Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              This policy describes what the LangQuest Next mobile app keeps
              about you, who can see it, how long it is kept, and how to delete
              it. LangQuest Next is provided by Frontier R&amp;D.
            </p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>Effective Date: {EFFECTIVE}</p>
            <p>
              This policy covers only the LangQuest Next app. The original
              LangQuest app has{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                its own privacy policy
              </Link>
              .
            </p>
          </div>

          <Section title="1. What LangQuest Next Is">
            <p>
              LangQuest Next is an app for Bible translation teams to record,
              review and check oral translations together, including without an
              internet connection. Questions about this policy go to <Mail />.
            </p>
          </Section>

          <Section title="2. What We Keep">
            <h3 className="text-xl font-bold">Your account</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Your email address and password. The password is stored only as
                a secure hash.
              </li>
              <li>The name in your profile.</li>
              <li>
                Which version of the terms you accepted, and whether you have
                seen the introduction.
              </li>
              <li>
                The people you block. Your list is private: nobody else sees it,
                and the people on it are not told.
              </li>
            </ul>
            <h3 className="text-xl font-bold">Your work</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The recordings, reviews, notes, answers and other work you add
                in an organization, with who added each one and when. Recordings
                are voice audio.
              </li>
              <li>
                What you type about other people: for example, the name and
                phone or WhatsApp contact of someone you ask to review, or the
                names of people who took part in a community check and where it
                happened.
              </li>
              <li>
                Your organizations and your role in each, invitations sent to
                your email address, and requests you make to join an
                organization, with their message.
              </li>
              <li>
                Your inbox: notices about requests and feedback meant for you.
              </li>
            </ul>
            <h3 className="text-xl font-bold">
              Reports of objectionable content
            </h3>
            <p>
              If you report something someone added, or report a person, we keep
              the report: what it is about, who made it, the reason you chose,
              anything you wrote, when, and that you sent it. Your
              organization&apos;s administrators see the report without your
              name. The LangQuest team sees who sent it, so we can follow up.
              The person reported is not told who reported them.
            </p>
            <h3 className="text-xl font-bold">Progress reports</h3>
            <p>
              From the work your organization records, LangQuest calculates
              progress reports for each language: how much has been recorded and
              checked, when recordings reached our servers, a monthly log of
              chapters, and pace against the organization&apos;s plan. These
              reports are about languages, not about individual people. They are
              shown to people in your organization whose role lets them see a
              language&apos;s progress, and in the app&apos;s status screens.
            </p>
            <h3 className="text-xl font-bold">Your phone and the app</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                A random ID created when the app is installed. It is not your
                phone&apos;s hardware ID or advertising ID.
              </li>
              <li>
                Speed and error reports (&quot;diagnostics&quot;): how long
                syncing, loading and downloads take, storage space, error codes,
                and the phone model, operating system and app version. They are
                linked to your account and to the app&apos;s random install ID,
                so we can find problems a particular person or phone is having.
                They never include recordings, what you type or names.
                Diagnostics are on unless you turn them off in the app under
                Settings, Send diagnostics.
              </li>
              <li>
                If you turn on notifications, a push token so we can tell your
                phone there is something new in your inbox. The notification
                itself says only that there is an update.
              </li>
              <li>
                Server logs: when the app or a LangQuest website contacts our
                servers, our providers record the request, including your IP
                address, the time and the account used, and they log each
                sign-in. These logs are used for security and for fixing
                problems.
              </li>
            </ul>
            <h3 className="text-xl font-bold">What the app does not do</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                No advertising and no advertising IDs. No third-party analytics
                or tracking services: the only analytics are LangQuest&apos;s
                own diagnostics and progress reports, described above, and they
                are not shared with anyone else.
              </li>
              <li>
                No location tracking. A language&apos;s country, which an
                organization may set, is about the language, not about you.
              </li>
              <li>
                The camera is used only to scan invitation QR codes, and no
                pictures are kept. The microphone is used only while you record.
              </li>
              <li>
                We do not sell your information or share it for advertising.
              </li>
            </ul>
          </Section>

          <Section title="3. Why We Keep It">
            <p>
              To run your account; to keep your team&apos;s translation work
              together and in sync across phones, even offline; to let reviewers
              and administrators do their part; to give your organization
              progress reports; to send the notifications you turned on; to act
              on reports of content or behavior that breaks the terms of use; to
              keep the service secure; and to find and fix problems. We use your
              information only for these purposes.
            </p>
          </Section>

          <Section title="4. Who Can See It">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Your organization.</strong> Members see work in the
                languages their role covers, with the names of the people who
                did it. Administrators see members, roles and join requests, and
                reports about their organization&apos;s work without who sent
                them. People whose role allows it see each language&apos;s
                progress reports.
              </li>
              <li>
                <strong>The public, only if your organization chooses.</strong>{' '}
                An organization can list a language publicly and can release its
                work under an open license. Work released that way may be copied
                and shared by others under that license, and a later change
                cannot recall copies already made.
              </li>
              <li>
                <strong>Our service providers,</strong> who process data only to
                run LangQuest Next for us: Supabase (database, sign-in and file
                storage), Expo (app updates and delivery of push notifications),
                Cloudflare (invitation emails, downloads of source audio, and
                the web dashboard, whose server reads your organization&apos;s
                work to build its progress reports), Vercel (this website), and
                Apple and Google (app distribution and notifications to your
                phone). Their servers may be outside your country, including in
                the United States.
              </li>
              <li>
                <strong>The LangQuest team,</strong> to support you, fix
                problems and act on reports, and anyone we are required by law
                to disclose information to.
              </li>
            </ul>
          </Section>

          <Section title="5. On Your Phone">
            <p>
              So that work can continue without a connection, the app keeps your
              organization&apos;s work and recordings on the phone. They stay
              there until the app is uninstalled. If several people share a
              phone, it holds the work of every organization any of them opened,
              and each person sees only what their own role allows.
            </p>
          </Section>

          <Section title="6. How Long We Keep It">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Account information, including the people you block: until you
                delete your account (or, for a block, until you unblock them).
              </li>
              <li>
                Reports: kept after they are resolved, as a record of what was
                done. Your name on reports you sent is removed when you delete
                your account.
              </li>
              <li>
                Diagnostics: 90 days. The record of an installed app is removed
                180 days after it was last seen.
              </li>
              <li>
                Work you did in an organization: as long as the organization
                keeps its translation record. It is the organization&apos;s
                work, and the record keeps who did what and when.
              </li>
              <li>
                Server logs: a limited time set by each provider, then deleted.
              </li>
              <li>
                Backups are kept by our database provider for a limited time and
                then deleted.
              </li>
            </ul>
          </Section>

          <Section title="7. Deleting Your Account">
            <p>
              In the app, open Settings and tap <strong>Delete account</strong>.
              If you can&apos;t use the app, follow the steps on the{' '}
              <Link
                href="/next/delete-account"
                className="text-primary hover:underline"
              >
                account deletion page
              </Link>
              .
            </p>
            <p>Deleting your account cannot be undone:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Deleted:</strong> your sign-in, email address and
                password, your name, notifications and push tokens, join
                requests and their messages, your email on invitations, the
                people you blocked, your name on reports you sent, and
                diagnostics sent from your account.
              </li>
              <li>
                <strong>Ended:</strong> your membership in every organization.
              </li>
              <li>
                <strong>Kept:</strong> the recordings, reviews, notes and other
                work you did in an organization. They stay part of that
                organization&apos;s translation work, marked with a random ID
                that no longer leads to you, and without your name. Something
                you typed or said in that work, such as a name spoken in a
                recording, is kept as it is. To ask for it to be removed,
                contact the organization&apos;s administrators.
              </li>
            </ul>
            <p>
              The app waits for work you have not sent yet, so your organization
              receives it before your account is deleted. Copies on other
              members&apos; phones stop showing your name. Copies in backups are
              deleted when those backups expire.
            </p>
          </Section>

          <Section title="8. Your Choices and Rights">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You can change your name in the app under Settings, Edit
                Profile.
              </li>
              <li>
                You can unblock people in the app under Settings, Blocked
                people.
              </li>
              <li>
                You can turn off diagnostics at any time in the app&apos;s
                Settings, and notifications in your phone&apos;s settings.
              </li>
              <li>
                <strong>Your account information</strong> (your sign-in, email,
                name, notifications and diagnostics): you can correct your name
                in the app, and delete all of it by deleting your account (see
                section 7). To ask what we hold about you, email <Mail />.
              </li>
              <li>
                <strong>Work you did in an organization</strong> (recordings,
                reviews, notes and comments): it belongs to that organization.
                To ask for any of it to be changed or removed, or to leave the
                organization, contact its administrators.
              </li>
              <li>
                Depending on where you live, you may have further rights under
                laws such as the GDPR or Canada&apos;s PIPEDA, including the
                right to complain to a data protection authority. We answer
                privacy requests within 30 days.
              </li>
            </ul>
          </Section>

          <Section title="9. Children">
            <p>
              LangQuest Next is made for translation teams and is not directed
              at children under 13. We do not knowingly create accounts for
              them. If you believe a child has an account, email <Mail /> and we
              will delete it.
            </p>
          </Section>

          <Section title="10. Security">
            <p>
              Data travels over encrypted connections. Access to recordings and
              work is limited to members of the organization, by their role, and
              is checked by the server. No system is perfectly secure; if we
              learn of a breach that affects you, we will tell you.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              When this policy changes, we update the date above. If a change
              affects how your information is used, we will tell you before it
              takes effect.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Frontier R&amp;D, <Mail />.
            </p>
          </Section>
        </div>
      </div>
    </WebPageWrapper>
  );
}
