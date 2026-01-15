import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BookOpen, Users, FileText, Clock, GitBranch, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export default async function HomePage() {
  // Check if user is logged in and redirect to dashboard
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  
  if (authToken) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Story Plotter</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Plan Your Stories with{' '}
            <span className="text-primary">Confidence</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A powerful story planning tool for writers. Organize your characters,
            scenes, plotlines, and timelines all in one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Writing Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Write Your Story
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Users}
              title="Character Management"
              description="Create detailed character profiles with relationships, arcs, and custom attributes."
            />
            <FeatureCard
              icon={FileText}
              title="Scene Editor"
              description="Write and organize scenes with a powerful rich text editor and status tracking."
            />
            <FeatureCard
              icon={Clock}
              title="Timeline View"
              description="Visualize your story's chronology with an interactive timeline."
            />
            <FeatureCard
              icon={GitBranch}
              title="Plotline Tracking"
              description="Manage multiple plotlines and track how they weave together."
            />
            <FeatureCard
              icon={BookOpen}
              title="World Building"
              description="Document locations, lore, and background details for your story world."
            />
            <FeatureCard
              icon={FileText}
              title="Export Options"
              description="Export your work to PDF, Word, or Markdown for sharing and publishing."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Writing?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of writers who use Story Plotter to bring their stories to life.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold">Story Plotter</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Story Plotter. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg bg-card border">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
