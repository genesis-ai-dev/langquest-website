import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  WifiOff,
  Brain,
  Trophy,
  Users,
  Database,
  Share2,
  BookOpen,
  CheckCircle,
  Smartphone,
  Zap
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex gap-2 items-center text-accent1">
            <Globe className="h-6 w-6" />
            <span className="font-bold text-xl">LangQuest</span>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="flex items-center space-x-2">
              <Button variant="outline" className="text-accent2">
                Log In
              </Button>
              <Button className="bg-accent1 hover:bg-accent1-hover">Sign Up</Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <Badge className="inline-flex mb-2" variant="outline">
                    Coming Soon
                  </Badge>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Translate, Preserve, and Connect
                  </h1>
                  <p className="max-w-[600px] text-neutral1 md:text-xl">
                    LangQuest is an app for translating and preserving
                    low-resource languages, especially in remote areas with
                    limited internet connectivity.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" className="gap-1 bg-accent4">
                    <Zap className="h-4 w-4" />
                    Get Early Access
                  </Button>
                  <Button size="lg" variant="outline" className="text-accent2">
                    Learn More
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-full md:h-[450px] lg:h-[500px] overflow-hidden rounded-lg border bg-background p-2">
                  <img
                    src="/placeholder.svg?height=500&width=400"
                    alt="LangQuest app interface showing translation in progress"
                    className="object-cover w-full h-full rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Designed for Remote Translation
                </h2>
                <p className="max-w-[900px] text-neutral1 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  LangQuest makes translation possible even in the most
                  challenging environments.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mt-12">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <WifiOff className="h-5 w-5 text-accent4" />
                    </div>
                  </div>
                  <CardTitle>Offline Tolerance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral1">
                    Work without internet for extended periods. Your data is
                    safely stored locally until you can sync.
                  </p>
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <Brain className="h-5 w-5 text-accent4" />
                    </div>
                  </div>
                  <CardTitle>AI-Assisted Translation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral1">
                    Use AI to generate initial translations, which users can
                    review and vote on, speeding up the process.
                  </p>
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <Trophy className="h-5 w-5 text-accent4" />
                    </div>
                  </div>
                  <CardTitle>Gamification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral1">
                    Features like leaderboards and rewards make translation fun
                    and encourage participation.
                  </p>
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <Database className="h-5 w-5 text-accent4" />
                    </div>
                  </div>
                  <CardTitle>Open Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral1">
                    All validated translations become part of an openly licensed
                    database, helping train future AI models.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  How LangQuest Works
                </h2>
                <p className="max-w-[900px] text-neutral1 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Organize translations into projects, quests, and assets for
                  efficient management.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 mt-12">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent4 text-neutral2">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Create Projects</h3>
                <p className="text-sm text-neutral1">
                  Organize your translation work into projects, like translating
                  the Bible or important cultural texts.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent4 text-neutral2">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Collaborate</h3>
                <p className="text-sm text-neutral1">
                  Invite community members to contribute translations and vote
                  on each other's work.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent4 text-neutral2">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Validate & Share</h3>
                <p className="text-sm text-neutral1">
                  Validate translations through community voting and share them
                  with the world.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Perfect For
                </h2>
                <p className="max-w-[900px] text-neutral1 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  LangQuest is designed for a variety of translation needs.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12">
              <Tabs defaultValue="bible" className="max-w-3xl mx-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bible" className="text-accent2">
                    Bible Translation
                  </TabsTrigger>
                  <TabsTrigger value="cultural" className="text-accent2">
                    Cultural Texts
                  </TabsTrigger>
                  <TabsTrigger value="education" className="text-accent2">
                    Educational Materials
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="bible" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bible Translation Projects</CardTitle>
                      <CardDescription>
                        Organize and manage Bible translation efforts in remote
                        communities.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Chapter-by-Chapter Organization
                          </h4>
                          <p className="text-sm text-neutral1">
                            Easily organize translation work by books, chapters,
                            and verses.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Cross-Reference Support
                          </h4>
                          <p className="text-sm text-neutral1">
                            Link related passages and maintain consistency
                            across the translation.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Community Review
                          </h4>
                          <p className="text-sm text-neutral1">
                            Enable community members to review and validate
                            translations.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="cultural" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cultural Text Preservation</CardTitle>
                      <CardDescription>
                        Preserve important cultural stories, songs, and
                        traditions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Multimedia Support
                          </h4>
                          <p className="text-sm text-neutral1">
                            Include audio recordings alongside text to preserve
                            pronunciation.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Cultural Context Notes
                          </h4>
                          <p className="text-sm text-neutral1">
                            Add explanatory notes to provide cultural context
                            for translations.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Intergenerational Collaboration
                          </h4>
                          <p className="text-sm text-neutral1">
                            Connect elders with youth to pass down language and
                            cultural knowledge.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="education" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Educational Materials</CardTitle>
                      <CardDescription>
                        Create learning resources in low-resource languages.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Curriculum Translation
                          </h4>
                          <p className="text-sm text-neutral1">
                            Translate educational materials for schools and
                            community programs.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Vocabulary Building
                          </h4>
                          <p className="text-sm text-neutral1">
                            Create dictionaries and vocabulary lists for
                            language learners.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-accent4/10 p-2">
                          <CheckCircle className="h-5 w-5 text-accent4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Interactive Learning
                          </h4>
                          <p className="text-sm text-neutral1">
                            Develop interactive language learning materials for
                            all ages.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Future Vision */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex items-center justify-center">
                <div className="relative h-[300px] w-full md:h-[400px] overflow-hidden rounded-lg border bg-background p-2">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="Two people sharing translation data via peer-to-peer connection"
                    className="object-cover w-full h-full rounded-md"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <Badge className="inline-flex mb-2" variant="secondary">
                    Coming Soon
                  </Badge>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Future: Peer-to-Peer Connectivity
                  </h2>
                  <p className="max-w-[600px] text-neutral1 md:text-xl">
                    We're actively researching solutions to enable direct
                    device-to-device sharing of translation data without
                    internet.
                  </p>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Share2 className="h-5 w-5 text-accent4 mt-0.5" />
                    <span className="text-sm">
                      Share updates between devices when team members meet
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Smartphone className="h-5 w-5 text-accent4 mt-0.5" />
                    <span className="text-sm">
                      Sync progress across multiple devices without internet
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-accent4 mt-0.5" />
                    <span className="text-sm">
                      Enable true collaboration in the most remote locations
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Join the LangQuest Community
                </h2>
                <p className="max-w-[900px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Be among the first to use LangQuest and help preserve
                  low-resource languages.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter your email"
                    type="email"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="sm:w-auto"
                  >
                    Get Early Access
                  </Button>
                </form>
                <p className="text-xs text-neutral2-hover">
                  We'll notify you when LangQuest is ready for beta testing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 md:py-0 border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex gap-2 items-center text-accent1">
            <Globe className="h-5 w-5" />
            <span className="font-semibold">LangQuest</span>
          </div>
          <p className="text-center text-sm leading-loose text-neutral1 md:text-left">
            © 2025 LangQuest. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-neutral1 hover:text-neutral2">
              Privacy
            </a>
            <a href="#" className="text-sm text-neutral1 hover:text-neutral2">
              Terms
            </a>
            <a href="#" className="text-sm text-neutral1 hover:text-neutral2">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
