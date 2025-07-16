
import React from "react";
import { Button } from "@/components/ui/button";

const ResetButton: React.FC = React.memo(() => {
  return (
    <Button 
      variant="outline" 
      className="border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
    >
      Reset
    </Button>
  );
});

ResetButton.displayName = "ResetButton";
export default ResetButton;
