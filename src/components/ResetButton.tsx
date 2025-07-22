
import React from "react";
import { YodelButton } from "@/components/ui/design-system/YodelButton";
import { RotateCcw } from "lucide-react";

const ResetButton: React.FC = React.memo(() => {
  return (
    <YodelButton 
      variant="outline" 
      size="md"
      leftIcon={<RotateCcw className="h-4 w-4" />}
    >
      Reset
    </YodelButton>
  );
});

ResetButton.displayName = "ResetButton";
export default ResetButton;
