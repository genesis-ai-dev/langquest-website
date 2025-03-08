'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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
  Zap,
  Clock,
  Menu,
  GitBranch
} from 'lucide-react';
import Link from 'next/link';
import Hero from '@/components/Hero';
import PeerToPeerVisualization from '@/components/PeerToPeerVisualization';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SubscribeForm } from '@/components/SubscribeForm';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WebPageWrapper from '@/components/WebPageWrapper';

export default function LandingPage() {
  return (
    <WebPageWrapper>
      <main className="flex-1">
        {/* Hero Section with Three.js Globe */}
        <Hero>
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col p-8 justify-center space-y-4 bg-background/60 backdrop-blur-sm  rounded-lg border border-border/50">
              <div className="space-y-2">
                <Badge className="inline-flex mb-2" variant="outline">
                  Coming Soon
                </Badge>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Translate, Preserve, and Connect
                </h1>
                <p className="max-w-[600px] md:text-xl">
                  Translate and preserve endangered languages anywhere, even
                  offline.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <SubscribeForm />
                <div className="flex gap-2">
                  <Link href="/database">
                    <Button
                      size="lg"
                      variant="outline"
                      className=" hover:bg-white/20 hover:text-white"
                    >
                      View the Database
                    </Button>
                  </Link>
                  <Link href="/data-view">
                    <Button
                      size="lg"
                      variant="secondary"
                      className=" hover:bg-white/20 hover:text-white"
                    >
                      User-Friendly Data
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Hero>

        {/* Key Features */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Designed for Remote Translation
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
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
                  <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
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
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Organize translations into projects, quests, and assets for
                  efficient management.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 mt-12">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent4 text-white">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Create Projects</h3>
                <p className="text-sm text-muted-foreground">
                  Organize your translation work into projects, like translating
                  the Bible or important cultural texts.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent4 text-white">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Collaborate</h3>
                <p className="text-sm text-muted-foreground">
                  Invite community members to contribute translations and vote
                  on each other's work.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent4 text-white">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Validate & Share</h3>
                <p className="text-sm text-muted-foreground">
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
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  LangQuest is designed for a variety of translation needs.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
              <Card className="relative before:absolute before:-inset-1 before:rounded-xl before:bg-[radial-gradient(circle_at_50%_120%,var(--color-accent1),transparent_70%)] before:opacity-40 before:blur-lg before:transition-all hover:before:opacity-60">
                <CardHeader>
                  <CardTitle>Bible Translation</CardTitle>
                  <CardDescription>
                    Collect linguistic data to enable AI-powered Bible
                    translation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Bite-sized Translation Tasks
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Break down translation into small, manageable pieces
                        like words, phrases and verses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Community Validation
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Enable native speakers to validate translations through
                        simple voting
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <Clock className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Offline Collaboration (Coming Soon)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Work together even without internet through peer-to-peer
                        syncing
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative before:absolute before:-inset-1 before:rounded-xl before:bg-[radial-gradient(circle_at_50%_120%,var(--color-accent2),transparent_70%)] before:opacity-40 before:blur-lg before:transition-all hover:before:opacity-60">
                <CardHeader>
                  <CardTitle>Cultural Text Documentation</CardTitle>
                  <CardDescription>
                    Document and preserve cultural knowledge in low-resource
                    languages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Multimodal Support
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Capture text, audio recordings, and images to document
                        language and culture
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Gamified Progress</h4>
                      <p className="text-sm text-muted-foreground">
                        Track achievements and milestones to make documentation
                        engaging
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Open Data Sharing</h4>
                      <p className="text-sm text-muted-foreground">
                        Share validated translations openly to benefit the whole
                        community
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative before:absolute before:-inset-1 before:rounded-xl before:bg-[radial-gradient(circle_at_50%_120%,var(--color-intense1),transparent_70%)] before:opacity-40 before:blur-lg before:transition-all hover:before:opacity-60">
                <CardHeader>
                  <CardTitle>Educational Materials</CardTitle>
                  <CardDescription>
                    Build language resources for education and learning
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Simple Validation</h4>
                      <p className="text-sm text-muted-foreground">
                        Easily validate translations through community voting
                        and feedback
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Resource Building</h4>
                      <p className="text-sm text-muted-foreground">
                        Create dictionaries, word lists and other learning
                        materials
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="rounded-full bg-accent4/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Local-First Design
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Work offline and sync when internet is available
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Future Vision */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex items-center justify-center">
                <div className="relative h-[300px] w-full md:h-[400px] overflow-hidden rounded-lg border bg-background p-2">
                  <PeerToPeerVisualization />
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
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
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
                <SubscribeForm />
                <p className="text-xs text-muted-foreground">
                  We'll notify you when LangQuest is ready for beta testing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </WebPageWrapper>
  );
}
