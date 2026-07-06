import { Link } from '@/i18n/navigation';

function PrivacyPolicy() {
  return (
    <>
      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          1. Introduction
        </h2>
        <div className="prose prose-gray dark:prose-invert">
          <p>
            This Privacy Policy describes how Frontier R&amp;D (&quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) collects, uses, and shares
            information in connection with your use of the LangQuest mobile
            application (&quot;App&quot;) and our website at{' '}
            <Link href="/" className="text-primary hover:underline">
              langquest.org
            </Link>{' '}
            (&quot;Website&quot;).
          </p>
          <p>
            We are committed to protecting your privacy. We collect minimal data
            necessary to provide the App and Website, as outlined in this
            policy.
          </p>
          <p>
            Frontier R&amp;D is based in Canada, and this Privacy Policy is
            governed by and construed in accordance with Canadian law. However,
            as explained in Section 8, your data may be processed in the United
            States.
          </p>
          <h3 className="text-xl font-bold">Global Availability</h3>
          <p>
            LangQuest is designed to be available worldwide to users of all
            languages and cultures. While we are based in Canada, we welcome
            users from all countries and regions. Our mission is to preserve and
            make language data accessible globally, and we are committed to
            respecting privacy laws in the various jurisdictions where our users
            reside.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          2. Information We Collect
        </h2>
        <div className="prose prose-gray dark:prose-invert space-y-4">
          <h3 className="text-xl font-bold">
            2.1 Information You Provide to Us
          </h3>
          <p>
            We collect the following information that you voluntarily provide to
            us:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account Information</strong>: When you create an account,
              we collect your email address (optional, for account recovery
              purposes) and username.
            </li>
            <li>
              <strong>User Content</strong>: Any content you contribute to the
              App, including translations, audio recordings, comments, and
              votes.
            </li>
            <li>
              <strong>Newsletter Subscription</strong>: If you opt in to our
              newsletter, we collect your email address.
            </li>
            <li>
              <strong>Communications</strong>: If you contact us directly, we
              may receive additional information about you, such as your name,
              email address, and the contents of your message.
            </li>
          </ul>

          <h3 className="text-xl font-bold">
            2.2 Information We Collect Automatically
          </h3>
          <p>
            When you use the App or visit the Website, we may collect certain
            information automatically.
          </p>
          <p>
            <strong>App.</strong> When you use the App, this may include:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Usage Information</strong>: Information about your
              interactions with the App, such as the features you use and the
              time spent on the App.
            </li>
            <li>
              <strong>Device Information</strong>: Information about your
              device, including device model and operating system, when you opt
              in to account-linked analytics after sign-in (see Analytics Data
              below).
            </li>
            <li>
              <strong>Analytics Data (PostHog)</strong>: We use PostHog on the
              native App (not on web or in development) only after you sign in
              and opt in to analytics. Until then, PostHog does not run on your
              device — no usage data, no session replay, and no error telemetry
              is sent.
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>
                  <strong>Before you opt in.</strong> Whether you are browsing
                  before sign-in or signed in without turning analytics on, we
                  do not collect analytics data or session replays.
                </li>
                <li>
                  <strong>After you opt in.</strong> If you turn on analytics in
                  the App, we collect:
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>
                      Usage patterns: features accessed, screens viewed, and
                      navigation paths
                    </li>
                    <li>
                      Device metadata: device manufacturer, model, operating
                      system version, app version, and OTA update identifier
                    </li>
                    <li>
                      Session replay on supported devices: recordings of screens
                      and interactions while you are signed in. Text you type
                      into forms is masked.
                    </li>
                    <li>
                      Technical events: app crashes, unhandled errors, and
                      related diagnostic data
                    </li>
                    <li>
                      Account linkage: we associate usage with your account user
                      ID through PostHog. We do not send your email address to
                      PostHog.
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
          <p>
            <strong>Website.</strong> When you visit langquest.org, we use
            Umami, a cookieless analytics service, to understand how visitors
            use the site. Umami may collect:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Pages viewed and referring URLs</li>
            <li>Browser type, operating system, and device type</li>
            <li>
              General geographic location (country) derived from your IP address
            </li>
          </ul>
          <p>
            Umami does not use cookies on the Website and does not track you
            across other websites. We use this data to measure traffic and
            improve the site. We rely on our legitimate interest in
            understanding how visitors use the site. If you object to this
            processing, you may enable Global Privacy Control or Do Not Track in
            your browser, or contact us at{' '}
            <a
              href="mailto:admin@frontierrnd.com"
              className="text-primary underline"
            >
              admin@frontierrnd.com
            </a>{' '}
            to opt out.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          3. How We Use Your Information
        </h2>
        <div className="prose prose-gray dark:prose-invert">
          <p>We use the information we collect for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Provide and maintain the App</strong>: To deliver the
              functionality you request, including account creation, content
              contributions, and user interactions.
            </li>
            <li>
              <strong>Improve the App</strong>: To understand how opted-in users
              use the App after they turn on analytics, so we can find and fix
              problems.
            </li>
            <li>
              <strong>Communicate with you</strong>: To respond to your
              inquiries and send you updates about the App.
            </li>
            <li>
              <strong>Send newsletters</strong>: If you opt in, to send you
              newsletters about LangQuest updates and developments.
            </li>
            <li>
              <strong>Security and compliance</strong>: To protect the App and
              our users, and to comply with legal obligations.
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          4. How We Share Your Information
        </h2>
        <div className="prose prose-gray dark:prose-invert space-y-4">
          <h3 className="text-xl font-bold">4.1 User Content</h3>
          <p>
            All content you contribute to LangQuest (translations, recordings,
            comments, votes) is made freely available worldwide under the CC0
            1.0 Universal (CC0 1.0) Public Domain Dedication. This means anyone
            can use this content for any purpose without attribution.
          </p>
          <p>
            <strong>Audio recordings.</strong> When you record audio for a
            contribution, that recording may identify you by your voice. A
            reading may also include names or other personal details if you
            speak them. CC0 dedicates the language data itself to the public
            domain; it does not make a voice recording anonymous. If you delete
            your account, we may keep your recordings as part of the LangQuest
            language archive with your username and account link removed, as
            described in Section 6.3. You may contact us to request deletion of
            your own recordings.
          </p>

          <h3 className="text-xl font-bold">4.1.1 Our Language Data Mission</h3>
          <p>
            The entire purpose of LangQuest is to preserve and make language
            data available to everyone. We do not sell language data, and we
            hope everyone who has any interest in language preservation will use
            it. We hope others will use this data to create new tools,
            resources, AI models (text, speech recognition and synthesis, etc.).
          </p>
          <p>
            It is very important to our mission that the language data is as
            usable as possible. We make the database public, and do not require
            any attribution for using it.
          </p>
          <p>
            We are inspired by projects like{' '}
            <a
              href="https://librivox.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              LibriVox
            </a>{' '}
            and{' '}
            <a
              href="https://www.gutenberg.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Project Gutenberg
            </a>
            . We hope to create a similar community for language preservation
            and bridge building across all languages and cultures.
          </p>

          <h3 className="text-xl font-bold">4.2 Service Providers</h3>
          <p>
            We share personal data with service providers who process it on our
            behalf. They may only use it to provide services to us and must
            protect it under contract.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Supabase</strong> (database, authentication, file storage,
              and backend functions): hosts account data, contributions, and app
              content.
            </li>
            <li>
              <strong>PostHog</strong> (App analytics): processes usage data,
              device metadata, and session replay only if you opt in to
              analytics after sign-in, as described in Section 2.2.
            </li>
            <li>
              <strong>Umami</strong> (Website analytics): collects cookieless
              page-view and traffic data on langquest.org, as described in
              Section 2.2.
            </li>
            <li>
              <strong>Resend</strong> (email): sends transactional emails,
              invites, and newsletter messages to addresses you provide.
            </li>
            <li>
              <strong>Cloudflare</strong> (infrastructure): runs edge services
              that route email webhooks, proxy App analytics, and store exported
              audio files.
            </li>
            <li>
              <strong>Vercel</strong> (Website hosting): hosts langquest.org and
              standard web server logs.
            </li>
          </ul>
          <p>
            These providers may process data in the United States or other
            countries. See Section 8 for transfer details.
          </p>

          <h3 className="text-xl font-bold">4.3 Legal Requirements</h3>
          <p>
            We may disclose your information if required to do so by law or in
            response to valid legal requests, such as subpoenas, court orders,
            or government regulations.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          5. Data Security
        </h2>
        <div className="prose prose-gray dark:prose-invert">
          <p>
            We implement reasonable security measures to protect your
            information from unauthorized access, alteration, disclosure, or
            destruction. However, no internet or electronic storage system is
            100% secure, and we cannot guarantee absolute security.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          6. Your Rights and Choices
        </h2>
        <div className="prose prose-gray dark:prose-invert space-y-4">
          <h3 className="text-xl font-bold">6.1 Account Information</h3>
          <p>
            You can update your account information through the App settings. If
            you need assistance, please contact us at{' '}
            <a
              href="mailto:admin@frontierrnd.com"
              className="text-primary underline"
            >
              admin@frontierrnd.com
            </a>
            .
          </p>

          <h3 className="text-xl font-bold">6.2 Newsletter Unsubscribe</h3>
          <p>
            If you have subscribed to our newsletter, you can unsubscribe at any
            time by following the unsubscribe link in the emails or by
            contacting us.
          </p>

          <h3 className="text-xl font-bold">6.3 Account Deletion</h3>
          <p>
            You can request deletion of your account in the App (Profile →
            Account Deletion) or by contacting us at{' '}
            <a
              href="mailto:admin@frontierrnd.com"
              className="text-primary underline"
            >
              admin@frontierrnd.com
            </a>
            .
          </p>
          <p>
            When you request deletion, we schedule a permanent purge after a
            30-day grace period. During that period you can sign back in and
            cancel the deletion. When the purge runs, we delete your account,
            profile, email address, and other personal information tied to your
            identity from our active systems.
          </p>
          <p>
            <strong>Contributions you published.</strong> Text translations,
            comments, and votes that you contributed under CC0 stay available in
            the public language dataset, but we remove the link between those
            items and your account (your username and contributor ID are
            removed). Please do not include personal details in shared text if
            you do not want them to remain public.
          </p>
          <p>
            <strong>Voice recordings.</strong> Audio recordings are different
            from text. A voice can identify a speaker even after we remove your
            account link, and many recordings are audio-only translations with
            no separate text. To preserve irreplaceable language data for
            research and archiving, we keep voice recordings you contributed
            after your account is deleted, with your username and account link
            removed. These recordings remain part of the LangQuest language
            archive. If you want your own recordings deleted instead, contact us
            at{' '}
            <a
              href="mailto:admin@frontierrnd.com"
              className="text-primary underline"
            >
              admin@frontierrnd.com
            </a>{' '}
            when you request account deletion or at any time before or after the
            purge. We will honor that request within one month.
          </p>
          <p>
            <strong>Backups.</strong> Deleted information may still exist in
            backup copies until those backups rotate out. We do not use backup
            copies for normal processing, and we do not restore deleted accounts
            on request.
          </p>

          <h3 className="text-xl font-bold">6.4 Analytics opt-out</h3>
          <p>
            PostHog does not run until you sign in and turn analytics on. You
            can opt in from the analytics prompt or in Profile settings. If you
            opt in, you can opt out again anytime in Profile settings. Opting
            out stops account-linked analytics and session replay while you
            remain signed in. It does not delete data already collected; contact
            us to exercise your deletion rights.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          7. Children&apos;s Privacy
        </h2>
        <div className="prose prose-gray dark:prose-invert">
          <p>
            The App is not directed to children under the age of 13, and we do
            not knowingly collect personal information from children. If you are
            a parent or guardian and believe we have collected information from
            your child, please contact us.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          8. International Transfers
        </h2>
        <div className="prose prose-gray dark:prose-invert">
          <p>
            While Frontier R&amp;D is based in Canada, your information is
            processed and stored in the United States where our servers and
            service providers maintain facilities. By using the App, you consent
            to the transfer of information to countries outside your country of
            residence, including from Canada to the United States, which may
            have different data protection rules than those of your country.
          </p>
          <p>
            Please be aware that different countries have different data
            protection requirements. At this time, we process all data in the
            United States, regardless of user location. If you are located in a
            region with specific data protection laws (such as the European
            Economic Area, United Kingdom, Switzerland, Brazil, or other
            jurisdictions), please understand that by using our App, you are
            consenting to the transfer and processing of your information in the
            United States, which may not provide the same level of data
            protection as your home country.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          9. Changes to This Privacy Policy
        </h2>
        <div className="prose prose-gray dark:prose-invert">
          <p>
            We&apos;re constantly trying to improve LangQuest, so we may need to
            change this Privacy Policy from time to time. We will alert you to
            any such changes by placing a notice on{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              langquest.org
            </Link>
            , by sending you an email, and/or by some other means.
          </p>
          <p>
            Please note that if you&apos;ve opted not to receive legal notice
            emails from us (or you haven&apos;t provided us with your email
            address), those legal notices will still govern your use of the App,
            and you are still responsible for reading and understanding them.
          </p>
          <p>
            If you use the App after any changes to the Privacy Policy have been
            posted, that means you agree to all of the changes. Use of
            information we collect is subject to the Privacy Policy in effect at
            the time such information is collected. Previous versions are
            available in our{' '}
            <Link
              href="/privacy/archive"
              className="text-primary hover:underline"
            >
              Privacy Policy archive
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          10. Contact Us
        </h2>
        <div className="prose prose-gray dark:prose-invert">
          <p>
            If you have any questions or concerns about this Privacy Policy or
            our data practices, please contact us at:
          </p>
          <ul>
            <li>
              Email:{' '}
              <a
                href="mailto:admin@frontierrnd.com"
                className="text-primary underline"
              >
                admin@frontierrnd.com
              </a>
            </li>
            <li>
              GitHub Issues:{' '}
              <a
                href="https://github.com/genesis-ai-dev/langquest/issues"
                className="text-primary underline"
              >
                LangQuest GitHub Issues
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
          11. Additional Information for Specific Jurisdictions
        </h2>
        <div className="prose prose-gray dark:prose-invert space-y-4">
          <h3 className="text-xl font-bold">
            11.2 European Economic Area and United Kingdom
          </h3>
          <p>
            If you are in the European Economic Area or the United Kingdom, you
            have additional rights under the EU GDPR and UK GDPR, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Right of access</strong>: You may request a copy of the
              personal data we hold about you.
            </li>
            <li>
              <strong>Right to erasure</strong>: You may request deletion of
              your personal data, subject to exceptions described in Section
              6.3.
            </li>
            <li>
              <strong>Right to rectification</strong>: You may ask us to correct
              inaccurate personal data.
            </li>
            <li>
              <strong>Right to restrict processing</strong>: You may ask us to
              limit how we use your data in certain circumstances.
            </li>
            <li>
              <strong>Right to data portability</strong>: You may request your
              data in a structured, machine-readable format where applicable.
            </li>
            <li>
              <strong>Right to object</strong>: You may object to processing
              based on legitimate interest, including Umami website analytics
              (see Section 2.2). You may withdraw analytics consent anytime in
              Profile settings.
            </li>
            <li>
              <strong>Right to lodge a complaint</strong>: You may contact your
              local supervisory authority. We do not have an EU or UK
              representative appointed at this time; contact us at{' '}
              <a
                href="mailto:admin@frontierrnd.com"
                className="text-primary underline"
              >
                admin@frontierrnd.com
              </a>
              .
            </li>
          </ul>
          <p>
            To exercise these rights, contact us at{' '}
            <a
              href="mailto:admin@frontierrnd.com"
              className="text-primary underline"
            >
              admin@frontierrnd.com
            </a>
            . We respond within one month.
          </p>

          <h3 className="text-xl font-bold">11.3 California Residents</h3>
          <p>
            If you are a California resident, you may have additional rights
            under the California Consumer Privacy Act (CCPA), including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Right to Know</strong>: You may request information about
              the personal information we&apos;ve collected about you, including
              categories of information, purposes for collection, and categories
              of third parties with whom we&apos;ve shared it.
            </li>
            <li>
              <strong>Right to Delete</strong>: You may request deletion of
              personal information we&apos;ve collected from you, subject to
              certain exceptions — including voice recordings we retain in the
              language archive after account deletion, as described in Section
              6.3, unless you ask us to delete your own recordings.
            </li>
            <li>
              <strong>Right to Opt-Out</strong>: You may opt-out of the
              &quot;sale&quot; of your personal information, though we do not
              sell personal information in the traditional sense.
            </li>
            <li>
              <strong>Right to Non-Discrimination</strong>: We will not
              discriminate against you for exercising your CCPA rights.
            </li>
          </ul>
          <p>
            To exercise these rights, please contact us at{' '}
            <a
              href="mailto:admin@frontierrnd.com"
              className="text-primary underline"
            >
              admin@frontierrnd.com
            </a>
            .
          </p>

          <h3 className="text-xl font-bold">11.4 International Users</h3>
          <p>
            If you are accessing our App from outside Canada and the United
            States, please be aware that your information may be transferred to,
            stored, and processed in the United States where our servers are
            located and our central database is operated. The data protection
            and other laws of the United States and Canada might not be as
            comprehensive as those in your country. By using our App, you
            consent to your information being transferred to and processed in
            the United States.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <div className="prose prose-gray dark:prose-invert">
          <p>
            If you have a disability and require this document in another
            format, please contact us at{' '}
            <a
              href="mailto:admin@frontierrnd.com"
              className="text-primary underline"
            >
              admin@frontierrnd.com
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}

export default PrivacyPolicy;
