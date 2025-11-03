import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageSquare, Upload, Zap } from 'lucide-react';

/**
 * Home page component introducing ConnectiLearn
 */
export function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-muted/20 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Welcome to ConnectiLearn
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your AI-powered learning companion with advanced RAG capabilities.
            Learn smarter, not harder.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/chat">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
            <Link to="/notes">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Upload Notes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose ConnectiLearn?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI Chat Assistant</CardTitle>
                <CardDescription>
                  Interact with an intelligent AI that understands your learning context
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Upload className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Upload Materials</CardTitle>
                <CardDescription>
                  Upload PDFs and text files to build your personalized knowledge base
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>RAG Technology</CardTitle>
                <CardDescription>
                  Advanced retrieval-augmented generation for accurate, context-aware answers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Organized Notes</CardTitle>
                <CardDescription>
                  Manage your study materials and learning resources in one place
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Upload Your Materials</h3>
                <p className="text-muted-foreground">
                  Upload your study notes, textbooks, or any learning materials in PDF or text format.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Ask Questions</h3>
                <p className="text-muted-foreground">
                  Chat with the AI assistant about your materials. Ask questions, request summaries, or explore concepts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Get Contextual Answers</h3>
                <p className="text-muted-foreground">
                  Receive accurate answers based on your uploaded materials using advanced RAG technology.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
