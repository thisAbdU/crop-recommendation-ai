"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("ivy@example.com");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (true) {
        // Redirect to dashboard
        router.push("/dashboard");
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

  const handleDemoLogin = async (
    role: "investor" | "zone_admin" | "central_admin"
  ) => {
    setError(null);
    setIsLoading(true);

    try {
      let demoEmail: string;
      let demoPassword: string;

      switch (role) {
        case "investor":
          demoEmail = "ivy@example.com";
          demoPassword = "password123";
          break;
        case "zone_admin":
          demoEmail = "zane@example.com";
          demoPassword = "password123";
          break;
        case "central_admin":
          demoEmail = "cora@example.com";
          demoPassword = "password123";
          break;
        default:
          demoEmail = "ivy@example.com";
          demoPassword = "password";
      }

      setEmail(demoEmail);
      setPassword(demoPassword);

      const success = await login(demoEmail, demoPassword);
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Demo login failed. Please try again.");
      }
    } catch (err) {
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
            Sign in to access your dashboard
          </p>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
