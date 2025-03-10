import WebPageWrapper from '@/components/WebPageWrapper';

const DataPolicy = () => {
  return (
    <WebPageWrapper>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="space-y-4 mt-12">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Data Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              This is the data policy for LangQuest. It outlines our philosophy
              on user data and language data.
            </p>
          </div>

          <div className="space-y-4 mt-12">
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
              User Data
            </h2>
            <div className="prose prose-gray dark:prose-invert">
              <p>
                We don&apos;t collect any user data, with two optional
                exceptions:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  When you create an account, you *may* provide an email
                  address. This can be used for resetting your password.
                </li>
                <li>
                  When you sign up to the newsletter, you share your email
                  address. You can unsubscribe at any time, and we will not
                  share your email address with any third parties. It will only
                  be used for updates about LangQuest.
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4 mt-12">
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
              Language Data
            </h2>
            <div className="prose prose-gray dark:prose-invert space-y-4">
              <p>
                The entire purpose of LangQuest is to preserve and make language
                data available to everyone. We do not sell language data, and we
                hope everyone who has any interest in language preservation will
                use it. We hope others will use this data to create new tools,
                resources, AI models (text, speech recognition and synthesis,
                etc.).
              </p>
              <p>
                It is very important to our mission that the language data is as
                usable as possible. We make the database public, and do not
                require any attribution for using it.
              </p>
              <p>
                To this end, the language gathered or validated in LangQuest is
                licensed under the{' '}
                <a
                  href="https://creativecommons.org/publicdomain/zero/1.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  CC0 1.0 Universal (CC0 1.0) Public Domain Dedication
                </a>
                .
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
                . We hope to create a similar community for language
                preservation and bridge building across all languages and
                cultures.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-12">
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
              Notes
            </h2>
            <div className="prose prose-gray dark:prose-invert space-y-4">
              <p>
                If you have any questions or feedback, please contact us at{' '}
                <a
                  href="mailto:admin@frontierrnd.com"
                  className="text-primary hover:underline"
                >
                  admin@frontierrnd.com
                </a>
                .
              </p>
              <p>
                Or leave an issue on{' '}
                <a
                  href="https://github.com/genesis-ai-dev/langquest/issues"
                  className="text-primary hover:underline"
                >
                  GitHub
                </a>
                .
              </p>
              <p>
                We reserve the right to update this data policy at any time
                (don&apos;t worry, you can&apos;t dedicate something to the
                public domain and then un-dedicate it. Public domain is
                forever).
              </p>
              <p>
                All of the source code for the app is{' '}
                <a
                  href="https://github.com/genesis-ai-dev/langquest"
                  className="text-primary hover:underline"
                >
                  available on GitHub
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </WebPageWrapper>
  );
};

export default DataPolicy;
