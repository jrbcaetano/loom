import { Link } from "react-router";
import { Mail, ArrowLeft } from "lucide-react";

export function ForgotPassword() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-[16px] flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-[28px] text-foreground mb-2">Forgot Password?</h1>
          <p className="text-muted-foreground">
            No worries, we'll send you reset instructions
          </p>
        </div>

        {/* Reset Form */}
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

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-opacity"
            >
              Send Reset Link
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="bg-muted/30 rounded-[16px] p-4 border border-border">
          <p className="text-sm text-muted-foreground text-center">
            We'll email you a link to reset your password. Check your inbox and spam folder.
          </p>
        </div>
      </div>
    </div>
  );
}
