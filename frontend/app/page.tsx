import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Leaf, 
  Brain, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Zap, 
  Globe, 
  Shield, 
  TrendingUp,
  ArrowRight,
  Play,
  BookOpen,
  Smartphone,
  Database,
  Cloud,
  Target,
  Award,
  Github,
  Mail,
  ExternalLink,
  Building2,
  UserCheck
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-sm"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">CropAI</span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </Link>
              <Link href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">
                Demo
              </Link>
              <Link href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
            </nav>
            
            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                Learn More
              </Button>
              <Link href="/login">
                <Button size="sm" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                  <Play className="w-4 h-4 mr-2" />
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-green-100/50 via-transparent to-blue-100/50"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm">
              <Zap className="w-4 h-4 mr-2" />
              AI-Powered Agricultural Technology
            </Badge>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            AI-Powered Agricultural Insights for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              Smarter Decisions
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            From soil to sensor, we help you make data-driven agricultural investments.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button size="lg" className="px-8 py-3 text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                <Play className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8 py-3 text-lg border-2">
              <BookOpen className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform combines IoT sensors, weather data, and AI to deliver actionable agricultural insights
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Database className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Collection</h3>
              <p className="text-gray-600">
                IoT sensors and weather APIs collect soil & environmental data in real-time
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Analysis</h3>
              <p className="text-gray-600">
                Advanced AI analyzes soil type & environmental patterns for optimal insights
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Target className="w-10 h-10 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Recommendations</h3>
              <p className="text-gray-600">
                Generate crop recommendations for farmers, exporters, and investors
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to make informed agricultural decisions
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Leaf className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-lg">Real-time Soil Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  Monitor soil conditions, moisture levels, and nutrient content in real-time
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Crop Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  AI-powered suggestions for optimal crop selection based on soil and climate data
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-lg">AI Chat Assistant</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  Get instant answers to agricultural questions with our intelligent chatbot
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-lg">Zone & User Management</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  Comprehensive dashboard for managing agricultural zones and user permissions
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Target Users Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Who Benefits
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform serves diverse stakeholders in the agricultural ecosystem
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-6 bg-green-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-10 h-10 text-green-700" />
                </div>
                <CardTitle className="text-xl">Investor</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-700">
                  Make data-driven investment decisions with comprehensive agricultural insights and market analysis
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-6 bg-blue-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-10 h-10 text-blue-700" />
                </div>
                <CardTitle className="text-xl">Local Governmental Agricultural Institution</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-700">
                  Monitor regional agricultural performance and implement data-driven policies for sustainable development
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-6 bg-yellow-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <UserCheck className="w-10 h-10 text-yellow-700" />
                </div>
                <CardTitle className="text-xl">Farmer</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-700">
                  Access personalized crop recommendations and soil insights for better yields and sustainable farming
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Experience the AI Chatbot
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See our AI assistant in action with real agricultural queries
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                Ask Anything About Agriculture
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">"What crops are best for clay soil in tropical climates?"</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">"How can I improve soil fertility naturally?"</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">"What's the optimal planting time for corn in Zone 5?"</p>
                </div>
              </div>
              
              <div className="mt-8">
                <Link href="/login">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Try the Chatbot
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">User:</p>
                  <p className="text-gray-800">"What's the best crop for my soil type?"</p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-2">AI Assistant:</p>
                  <p className="text-gray-800">
                    Based on your soil analysis, I recommend <strong>soybeans</strong> as they thrive in your soil conditions. 
                    Consider planting in early spring for optimal results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team & Hackathon Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Built for the Future of Agriculture
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our team developed this platform to address real challenges in agricultural decision-making
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6">
                <Badge variant="outline" className="mb-4 px-4 py-2 text-lg border-2">
                  <Award className="w-5 h-5 mr-2" />
                  Hackathon Project
                </Badge>
              </div>
              
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Why This Matters
              </h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Agriculture is the backbone of our economy, yet decision-making often relies on intuition rather than data. 
                Our platform bridges this gap by providing real-time insights that help farmers, investors, and administrators 
                make informed choices for better yields and sustainable practices.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Data-driven agricultural decisions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Sustainable farming practices</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Improved crop yields and profitability</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8">
              <h4 className="text-xl font-semibold text-gray-900 mb-6 text-center">Our Team</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
                  <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-semibold">A</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Agricultural Expert</p>
                    <p className="text-sm text-gray-600">Soil Science & Crop Management</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
                  <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold">D</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Data Scientist</p>
                    <p className="text-sm text-gray-600">AI & Machine Learning</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
                  <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                    <span className="text-purple-700 font-semibold">F</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Full Stack Developer</p>
                    <p className="text-sm text-gray-600">Frontend & Backend Development</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Agricultural AI</h3>
              <p className="text-gray-400 text-sm">
                Empowering agricultural decisions with AI-powered insights and real-time data analysis.
              </p>
            </div>
            
            <div>
              <h4 className="text-md font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#demo" className="hover:text-white transition-colors">Demo</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-md font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Team</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-md font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </Link>
                <Link href="#" className="hover:text-white transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Agricultural AI Platform. Built for innovation in agricultural technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
