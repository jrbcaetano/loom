import { Link } from "react-router";
import { Mail, Lock, Eye } from "lucide-react";

export function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-[16px] flex items-center justify-center text-2xl mx-auto mb-4">
            🏠
          </div>
          <h1 className="text-[32px] text-foreground mb-2">Welcome to Loom</h1>
          <p className="text-muted-foreground">Coordinate your family life</p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-[16px] p-6 shadow-sm border border-border mb-4">
          <form className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-border rounded-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-opacity"
            >
              Log in
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">OR</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button className="w-full py-3 px-4 bg-muted/50 border border-border rounded-[10px] text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">🍎</span>
              <span>Continue with Apple</span>
            </button>
            <button className="w-full py-3 px-4 bg-muted/50 border border-border rounded-[10px] text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">📧</span>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
