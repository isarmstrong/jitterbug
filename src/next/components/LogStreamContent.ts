import React from "react";

export interface LogStreamContentProps {
    className?: string;
}

export const LogStreamContent: React.FC<LogStreamContentProps> = (): React.ReactElement => {
    return React.createElement("div", null, "LogStreamContent");
}; 