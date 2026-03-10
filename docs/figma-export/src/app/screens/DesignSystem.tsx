import { Home, CheckSquare, List, Calendar, User, Plus, Bell, Settings, Star, Users, Lock } from "lucide-react";

export function DesignSystem() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-[36px] text-foreground mb-2">Loom Design System</h1>
        <p className="text-muted-foreground">UI components and design tokens</p>
      </div>

      {/* Colors */}
      <Section title="Colors">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorToken name="Primary" color="#4F7DF3" textColor="white" />
          <ColorToken name="Background" color="#F7F8FA" />
          <ColorToken name="Card" color="#FFFFFF" border />
          <ColorToken name="Text Primary" color="#111827" textColor="white" />
          <ColorToken name="Text Secondary" color="#6B7280" textColor="white" />
          <ColorToken name="Border" color="#E5E7EB" border />
          <ColorToken name="Muted" color="#F7F8FA" />
          <ColorToken name="Destructive" color="#EF4444" textColor="white" />
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <div className="space-y-4 bg-card p-6 rounded-[16px] border border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Heading 1</p>
            <h1 className="text-foreground">The quick brown fox jumps over the lazy dog</h1>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Heading 2</p>
            <h2 className="text-foreground">The quick brown fox jumps over the lazy dog</h2>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Heading 3</p>
            <h3 className="text-foreground">The quick brown fox jumps over the lazy dog</h3>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Body Text</p>
            <p className="text-foreground">The quick brown fox jumps over the lazy dog</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Small Text</p>
            <p className="text-sm text-muted-foreground">The quick brown fox jumps over the lazy dog</p>
          </div>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Primary</p>
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-[10px]">
              Primary Button
            </button>
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] opacity-50">
              Disabled
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Secondary</p>
            <button className="w-full py-3 bg-muted/50 border border-border text-foreground rounded-[10px]">
              Secondary Button
            </button>
            <button className="w-full py-3 bg-muted/50 border border-border text-foreground rounded-[10px] opacity-50">
              Disabled
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Destructive</p>
            <button className="w-full py-3 bg-destructive/10 text-destructive rounded-[10px]">
              Delete
            </button>
            <button className="w-full py-3 bg-destructive/10 text-destructive rounded-[10px] opacity-50">
              Disabled
            </button>
          </div>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Inputs">
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm text-foreground mb-2">Text Input</label>
            <input
              type="text"
              placeholder="Enter text..."
              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm text-foreground mb-2">With Icon</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Username"
                className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-foreground mb-2">Textarea</label>
            <textarea
              placeholder="Enter description..."
              rows={3}
              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            ></textarea>
          </div>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <h3 className="text-base text-foreground mb-2">Basic Card</h3>
            <p className="text-sm text-muted-foreground">
              Card with 16px border radius, subtle shadow and border
            </p>
          </div>
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-primary">
            <h3 className="text-base text-foreground mb-2">Highlighted Card</h3>
            <p className="text-sm text-muted-foreground">Card with primary border for emphasis</p>
          </div>
        </div>
      </Section>

      {/* Avatars */}
      <Section title="Avatars">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl">
            👨
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
            👩
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
            👧
          </div>
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-base">
            👦
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <div className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">Primary</div>
          <div className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Shared</span>
          </div>
          <div className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Private</span>
          </div>
          <div className="px-3 py-1 bg-destructive/10 text-destructive text-xs rounded-full">High Priority</div>
          <div className="px-3 py-1 bg-card border border-border text-foreground text-xs rounded-full">Default</div>
        </div>
      </Section>

      {/* Icons */}
      <Section title="Icons">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
          {[Home, CheckSquare, List, Calendar, User, Plus, Bell, Settings, Star, Users].map((Icon, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-muted/30 rounded-[10px] flex items-center justify-center">
                <Icon className="w-5 h-5 text-foreground" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* List Items */}
      <Section title="List Items">
        <div className="bg-card rounded-[16px] shadow-sm border border-border divide-y divide-border max-w-md">
          <div className="flex items-center gap-3 p-4">
            <input type="checkbox" className="w-5 h-5 rounded border-2 border-muted-foreground/30 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-foreground">Task with checkbox</p>
              <p className="text-xs text-muted-foreground">Due today</p>
            </div>
            <div className="text-xl">👨</div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="w-1 h-12 bg-primary rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-foreground">Event item</p>
              <p className="text-xs text-muted-foreground">Tomorrow at 3:00 PM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Star className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-foreground">List item with icon</p>
            </div>
            <span className="text-xs text-muted-foreground">10 pts</span>
          </div>
        </div>
      </Section>

      {/* Spacing */}
      <Section title="Spacing (8px Grid)">
        <div className="space-y-2">
          {[8, 16, 24, 32, 40, 48].map((size) => (
            <div key={size} className="flex items-center gap-4">
              <div className="w-20 text-sm text-muted-foreground">{size}px</div>
              <div className="h-8 bg-primary rounded" style={{ width: size }}></div>
            </div>
          ))}
        </div>
      </Section>

      {/* Border Radius */}
      <Section title="Border Radius">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary mx-auto mb-2" style={{ borderRadius: "10px" }}></div>
            <p className="text-xs text-muted-foreground">Buttons: 10px</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-primary mx-auto mb-2" style={{ borderRadius: "16px" }}></div>
            <p className="text-xs text-muted-foreground">Cards: 16px</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-primary mx-auto mb-2" style={{ borderRadius: "20px" }}></div>
            <p className="text-xs text-muted-foreground">Large: 20px</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-primary rounded-full mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">Circle: Full</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="text-xl text-foreground mb-6">{title}</h2>
      {children}
    </div>
  );
}

function ColorToken({
  name,
  color,
  textColor = "#111827",
  border = false,
}: {
  name: string;
  color: string;
  textColor?: string;
  border?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div
        className={`h-20 rounded-[10px] flex items-end p-3 ${border ? "border border-border" : ""}`}
        style={{ backgroundColor: color }}
      >
        <span className="text-xs" style={{ color: textColor }}>
          {color}
        </span>
      </div>
      <p className="text-sm text-foreground">{name}</p>
    </div>
  );
}
