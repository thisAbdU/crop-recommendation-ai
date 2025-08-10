"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, UserPlus, LogIn } from "lucide-react";
import { AuthService } from "@/services/authService";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [email, setEmail] = useState("ivy@example.com");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    phone_number: "",
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSignupLoading, setIsSignupLoading] = useState(false);

  const router = useRouter();
  const { login, demoLogin, user } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        // Get user info to determine role-based redirect
        const userInfo = localStorage.getItem("user_info");
        if (userInfo) {
          const user = JSON.parse(userInfo);
          // Redirect based on user role
          switch (user.role) {
            case "zone_admin":
              router.push("/dashboard/zone-data");
              break;
            case "central_admin":
              router.push("/dashboard/zones");
              break;
            case "investor":
              router.push("/dashboard");
              break;
            default:
              router.push("/dashboard");
          }
        } else {
          // Fallback to default dashboard
          router.push("/dashboard");
        }
      } else {
        setError("Invalid credentials. Please check your email and password.");
      }
    } catch (err) {
      setError("An error occurred during login. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError(null);

    // Basic validation
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    if (signupData.password.length < 6) {
      setSignupError("Password must be at least 6 characters long.");
      return;
    }

    setIsSignupLoading(true);

    try {
      // Call the real signup API
      const response = await AuthService.signup({
        first_name: signupData.first_name,
        last_name: signupData.last_name,
        email: signupData.email,
        password: signupData.password,
        phone_number: signupData.phone_number,
        role: "INVESTER",
      });

      if (response) {
        // Redirect to login tab with success message
        setActiveTab("login");
        setError("Account created successfully! Please sign in.");

        // Clear signup form
        setSignupData({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "",
          phone_number: "",
        });
      }
    } catch (err) {
      setSignupError(
        err instanceof Error
          ? err.message
          : "An error occurred during signup. Please try again."
      );
      console.error("Signup error:", err);
    } finally {
      setIsSignupLoading(false);
    }
  }

  const handleDemoLogin = async (
    role: "investor" | "zone_admin" | "central_admin"
  ) => {
    console.log("🔗 Demo login clicked for role:", role);
    setError(null);
    setIsLoading(true);

    try {
      console.log("📞 Calling demoLogin function...");
      // Use the new demoLogin function from AuthContext
      const success = await demoLogin(role);
      console.log("✅ demoLogin result:", success);

      if (success) {
        console.log(
          "🎉 Demo login successful, redirecting to role-specific dashboard..."
        );

        // Debug: Check localStorage and user state
        console.log(
          "🔍 localStorage user_info:",
          localStorage.getItem("user_info")
        );
        console.log(
          "🔍 localStorage auth_token:",
          localStorage.getItem("auth_token")
        );
        console.log("🔍 Current user from context:", user);

        // Redirect based on user role
        switch (role) {
          case "zone_admin":
            console.log("🚀 Redirecting zone_admin to /dashboard/zone-data");
            router.replace("/dashboard/zone-data");
            break;
          case "central_admin":
            console.log("🚀 Redirecting central_admin to /dashboard/zones");
            router.replace("/dashboard/zones");
            break;
          case "investor":
            console.log("🚀 Redirecting investor to /dashboard");
            router.replace("/dashboard");
            break;
          default:
            console.log("🚀 Redirecting to default /dashboard");
            router.replace("/dashboard");
        }
      } else {
        console.log("❌ Demo login failed");
        setError("Demo login failed. Please try again.");
      }
    } catch (err) {
      console.error("💥 Demo login error:", err);
      setError("Demo login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-blue-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg"></div>
          </div>
          <CardTitle className="text-2xl">Welcome to CropAI</CardTitle>
          <p className="text-muted-foreground text-sm">
            Sign in to access your dashboard or create an investor account
          </p>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="login"
                className="flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Input
                    value="INVESTER"
                    hidden
                    name="role"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="relative">
                  <Input
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or try demo accounts
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("investor")}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    Investor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("zone_admin")}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    Zone Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("central_admin")}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    Central Admin
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="space-y-4 mt-6">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700 text-center">
                  <strong>Investor Signup Only</strong>
                  <br />
                  Create your account to access agricultural investment insights
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="First Name"
                    value={signupData.first_name}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        first_name: e.target.value,
                      })
                    }
                    required
                    disabled={isSignupLoading}
                  />
                  <Input
                    placeholder="Last Name"
                    value={signupData.last_name}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        last_name: e.target.value,
                      })
                    }
                    required
                    disabled={isSignupLoading}
                  />
                </div>

                <Input
                  placeholder="Email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData({ ...signupData, email: e.target.value })
                  }
                  required
                  disabled={isSignupLoading}
                />

                <Input
                  placeholder="Phone Number"
                  type="tel"
                  value={signupData.phone_number}
                  onChange={(e) =>
                    setSignupData({
                      ...signupData,
                      phone_number: e.target.value,
                    })
                  }
                  disabled={isSignupLoading}
                />

                <div className="relative">
                  <Input
                    placeholder="Password"
                    type={showSignupPassword ? "text" : "password"}
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    required
                    disabled={isSignupLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isSignupLoading}
                  >
                    {showSignupPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    placeholder="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupData.confirmPassword}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    disabled={isSignupLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isSignupLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {signupError && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{signupError}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  type="submit"
                  disabled={isSignupLoading}
                >
                  {isSignupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Investor Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
