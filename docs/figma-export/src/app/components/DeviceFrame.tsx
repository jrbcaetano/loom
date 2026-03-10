interface DeviceFrameProps {
  children: React.ReactNode;
}

export function DeviceFrame({ children }: DeviceFrameProps) {
  return (
    <div className="lg:hidden">
      {/* iPhone 15 Pro frame - only visible on actual mobile */}
      <div className="relative mx-auto bg-background min-h-screen">
        {children}
      </div>
    </div>
  );
}
