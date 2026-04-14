import { memo } from "react";

export const ChatEmptyStateHero = memo(function ChatEmptyStateHero({
  projectName,
}: {
  projectName: string | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div className="flex flex-col items-center gap-0.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground/90">Let's build</h1>
        {projectName && <span className="text-lg text-muted-foreground/40">{projectName}</span>}
      </div>
    </div>
  );
});
